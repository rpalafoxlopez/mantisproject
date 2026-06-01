<template>
  <div class="host-container">
    <header class="host-header">
      <div class="logo-section">
        <img src="/img/quizhive.png" alt="QuizHive" class="host-logo" />
        <span class="logo-text">QuizHive</span>
      </div>
      <div class="header-actions">
        <button class="btn-exit" @click="exitGame">
          <span class="material-icons">close</span>
        </button>
      </div>
    </header>

    <!-- DASHBOARD DEL HOST -->
    <div v-if="!showFinalResults" class="lobby-view">
      <div class="lobby-card">
        <div class="session-info">
          <h1 class="session-title">{{ sessionTitle || 'Sala de Control' }}</h1>
          <div class="code-section">
            <label>Código de Sala</label>
            <div class="code-display" @click="copyCode">
              <span class="code-text">{{ sessionCode }}</span>
              <button class="btn-copy" :class="{ 'copied': copied }">
                <span class="material-icons">{{ copied ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
            <span v-if="copied" class="copy-feedback">¡Copiado!</span>
          </div>
          <div class="share-bar">
            <span class="share-label">Compartir:</span>
            <button class="btn-share-icon btn-whatsapp" @click="shareWhatsApp" title="WhatsApp">
              <span class="material-icons">whatsapp</span>
            </button>
            <button class="btn-share-icon btn-telegram" @click="shareTelegram" title="Telegram">
              <span class="material-icons">telegram</span>
            </button>
            <button class="btn-share-icon" @click="copyLink" title="Copiar link">
              <span class="material-icons">link</span>
            </button>
          </div>
          <div class="join-url"><code>{{ joinUrl }}</code></div>
        </div>

        <!-- ESTADÍSTICAS EN VIVO -->
        <div class="live-stats-host">
          <div class="stat-card">
            <span class="stat-value">{{ players.length }}</span>
            <span class="stat-label">Jugadores</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ totalAnswered }}</span>
            <span class="stat-label">Respuestas totales</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ avgProgress }}%</span>
            <span class="stat-label">Progreso promedio</span>
          </div>
        </div>

        <!-- LISTA DE JUGADORES CON PROGRESO -->
        <div class="players-section">
          <div class="players-header">
            <h2><span class="material-icons">group</span> Jugadores ({{ players.length }})</h2>
          </div>
          <div class="players-table">
            <div class="table-header">
              <span>#</span>
              <span>Nombre</span>
              <span>Progreso</span>
              <span>Puntaje</span>
            </div>
            <!-- ═══════════════════════════════════════════════════════ -->
            <!-- ✅ FIX 3: Key única con índice + score para forzar re-render -->
            <!-- ═══════════════════════════════════════════════════════ -->
            <div
              v-for="(player, i) in sortedPlayers"
              :key="player.name + '-' + i + '-' + player.score"
              class="player-row"
              :class="{ 'top3': i < 3 }"
            >
              <span class="row-rank">{{ i + 1 }}</span>
              <span class="row-name">{{ player.name }}</span>
              <span class="row-progress">
                <div class="progress-bar-mini">
                  <div class="progress-fill-mini" :style="{ width: (player.totalAnswered / questionCount * 100) + '%' }"></div>
                </div>
                <span class="progress-text">{{ player.totalAnswered }}/{{ questionCount }}</span>
              </span>
              <span class="row-score">{{ player.score }}</span>
            </div>
          </div>
        </div>

        <!-- 🆕 NUEVO: Analytics de puntajes -->
        <ScoreAnalytics 
          :players="players"
          :total-questions="questionCount"
          :score-history="scoreHistory"
        />

        <!-- PREGUNTAS DEL QUIZ -->
        <div v-if="questions.length" class="questions-section">
          <h2><span class="material-icons">quiz</span> Preguntas ({{ questions.length }})</h2>
          <div class="questions-list">
            <div v-for="(q, i) in questions" :key="i" class="question-item">
              <span class="q-num">{{ i + 1 }}</span>
              <span class="q-text">{{ q.text }}</span>
              <span class="q-meta">{{ q.options.length }} opciones</span>
            </div>
          </div>
        </div>

        <!-- CONTROLES -->
        <div class="controls-section">
          <button class="btn-end-quiz" @click="endQuiz">
            <span class="material-icons">stop</span>
            Cerrar Quiz y Ver Resultados
          </button>
          <p class="hint">Los jugadores podrán seguir respondiendo hasta que cierres el quiz.</p>
        </div>
      </div>
    </div>

    <!-- RESULTADOS FINALES -->
    <div v-else class="final-results-view">
      <div class="results-card">
        <h1><span class="material-icons">emoji_events</span> Resultados Finales</h1>
        <h2>{{ sessionTitle }}</h2>

        <div class="final-stats">
          <div class="stat-box">
            <span class="stat-num">{{ finalResults.totalPlayers }}</span>
            <span class="stat-desc">Jugadores</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ finalResults.totalQuestions }}</span>
            <span class="stat-desc">Preguntas</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ totalResponses }}</span>
            <span class="stat-desc">Respuestas totales</span>
          </div>
        </div>

        <!-- PODIUM TOP 3 -->
        <div class="podium" v-if="finalResults.leaderboard.length >= 3">
          <div
            v-for="(player, i) in finalResults.leaderboard.slice(0, 3)"
            :key="player.name"
            class="podium-item"
            :class="'place-' + (i + 1)"
          >
            <div class="podium-rank">{{ ['🥇','🥈','🥉'][i] }}</div>
            <div class="podium-name">{{ player.name }}</div>
            <div class="podium-score">{{ player.score }} pts</div>
            <div class="podium-detail">{{ player.correctCount }}/{{ finalResults.totalQuestions }} correctas</div>
          </div>
        </div>

        <!-- TOP 10 COMPLETO -->
        <div class="top10-section">
          <h3>Top 10 Ranking</h3>
          <div class="top10-list">
            <div
              v-for="(player, i) in finalResults.leaderboard"
              :key="player.name"
              class="top10-row"
            >
              <span class="top10-rank">{{ i + 1 }}</span>
              <span class="top10-name">{{ player.name }}</span>
              <span class="top10-correct">{{ player.correctCount }}/{{ finalResults.totalQuestions }}</span>
              <span class="top10-score">{{ player.score }} pts</span>
            </div>
          </div>
        </div>

        <div class="results-actions">
          <button class="btn-primary btn-large" @click="playAgain">
            <span class="material-icons">replay</span> Nuevo Quiz
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import axios from 'axios'
import ScoreAnalytics from './ScoreAnalytics.vue'

