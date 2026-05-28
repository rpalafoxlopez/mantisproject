<template>
  <div class="play-view">
    <header class="play-header">
       <span class="logo"><img src="/img/quizhive.png" width="120" alt="QuizHive Logo"></span>
    </header>

    <main class="play-main">
      <!-- WAITING -->
      <section v-if="status === 'waiting'" class="card waiting-card">
        <div class="spinner-big"></div>
        <h2>Esperando al host…</h2>
        <p class="subtitle">La partida comenzará pronto. ¡Prepárate!</p>
        <div class="players-preview">
          <span v-for="p in players" :key="p.socketId" class="mini-chip">{{ p.name }}</span>
        </div>
      </section>

      <!-- QUESTION -->
      <section v-else-if="status === 'active' && !answered" class="card question-card">
        <div class="q-header">
          <span class="q-num">Pregunta {{ currentQuestion + 1 }} / {{ totalQuestions }}</span>
          <div class="timer-ring">
            <svg viewBox="0 0 36 36" class="timer-svg">
              <path class="timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="timer-fg" :stroke-dasharray="`${timerPercent}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="timer-text">{{ Math.ceil(timerSeconds) }}</span>
          </div>
        </div>

        <h2 class="q-text">{{ questionText }}</h2>

        <div class="options-list">
          <button
            v-for="(opt, i) in questionOptions"
            :key="i"
            class="option-btn"
            :disabled="answered"
            @click="submitAnswer(i)"
          >
            <span class="opt-letter">{{ ['A','B','C','D','E','F'][i] }}</span>
            <span class="opt-text">{{ opt.text }}</span>
          </button>
        </div>
      </section>

      <!-- ANSWERED WAITING -->
      <section v-else-if="status === 'active' && answered && !showResult" class="card answered-card">
        <div class="spinner-big"></div>
        <h2>Respuesta enviada ✅</h2>
        <p class="subtitle">Esperando a los demás jugadores…</p>
      </section>

      <!-- RESULT -->
      <section v-else-if="showResult" class="card result-card">
        <div class="result-icon" :class="{ correct: isCorrect, wrong: !isCorrect }">
          {{ isCorrect ? '🎉' : '😢' }}
        </div>
        <h2>{{ isCorrect ? '¡Correcto!' : 'Incorrecto' }}</h2>
        <p class="subtitle">
          <span v-if="isCorrect">+{{ points }} puntos</span>
          <span v-else>La respuesta correcta era: {{ correctLetter }}</span>
        </p>
        <div class="mini-lb">
          <div v-for="(p, i) in miniLeaderboard" :key="i" class="lb-row" :class="{ me: p.name === playerName }">
            <span class="lb-rank">{{ i + 1 }}</span>
            <span class="lb-name">{{ p.name }}</span>
            <span class="lb-score">{{ p.score }}</span>
          </div>
        </div>
      </section>

      <!-- GAME ENDED -->
      <section v-else-if="status === 'finished'" class="card ended-card">
        <h2>🏁 Partida terminada</h2>
        <div class="final-lb">
          <div v-for="(p, i) in leaderboard" :key="i" class="lb-row-final" :class="{ me: p.name === playerName, top3: i < 3 }">
            <span class="lb-rank">{{ i + 1 }}</span>
            <span class="lb-name">{{ p.name }}</span>
            <span class="lb-score">{{ p.score }} pts</span>
          </div>
        </div>
        <button class="btn-primary" @click="goHome">← Volver al inicio</button>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const socket = ref(null)
const playerName = ref('')
const status = ref('waiting')
const players = ref([])
const currentQuestion = ref(0)
const totalQuestions = ref(0)
const questionText = ref('')
const questionOptions = ref([])
const answered = ref(false)
const showResult = ref(false)
const isCorrect = ref(false)
const points = ref(0)
const correctIndex = ref(-1)
const correctLetter = ref('')
const miniLeaderboard = ref([])
const leaderboard = ref([])
const timerSeconds = ref(20)
const timerPercent = ref(100)
let timerInterval = null
let startTime = 0

onMounted(() => {
  const code = route.query.code || localStorage.getItem('quizhive_player_code')
  const name = route.query.name || localStorage.getItem('quizhive_player_name')
  if (!code || !name) { router.push('/join'); return }
  playerName.value = decodeURIComponent(name)
  connectSocket(code, playerName.value)
})

onUnmounted(() => { if (socket.value) socket.value.disconnect(); clearInterval(timerInterval) })

function connectSocket(code, name) {
  socket.value = io(API)
  socket.value.emit('player:join', { code, name })

  socket.value.on('player:joined', () => { status.value = 'waiting' })

  socket.value.on('players:update', ({ players: p }) => { players.value = p })

  socket.value.on('game:started', ({ questionCount }) => {
    status.value = 'active'; totalQuestions.value = questionCount; answered.value = false; showResult.value = false
  })

  socket.value.on('question:show', ({ index, total, text, options, timeLimit }) => {
    currentQuestion.value = index; totalQuestions.value = total
    questionText.value = text; questionOptions.value = options
    answered.value = false; showResult.value = false
    correctIndex.value = -1; isCorrect.value = false; points.value = 0
    startTimer(timeLimit); startTime = Date.now()
  })

  socket.value.on('answer:result', ({ isCorrect: ic, points: pts, correctIndex: ci }) => {
    isCorrect.value = ic; points.value = pts; correctIndex.value = ci
    correctLetter.value = ['A','B','C','D','E','F'][ci] || ''
  })

  socket.value.on('question:results', ({ correctIndex: ci, leaderboard: lb }) => {
    correctIndex.value = ci; miniLeaderboard.value = lb; showResult.value = true; clearInterval(timerInterval)
  })

  socket.value.on('game:ended', ({ leaderboard: lb }) => {
    status.value = 'finished'; leaderboard.value = lb; clearInterval(timerInterval)
  })

  socket.value.on('error', ({ message }) => { alert(message); router.push('/join') })
}

function submitAnswer(index) {
  if (answered.value) return
  answered.value = true
  const timeUsed = (Date.now() - startTime) / 1000
  socket.value.emit('player:answer', { code: route.query.code, answerIndex: index, timeUsed })
}

function startTimer(seconds) {
  clearInterval(timerInterval)
  let remaining = seconds
  timerSeconds.value = seconds
  timerPercent.value = 100
  timerInterval = setInterval(() => {
    remaining -= 0.1
    timerSeconds.value = Math.max(0, remaining)
    timerPercent.value = (remaining / seconds) * 100
    if (remaining <= 0) { clearInterval(timerInterval); if (!answered.value) submitAnswer(-1) }
  }, 100)
}

function goHome() { router.push('/'); localStorage.removeItem('quizhive_player_code'); localStorage.removeItem('quizhive_player_name') }
</script>

<style scoped>
.play-view { min-height: 100vh; background: #f8fafc; color: #1e293b; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
.play-header { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 1.3rem; color: #16a34a; font-weight: 700; }
.player-name { font-size: .9rem; color: #64748b; font-weight: 500; }
.play-main { max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
.card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
h2 { margin: 0 0 .4rem; font-size: 1.25rem; color: #0f172a; }
.subtitle { color: #64748b; font-size: .9rem; margin: 0 0 1.2rem; }
.spinner-big { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.waiting-card { text-align: center; padding: 3rem 1.5rem; }
.players-preview { display: flex; flex-wrap: wrap; justify-content: center; gap: .4rem; margin-top: 1rem; }
.mini-chip { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 20px; padding: .2rem .7rem; font-size: .8rem; font-weight: 500; }

.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.q-num { font-size: .85rem; color: #64748b; font-weight: 600; }
.timer-ring { position: relative; width: 50px; height: 50px; }
.timer-svg { transform: rotate(-90deg); width: 50px; height: 50px; }
.timer-bg { fill: none; stroke: #e2e8f0; stroke-width: 3; }
.timer-fg { fill: none; stroke: #16a34a; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray .1s linear; }
.timer-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: .9rem; font-weight: 700; color: #0f172a; }
.q-text { font-size: 1.3rem; font-weight: 700; margin-bottom: 1.5rem; color: #0f172a; }
.options-list { display: flex; flex-direction: column; gap: .75rem; }
.option-btn { display: flex; align-items: center; gap: .75rem; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px; padding: 1rem; cursor: pointer; transition: all .2s; text-align: left; }
.option-btn:hover:not(:disabled) { border-color: #16a34a; background: #f0fdf4; }
.option-btn:disabled { opacity: .6; cursor: not-allowed; }
.opt-letter { width: 32px; height: 32px; background: #e2e8f0; color: #475569; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .9rem; flex-shrink: 0; }
.option-btn:hover .opt-letter { background: #16a34a; color: #fff; }
.opt-text { flex: 1; font-size: 1rem; color: #1e293b; }

.answered-card { text-align: center; padding: 3rem 1.5rem; }

.result-card { text-align: center; padding: 2rem 1.5rem; }
.result-icon { font-size: 3rem; margin-bottom: .5rem; }
.result-icon.correct { color: #16a34a; }
.result-icon.wrong { color: #dc2626; }
.mini-lb { max-width: 300px; margin: 1.5rem auto 0; text-align: left; }
.lb-row { display: flex; align-items: center; gap: .75rem; padding: .4rem 0; }
.lb-row.me { background: #f0fdf4; border-radius: 6px; padding: .4rem .6rem; }
.lb-rank { width: 24px; text-align: center; font-weight: 700; color: #16a34a; }
.lb-name { flex: 1; font-size: .9rem; }
.lb-score { font-weight: 700; color: #0f172a; }

.ended-card { text-align: center; padding: 2rem 1.5rem; }
.final-lb { max-width: 350px; margin: 1.5rem auto; text-align: left; }
.lb-row-final { display: flex; align-items: center; gap: .75rem; padding: .5rem 0; border-bottom: 1px solid #f1f5f9; }
.lb-row-final.me { background: #f0fdf4; border-radius: 6px; padding: .5rem .6rem; }
.lb-row-final.top3 .lb-rank { color: #f59e0b; }
.btn-primary { background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: .6rem 1.2rem; font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .2s; margin-top: 1rem; }
.btn-primary:hover { background: #15803d; }
</style>