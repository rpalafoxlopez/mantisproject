<!-- Agregar un botón de recarga en el template (opcional) -->
<template>
  <div class="play-view">
    <header class="play-header">
      <span class="logo"><img src="/img/quizhive.png" width="120" alt="QuizHive Logo"></span>
      <div class="progress-info">
        <span class="score">⭐ {{ myScore }} pts</span>
        <span class="answered-count">{{ answeredCount }}/{{ totalQuestions }}</span>
      </div>
      <!-- 🆕 Botón de recarga manual -->
      <button v-if="connectionError" class="btn-reload" @click="forcePageRefresh">
        🔄 Recargar
      </button>
    </header>

    <!-- Mostrar mensaje de reintento -->
    <div v-if="isRetrying" class="retry-banner">
      <div class="spinner-small"></div>
      <span>Reconectando... Intento {{ sessionRetryCount }}/{{ maxRetries }}</span>
    </div>

    <!-- Resto del template igual -->
    <main class="play-main">
      <!-- ... contenido existente ... -->
    </main>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const code = ref(route.query.code || localStorage.getItem('quizhive_player_code') || '')
const playerName = ref(route.query.name || localStorage.getItem('quizhive_player_name') || '')

// ═══════════════════════════════════════════════════════
// 🆕 MEJORA: playerId con limpieza forzada
// ═══════════════════════════════════════════════════════
let playerId = localStorage.getItem('quizhive_player_id')
const sessionRetryCount = ref(0)
const maxRetries = 3

if (!playerId) {
  playerId = 'pid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
  localStorage.setItem('quizhive_player_id', playerId)
}

const title = ref('')
const questions = ref([])
const totalQuestions = ref(0)
const currentQuestion = ref(0)
const selectedOption = ref(null)
const answers = ref({})
const showAnswerFeedback = ref(false)
const lastAnswerCorrect = ref(false)
const lastPoints = ref(0)
const correctIndex = ref(-1)
const myScore = ref(0)
const personalRank = ref(0)
const totalPlayers = ref(0)
const correctCount = ref(0)
const leaderboard = ref([])
const showResults = ref(false)
const connectionError = ref('')
const isRetrying = ref(false)

const answeredCount = computed(() => Object.keys(answers.value).length)

let socket = null
let questionStartTime = 0
let hasJoined = false
let reconnectTimer = null

// 🆕 Función para limpiar estado y reintentar
function resetAndRetry() {
  if (isRetrying.value) return
  
  isRetrying.value = true
  sessionRetryCount.value++
  
  console.log(`🔄 Intento de reconexión ${sessionRetryCount.value}/${maxRetries}`)
  
  // Limpiar socket anterior
  if (socket) {
    socket.disconnect()
    socket = null
  }
  
  // Limpiar localStorage temporalmente
  const savedPlayerId = localStorage.getItem('quizhive_player_id')
  const savedCode = localStorage.getItem('quizhive_player_code')
  const savedName = localStorage.getItem('quizhive_player_name')
  
  // Generar nuevo playerId para este intento
  const newPlayerId = 'pid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
  localStorage.setItem('quizhive_player_id', newPlayerId)
  playerId = newPlayerId
  
  hasJoined = false
  
  // Pequeño delay antes de reconectar
  setTimeout(() => {
    isRetrying.value = false
    initializeConnection()
  }, 1000)
}

// 🆕 Función para refrescar la página (último recurso)
function forcePageRefresh() {
  console.log('🔄 Forzando recarga de página...')
  // Guardar datos actuales
  localStorage.setItem('quizhive_player_code', code.value)
  localStorage.setItem('quizhive_player_name', playerName.value)
  // Recargar página
  window.location.reload()
}

