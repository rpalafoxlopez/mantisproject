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
      <section v-if="!showResults" class="quiz-container">
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

        <div class="question-card" v-if="currentQuestion < questions.length">
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
                @click="goToQuestion(currentQuestion + 1)"
              >
                Siguiente →
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
                @click="goToNextUnanswered"
              >
                Saltar a pendiente →
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- RESULTADOS FINALES -->
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
const answers = ref({}) // { questionIndex: { answerIndex, isCorrect, points } }
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

const answeredCount = computed(() => Object.keys(answers.value).length)

let socket = null
let questionStartTime = 0

onMounted(() => {
  if (!code.value || !playerName.value) {
    router.push('/join')
    return
  }

  socket = io(API, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  })

  socket.on('connect', () => {
    console.log('✅ Socket conectado:', socket.id)
    // Re-unirse automáticamente al reconectar
    socket.emit('player:join', {
      code: code.value,
      name: playerName.value
    })
  })

  socket.on('player:joined', ({ title: t, questions: q, totalQuestions: total }) => {
    console.log('✅ Unido al quiz:', t)
    title.value = t
    questions.value = q
    totalQuestions.value = total
    questionStartTime = Date.now()
    showResults.value = false
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
    alert(message)
    if (message.includes('terminó') || message.includes('inválido')) {
      router.push('/join')
    }
  })

  // Unirse inicialmente
  socket.emit('player:join', {
    code: code.value,
    name: playerName.value
  })
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

    // Restaurar selección previa si ya respondió
    const prev = answers.value[idx]
    if (prev) {
      selectedOption.value = prev.answerIndex
      showAnswerFeedback.value = true
      lastAnswerCorrect.value = prev.isCorrect
      lastPoints.value = prev.points
    }
  }
}

function goToNextUnanswered() {
  for (let i = 0; i < questions.value.length; i++) {
    if (answers.value[i] === undefined) {
      goToQuestion(i)
      return
    }
  }
  // Todas respondidas
  if (answeredCount.value === totalQuestions.value) {
    finishQuiz()
  }
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