<template>
  <div class="min-h-screen bg-slate-900 text-white">
    <!-- WAITING -->
    <div v-if="gameStore.isWaiting" class="min-h-screen flex items-center justify-center px-4">
      <div class="text-center">
        <div class="text-6xl mb-4 animate-bounce">{{ gameStore.playerAvatar }}</div>
        <h2 class="text-2xl font-bold mb-2">¡Hola, {{ gameStore.playerName }}!</h2>
        <p class="text-slate-400 mb-6">Esperando que el host inicie el juego...</p>
        <div class="flex justify-center gap-2 mb-6 flex-wrap">
          <span v-for="player in gameStore.players" :key="player.socketId" class="text-2xl animate-pulse">
            {{ player.avatar }}
          </span>
        </div>
        <div class="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
      </div>
    </div>

    <!-- PLAYING -->
    <div v-if="gameStore.isPlaying && gameStore.currentQuestion" class="min-h-screen flex flex-col">
      <!-- Timer Bar -->
      <div class="w-full h-2 bg-slate-800">
        <div 
          class="h-full transition-all duration-1000 ease-linear"
          :class="timerBarColor"
          :style="{ width: timerPercentage + '%' }"
        ></div>
      </div>

      <!-- Header -->
      <div class="flex justify-between items-center px-4 py-3 bg-slate-800/50">
        <span class="text-sm text-blue-400 font-medium uppercase tracking-wider">
          {{ gameStore.currentQuestion.category }}
        </span>
        <span class="text-sm text-slate-400">
          {{ gameStore.currentQuestionIndex + 1 }} / {{ gameStore.totalQuestions }}
        </span>
      </div>

      <!-- Question -->
      <div class="flex-1 flex flex-col justify-center px-4 py-6 max-w-3xl mx-auto w-full">
        <h2 class="text-xl lg:text-2xl font-bold text-center mb-8 leading-relaxed">
          {{ gameStore.currentQuestion.question }}
        </h2>

        <!-- Options -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="(option, index) in gameStore.currentQuestion.options"
            :key="index"
            class="relative flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200"
            :class="getOptionClass(index)"
            :disabled="gameStore.hasAnswered"
            @click="selectAnswer(index)"
          >
            <span 
              class="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0"
              :class="shapeColors[index]"
            >
              {{ ['▲','●','■','★'][index] }}
            </span>
            <span class="flex-1 font-semibold text-base">{{ option }}</span>
            <span v-if="gameStore.hasAnswered && index === gameStore.answerResult?.correctAnswer" class="text-green-400">
              <span class="material-symbols-outlined">check_circle</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Feedback -->
      <div 
        v-if="gameStore.answerResult" 
        class="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl flex items-center gap-3 text-white font-semibold shadow-2xl animate-slide-up z-50"
        :class="gameStore.answerResult.correct ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-pink-500'"
      >
        <span class="text-2xl">{{ gameStore.answerResult.correct ? '✅' : '❌' }}</span>
        <span>
          {{ gameStore.answerResult.correct ? `¡Correcto! +${gameStore.answerResult.pointsEarned} pts` : 'Incorrecto' }}
        </span>
        <span class="bg-white/20 px-3 py-1 rounded-lg text-sm">
          Total: {{ gameStore.answerResult.totalScore }}
        </span>
      </div>
    </div>

    <!-- LEADERBOARD -->
    <div v-if="showLeaderboard" class="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-900">
      <h2 class="text-3xl font-bold text-yellow-400 mb-8 flex items-center gap-2">
        <span class="material-symbols-outlined">emoji_events</span>
        Leaderboard
      </h2>
      <div class="w-full max-w-md space-y-2">
        <div 
          v-for="(player, i) in gameStore.leaderboard" 
          :key="player.name"
          class="flex items-center gap-3 p-4 rounded-xl bg-slate-800 animate-slide-in"
          :style="{ animationDelay: (i * 0.1) + 's' }"
        >
          <span class="w-8 text-center font-black text-lg" :class="i < 3 ? 'text-yellow-400' : 'text-slate-500'">
            {{ i + 1 }}
          </span>
          <span class="text-2xl">{{ player.avatar }}</span>
          <span class="flex-1 font-medium">{{ player.name }}</span>
          <div class="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
              :style="{ width: getBarWidth(player.score) + '%' }"
            ></div>
          </div>
          <span class="font-black text-blue-400">{{ player.score }}</span>
        </div>
      </div>
      <p class="mt-8 text-slate-400 animate-pulse">
        Siguiente pregunta en {{ countdown }}...
      </p>
    </div>

    <!-- FINISHED -->
    <div v-if="gameStore.isFinished" class="min-h-screen flex items-center justify-center px-4 bg-slate-900">
      <FinalLeaderboard :leaderboard="gameStore.finalResults?.leaderboard" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSocketStore } from '../stores/socket.js'
import { useGameStore } from '../stores/game.js'
import FinalLeaderboard from '../components/FinalLeaderboard.vue'

