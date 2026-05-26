<template>
  <div class="play-view">
    <!-- WAITING: Esperando que inicie -->
    <div v-if="gameStore.isWaiting" class="waiting-screen">
      <div class="waiting-content">
        <div class="waiting-avatar">{{ gameStore.playerAvatar }}</div>
        <h2>¡Hola, {{ gameStore.playerName }}!</h2>
        <p>Esperando que el host inicie el juego...</p>
        <div class="waiting-players">
          <div 
            v-for="player in gameStore.players" 
            :key="player.socketId"
            class="wp-item"
          >
            {{ player.avatar }}
          </div>
        </div>
        <div class="spinner"></div>
      </div>
    </div>

    <!-- PLAYING: Pregunta activa -->
    <div v-if="gameStore.isPlaying && gameStore.currentQuestion" class="game-screen">
      <!-- Timer -->
      <div class="timer-bar-container">
        <div 
          class="timer-bar"
          :style="{ width: timerPercentage + '%' }"
          :class="timerBarClass"
        ></div>
        <span class="timer-text">{{ gameStore.timeLeft }}s</span>
      </div>

      <!-- Question -->
      <div class="question-container">
        <div class="question-header">
          <span class="q-category">{{ gameStore.currentQuestion.category }}</span>
          <span class="q-progress">
            {{ gameStore.currentQuestionIndex + 1 }} / {{ gameStore.totalQuestions }}
          </span>
        </div>

        <h2 class="question-text">{{ gameStore.currentQuestion.question }}</h2>

        <!-- Options -->
        <div class="options-grid">
          <button
            v-for="(option, index) in gameStore.currentQuestion.options"
            :key="index"
            class="option-btn"
            :class="getOptionClass(index)"
            :disabled="gameStore.hasAnswered"
            @click="selectAnswer(index)"
          >
            <span class="opt-shape" :class="'shape-' + index">
              {{ ['▲', '●', '■', '★'][index] }}
            </span>
            <span class="opt-label">{{ option }}</span>
          </button>
        </div>
      </div>

      <!-- Answer feedback -->
      <div v-if="gameStore.answerResult" class="answer-feedback" :class="feedbackClass">
        <div class="feedback-icon">
          {{ gameStore.answerResult.correct ? '✅' : '❌' }}
        </div>
        <div class="feedback-text">
          <span v-if="gameStore.answerResult.correct">
            ¡Correcto! +{{ gameStore.answerResult.pointsEarned }} pts
          </span>
          <span v-else>
            Incorrecto. La respuesta era: {{ correctOptionText }}
          </span>
        </div>
        <div class="feedback-score">
          Total: {{ gameStore.answerResult.totalScore }} pts
        </div>
      </div>
    </div>

    <!-- LEADERBOARD between questions -->
    <div v-if="showLeaderboard" class="leaderboard-screen">
      <h2>🏆 Leaderboard</h2>
      <div class="lb-animation">
        <div 
          v-for="(player, i) in gameStore.leaderboard" 
          :key="player.name"
          class="lb-row"
          :style="{ animationDelay: (i * 0.1) + 's' }"
        >
          <span class="lb-rank">{{ i + 1 }}</span>
          <span class="lb-avatar">{{ player.avatar }}</span>
          <span class="lb-name">{{ player.name }}</span>
          <div class="lb-bar-container">
            <div 
              class="lb-bar"
              :style="{ width: getBarWidth(player.score) + '%' }"
            ></div>
          </div>
          <span class="lb-score">{{ player.score }}</span>
        </div>
      </div>
      <p class="next-hint">Siguiente pregunta en {{ countdown }}...</p>
    </div>

    <!-- FINISHED -->
    <div v-if="gameStore.isFinished" class="finished-screen">
      <FinalLeaderboard :leaderboard="gameStore.finalResults?.leaderboard" />
      <button class="btn btn-primary" @click="goHome">
        Jugar de Nuevo
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
const timerInterval = ref(null)
const countdownInterval = ref(null)

const timerPercentage = computed(() => {
  if (!gameStore.currentQuestion) return 100
  return (gameStore.timeLeft / gameStore.currentQuestion.timeLimit) * 100
})

const timerBarClass = computed(() => {
  if (gameStore.timeLeft <= 5) return 'urgent'
  if (gameStore.timeLeft <= 10) return 'warning'
  return ''
})

const feedbackClass = computed(() => 
  gameStore.answerResult?.correct ? 'correct' : 'wrong'
)

const correctOptionText = computed(() => {
  if (!gameStore.currentQuestion || gameStore.answerResult?.correctAnswer === undefined) return ''
  return gameStore.currentQuestion.options[gameStore.answerResult.correctAnswer]
})

function getBarWidth(score) {
  const max = Math.max(...gameStore.leaderboard.map(p => p.score), 1)
  return (score / max) * 100
}

function getOptionClass(index) {
  if (!gameStore.hasAnswered) return ''
  if (gameStore.answerResult?.correct && index === gameStore.answerResult.correctAnswer) {
    return 'correct-answer'
  }
  if (!gameStore.answerResult?.correct && index === gameStore.answerResult?.selectedOption) {
    return 'wrong-answer'
  }
  if (index === gameStore.answerResult?.correctAnswer) {
    return 'correct-answer'
  }
  return 'disabled'
}