const route = useRoute()
const router = useRouter()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ========== VARIABLES DECLARADAS ==========
const sessionCode = ref('')
const sessionTitle = ref('')
const questions = ref([])
const questionCount = ref(0)
const players = ref([])
const scoreHistory = ref([])
const copied = ref(false)
const showFinalResults = ref(false)
const finalResults = ref({ 
  leaderboard: [], 
  totalPlayers: 0, 
  totalQuestions: 0 
})
const socket = ref(null)

// ========== COMPUTEDS ==========
const joinUrl = computed(() => `${window.location.origin}/join?code=${sessionCode.value}`)

const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => (b.score || 0) - (a.score || 0))
})

const totalAnswered = computed(() => {
  return players.value.reduce((sum, p) => sum + (p.totalAnswered || 0), 0)
})

const avgProgress = computed(() => {
  if (!players.value.length || !questionCount.value) return 0
  const total = players.value.reduce((sum, p) => sum + (p.totalAnswered || 0), 0)
  return Math.round((total / (players.value.length * questionCount.value)) * 100)
})

const totalResponses = computed(() => {
  return finalResults.value.leaderboard.reduce((sum, p) => sum + (p.totalAnswered || 0), 0)
})

// ========== LIFE CYCLE ==========
onMounted(async () => {
  const code = route.params.sessionCode || route.query.code
  if (!code) { 
    router.push('/admin')
    return
  }

  sessionCode.value = code

  // Cargar datos iniciales
  try {
    const res = await axios.get(`${API_URL}/api/sessions/${code}`)
    sessionTitle.value = res.data.title || 'Quiz'
    questions.value = res.data.questions || []
    questionCount.value = res.data.questions?.length || 0
    players.value = res.data.players || []
  } catch (err) {
    console.error('Error fetching session:', err)
  }

  // Conectar socket
  socket.value = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true
  })

  socket.value.on('connect', () => {
    console.log('✅ Host conectado al socket')
    socket.value.emit('host:join', { code })
  })

  socket.value.on('host:joined', ({ title, questionCount: qc, players: p }) => {
    console.log('✅ Host unido a la sala:', title)
    sessionTitle.value = title
    questionCount.value = qc
    players.value = p || []
  })

  // ═══════════════════════════════════════════════════════
  // ✅ FIX 3: Agregar console.log para debuggear players:update
  // ═══════════════════════════════════════════════════════
  socket.value.on('players:update', ({ players: p }) => {
    console.log('📥 players:update recibido:', p?.length, 'jugadores', p)

    // Guardar snapshot para historial (necesario para gráficos)
    if (p && p.length > 0) {
      scoreHistory.value.push({
        timestamp: Date.now(),
        players: JSON.parse(JSON.stringify(p))
      })

      // Mantener solo últimas 30 actualizaciones
      if (scoreHistory.value.length > 30) scoreHistory.value.shift()
    }

    // Actualizar lista de jugadores
    players.value = p || []
  })

  socket.value.on('quiz:finalResults', ({ title, leaderboard, totalQuestions, totalPlayers }) => {
    finalResults.value = { 
      title, 
      leaderboard: leaderboard || [], 
      totalQuestions, 
      totalPlayers 
    }
    showFinalResults.value = true
  })

  socket.value.on('error', ({ message }) => {
    console.error('Socket error:', message)
    alert(message)
  })
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})

