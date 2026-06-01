<template>
  <div class="play-view">
    <header class="play-header">
      <span class="logo"><img src="/img/quizhive.png" width="120" alt="QuizHive Logo"></span>
      <div class="progress-info">
        <span class="score">⭐ {{ myScore }} pts</span>
        <span class="answered-count">{{ answeredCount }}/{{ totalQuestions }}</span>
      </div>
      <button v-if="connectionError" class="btn-reload" @click="forcePageRefresh">
        🔄 Recargar
      </button>
    </header>

    <div v-if="isRetrying" class="retry-banner">
      <div class="spinner-small"></div>
      <span>Reconectando... Intento {{ sessionRetryCount }}/{{ maxRetries }}</span>
    </div>

    <main class="play-main">
      <section v-if="!showResults && questions.length > 0" class="quiz-container">
        <div class="question-nav">
          <button
            v-for="(_, i) in questions"
            :key="i"
            class="nav-dot"
            :class="{
              current: currentQuestion === i,
              answered: answers[i] !== undefined,
              pending: answers[i] === undefined && currentQuestion !== i
            }"
            @click="goToQuestion(i)"
          >
            {{ i + 1 }}
          </button>
        </div>

        <div class="question-card">
          <span class="q-counter">Pregunta {{ currentQuestion + 1 }} de {{ totalQuestions }}</span>
          <h2 class="q-text">{{ questions[currentQuestion].text }}</h2>

          <div class="options-list">
            <button
              v-for="(opt, i) in questions[currentQuestion].options"
              :key="i"
              class="option-btn"
              :class="{
                selected: selectedOption === i,
                correct: showAnswerFeedback && i === correctIndex,
                wrong: showAnswerFeedback && selectedOption === i && i !== correctIndex
              }"
              :disabled="showAnswerFeedback"
              @click="selectOption(i)"
            >
              <span class="opt-letter">{{ ['A','B','C','D','E','F'][i] }}</span>
              <span class="opt-text">{{ opt.text }}</span>
            </button>
          </div>

          <div class="action-bar">
            <button
              v-if="!showAnswerFeedback && selectedOption !== null"
              class="btn-confirm"
              @click="submitAnswer"
            >
              Confirmar respuesta
            </button>

            <div v-if="showAnswerFeedback" class="feedback-banner" :class="{ correct: lastAnswerCorrect }">
              <span v-if="lastAnswerCorrect">✅ Correcto! +{{ lastPoints }} pts</span>
              <span v-else>❌ Incorrecto. La correcta era {{ ['A','B','C','D','E','F'][correctIndex] }}</span>
            </div>

            <div class="nav-buttons">
              <button v-if="currentQuestion > 0" class="btn-nav" @click="goToQuestion(currentQuestion - 1)">
                ← Anterior
              </button>
              <button v-if="currentQuestion < questions.length - 1" class="btn-nav primary" @click="handleNext">
                {{ selectedOption !== null && !showAnswerFeedback ? 'Confirmar y siguiente →' : 'Siguiente →' }}
              </button>
              <button v-else-if="answeredCount === totalQuestions" class="btn-finish" @click="finishQuiz">
                🏆 Ver resultados
              </button>
              <button v-else class="btn-nav" @click="handleNext">
                {{ selectedOption !== null && !showAnswerFeedback ? 'Confirmar y siguiente →' : 'Saltar a pendiente →' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="!showResults && questions.length === 0" class="card loading-card">
        <div class="spinner-big"></div>
        <h2>Conectando al quiz…</h2>
        <p class="subtitle">Espera un momento</p>
      </section>

      <section v-else class="results-card">
        <h2>🏆 Resultados</h2>
        <div class="personal-stats">
          <div class="stat-big">
            <span class="rank">#{{ personalRank }}</span>
            <span class="of">de {{ totalPlayers }} jugadores</span>
          </div>
          <div class="score-big">⭐ {{ myScore }} puntos</div>
          <div class="detail">{{ correctCount }}/{{ totalQuestions }} correctas</div>
        </div>
        <h3>Top 10</h3>
        <ol class="leaderboard">
          <li v-for="(player, idx) in leaderboard" :key="idx" :class="{ 'is-you': player.name === playerName }">
            <span class="pos">{{ idx + 1 }}</span>
            <span class="name">{{ player.name }}</span>
            <span class="correct">{{ player.correctCount }}/{{ totalQuestions }}</span>
            <span class="score">⭐ {{ player.score }}</span>
          </li>
        </ol>
        <button class="btn-home" @click="goHome">← Volver al inicio</button>
      </section>
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

// Datos del jugador
const code = ref(route.query.code || localStorage.getItem('quizhive_player_code') || '')
const playerName = ref(route.query.name || localStorage.getItem('quizhive_player_name') || '')

// playerId persistente - UNA SOLA DECLARACIÓN
let playerId = localStorage.getItem('quizhive_player_id')
if (!playerId) {
  playerId = 'pid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
  localStorage.setItem('quizhive_player_id', playerId)
}

// Estado del juego
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
const sessionRetryCount = ref(0)
const maxRetries = 3

const answeredCount = computed(() => Object.keys(answers.value).length)

let socket = null
let questionStartTime = 0
let hasJoined = false
let reconnectTimer = null

// Función para recargar la página
function forcePageRefresh() {
  console.log('🔄 Forzando recarga de página...')
  localStorage.setItem('quizhive_player_code', code.value)
  localStorage.setItem('quizhive_player_name', playerName.value)
  window.location.reload()
}

// Función para reiniciar conexión
function resetAndRetry() {
  if (isRetrying.value) return
  
  isRetrying.value = true
  sessionRetryCount.value++
  
  console.log(`🔄 Intento de reconexión ${sessionRetryCount.value}/${maxRetries}`)
  
  if (socket) {
    socket.disconnect()
    socket = null
  }
  
  // Generar nuevo playerId
  const newPlayerId = 'pid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
  localStorage.setItem('quizhive_player_id', newPlayerId)
  playerId = newPlayerId
  
  hasJoined = false
  
  setTimeout(() => {
    isRetrying.value = false
    initSocket()
  }, 1000)
}

// Inicializar socket
function initSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  
  socket = io(API, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
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
    console.log('✅ Unido al quiz:', t)
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

  socket.on('quiz:personalResults', ({ yourScore, yourRank, totalPlayers: tp, correctCount: cc, totalQuestions: tq, leaderboard: lb }) => {
    myScore.value = yourScore
    personalRank.value = yourRank
    totalPlayers.value = tp
    correctCount.value = cc
    totalQuestions.value = tq
    leaderboard.value = lb
    showResults.value = true
  })

  socket.on('error', ({ message }) => {
    console.log('❌ Socket error:', message)
    connectionError.value = message
    
    if (message.includes('nombre ya está en uso')) {
      if (sessionRetryCount.value < maxRetries) {
        console.log('🔄 Nombre en uso, reintentando...')
        resetAndRetry()
      } else {
        alert(`No se pudo conectar. Por favor, recarga la página.\n\nError: ${message}`)
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

// Funciones del juego
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
      const currentQ = questions.value[idx]
      if (currentQ && currentQ.options) {
        correctIndex.value = currentQ.options.findIndex(o => o?.isCorrect === true)
      }
    }
  }
}

function finishQuiz() {
  socket.emit('player:requestResults', { code: code.value })
}

function goHome() {
  localStorage.removeItem('quizhive_player_code')
  localStorage.removeItem('quizhive_player_name')
  localStorage.removeItem('quizhive_player_id')
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

// Ciclo de vida
onMounted(() => {
  if (!code.value || !playerName.value) {
    router.push('/join')
    return
  }
  
  initSocket()

  setTimeout(() => {
    if (questions.value.length === 0 && !connectionError.value && !isRetrying.value) {
      console.log('⏱️ Timeout esperando respuesta')
      connectionError.value = 'El servidor no respondió. Intenta recargar.'
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

// Exponer función global para debugging
window.forceReload = forcePageRefresh
</script>

<style scoped>
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

.play-view { min-height: 100vh; background: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
.play-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
.progress-info { display: flex; gap: 1.5rem; align-items: center; }
.score { font-size: 1.1rem; font-weight: 700; color: #16a34a; }
.answered-count { color: #64748b; font-size: .9rem; }

.play-main { max-width: 700px; margin: 2rem auto; padding: 0 1rem; }

.loading-card { text-align: center; padding: 3rem; }
.spinner-big { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

.question-nav { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.5rem; justify-content: center; }
.nav-dot { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #e2e8f0; background: #fff; cursor: pointer; font-weight: 600; font-size: .85rem; transition: all .2s; }
.nav-dot.current { border-color: #16a34a; background: #f0fdf4; color: #16a34a; transform: scale(1.1); }
.nav-dot.answered { background: #dcfce7; border-color: #16a34a; color: #166534; }
.nav-dot.pending { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
.nav-dot:hover { transform: scale(1.1); }

.question-card { background: #fff; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.q-counter { color: #64748b; font-size: .85rem; font-weight: 500; }
.q-text { font-size: 1.3rem; color: #0f172a; margin: 1rem 0 1.5rem; }

.options-list { display: flex; flex-direction: column; gap: .75rem; margin-bottom: 1.5rem; }
.option-btn { display: flex; align-items: center; gap: .75rem; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 10px; background: #fff; cursor: pointer; text-align: left; transition: all .2s; }
.option-btn:hover:not(:disabled) { border-color: #16a34a; background: #f0fdf4; }
.option-btn.selected { border-color: #16a34a; background: #f0fdf4; }
.option-btn.correct { border-color: #16a34a; background: #dcfce7; }
.option-btn.wrong { border-color: #dc2626; background: #fef2f2; }
.option-btn:disabled { cursor: default; }
.opt-letter { width: 32px; height: 32px; background: #e2e8f0; color: #475569; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .9rem; flex-shrink: 0; }
.option-btn.selected .opt-letter { background: #16a34a; color: #fff; }
.option-btn.correct .opt-letter { background: #16a34a; color: #fff; }
.option-btn.wrong .opt-letter { background: #dc2626; color: #fff; }

.action-bar { display: flex; flex-direction: column; gap: 1rem; }
.btn-confirm { width: 100%; padding: .8rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
.btn-confirm:hover { background: #15803d; }

.feedback-banner { padding: 1rem; border-radius: 8px; text-align: center; font-weight: 600; }
.feedback-banner.correct { background: #dcfce7; color: #166534; }
.feedback-banner:not(.correct) { background: #fef2f2; color: #991b1b; }

.nav-buttons { display: flex; gap: .5rem; justify-content: space-between; }
.btn-nav { padding: .6rem 1.2rem; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-nav.primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.btn-nav:hover { opacity: .9; }
.btn-finish { padding: .6rem 1.2rem; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-finish:hover { background: #d97706; }

.results-card { background: #fff; border-radius: 12px; padding: 2rem; text-align: center; }
.personal-stats { background: #f0fdf4; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
.stat-big { display: flex; align-items: baseline; justify-content: center; gap: .5rem; margin-bottom: .5rem; }
.rank { font-size: 2.5rem; font-weight: 800; color: #16a34a; }
.of { color: #64748b; }
.score-big { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
.detail { color: #64748b; }

.leaderboard { list-style: none; padding: 0; margin: 0 0 1.5rem; }
.leaderboard li { display: flex; align-items: center; gap: 1rem; padding: .75rem 1rem; border-radius: 8px; margin-bottom: .5rem; }
.leaderboard li.is-you { background: #f0fdf4; border: 2px solid #16a34a; }
.pos { font-weight: 700; color: #64748b; width: 2rem; }
.name { flex: 1; text-align: left; font-weight: 500; }
.correct { color: #64748b; font-size: .85rem; }
.score { font-weight: 700; color: #16a34a; }

.btn-home { padding: .8rem 1.5rem; background: #64748b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
.btn-home:hover { background: #475569; }
</style>