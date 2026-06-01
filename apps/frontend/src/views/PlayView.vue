<<template>
  <div class="play-view">
    <header class="play-header">
      <span class="logo"><img src="/img/quizhive.png" width="120" alt="QuizHive Logo"></span>
      <div class="progress-info">
        <span class="score">⭐ {{ myScore }} pts</span>
        <span class="answered-count">{{ answeredCount }}/{{ totalQuestions }}</span>
      </div>
    </header>

    <main class="play-main">
      <!-- QUIZ EN PROGRESO -->
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

            <!-- MINI LEADERBOARD EN VIVO -->
            <div v-if="liveLeaderboard.length > 0" class="mini-leaderboard">
              <h4>🏆 En vivo — Top 5</h4>
              <div class="mini-lb-list">
                <div
                  v-for="(player, i) in liveLeaderboard"
                  :key="player.name"
                  class="mini-lb-row"
                  :class="{ 'is-me': player.name === playerName }"
                >
                  <span class="mini-pos">{{ i + 1 }}</span>
                  <span class="mini-name">{{ player.name }}</span>
                  <span class="mini-score">⭐ {{ player.score }}</span>
                </div>
              </div>
            </div>

            <div class="nav-buttons">
              <button
                v-if="currentQuestion > 0"
                class="btn-nav"
                @click="goToQuestion(currentQuestion - 1)"
              >
                ← Anterior
              </button>
              <button
                v-if="currentQuestion < questions.length - 1"
                class="btn-nav primary"
                @click="handleNext"
              >
                {{ selectedOption !== null && !showAnswerFeedback ? 'Confirmar y siguiente →' : 'Siguiente →' }}
              </button>
              <button
                v-else-if="answeredCount === totalQuestions"
                class="btn-finish"
                @click="finishQuiz"
              >
                🏆 Ver resultados
              </button>
              <button
                v-else
                class="btn-nav"
                @click="handleNext"
              >
                {{ selectedOption !== null && !showAnswerFeedback ? 'Confirmar y siguiente →' : 'Saltar a pendiente →' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- CARGANDO -->
      <section v-else-if="!showResults && questions.length === 0" class="card loading-card">
        <div class="spinner-big"></div>
        <h2>Conectando al quiz…</h2>
        <p class="subtitle">Espera un momento</p>
      </section>

      <!-- RESULTADOS FINALES -->
      <section v-else class="results-card">
        <h2>🏆 Resultados Finales</h2>

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
          <li
            v-for="(player, idx) in leaderboard"
            :key="idx"
            :class="{ 'is-you': player.name === playerName }"
          >
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

const code = ref(route.query.code || localStorage.getItem('quizhive_player_code') || '')
const playerName = ref(route.query.name || localStorage.getItem('quizhive_player_name') || '')
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
const liveLeaderboard = ref([])

const answeredCount = computed(() => Object.keys(answers.value).length)

let socket = null
let questionStartTime = 0
let hasJoined = false

onMounted(() => {
  if (!code.value || !playerName.value) {
    router.push('/join')
    return
  }

  socket = io(API, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  })

  socket.on('connect', () => {
    console.log('✅ Socket conectado, uniendo al quiz...')
    connectionError.value = ''
    if (!hasJoined) {
      hasJoined = true
      socket.emit('player:join', {
        code: code.value,
        name: playerName.value
      })
    }
  })

  socket.on('player:joined', ({ title: t, questions: q, totalQuestions: total }) => {
    console.log('✅ Unido al quiz:', t, 'Preguntas:', q?.length)
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

  // 🆕 ESCUCHAR LEADERBOARD EN VIVO
  socket.on('leaderboard:live', ({ leaderboard: lb }) => {
    liveLeaderboard.value = lb || []
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

  socket.on('error', ({ message }) => {
    console.log('❌ Socket error:', message)
    connectionError.value = message
    if (message.includes('terminó') || message.includes('inválido') || message.includes('encontrada')) {
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

  setTimeout(() => {
    if (questions.value.length === 0 && !connectionError.value) {
      console.log('⏱️ Timeout esperando respuesta del servidor')
      connectionError.value = 'El servidor no respondió. Intenta recargar la página.'
    }
  }, 10000)
})

onUnmounted(() => {
  if (socket) socket.disconnect()
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

function finishQuiz() {
  socket.emit('player:requestResults', { code: code.value })
}

function goHome() {
  localStorage.removeItem('quizhive_player_code')
  localStorage.removeItem('quizhive_player_name')
  router.push('/')
}
</script>

<style scoped>
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

/* 🆕 MINI LEADERBOARD EN VIVO */
.mini-leaderboard { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: .75rem 1rem; }
.mini-leaderboard h4 { margin: 0 0 .5rem; font-size: .85rem; color: #64748b; text-align: center; }
.mini-lb-list { display: flex; flex-direction: column; gap: .3rem; }
.mini-lb-row { display: flex; align-items: center; gap: .5rem; padding: .3rem .5rem; border-radius: 4px; font-size: .85rem; }
.mini-lb-row.is-me { background: #f0fdf4; font-weight: 600; }
.mini-pos { width: 1.5rem; text-align: center; color: #64748b; }
.mini-name { flex: 1; }
.mini-score { color: #16a34a; font-weight: 600; }

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