const route = useRoute()
const router = useRouter()
const socketStore = useSocketStore()
const gameStore = useGameStore()

const showLeaderboard = ref(false)
const countdown = ref(3)
let timerInterval = null
let countdownInterval = null

const timerPercentage = computed(() => {
  if (!gameStore.currentQuestion) return 100
  return (gameStore.timeLeft / gameStore.currentQuestion.timeLimit) * 100
})

const timerBarColor = computed(() => {
  if (gameStore.timeLeft <= 5) return 'bg-gradient-to-r from-red-500 to-pink-500'
  if (gameStore.timeLeft <= 10) return 'bg-gradient-to-r from-yellow-500 to-orange-500'
  return 'bg-gradient-to-r from-blue-500 to-cyan-400'
})

const shapeColors = [
  'bg-red-500/20 text-red-400',
  'bg-green-500/20 text-green-400',
  'bg-yellow-500/20 text-yellow-400',
  'bg-purple-500/20 text-purple-400'
]

function getBarWidth(score) {
  const max = Math.max(...gameStore.leaderboard.map(p => p.score), 1)
  return (score / max) * 100
}

function getOptionClass(index) {
  if (!gameStore.hasAnswered) {
    return 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600 cursor-pointer'
  }
  if (gameStore.answerResult?.correct && index === gameStore.answerResult.correctAnswer) {
    return 'bg-green-500/20 border-green-500 animate-pulse'
  }
  if (!gameStore.answerResult?.correct && index === gameStore.answerResult?.selectedOption) {
    return 'bg-red-500/20 border-red-500'
  }
  if (index === gameStore.answerResult?.correctAnswer) {
    return 'bg-green-500/20 border-green-500'
  }
  return 'bg-slate-800/50 border-slate-800 opacity-50'
}

onMounted(() => {
  socketStore.connect()

  if (gameStore.sessionCode && gameStore.playerName) {
    socketStore.emit('player:join', {
      sessionCode: gameStore.sessionCode,
      playerName: gameStore.playerName,
      avatar: gameStore.playerAvatar
    })
  }

  setupSocketListeners()
})

onUnmounted(() => {
  clearIntervals()
  socketStore.off('game:started')
  socketStore.off('question:show')
  socketStore.off('answer:result')
  socketStore.off('leaderboard:show')
  socketStore.off('question:results')
  socketStore.off('game:ended')
  socketStore.off('session:ended')
})

function clearIntervals() {
  if (timerInterval) clearInterval(timerInterval)
  if (countdownInterval) clearInterval(countdownInterval)
}

function setupSocketListeners() {
  socketStore.on('game:started', ({ totalQuestions }) => {
    gameStore.setStatus('playing')
    gameStore.totalQuestions = totalQuestions
    showLeaderboard.value = false
  })

  socketStore.on('question:show', (question) => {
    gameStore.setQuestion(question, question.index, question.totalQuestions)
    showLeaderboard.value = false
    startTimer()
  })

  socketStore.on('answer:result', (result) => {
    gameStore.setAnswerResult(result)
    gameStore.submitAnswer()
    clearIntervals()
  })

  socketStore.on('leaderboard:show', ({ leaderboard, nextQuestionIn }) => {
    showLeaderboard.value = true
    gameStore.setLeaderboard(leaderboard)
    countdown.value = nextQuestionIn || 3
    startCountdown()
  })

  socketStore.on('question:results', (results) => {
    gameStore.setQuestionResults(results)
  })

  socketStore.on('game:ended', ({ leaderboard, stats }) => {
    clearIntervals()
    gameStore.setFinalResults({ leaderboard, stats })
  })

  socketStore.on('session:ended', ({ reason }) => {
    alert(`Sesión terminada: ${reason}`)
    goHome()
  })
}

function startTimer() {
  clearIntervals()
  if (!gameStore.currentQuestion) return

  gameStore.setTimeLeft(gameStore.currentQuestion.timeLimit)

  timerInterval = setInterval(() => {
    if (gameStore.timeLeft > 0 && !gameStore.hasAnswered) {
      gameStore.setTimeLeft(gameStore.timeLeft - 1)
    } else {
      clearInterval(timerInterval)
    }
  }, 1000)
}

function startCountdown() {
  clearIntervals()
  countdownInterval = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(countdownInterval)
      showLeaderboard.value = false
    }
  }, 1000)
}

function selectAnswer(index) {
  if (gameStore.hasAnswered) return

  socketStore.emit('player:answer', {
    sessionCode: gameStore.sessionCode,
    questionIndex: gameStore.currentQuestionIndex,
    selectedOption: index
  })
}

function goHome() {
  gameStore.reset()
  router.push('/')
}
</script>

<style scoped>
@keyframes slide-up {
  from { transform: translateX(-50%) translateY(100px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-slide-up {
  animation: slide-up 0.3s ease forwards;
}

.animate-slide-in {
  animation: slide-in 0.4s ease forwards;
  opacity: 0;
}
</style>
