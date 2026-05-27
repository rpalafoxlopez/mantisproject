<template>
  <div class="min-h-screen bg-background py-8 px-4 lg:px-10">
    <div class="max-w-5xl mx-auto">
      <!-- LOBBY -->
      <div v-if="gameStore.isWaiting" class="space-y-6">
        <!-- Header -->
        <div class="text-center">
          <h1 class="text-3xl font-bold text-primary flex items-center justify-center gap-3">
            <span class="material-symbols-outlined text-secondary">hive</span>
            Sala de Control
          </h1>
        </div>

        <!-- Room Code -->
        <div class="flex justify-center">
          <div class="bg-gradient-to-r from-primary to-secondary text-white px-8 py-6 rounded-2xl text-center shadow-lg">
            <div class="text-sm opacity-80 uppercase tracking-wider mb-2">Código de Sala</div>
            <div class="text-4xl font-black tracking-widest">{{ gameStore.sessionCode }}</div>
            <button 
              class="mt-3 text-sm bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2 mx-auto"
              @click="copyCode"
            >
              <span class="material-symbols-outlined text-base">content_copy</span>
              Copiar
            </button>
          </div>
        </div>

        <div class="grid lg:grid-cols-2 gap-6">
          <!-- Players -->
          <div class="card">
            <h2 class="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">group</span>
              Jugadores ({{ gameStore.players.length }})
            </h2>
            <div class="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <div 
                v-for="player in gameStore.players" 
                :key="player.socketId"
                class="text-center p-3 rounded-xl bg-gray-50"
                :class="{ 'opacity-50': !player.connected }"
              >
                <div class="text-2xl mb-1">{{ player.avatar }}</div>
                <div class="text-xs font-medium truncate">{{ player.name }}</div>
              </div>
              <div v-if="gameStore.players.length === 0" class="col-span-full text-center py-8 text-on-surface-variant">
                Esperando jugadores...
              </div>
            </div>
          </div>

          <!-- Questions -->
          <div class="card">
            <h2 class="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">quiz</span>
              Preguntas ({{ selectedQuestions.length }}/25)
            </h2>
            <div v-if="selectedQuestions.length > 25" class="bg-error/10 text-error p-3 rounded-lg mb-3 text-sm flex items-center gap-2">
              <span class="material-symbols-outlined">warning</span>
              Máximo 25 preguntas permitidas. Selecciona las mejores.
            </div>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div 
                v-for="(q, i) in selectedQuestions" 
                :key="q._id"
                class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm"
              >
                <span class="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{{ i + 1 }}</span>
                <span class="flex-1 truncate">{{ q.question }}</span>
                <span class="text-xs text-on-surface-variant flex-shrink-0">{{ q.timeLimit }}s</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center gap-4">
          <button 
            class="btn btn-success px-8 py-4 text-base"
            :disabled="gameStore.players.length === 0 || selectedQuestions.length === 0 || selectedQuestions.length > 25"
            @click="startGame"
          >
            <span class="material-symbols-outlined">rocket_launch</span>
            Iniciar Juego
          </button>
          <button class="btn btn-danger" @click="endSession">
            <span class="material-symbols-outlined">close</span>
            Cerrar Sala
          </button>
        </div>
      </div>

      <!-- PLAYING -->
      <div v-if="gameStore.isPlaying" class="space-y-6">
        <div class="flex justify-between items-center">
          <div class="text-lg font-semibold text-primary">
            Pregunta {{ gameStore.currentQuestionIndex + 1 }} / {{ gameStore.totalQuestions }}
          </div>
          <div 
            class="text-2xl font-black px-4 py-2 rounded-xl"
            :class="timerClass"
          >
            ⏱️ {{ gameStore.timeLeft }}s
          </div>
        </div>

        <!-- Question -->
        <div class="card bg-gradient-to-br from-primary/5 to-secondary/5">
          <h2 class="text-xl font-bold text-on-surface mb-4">{{ gameStore.currentQuestion?.question }}</h2>
          <div class="grid grid-cols-2 gap-3">
            <div 
              v-for="(opt, i) in gameStore.currentQuestion?.options" 
              :key="i"
              class="flex items-center gap-3 p-4 rounded-xl border-2"
              :class="i === correctAnswerIndex ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'"
            >
              <span class="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">{{ ['A','B','C','D'][i] }}</span>
              <span class="flex-1">{{ opt }}</span>
              <span v-if="i === correctAnswerIndex" class="text-green-500">
                <span class="material-symbols-outlined">check_circle</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Progress -->
        <div class="card">
          <div class="flex justify-between text-sm mb-2">
            <span>Progreso de respuestas</span>
            <span>{{ answeredCount }} / {{ gameStore.players.length }}</span>
          </div>
          <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
              :style="{ width: answerProgress + '%' }"
            ></div>
          </div>
        </div>

        <!-- Live Leaderboard -->
        <div class="card">
          <h3 class="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary">emoji_events</span>
            Leaderboard en Vivo
          </h3>
          <div class="space-y-2">
            <div 
              v-for="(player, i) in gameStore.leaderboard" 
              :key="player.name"
              class="flex items-center gap-3 p-3 rounded-lg"
              :class="i < 3 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'"
            >
              <span class="w-8 text-center font-black" :class="i < 3 ? 'text-yellow-600' : 'text-gray-400'">{{ i + 1 }}</span>
              <span class="text-xl">{{ player.avatar }}</span>
              <span class="flex-1 font-medium">{{ player.name }}</span>
              <span class="font-black text-primary">{{ player.score }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-4">
          <button class="btn btn-primary" @click="nextQuestion">
            <span class="material-symbols-outlined">skip_next</span>
            Siguiente
          </button>
          <button class="btn btn-danger" @click="endGame">
            <span class="material-symbols-outlined">stop</span>
            Terminar
          </button>
        </div>
      </div>

      <!-- FINISHED -->
      <div v-if="gameStore.isFinished" class="text-center py-12">
        <FinalLeaderboard :leaderboard="gameStore.finalResults?.leaderboard" />
        <button class="btn btn-primary mt-8" @click="goHome">
          <span class="material-symbols-outlined">replay</span>
          Nueva Partida
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSocketStore } from '../stores/socket.js'
import { useGameStore } from '../stores/game.js'
import axios from 'axios'
import FinalLeaderboard from '../components/FinalLeaderboard.vue'

