<template>
  <div class="host-container">
    <header class="host-header">
      <div class="logo-section">
        <img src="/img/logo.png" alt="MANTIS" class="host-logo" />
        <span class="logo-text">MANTIS</span>
      </div>
      <div class="header-actions">
        <button class="btn-exit" @click="exitGame">
          <span class="material-icons">close</span>
        </button>
      </div>
    </header>

    <div v-if="gameStore.isWaiting" class="lobby-view">
      <div class="lobby-card">
        <div class="session-info">
          <h1 class="session-title">{{ sessionTitle || 'Sala de Control' }}</h1>
          <div class="code-section">
            <label>Codigo de Sala</label>
            <div class="code-display" @click="copyCode">
              <span class="code-text">{{ gameStore.sessionCode }}</span>
              <button class="btn-copy" :class="{ 'copied': copied }">
                <span class="material-icons">{{ copied ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
            <span v-if="copied" class="copy-feedback">Copiado al portapapeles!</span>
          </div>
          <div class="share-bar">
            <span class="share-label">Compartir:</span>
            <button class="btn-share-icon btn-whatsapp" @click="shareWhatsApp" title="WhatsApp">
              <img src="/img/whatsapp-icon.svg" alt="WA" />
            </button>
            <button class="btn-share-icon btn-telegram" @click="shareTelegram" title="Telegram">
              <img src="/img/telegram-icon.svg" alt="TG" />
            </button>
            <button class="btn-share-icon" @click="copyLink" title="Copiar link">
              <span class="material-icons">link</span>
            </button>
          </div>
          <div class="join-url"><code>{{ joinUrl }}</code></div>
        </div>

        <div class="players-section">
          <div class="players-header">
            <h2><span class="material-icons">group</span> Jugadores <span class="player-count">({{ gameStore.players.length }})</span></h2>
            <span v-if="gameStore.players.length === 0" class="waiting-text">Esperando jugadores...</span>
          </div>
          <div class="players-grid">
            <div v-for="player in gameStore.players" :key="player.socketId" class="player-chip" :class="{ 'disconnected': !player.connected }">
              <span class="player-avatar">{{ player.avatar }}</span>
              <span class="player-name">{{ player.name }}</span>
              <span v-if="!player.connected" class="status-dot offline"></span>
              <span v-else class="status-dot online"></span>
            </div>
          </div>
        </div>

        <div v-if="sessionData && sessionData.questions" class="questions-summary">
          <h2><span class="material-icons">quiz</span> Preguntas ({{ sessionData.questions.length }})</h2>
          <div class="questions-list">
            <div v-for="(q, i) in sessionData.questions" :key="i" class="question-preview">
              <span class="q-num">{{ i + 1 }}</span>
              <span class="q-text">{{ q.question }}</span>
              <span class="q-meta">{{ q.options.length }} opc · {{ q.timeLimit }}s</span>
            </div>
          </div>
        </div>

        <div class="start-section">
          <button class="btn-start" @click="startGame" :disabled="gameStore.players.length === 0 || isStarting">
            <span v-if="isStarting" class="spinner"></span>
            <span v-else class="material-icons">play_arrow</span>
            {{ isStarting ? 'Iniciando...' : 'Iniciar Partida' }}
          </button>
          <p v-if="gameStore.players.length === 0" class="start-hint">Comparte el codigo para que los jugadores se unan</p>
        </div>
      </div>
    </div>

    <div v-if="gameStore.isPlaying" class="game-view">
      <div class="game-header">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: ((gameStore.currentQuestionIndex + 1) / gameStore.totalQuestions * 100) + '%' }"></div>
        </div>
        <div class="game-meta">
          <span>Pregunta {{ gameStore.currentQuestionIndex + 1 }} / {{ gameStore.totalQuestions }}</span>
          <span class="timer">⏱️ {{ gameStore.timeLeft }}s</span>
        </div>
      </div>

      <div v-if="currentQuestionHost" class="question-display">
        <h2 class="question-text">{{ currentQuestionHost.question }}</h2>
        <div class="options-grid">
          <div v-for="(opt, i) in currentQuestionHost.options" :key="i" class="option-card" :class="{ 'correct': i === currentQuestionHost.correctAnswer }">
            <span class="opt-letter">{{ ['A','B','C','D','E','F'][i] }}</span>
            <span class="opt-text">{{ opt }}</span>
            <span v-if="i === currentQuestionHost.correctAnswer" class="correct-badge"><span class="material-icons">check_circle</span> Correcta</span>
          </div>
        </div>
      </div>

      <div class="live-stats">
        <div class="stat-card"><span class="stat-value">{{ answeredCount }}</span><span class="stat-label">Respondieron</span></div>
        <div class="stat-card"><span class="stat-value">{{ gameStore.players.length - answeredCount }}</span><span class="stat-label">Pendientes</span></div>
        <div class="stat-card"><span class="stat-value">{{ gameStore.players.length }}</span><span class="stat-label">Total</span></div>
      </div>

      <div v-if="gameStore.leaderboard.length > 0" class="live-leaderboard">
        <h3><span class="material-icons">emoji_events</span> Leaderboard en Vivo</h3>
        <div class="leaderboard-list">
          <div v-for="(player, i) in gameStore.leaderboard" :key="player.name" class="lb-row" :class="{ 'top3': i < 3 }">
            <span class="lb-rank">{{ i + 1 }}</span>
            <span class="lb-avatar">{{ player.avatar }}</span>
            <span class="lb-name">{{ player.name }}</span>
            <span class="lb-score">{{ player.score }}</span>
          </div>
        </div>
      </div>

      <div class="game-controls">
        <button class="btn-next" @click="nextQuestion" :disabled="!canAdvance">
          <span class="material-icons">skip_next</span> Siguiente Pregunta
        </button>
        <button class="btn-end" @click="endGame">
          <span class="material-icons">stop</span> Terminar Partida
        </button>
      </div>
    </div>

    <div v-if="gameStore.isFinished" class="results-view">
      <div class="results-card">
        <h1><span class="material-icons">emoji_events</span> Resultados Finales</h1>
        <div v-if="gameStore.finalResults" class="final-stats">
          <div class="stat-box"><span class="stat-num">{{ gameStore.finalResults.totalPlayers }}</span><span class="stat-desc">Jugadores</span></div>
          <div class="stat-box"><span class="stat-num">{{ gameStore.finalResults.totalQuestions }}</span><span class="stat-desc">Preguntas</span></div>
          <div class="stat-box"><span class="stat-num">{{ gameStore.finalResults.stats?.accuracy || 0 }}%</span><span class="stat-desc">Precision</span></div>
        </div>
        <div class="podium">
          <div v-for="(player, i) in gameStore.finalResults?.leaderboard?.slice(0, 3) || []" :key="player.name" class="podium-item" :class="'place-' + (i + 1)">
            <div class="podium-avatar">{{ player.avatar }}</div>
            <div class="podium-rank">{{ ['🥇','🥈','🥉'][i] }}</div>
            <div class="podium-name">{{ player.name }}</div>
            <div class="podium-score">{{ player.score }} pts</div>
          </div>
        </div>
        <div class="full-leaderboard">
          <h3>Ranking Completo</h3>
          <div v-for="(player, i) in gameStore.finalResults?.leaderboard || []" :key="player.name" class="lb-full-row">
            <span class="lb-full-rank">{{ i + 1 }}</span>
            <span class="lb-full-avatar">{{ player.avatar }}</span>
            <span class="lb-full-name">{{ player.name }}</span>
            <span class="lb-full-correct">{{ player.correctAnswers }}/{{ gameStore.totalQuestions }}</span>
            <span class="lb-full-score">{{ player.score }}</span>
          </div>
        </div>
        <div class="results-actions">
          <button class="btn-primary btn-large" @click="playAgain">
            <span class="material-icons">replay</span> Nueva Partida
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/game.js'
import { useSocketStore } from '../stores/socket.js'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const socketStore = useSocketStore()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const sessionData = ref(null)
const sessionTitle = ref('')
const isStarting = ref(false)
const copied = ref(false)
const answeredCount = ref(0)
const currentQuestionHost = ref(null)
const canAdvance = ref(false)

const joinUrl = computed(() => `${window.location.origin}/join?code=${gameStore.sessionCode}`)

onMounted(async () => {
  const code = route.params.sessionCode
  if (!code) { router.push('/admin'); return }
  gameStore.setSession(code, true)
  socketStore.connect()
  try {
    const res = await axios.get(`${API_URL}/api/sessions/${code}`)
    sessionData.value = res.data
    sessionTitle.value = res.data.title || 'Sala de Control'
  } catch (err) { console.error('Error fetching session:', err) }
  setTimeout(() => { socketStore.emit('host:join', { sessionCode: code }) }, 500)
  setupSocketListeners()
})

onUnmounted(() => {
  socketStore.off('host:joined')
  socketStore.off('players:update')
  socketStore.off('game:started')
  socketStore.off('question:host')
  socketStore.off('player:answered')
  socketStore.off('question:results')
  socketStore.off('leaderboard:show')
  socketStore.off('game:ended')
  socketStore.off('host:next:auto')
  socketStore.off('error')
})

function setupSocketListeners() {
  socketStore.on('host:joined', ({ session }) => { gameStore.setPlayers(session.players || []) })
  socketStore.on('players:update', (players) => { gameStore.setPlayers(players) })
  socketStore.on('game:started', ({ totalQuestions, players }) => {
    gameStore.setStatus('playing')
    gameStore.totalQuestions = totalQuestions
    gameStore.setPlayers(players)
    isStarting.value = false
    answeredCount.value = 0
  })
  socketStore.on('question:host', (question) => {
    currentQuestionHost.value = question
    gameStore.setQuestion(question, question.index, question.totalQuestions)
    answeredCount.value = 0
    canAdvance.value = false
    let timeLeft = question.timeLimit
    gameStore.setTimeLeft(timeLeft)
    const timer = setInterval(() => {
      timeLeft--
      gameStore.setTimeLeft(timeLeft)
      if (timeLeft <= 0) { clearInterval(timer); canAdvance.value = true }
    }, 1000)
  })
  socketStore.on('player:answered', ({ totalAnswered, totalPlayers }) => {
    answeredCount.value = totalAnswered
    if (totalAnswered >= totalPlayers) canAdvance.value = true
  })
  socketStore.on('question:results', () => { canAdvance.value = true })
  socketStore.on('leaderboard:show', ({ leaderboard }) => { gameStore.setLeaderboard(leaderboard) })
  socketStore.on('game:ended', ({ leaderboard, stats, totalQuestions }) => {
    gameStore.setFinalResults({ leaderboard, stats, totalQuestions })
  })
  socketStore.on('error', ({ message }) => { alert(message); isStarting.value = false })
}

function startGame() {
  if (gameStore.players.length === 0) return
  isStarting.value = true
  socketStore.emit('host:start', { sessionCode: gameStore.sessionCode })
}
function nextQuestion() { socketStore.emit('host:next', { sessionCode: gameStore.sessionCode }); canAdvance.value = false }
function endGame() { if (confirm('Terminar la partida?')) socketStore.emit('host:end', { sessionCode: gameStore.sessionCode }) }
function exitGame() { if (confirm('Salir de la sala?')) { gameStore.reset(); socketStore.disconnect(); router.push('/admin') } }
function playAgain() { gameStore.reset(); router.push('/admin') }
function copyCode() { navigator.clipboard.writeText(gameStore.sessionCode); copied.value = true; setTimeout(() => copied.value = false, 2000) }
function copyLink() { navigator.clipboard.writeText(joinUrl.value); copied.value = true; setTimeout(() => copied.value = false, 2000) }
function shareWhatsApp() {
  const text = encodeURIComponent(`🎮 Unete a mi partida en MANTIS!\n\nCodigo: *${gameStore.sessionCode}*\nTitulo: ${sessionTitle.value}\n\nEntra aqui: ${joinUrl.value}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}
function shareTelegram() {
  const text = encodeURIComponent(`🎮 Unete a mi partida en MANTIS!\n\nCodigo: ${gameStore.sessionCode}\nTitulo: ${sessionTitle.value}`)
  const url = encodeURIComponent(joinUrl.value)
  window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank')
}
</script>

<style scoped>
.host-container { min-height: 100vh; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%); color: #e0e0e0; }
.host-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1); }
.logo-section { display: flex; align-items: center; gap: 0.75rem; }
.host-logo { height: 36px; width: auto; }
.logo-text { font-size: 1.25rem; font-weight: 800; background: linear-gradient(135deg, #00d4aa, #00a8e8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-exit { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #e0e0e0; padding: 0.5rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.btn-exit:hover { background: rgba(255,50,50,0.2); border-color: rgba(255,50,50,0.4); color: #ff4444; }
.lobby-view { max-width: 800px; margin: 0 auto; padding: 2rem; }
.lobby-card { display: flex; flex-direction: column; gap: 2rem; }
.session-info { text-align: center; }
.session-title { font-size: 1.5rem; color: #fff; margin-bottom: 1.5rem; }
.code-section { margin-bottom: 1rem; }
.code-section label { display: block; color: #888; margin-bottom: 0.5rem; font-size: 0.9rem; }
.code-display { display: inline-flex; align-items: center; gap: 1rem; padding: 1rem 2rem; background: linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,168,232,0.15)); border: 2px solid rgba(0,212,170,0.4); border-radius: 16px; cursor: pointer; transition: all 0.2s; }
.code-display:hover { border-color: #00d4aa; box-shadow: 0 0 30px rgba(0,212,170,0.2); }
.code-text { font-size: 2.5rem; font-weight: 800; letter-spacing: 6px; color: #00d4aa; font-family: 'Courier New', monospace; }
.btn-copy { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 0.5rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.btn-copy:hover, .btn-copy.copied { background: rgba(0,212,170,0.2); border-color: #00d4aa; color: #00d4aa; }
.copy-feedback { display: block; margin-top: 0.5rem; color: #00d4aa; font-size: 0.9rem; }
.share-bar { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin: 1rem 0; }
.share-label { color: #888; font-size: 0.9rem; margin-right: 0.5rem; }
.btn-share-icon { width: 40px; height: 40px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-share-icon img { width: 20px; height: 20px; }
.btn-share-icon .material-icons { font-size: 20px; }
.btn-whatsapp { background: #25d366; color: #fff; }
.btn-whatsapp:hover { background: #1ebe57; transform: scale(1.1); }
.btn-telegram { background: #0088cc; color: #fff; }
.btn-telegram:hover { background: #0077b3; transform: scale(1.1); }
.btn-share-icon:not(.btn-whatsapp):not(.btn-telegram) { background: rgba(255,255,255,0.1); color: #ccc; }
.btn-share-icon:not(.btn-whatsapp):not(.btn-telegram):hover { background: rgba(255,255,255,0.2); color: #fff; }
.join-url { margin-top: 0.5rem; }
.join-url code { background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; color: #888; word-break: break-all; }
.players-section { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.5rem; }
.players-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.players-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; color: #fff; }
.player-count { color: #00d4aa; }
.waiting-text { color: #666; font-size: 0.9rem; }
.players-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.player-chip { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.2); border-radius: 20px; font-size: 0.9rem; }
.player-chip.disconnected { opacity: 0.5; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
.player-avatar { font-size: 1.2rem; }
.player-name { color: #ddd; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.online { background: #00d4aa; }
.status-dot.offline { background: #ff4444; }
.questions-summary { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.5rem; }
.questions-summary h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; color: #fff; margin-bottom: 1rem; }
.questions-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto; }
.question-preview { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; }
.q-num { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: rgba(0,168,232,0.2); color: #00a8e8; border-radius: 6px; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
.q-text { flex: 1; color: #ccc; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.q-meta { color: #666; font-size: 0.75rem; flex-shrink: 0; }
.start-section { text-align: center; padding: 1rem 0; }
.btn-start { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 3rem; background: linear-gradient(135deg, #00d4aa, #00a8e8); color: #0f0f1a; border: none; border-radius: 12px; font-size: 1.2rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-start:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 25px rgba(0,212,170,0.4); }
.btn-start:disabled { opacity: 0.4; cursor: not-allowed; }
.start-hint { margin-top: 0.75rem; color: #666; font-size: 0.9rem; }
.game-view { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
.game-header { margin-bottom: 1.5rem; }
.progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #00d4aa, #00a8e8); border-radius: 3px; transition: width 0.5s ease; }
.game-meta { display: flex; justify-content: space-between; color: #888; font-size: 0.9rem; }
.timer { color: #00d4aa; font-weight: 600; }
.question-display { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; }
.question-text { font-size: 1.5rem; color: #fff; margin-bottom: 1.5rem; text-align: center; }
.options-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.option-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; transition: all 0.2s; }
.option-card.correct { border-color: #00d4aa; background: rgba(0,212,170,0.1); }
.opt-letter { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); border-radius: 8px; font-weight: 700; color: #888; flex-shrink: 0; }
.option-card.correct .opt-letter { background: #00d4aa; color: #0f0f1a; }
.opt-text { flex: 1; color: #ddd; }
.correct-badge { display: flex; align-items: center; gap: 0.25rem; padding: 0.3rem 0.6rem; background: rgba(0,212,170,0.2); color: #00d4aa; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
.live-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem; text-align: center; }
.stat-value { display: block; font-size: 1.75rem; font-weight: 700; color: #00d4aa; }
.stat-label { color: #888; font-size: 0.8rem; }
.live-leaderboard { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; }
.live-leaderboard h3 { display: flex; align-items: center; gap: 0.5rem; color: #fff; margin-bottom: 1rem; font-size: 1.1rem; }
.leaderboard-list { display: flex; flex-direction: column; gap: 0.4rem; }
.lb-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; }
.lb-row.top3 { background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.2); }
.lb-rank { width: 28px; text-align: center; font-weight: 700; color: #888; }
.lb-avatar { font-size: 1.3rem; }
.lb-name { flex: 1; color: #ddd; }
.lb-score { font-weight: 700; color: #00d4aa; }
.game-controls { display: flex; gap: 1rem; justify-content: center; }
.btn-next { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #00d4aa, #00a8e8); color: #0f0f1a; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-next:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,212,170,0.3); }
.btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-end { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: rgba(255,50,50,0.15); color: #ff6b6b; border: 1px solid rgba(255,50,50,0.3); border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-end:hover { background: rgba(255,50,50,0.25); }
.results-view { max-width: 700px; margin: 0 auto; padding: 2rem; }
.results-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2rem; }
.results-card h1 { display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #fff; margin-bottom: 1.5rem; font-size: 1.75rem; }
.final-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
.stat-box { text-align: center; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px; }
.stat-num { display: block; font-size: 2rem; font-weight: 800; color: #00d4aa; }
.stat-desc { color: #888; font-size: 0.85rem; }
.podium { display: flex; justify-content: center; align-items: flex-end; gap: 1rem; margin-bottom: 2rem; padding: 1rem 0; }
.podium-item { text-align: center; padding: 1rem; border-radius: 16px; min-width: 120px; }
.podium-item.place-1 { background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05)); border: 1px solid rgba(255,215,0,0.3); order: 2; transform: scale(1.1); }
.podium-item.place-2 { background: linear-gradient(135deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05)); border: 1px solid rgba(192,192,192,0.3); order: 1; }
.podium-item.place-3 { background: linear-gradient(135deg, rgba(205,127,50,0.15), rgba(205,127,50,0.05)); border: 1px solid rgba(205,127,50,0.3); order: 3; }
.podium-avatar { font-size: 2.5rem; margin-bottom: 0.5rem; }
.podium-rank { font-size: 1.5rem; margin-bottom: 0.25rem; }
.podium-name { font-weight: 600; color: #fff; margin-bottom: 0.25rem; }
.podium-score { color: #00d4aa; font-weight: 700; }
.full-leaderboard { margin-bottom: 2rem; }
.full-leaderboard h3 { color: #ccc; margin-bottom: 1rem; font-size: 1rem; }
.lb-full-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 0.4rem; }
.lb-full-rank { width: 28px; text-align: center; font-weight: 700; color: #888; }
.lb-full-avatar { font-size: 1.2rem; }
.lb-full-name { flex: 1; color: #ddd; }
.lb-full-correct { color: #888; font-size: 0.85rem; }
.lb-full-score { font-weight: 700; color: #00d4aa; min-width: 60px; text-align: right; }
.results-actions { text-align: center; }
.btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #00d4aa, #00a8e8); color: #0f0f1a; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,212,170,0.3); }
.btn-large { padding: 1rem 2rem; font-size: 1.1rem; }
.spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(15,15,26,0.3); border-top-color: #0f0f1a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .lobby-view, .game-view, .results-view { padding: 1rem; }
  .code-text { font-size: 1.75rem; letter-spacing: 3px; }
  .options-grid { grid-template-columns: 1fr; }
  .live-stats { grid-template-columns: 1fr; }
  .podium { flex-direction: column; align-items: center; }
  .podium-item.place-1 { order: 1; transform: none; }
  .podium-item.place-2 { order: 2; }
  .podium-item.place-3 { order: 3; }
  .game-controls { flex-direction: column; }
}
</style>