// ========== MÉTODOS ==========
function endQuiz() {
  if (!confirm('¿Cerrar el quiz? Los jugadores no podrán enviar más respuestas.')) return
  socket.value.emit('host:end', { code: sessionCode.value })
}

function exitGame() {
  if (confirm('¿Salir de la sala?')) {
    if (socket.value) socket.value.disconnect()
    router.push('/admin')
  }
}

function playAgain() {
  showFinalResults.value = false
  finalResults.value = { leaderboard: [], totalPlayers: 0, totalQuestions: 0 }
  router.push('/admin')
}

function copyCode() {
  navigator.clipboard.writeText(sessionCode.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function copyLink() {
  navigator.clipboard.writeText(joinUrl.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function shareWhatsApp() {
  const text = encodeURIComponent(`🎮 ¡Únete a mi quiz en QuizHive!

Código: *${sessionCode.value}*
Título: ${sessionTitle.value}

${joinUrl.value}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

function shareTelegram() {
  const text = encodeURIComponent(`🎮 ¡Únete a mi quiz en QuizHive!

Código: ${sessionCode.value}
Título: ${sessionTitle.value}`)
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
.lobby-view { max-width: 1200px; margin: 0 auto; padding: 2rem; }
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

.live-stats-host { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem; text-align: center; }
.stat-value { display: block; font-size: 1.75rem; font-weight: 700; color: #00d4aa; }
.stat-label { color: #888; font-size: 0.8rem; }

.players-section { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.5rem; }
.players-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.players-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; color: #fff; }
.players-table { display: flex; flex-direction: column; gap: 0.4rem; }
.table-header { display: grid; grid-template-columns: 40px 1fr 150px 60px; gap: 0.75rem; padding: 0.5rem 0.75rem; color: #888; font-size: 0.8rem; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.1); }
.player-row { display: grid; grid-template-columns: 40px 1fr 150px 60px; gap: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; align-items: center; }
.player-row.top3 { background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.2); }
.row-rank { font-weight: 700; color: #888; }
.row-name { color: #ddd; font-weight: 500; }
.row-progress { display: flex; align-items: center; gap: 0.5rem; }
.progress-bar-mini { width: 80px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.progress-fill-mini { height: 100%; background: linear-gradient(90deg, #00d4aa, #00a8e8); border-radius: 3px; transition: width 0.5s ease; }
.progress-text { color: #888; font-size: 0.75rem; }
.row-score { font-weight: 700; color: #00d4aa; text-align: right; }

.questions-section { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.5rem; }
.questions-section h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; color: #fff; margin-bottom: 1rem; }
.questions-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto; }
.question-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; }
.q-num { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: rgba(0,168,232,0.2); color: #00a8e8; border-radius: 6px; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
.q-text { flex: 1; color: #ccc; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.q-meta { color: #666; font-size: 0.75rem; flex-shrink: 0; }

.controls-section { text-align: center; padding: 1rem 0; }
.btn-end-quiz { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: linear-gradient(135deg, #ff4444, #cc0000); color: #fff; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-end-quiz:hover { transform: translateY(-2px); box-shadow: 0 4px 25px rgba(255,68,68,0.4); }
.hint { margin-top: 0.75rem; color: #666; font-size: 0.85rem; }

.final-results-view { max-width: 800px; margin: 0 auto; padding: 2rem; }
.results-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2rem; }
.results-card h1 { display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #fff; margin-bottom: 0.5rem; font-size: 1.75rem; }
.results-card h2 { text-align: center; color: #00d4aa; margin-bottom: 1.5rem; font-size: 1.2rem; }
.final-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
.stat-box { text-align: center; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px; }
.stat-num { display: block; font-size: 2rem; font-weight: 800; color: #00d4aa; }
.stat-desc { color: #888; font-size: 0.85rem; }
.podium { display: flex; justify-content: center; align-items: flex-end; gap: 1rem; margin-bottom: 2rem; padding: 1rem 0; }
.podium-item { text-align: center; padding: 1rem; border-radius: 16px; min-width: 140px; }
.podium-item.place-1 { background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05)); border: 1px solid rgba(255,215,0,0.3); order: 2; transform: scale(1.1); }
.podium-item.place-2 { background: linear-gradient(135deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05)); border: 1px solid rgba(192,192,192,0.3); order: 1; }
.podium-item.place-3 { background: linear-gradient(135deg, rgba(205,127,50,0.15), rgba(205,127,50,0.05)); border: 1px solid rgba(205,127,50,0.3); order: 3; }
.podium-rank { font-size: 2rem; margin-bottom: 0.5rem; }
.podium-name { font-weight: 700; color: #fff; margin-bottom: 0.25rem; }
.podium-score { color: #00d4aa; font-weight: 700; font-size: 1.1rem; }
.podium-detail { color: #888; font-size: 0.8rem; }
.top10-section { margin-bottom: 2rem; }
.top10-section h3 { color: #ccc; margin-bottom: 1rem; font-size: 1rem; text-align: center; }
.top10-list { display: flex; flex-direction: column; gap: 0.4rem; max-width: 500px; margin: 0 auto; }
.top10-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; }
.top10-rank { width: 28px; text-align: center; font-weight: 700; color: #888; }
.top10-name { flex: 1; color: #ddd; }
.top10-correct { color: #888; font-size: 0.85rem; }
.top10-score { font-weight: 700; color: #00d4aa; min-width: 80px; text-align: right; }
.results-actions { text-align: center; }
.btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #00d4aa, #00a8e8); color: #0f0f1a; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,212,170,0.3); }
.btn-large { padding: 1rem 2rem; font-size: 1.1rem; }

@media (max-width: 768px) {
  .lobby-view, .final-results-view { padding: 1rem; }
  .code-text { font-size: 1.75rem; letter-spacing: 3px; }
  .live-stats-host { grid-template-columns: 1fr; }
  .table-header, .player-row { grid-template-columns: 30px 1fr 100px 50px; gap: 0.5rem; }
  .progress-bar-mini { width: 50px; }
  .podium { flex-direction: column; align-items: center; }
  .podium-item.place-1 { order: 1; transform: none; }
  .podium-item.place-2 { order: 2; }
  .podium-item.place-3 { order: 3; }
  .final-stats { grid-template-columns: 1fr; }
  .players-section, .questions-section { padding: 1rem; }
}
</style>