onMounted(() => {
  socketStore.connect()

  // Re-join if disconnected
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
  if (timerInterval.value) clearInterval(timerInterval.value)
  if (countdownInterval.value) clearInterval(countdownInterval.value)
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

  timerInterval.value = setInterval(() => {
    if (gameStore.timeLeft > 0 && !gameStore.hasAnswered) {
      gameStore.setTimeLeft(gameStore.timeLeft - 1)
    } else {
      clearInterval(timerInterval.value)
    }
  }, 1000)
}

function startCountdown() {
  clearIntervals()
  countdownInterval.value = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(countdownInterval.value)
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
.play-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* WAITING */
.waiting-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
}

.waiting-content {
  text-align: center;
  color: white;
}

.waiting-avatar {
  font-size: 5rem;
  margin-bottom: 1rem;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.waiting-content h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.waiting-content p {
  opacity: 0.8;
  margin-bottom: 2rem;
}

.waiting-players {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.wp-item {
  font-size: 2rem;
  animation: popIn 0.3s ease;
}

@keyframes popIn {
  0% { transform: scale(0); }
  80% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* GAME SCREEN */
.game-screen {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.timer-bar-container {
  position: relative;
  width: 100%;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.timer-bar {
  height: 100%;
  background: linear-gradient(90deg, #4facfe, #00f2fe);
  border-radius: 4px;
  transition: width 1s linear;
}

.timer-bar.warning {
  background: linear-gradient(90deg, #f093fb, #f5576c);
}

.timer-bar.urgent {
  background: linear-gradient(90deg, #f5576c, #ff0844);
}

.timer-text {
  position: absolute;
  right: 0;
  top: -25px;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
}

.question-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.question-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.q-category {
  color: #4facfe;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.q-progress {
  color: rgba(255,255,255,0.6);
  font-size: 0.9rem;
}

.question-text {
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 2rem;
  line-height: 1.4;
  text-align: center;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  flex: 1;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border: 3px solid rgba(255,255,255,0.2);
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  font-size: 1.1rem;
  text-align: left;
}

.option-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.4);
  transform: translateY(-2px);
}

.option-btn:active:not(:disabled) {
  transform: translateY(0);
}

.opt-shape {
  width: 45px;
  height: 45px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.shape-0 { background: linear-gradient(135deg, #ff6b6b, #ee5a5a); }
.shape-1 { background: linear-gradient(135deg, #4ecdc4, #44a08d); }
.shape-2 { background: linear-gradient(135deg, #ffe66d, #f7d794); color: #333; }
.shape-3 { background: linear-gradient(135deg, #a29bfe, #6c5ce7); }

.opt-label {
  flex: 1;
  font-weight: 600;
}

.option-btn.correct-answer {
  border-color: #4facfe;
  background: linear-gradient(135deg, #4facfe30, #00f2fe30);
  animation: correctPulse 0.5s ease;
}

.option-btn.wrong-answer {
  border-color: #f5576c;
  background: linear-gradient(135deg, #f5576c30, #f093fb30);
  animation: shake 0.5s ease;
}

.option-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@keyframes correctPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

/* ANSWER FEEDBACK */
.answer-feedback {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 2rem;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: white;
  font-weight: 600;
  animation: slideUp 0.3s ease;
  z-index: 100;
}

.answer-feedback.correct {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.answer-feedback.wrong {
  background: linear-gradient(135deg, #f5576c, #f093fb);
}

@keyframes slideUp {
  from { transform: translateX(-50%) translateY(100px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

.feedback-icon {
  font-size: 1.5rem;
}

.feedback-score {
  font-weight: 900;
  font-size: 1.1rem;
}

/* LEADERBOARD */
.leaderboard-screen {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: white;
}

.leaderboard-screen h2 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #ffd700;
}

.lb-animation {
  width: 100%;
  max-width: 600px;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  margin-bottom: 0.5rem;
  animation: slideIn 0.5s ease forwards;
  opacity: 0;
  transform: translateX(-50px);
}

@keyframes slideIn {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.lb-row:nth-child(1) { background: linear-gradient(135deg, #ffd70020, #ffb70020); border: 1px solid #ffd70040; }
.lb-row:nth-child(2) { background: linear-gradient(135deg, #c0c0c020, #a0a0a020); border: 1px solid #c0c0c040; }
.lb-row:nth-child(3) { background: linear-gradient(135deg, #cd7f3220, #b8733320); border: 1px solid #cd7f3240; }

.lb-rank {
  font-weight: 900;
  font-size: 1.2rem;
  width: 30px;
  color: #ffd700;
}

.lb-avatar {
  font-size: 1.5rem;
}

.lb-name {
  flex: 1;
  font-weight: 600;
}

.lb-bar-container {
  width: 100px;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.lb-bar {
  height: 100%;
  background: linear-gradient(90deg, #4facfe, #00f2fe);
  border-radius: 4px;
  transition: width 1s ease;
}

.lb-score {
  font-weight: 900;
  font-size: 1.1rem;
  color: #4facfe;
}

.next-hint {
  margin-top: 2rem;
  color: rgba(255,255,255,0.6);
  font-size: 1.1rem;
}

/* FINISHED */
.finished-screen {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

@media (max-width: 600px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
  .question-text {
    font-size: 1.2rem;
  }
  .option-btn {
    padding: 1rem;
    font-size: 1rem;
  }
}
</style>
