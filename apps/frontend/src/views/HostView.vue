<template>
  <div class="host-view">
    <!-- LOBBY: Esperando jugadores -->
    <div v-if="gameStore.isWaiting" class="host-lobby">
      <div class="lobby-header">
        <h1>👑 Sala de Control</h1>
        <div class="room-code">
          <span class="code-label">CÓDIGO DE SALA</span>
          <span class="code-value">{{ gameStore.sessionCode }}</span>
          <button class="copy-btn" @click="copyCode">📋</button>
        </div>
      </div>

      <div class="lobby-content">
        <div class="players-section">
          <h2>Jugadores Conectados ({{ gameStore.players.length }})</h2>
          <div class="players-grid">
            <div 
              v-for="player in gameStore.players" 
              :key="player.socketId"
              class="player-card"
              :class="{ disconnected: !player.connected }"
            >
              <span class="player-avatar">{{ player.avatar }}</span>
              <span class="player-name">{{ player.name }}</span>
              <span v-if="!player.connected" class="player-status">desconectado</span>
            </div>
            <div v-if="gameStore.players.length === 0" class="no-players">
              Esperando jugadores...
            </div>
          </div>
        </div>

        <div class="questions-section">
          <h2>Preguntas ({{ selectedQuestions.length }})</h2>
          <div class="question-list">
            <div 
              v-for="(q, i) in selectedQuestions" 
              :key="q._id"
              class="question-item"
            >
              <span class="q-number">{{ i + 1 }}</span>
              <span class="q-text">{{ q.question }}</span>
              <span class="q-time">{{ q.timeLimit }}s</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lobby-actions">
        <button 
          class="btn btn-success btn-lg"
          :disabled="gameStore.players.length === 0 || selectedQuestions.length === 0"
          @click="startGame"
        >
          🚀 Iniciar Juego
        </button>
        <button class="btn btn-danger" @click="endSession">
          ✕ Cerrar Sala
        </button>
      </div>
    </div>

    <!-- PLAYING: Juego en curso -->
    <div v-if="gameStore.isPlaying" class="host-game">
      <div class="game-header">
        <div class="question-counter">
          Pregunta {{ gameStore.currentQuestionIndex + 1 }} / {{ gameStore.totalQuestions }}
        </div>
        <div class="timer-display" :class="timerClass">
          ⏱️ {{ gameStore.timeLeft }}s
        </div>
      </div>

      <div class="host-question">
        <h2>{{ gameStore.currentQuestion?.question }}</h2>
        <div class="options-preview">
          <div 
            v-for="(opt, i) in gameStore.currentQuestion?.options" 
            :key="i"
            class="option-preview"
            :class="{ correct: i === correctAnswerIndex }"
          >
            <span class="opt-letter">{{ ['A','B','C','D'][i] }}</span>
            <span class="opt-text">{{ opt }}</span>
            <span v-if="i === correctAnswerIndex" class="opt-check">✓</span>
          </div>
        </div>
      </div>

      <div class="answer-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ width: answerProgress + '%' }"
          ></div>
        </div>
        <span>{{ answeredCount }} / {{ gameStore.players.length }} respondieron</span>
      </div>

      <div class="live-leaderboard">
        <h3>🏆 Leaderboard en Vivo</h3>
        <div class="lb-list">
          <div 
            v-for="(player, i) in gameStore.leaderboard" 
            :key="player.name"
            class="lb-item"
            :class="{ top3: i < 3 }"
          >
            <span class="lb-rank">{{ i + 1 }}</span>
            <span class="lb-avatar">{{ player.avatar }}</span>
            <span class="lb-name">{{ player.name }}</span>
            <span class="lb-score">{{ player.score }}</span>
          </div>
        </div>
      </div>

      <div class="host-controls">
        <button class="btn btn-primary" @click="nextQuestion">
          Siguiente ➜
        </button>
        <button class="btn btn-danger" @click="endGame">
          Terminar Juego
        </button>
      </div>
    </div>

    <!-- FINISHED: Resultados finales -->
    <div v-if="gameStore.isFinished" class="host-finished">
      <h1>🎉 Juego Terminado</h1>
      <FinalLeaderboard :leaderboard="gameStore.finalResults?.leaderboard" />
      <button class="btn btn-primary" @click="goHome">
        Nueva Partida
      </button>
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
  if (gameStore.timeLeft <= 5) return 'urgent'
  if (gameStore.timeLeft <= 10) return 'warning'
  return ''
})