// 🆕 Función para inicializar conexión
function initializeConnection() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  
  socket = io(API, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 10000
  })

  socket.on('connect', () => {
    console.log('✅ Socket conectado:', socket.id)
    connectionError.value = ''
    if (!hasJoined) {
      hasJoined = true
      socket.emit('player:join', {
        code: code.value,
        name: playerName.value,
        playerId: playerId
      })
    }
  })

  socket.on('player:joined', ({ title: t, questions: q, totalQuestions: total }) => {
    console.log('✅ Unido al quiz:', t, 'Preguntas:', q?.length)
    // Limpiar contador de reintentos al conectar exitosamente
    sessionRetryCount.value = 0
    title.value = t
    questions.value = q || []
    totalQuestions.value = total || (q ? q.length : 0)
    currentQuestion.value = 0
    selectedOption.value = null
    answers.value = {}
    showAnswerFeedback.value = false
    showResults.value = false
    myScore.value = 0
    correctCount.value = 0
    connectionError.value = ''
    questionStartTime = Date.now()
  })

  socket.on('answer:confirmed', ({ questionIndex, isCorrect, points, yourScore, correctIndex: ci }) => {
    lastAnswerCorrect.value = isCorrect
    lastPoints.value = points
    correctIndex.value = ci
    myScore.value = yourScore
    showAnswerFeedback.value = true

    answers.value[questionIndex] = {
      answerIndex: selectedOption.value,
      isCorrect,
      points
    }

    if (isCorrect) correctCount.value++
  })

  socket.on('quiz:personalResults', ({
    yourScore, yourRank, totalPlayers: tp, correctCount: cc,
    totalQuestions: tq, leaderboard: lb
  }) => {
    myScore.value = yourScore
    personalRank.value = yourRank
    totalPlayers.value = tp
    correctCount.value = cc
    totalQuestions.value = tq
    leaderboard.value = lb
    showResults.value = true
  })

  // 🆕 Manejo específico del error "nombre en uso"
  socket.on('error', ({ message }) => {
    console.log('❌ Socket error:', message)
    connectionError.value = message
    
    if (message.includes('nombre ya está en uso')) {
      if (sessionRetryCount.value < maxRetries) {
        // Intentar reconectar con nuevo ID
        console.log('🔄 Nombre en uso, reintentando con nuevo ID...')
        resetAndRetry()
      } else {
        // Si falla después de varios intentos, mostrar mensaje y ofrecer recargar
        alert(`No se pudo conectar. Por favor, recarga la página o cambia tu nombre.\n\nError: ${message}`)
        if (confirm('¿Quieres recargar la página?')) {
          forcePageRefresh()
        }
      }
    } else if (message.includes('terminó') || message.includes('inválido') || message.includes('encontrada')) {
      alert(message)
      router.push('/join')
    }
  })

  socket.on('connect_error', (err) => {
    console.log('❌ Connect error:', err.message)
    connectionError.value = 'Error de conexión con el servidor'
  })

  socket.on('disconnect', (reason) => {
    console.log('❌ Desconectado:', reason)
  })
}

onMounted(() => {
  if (!code.value || !playerName.value) {
    router.push('/join')
    return
  }
  
  initializeConnection()

  // Timeout de seguridad
  setTimeout(() => {
    if (questions.value.length === 0 && !connectionError.value && !isRetrying.value) {
      console.log('⏱️ Timeout esperando respuesta del servidor')
      connectionError.value = 'El servidor no respondió. Intenta recargar la página.'
    }
  }, 10000)
})

onUnmounted(() => {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (socket) {
    socket.disconnect()
    socket = null
  }
})

function selectOption(idx) {
  if (!showAnswerFeedback.value) {
    selectedOption.value = idx
  }
}

function submitAnswer() {
  if (selectedOption.value === null || showAnswerFeedback.value) return

  const timeUsed = Math.floor((Date.now() - questionStartTime) / 1000)

  socket.emit('player:answer', {
    code: code.value,
    questionIndex: currentQuestion.value,
    answerIndex: selectedOption.value,
    timeUsed
  })
}

function goToQuestion(idx) {
  if (idx >= 0 && idx < questions.value.length) {
    currentQuestion.value = idx
    selectedOption.value = null
    showAnswerFeedback.value = false
    correctIndex.value = -1
    questionStartTime = Date.now()

    const prev = answers.value[idx]
    if (prev) {
      selectedOption.value = prev.answerIndex
      showAnswerFeedback.value = true
      lastAnswerCorrect.value = prev.isCorrect
      lastPoints.value = prev.points
      correctIndex.value = questions.value[idx].options.findIndex((o, i) => 
        questions.value[idx].options[i]?.isCorrect
      )
    }
  }
}

function finishQuiz() {
  socket.emit('player:requestResults', { code: code.value })
}

function goHome() {
  // Limpiar todo al salir
  localStorage.removeItem('quizhive_player_code')
  localStorage.removeItem('quizhive_player_name')
  localStorage.removeItem('quizhive_player_id') // También limpiar playerId
  hasJoined = false
  if (socket) socket.disconnect()
  router.push('/')
}

function handleNext() {
  if (selectedOption.value !== null && !showAnswerFeedback.value) {
    submitAnswer()
    setTimeout(() => {
      goToQuestion(currentQuestion.value + 1)
    }, 1200)
    return
  }
  goToQuestion(currentQuestion.value + 1)
}

// 🆕 Función manual para recargar
window.forceReload = forcePageRefresh
</script>

<style scoped>
/* Agregar estos estilos */
.btn-reload {
  background: #f59e0b;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reload:hover {
  background: #d97706;
  transform: scale(1.05);
}

.retry-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #f59e0b;
  color: #fff;
  padding: 0.75rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  z-index: 1000;
  font-weight: 500;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
</style>