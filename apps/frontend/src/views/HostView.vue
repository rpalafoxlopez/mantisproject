<template>
  <div class="host-view">
    <header class="host-header">
      <router-link to="/dashboard" class="back-link">← Dashboard</router-link>
      <span class="logo">🐝 QuizHive</span>
    </header>

    <main class="host-main">
      <!-- JOIN FORM -->
      <section v-if="!joined" class="card join-card">
        <h2>🎮 Panel del Host</h2>
        <p class="subtitle">Ingresa el código de la partida que quieres iniciar.</p>
        <div class="field">
          <label>Código de la partida</label>
          <input v-model="joinCode" type="text" placeholder="Ej. ABC123" maxlength="6" @keyup.enter="joinAsHost" />
        </div>
        <button class="btn-primary" :disabled="joining || !joinCode.trim()" @click="joinAsHost">
          <span v-if="joining">Entrando…</span><span v-else>▶️ Entrar como Host</span>
        </button>
        <p v-if="joinError" class="error-msg">{{ joinError }}</p>
      </section>

      <!-- LOBBY -->
      <template v-else-if="status === 'waiting'">
        <section class="card lobby-card">
          <div class="lobby-top">
            <div>
              <h2>{{ title }}</h2>
              <p class="subtitle">Esperando jugadores…</p>
            </div>
            <div class="code-badge">{{ code }}</div>
          </div>

          <div class="players-area">
            <h3>Jugadores conectados ({{ players.length }})</h3>
            <div v-if="!players.length" class="empty-players">
              <p>Aún no hay jugadores. Comparte el código para que se unan.</p>
            </div>
            <div v-else class="player-list">
              <div v-for="p in players" :key="p.socketId" class="player-chip">
                <span class="player-avatar">{{ p.name.charAt(0).toUpperCase() }}</span>
                <span class="player-name">{{ p.name }}</span>
              </div>
            </div>
          </div>

          <div class="lobby-actions">
            <button class="btn-primary btn-large" :disabled="!players.length || !questionCount" @click="startGame">
              ▶️ Iniciar partida
            </button>
            <p v-if="!questionCount" class="warn-msg">⚠️ La partida no tiene preguntas. Ve al editor para agregarlas.</p>
          </div>
        </section>
      </template>

      <!-- GAME ACTIVE -->
      <template v-else-if="status === 'active'">
        <section class="card game-card">
          <div class="game-header">
            <span class="q-counter">Pregunta {{ currentQuestion + 1 }} / {{ totalQuestions }}</span>
            <div class="timer-bar">
              <div class="timer-fill" :style="{ width: timerPercent + '%' }"></div>
            </div>
          </div>

          <div class="question-area">
            <h2 class="q-text">{{ questionText }}</h2>
            <div class="options-grid">
              <div v-for="(opt, i) in questionOptions" :key="i" class="option-box" :class="{ correct: showResults && i === correctIndex, wrong: showResults && selectedAnswers[i] && i !== correctIndex }">
                <span class="opt-letter">{{ ['A','B','C','D','E','F'][i] }}</span>
                <span class="opt-text">{{ opt.text }}</span>
                <span v-if="showResults && i === correctIndex" class="opt-check">✅</span>
              </div>
            </div>
          </div>

          <div class="game-actions">
            <button v-if="!showResults" class="btn-ghost" @click="endGame">⏹ Terminar</button>
            <button v-if="showResults && !isLastQuestion" class="btn-primary" @click="nextQuestion">Siguiente →</button>
            <button v-if="showResults && isLastQuestion" class="btn-primary" @click="endGame">🏁 Ver resultados</button>
          </div>

          <!-- Live leaderboard -->
          <div v-if="showResults" class="mini-leaderboard">
            <h4>🏆 Top jugadores</h4>
            <div v-for="(p, i) in leaderboard.slice(0, 5)" :key="i" class="lb-row">
              <span class="lb-rank">{{ i + 1 }}</span>
              <span class="lb-name">{{ p.name }}</span>
              <span class="lb-score">{{ p.score }} pts</span>
            </div>
          </div>
        </section>
      </template>

      <!-- FINISHED -->
      <template v-else-if="status === 'finished'">
        <section class="card results-card">
          <h2>🏁 Partida finalizada</h2>
          <div class="final-podium">
            <div v-for="(p, i) in leaderboard.slice(0, 3)" :key="i" class="podium-place" :class="`place-${i + 1}`">
              <div class="podium-avatar">{{ p.name.charAt(0).toUpperCase() }}</div>
              <div class="podium-name">{{ p.name }}</div>
              <div class="podium-score">{{ p.score }}</div>
            </div>
          </div>
          <div class="full-leaderboard">
            <div v-for="(p, i) in leaderboard" :key="i" class="lb-row-full">
              <span class="lb-rank">{{ i + 1 }}</span>
              <span class="lb-name">{{ p.name }}</span>
              <span class="lb-score">{{ p.score }} pts</span>
            </div>
          </div>
          <div class="results-actions">
            <button class="btn-ghost" @click="reset">← Volver al Dashboard</button>
            <button class="btn-primary" @click="restartSame">🔄 Reutilizar código</button>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const socket = ref(null)