const route = useRoute()
const router = useRouter()
const socketStore = useSocketStore()
const gameStore = useGameStore()

const selectedQuestions = ref([])
const correctAnswerIndex = ref(null)
const answeredCount = ref(0)

const timerClass = computed(() => {
  if (gameStore.timeLeft <= 5) return 'bg-red-100 text-red-600 animate-pulse'
  if (gameStore.timeLeft <= 10) return 'bg-yellow-100 text-yellow-600'
  return 'bg-blue-100 text-blue-600'
})

const answerProgress = computed(() => {
  if (gameStore.players.length === 0) return 0
  return (answeredCount.value / gameStore.players.length) * 100
})

onMounted(async () => {
  socketStore.connect()

  if (!route.params.sessionCode) {
    await createSession()
  } else {
    gameStore.setSession(route.params.sessionCode, true)
    joinAsHost()
  }

  setupSocketListeners()
})

onUnmounted(() => {
  socketStore.off('host:joined')
  socketStore.off('players:update')
  socketStore.off('game:started')
  socketStore.off('question:host')
  socketStore.off('player:answered')
  socketStore.off('question:results')
  socketStore.off('game:ended')
})

async function createSession() {
  try {
    const res = await axios.get('/api/questions')
    const questions = res.data.slice(0, 25) // Limit to 25
    selectedQuestions.value = questions

    const sessionRes = await axios.post('/api/sessions/create', {
      questionIds: questions.map(q => q._id),
      settings: {
        timePerQuestion: 20,
        showLeaderboard: true,
        allowLateJoin: false
      }
    })

    gameStore.setSession(sessionRes.data.code, true)
    selectedQuestions.value = sessionRes.data.questions

    router.replace(`/host/${sessionRes.data.code}`)
    joinAsHost()
  } catch (error) {
    console.error('Error creating session:', error)
    if (error.response?.status === 401) {
      alert('Debes iniciar sesión para crear una partida')
      router.push('/login')
    }
  }
}

function joinAsHost() {
  socketStore.emit('host:join', { sessionCode: gameStore.sessionCode })
}

function setupSocketListeners() {
  socketStore.on('host:joined', ({ session }) => {
    gameStore.setPlayers(session.players)
  })

  socketStore.on('players:update', (players) => {
    gameStore.setPlayers(players)
  })

  socketStore.on('game:started', ({ totalQuestions, players }) => {
    gameStore.setStatus('playing')
    gameStore.totalQuestions = totalQuestions
    gameStore.setPlayers(players)
    answeredCount.value = 0
  })

  socketStore.on('question:host', (question) => {
    gameStore.setQuestion(question, question.index, question.totalQuestions)
    correctAnswerIndex.value = question.correctAnswer
    answeredCount.value = 0
  })

  socketStore.on('player:answered', ({ totalAnswered }) => {
    answeredCount.value = totalAnswered
  })

  socketStore.on('question:results', (results) => {
    gameStore.setQuestionResults(results)
  })

  socketStore.on('game:ended', ({ leaderboard, stats }) => {
    gameStore.setFinalResults({ leaderboard, stats })
  })

  socketStore.on('host:next:auto', ({ sessionCode }) => {
    socketStore.emit('host:next', { sessionCode })
  })
}

function startGame() {
  socketStore.emit('host:start', { sessionCode: gameStore.sessionCode })
}

function nextQuestion() {
  socketStore.emit('host:next', { sessionCode: gameStore.sessionCode })
}

function endGame() {
  socketStore.emit('host:end', { sessionCode: gameStore.sessionCode })
}

function endSession() {
  axios.delete(`/api/sessions/${gameStore.sessionCode}`)
  gameStore.reset()
  router.push('/')
}

function goHome() {
  gameStore.reset()
  router.push('/')
}

function copyCode() {
  navigator.clipboard.writeText(gameStore.sessionCode)
}
</script>