const answerProgress = computed(() => {
  if (gameStore.players.length === 0) return 0
  return (answeredCount.value / gameStore.players.length) * 100
})

onMounted(async () => {
  socketStore.connect()

  // If no session code, create one
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
    // Fetch all questions and create session with all of them
    const res = await axios.get('/api/questions')
    const questions = res.data
    selectedQuestions.value = questions

    const sessionRes = await axios.post('/api/sessions/create', {
      hostId: socketStore.socket?.id || 'host-' + Date.now(),
      questionIds: questions.map(q => q._id),
      settings: {
        timePerQuestion: 20,
        showLeaderboard: true,
        allowLateJoin: false
      }
    })

    gameStore.setSession(sessionRes.data.code, true)
    selectedQuestions.value = sessionRes.data.questions

    // Update URL without navigation
    router.replace(`/host/${sessionRes.data.code}`)

    joinAsHost()
  } catch (error) {
    console.error('Error creating session:', error)
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

<style scoped>
.host-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

/* LOBBY */
.host-lobby {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.lobby-header {
  text-align: center;
  margin-bottom: 2rem;
}

.lobby-header h1 {
  color: #667eea;
  margin-bottom: 1rem;
}

.room-code {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 1rem 2rem;
  border-radius: 15px;
}

.code-label {
  font-size: 0.8rem;
  opacity: 0.8;
}

.code-value {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 0.3rem;
}

.copy-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
}

.lobby-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.players-section h2,
.questions-section h2 {
  color: #555;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.player-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.player-card.disconnected {
  opacity: 0.5;
}

.player-avatar {
  font-size: 2rem;
}

.player-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #333;
}

.player-status {
  font-size: 0.7rem;
  color: #f5576c;
}

.no-players {
  grid-column: 1 / -1;
  text-align: center;
  color: #888;
  padding: 2rem;
}

.question-list {
  max-height: 300px;
  overflow-y: auto;
}

.question-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 10px;
  margin-bottom: 0.5rem;
}

.q-number {
  background: #667eea;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.q-text {
  flex: 1;
  font-size: 0.85rem;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.q-time {
  font-size: 0.8rem;
  color: #888;
  flex-shrink: 0;
}

.lobby-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* PLAYING */
.host-game {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.question-counter {
  font-size: 1.1rem;
  color: #667eea;
  font-weight: 700;
}

.timer-display {
  font-size: 1.5rem;
  font-weight: 900;
  color: #4facfe;
  background: linear-gradient(135deg, #4facfe20, #00f2fe20);
  padding: 0.5rem 1rem;
  border-radius: 10px;
}

.timer-display.warning {
  color: #f093fb;
  background: linear-gradient(135deg, #f093fb20, #f5576c20);
}

.timer-display.urgent {
  color: #f5576c;
  background: linear-gradient(135deg, #f5576c20, #f093fb20);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.host-question {
  background: linear-gradient(135deg, #667eea10, #764ba210);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.host-question h2 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.options-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.option-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  border: 2px solid #e0e0e0;
}

.option-preview.correct {
  border-color: #4facfe;
  background: linear-gradient(135deg, #4facfe10, #00f2fe10);
}

.opt-letter {
  background: #667eea;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.opt-text {
  flex: 1;
  font-size: 0.95rem;
}

.opt-check {
  color: #4facfe;
  font-size: 1.2rem;
  font-weight: 700;
}

.answer-progress {
  margin-bottom: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.live-leaderboard {
  background: #f8f9fa;
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.live-leaderboard h3 {
  color: #667eea;
  margin-bottom: 1rem;
}

.lb-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lb-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 10px;
}

.lb-item.top3 {
  background: linear-gradient(135deg, #ffd70015, #ffb70015);
  border: 1px solid #ffd70030;
}

.lb-rank {
  font-weight: 900;
  color: #667eea;
  width: 24px;
}

.lb-avatar {
  font-size: 1.5rem;
}

.lb-name {
  flex: 1;
  font-weight: 600;
}

.lb-score {
  font-weight: 900;
  color: #667eea;
  font-size: 1.1rem;
}

.host-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* FINISHED */
.host-finished {
  text-align: center;
  padding: 2rem;
}

.host-finished h1 {
  color: #667eea;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .lobby-content {
    grid-template-columns: 1fr;
  }
  .options-preview {
    grid-template-columns: 1fr;
  }
  .room-code {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