const joined = ref(false)
const joining = ref(false)
const joinCode = ref('')
const joinError = ref('')

const code = ref('')
const title = ref('')
const status = ref('waiting')
const players = ref([])
const questionCount = ref(0)
const currentQuestion = ref(0)
const totalQuestions = ref(0)
const questionText = ref('')
const questionOptions = ref([])
const correctIndex = ref(-1)
const showResults = ref(false)
const selectedAnswers = ref({})
const leaderboard = ref([])
const timerPercent = ref(100)
let timerInterval = null

const isLastQuestion = computed(() => currentQuestion.value >= totalQuestions.value - 1)

onMounted(() => {
  const codeFromUrl = route.query.code
  if (codeFromUrl) { joinCode.value = codeFromUrl.toUpperCase(); joinAsHost() }
})

onUnmounted(() => { if (socket.value) socket.value.disconnect(); clearInterval(timerInterval) })

function joinAsHost() {
  if (!joinCode.value.trim()) return
  joining.value = true; joinError.value = ''
  socket.value = io(API)
  socket.value.emit('host:join', { code: joinCode.value.trim() })

  socket.value.on('host:joined', ({ code: c, title: t, questionCount: qc, players: p }) => {
    joined.value = true; joining.value = false
    code.value = c; title.value = t; questionCount.value = qc; players.value = p; status.value = 'waiting'
  })

  socket.value.on('players:update', ({ players: p }) => { players.value = p })

  socket.value.on('game:started', ({ questionCount: qc }) => {
    status.value = 'active'; totalQuestions.value = qc; currentQuestion.value = 0; showResults.value = false
  })

  socket.value.on('question:show', ({ index, total, text, options, timeLimit }) => {
    currentQuestion.value = index; totalQuestions.value = total
    questionText.value = text; questionOptions.value = options
    correctIndex.value = -1; showResults.value = false; selectedAnswers.value = {}
    startTimer(timeLimit)
  })

  socket.value.on('question:results', ({ correctIndex: ci, leaderboard: lb }) => {
    correctIndex.value = ci; showResults.value = true; leaderboard.value = lb; clearInterval(timerInterval)
  })

  socket.value.on('game:ended', ({ leaderboard: lb }) => {
    status.value = 'finished'; leaderboard.value = lb; clearInterval(timerInterval)
  })

  socket.value.on('error', ({ message }) => { joinError.value = message; joining.value = false })
}

function startGame() { socket.value.emit('host:start', { code: code.value }) }
function nextQuestion() { socket.value.emit('host:next', { code: code.value }) }
function endGame() { socket.value.emit('host:end', { code: code.value }) }

function startTimer(seconds) {
  clearInterval(timerInterval)
  let remaining = seconds
  timerPercent.value = 100
  timerInterval = setInterval(() => {
    remaining -= 0.1
    timerPercent.value = (remaining / seconds) * 100
    if (remaining <= 0) clearInterval(timerInterval)
  }, 100)
}

function reset() { router.push('/dashboard') }
function restartSame() { status.value = 'waiting'; players.value = []; socket.value.emit('host:join', { code: code.value }) }
</script>

<style scoped>
.host-view { min-height: 100vh; background: #f8fafc; color: #1e293b; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
.host-header { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
.back-link { color: #64748b; text-decoration: none; font-size: .85rem; padding: .3rem .7rem; border: 1px solid #e2e8f0; border-radius: 6px; transition: all .2s; }
.back-link:hover { color: #0f172a; border-color: #cbd5e1; }
.logo { font-size: 1.3rem; color: #16a34a; font-weight: 700; margin-left: auto; }
.host-main { max-width: 800px; margin: 2rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1.5rem; }
.card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
h2 { margin: 0 0 .4rem; font-size: 1.25rem; color: #0f172a; }
.subtitle { color: #64748b; font-size: .9rem; margin: 0 0 1.2rem; }
.field { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1rem; }
.field label { font-size: .85rem; color: #475569; font-weight: 500; }
input { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b; padding: .6rem .8rem; font-size: .95rem; outline: none; transition: border-color .2s, box-shadow .2s; }
input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
.btn-primary { background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: .6rem 1.2rem; font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .2s; }
.btn-primary:hover:not(:disabled) { background: #15803d; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px; padding: .5rem 1rem; cursor: pointer; font-size: .9rem; transition: all .2s; }
.btn-ghost:hover { color: #0f172a; border-color: #cbd5e1; }
.btn-large { font-size: 1.1rem; padding: .8rem 1.5rem; }
.error-msg { color: #dc2626; font-size: .85rem; margin-top: .4rem; }
.warn-msg { color: #b45309; font-size: .85rem; margin-top: .5rem; }

.join-card { max-width: 400px; margin: 0 auto; }
.lobby-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.code-badge { background: #f0fdf4; color: #16a34a; font-family: 'Courier New', monospace; font-size: 1.2rem; font-weight: 700; padding: .4rem .8rem; border-radius: 8px; border: 1px solid #bbf7d0; }
.players-area { margin: 1rem 0; }
.players-area h3 { font-size: .9rem; color: #64748b; margin-bottom: .7rem; }
.empty-players { text-align: center; padding: 1.5rem; color: #94a3b8; border: 2px dashed #e2e8f0; border-radius: 8px; }
.player-list { display: flex; flex-wrap: wrap; gap: .5rem; }
.player-chip { display: flex; align-items: center; gap: .4rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px; padding: .3rem .8rem; }
.player-avatar { width: 24px; height: 24px; background: #16a34a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 700; }
.player-name { font-size: .85rem; color: #0f172a; font-weight: 500; }
.lobby-actions { margin-top: 1.5rem; text-align: center; }

.game-header { margin-bottom: 1.5rem; }
.q-counter { font-size: .85rem; color: #64748b; font-weight: 600; }
.timer-bar { height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: .5rem; overflow: hidden; }
.timer-fill { height: 100%; background: #16a34a; border-radius: 3px; transition: width .1s linear; }
.q-text { font-size: 1.4rem; font-weight: 700; margin-bottom: 1.5rem; color: #0f172a; }
.options-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: .75rem; margin-bottom: 1.5rem; }
.option-box { display: flex; align-items: center; gap: .75rem; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px; padding: 1rem; transition: all .2s; }
.option-box.correct { background: #dcfce7; border-color: #16a34a; }
.option-box.wrong { background: #fef2f2; border-color: #fca5a5; }
.opt-letter { width: 32px; height: 32px; background: #e2e8f0; color: #475569; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .9rem; }
.option-box.correct .opt-letter { background: #16a34a; color: #fff; }
.opt-text { flex: 1; font-size: 1rem; }
.opt-check { font-size: 1.2rem; }
.game-actions { display: flex; justify-content: center; gap: .75rem; }
.mini-leaderboard { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
.mini-leaderboard h4 { font-size: .9rem; color: #64748b; margin-bottom: .5rem; }
.lb-row { display: flex; align-items: center; gap: .75rem; padding: .4rem 0; }
.lb-rank { width: 24px; text-align: center; font-weight: 700; color: #16a34a; }
.lb-name { flex: 1; font-size: .9rem; }
.lb-score { font-weight: 700; color: #0f172a; }

.results-card { text-align: center; }
.final-podium { display: flex; justify-content: center; align-items: flex-end; gap: 1rem; margin: 2rem 0; }
.podium-place { display: flex; flex-direction: column; align-items: center; gap: .3rem; }
.podium-place.place-1 .podium-avatar { width: 70px; height: 70px; font-size: 1.5rem; background: #fbbf24; }
.podium-place.place-2 .podium-avatar { width: 55px; height: 55px; font-size: 1.2rem; background: #94a3b8; }
.podium-place.place-3 .podium-avatar { width: 55px; height: 55px; font-size: 1.2rem; background: #b45309; }
.podium-avatar { border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
.podium-name { font-size: .85rem; font-weight: 600; color: #0f172a; }
.podium-score { font-size: 1.1rem; font-weight: 800; color: #16a34a; }
.full-leaderboard { max-width: 400px; margin: 0 auto 1.5rem; text-align: left; }
.lb-row-full { display: flex; align-items: center; gap: .75rem; padding: .5rem 0; border-bottom: 1px solid #f1f5f9; }
.results-actions { display: flex; justify-content: center; gap: .75rem; }
</style>