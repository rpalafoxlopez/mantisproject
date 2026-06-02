<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="modal-container">
        <div class="modal-header">
          <h2>
            <span class="icon">📊</span>
            Estadísticas: {{ quiz.title }}
          </h2>
          <button class="close-btn" @click="close">×</button>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando datos del quiz...</p>
        </div>

        <div v-else-if="quizData" class="modal-body">
          <!-- Resumen rápido -->
          <div class="summary-grid">
            <div class="summary-card">
              <span class="summary-value">{{ quizData.totalPlayers || 0 }}</span>
              <span class="summary-label">Jugadores</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">{{ quizData.totalQuestions || 0 }}</span>
              <span class="summary-label">Preguntas</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">{{ avgScore }}</span>
              <span class="summary-label">Puntaje Promedio</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">{{ topPlayer?.score || 0 }}</span>
              <span class="summary-label">Máxima Puntuación</span>
            </div>
          </div>

          <!-- Top Jugadores -->
          <div class="analytics-section">
            <h3>🏆 Top Jugadores</h3>
            <div class="top-players-table">
              <div class="table-header">
                <span>#</span>
                <span>Nombre</span>
                <span>Puntaje</span>
                <span>Correctas</span>
                <span>Bonus</span>
              </div>
              <div
                v-for="(player, idx) in topPlayers"
                :key="player.name"
                class="table-row"
                :class="{ 'top-three': idx < 3 }"
              >
                <span class="rank">{{ idx + 1 }}</span>
                <span class="name">{{ player.name }}</span>
                <span class="score">{{ player.score }} pts</span>
                <span class="correct">{{ player.correctCount }}/{{ quizData.totalQuestions }}</span>
                <span class="bonus">{{ player.bonusCount || 0 }}x</span>
              </div>
            </div>
          </div>

          <!-- Distribución de rendimiento -->
          <div class="analytics-section">
            <h3>📊 Distribución de Rendimiento</h3>
            <div class="distribution-container">
              <div class="distribution-bars">
                <div class="dist-bar high" :style="{ width: highPerfPercentage + '%' }">
                  <span>Alto</span>
                </div>
                <div class="dist-bar medium" :style="{ width: mediumPerfPercentage + '%' }">
                  <span>Medio</span>
                </div>
                <div class="dist-bar low" :style="{ width: lowPerfPercentage + '%' }">
                  <span>Bajo</span>
                </div>
              </div>
              <div class="distribution-legend">
                <span><span class="dot high"></span> Alto (≥140 pts/preg)</span>
                <span><span class="dot medium"></span> Medio (80-139 pts)</span>
                <span><span class="dot low"></span> Bajo (<80 pts)</span>
              </div>
            </div>
          </div>

          <!-- Evolución de puntajes (gráfico simple) -->
          <div class="analytics-section" v-if="scoreHistory.length > 0">
            <h3>📈 Evolución de Puntajes (Top 5)</h3>
            <div class="evolution-chart">
              <div class="chart-y-axis">
                <span>150</span>
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>
              <div class="chart-bars-container">
                <div
                  v-for="player in topPlayersByProgression"
                  :key="player.name"
                  class="player-evolution"
                >
                  <div class="player-name">{{ player.name }}</div>
                  <div class="bars-wrapper">
                    <div
                      v-for="(score, qIdx) in player.scoreProgression"
                      :key="qIdx"
                      class="evolution-bar"
                      :style="{ height: (score / 150 * 100) + '%' }"
                      :title="`Pregunta ${qIdx + 1}: ${score} pts`"
                    >
                      <span class="tooltip">{{ score }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="modal-actions">
            <button class="btn-secondary" @click="goToEdit">
              ✏️ Editar Quiz
            </button>
            <button
              v-if="quizData.status !== 'finished'"
              class="btn-primary"
              @click="startQuiz"
            >
              ▶️ Iniciar Partida
            </button>
            <button class="btn-danger" @click="confirmDelete">
              🗑 Eliminar Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal de confirmación de eliminación -->
  <Transition name="modal">
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-container small">
        <div class="modal-header">
          <h2>⚠️ Eliminar Quiz</h2>
          <button class="close-btn" @click="showDeleteConfirm = false">×</button>
        </div>
        <div class="modal-body">
          <p>¿Estás seguro de que quieres eliminar <strong>{{ quiz?.title }}</strong>?</p>
          <p class="warning-text">Esta acción no se puede deshacer y eliminará todas las preguntas y estadísticas.</p>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showDeleteConfirm = false">Cancelar</button>
          <button class="btn-danger" @click="deleteQuiz">Sí, eliminar</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const router = useRouter()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  quiz: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'deleted'])

const loading = ref(false)
const quizData = ref(null)
const showDeleteConfirm = ref(false)

const avgScore = computed(() => {
  if (!quizData.value?.players?.length) return 0
  const total = quizData.value.players.reduce((sum, p) => sum + (p.score || 0), 0)
  return Math.round(total / quizData.value.players.length)
})

const topPlayer = computed(() => {
  if (!quizData.value?.players?.length) return null
  return [...quizData.value.players].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
})

const topPlayers = computed(() => {
  if (!quizData.value?.players?.length) return []
  return [...quizData.value.players]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      score: p.score,
      correctCount: p.answers?.filter(a => a.isCorrect).length || 0,
      bonusCount: p.answers?.filter(a => a.pts === 150).length || 0
    }))
})

const highPerfPercentage = computed(() => {
  if (!quizData.value?.players?.length) return 0
  const count = quizData.value.players.filter(p => {
    const avg = p.totalAnswered ? Math.round(p.score / p.totalAnswered) : 0
    return avg >= 140
  }).length
  return (count / quizData.value.players.length) * 100
})

const mediumPerfPercentage = computed(() => {
  if (!quizData.value?.players?.length) return 0
  const count = quizData.value.players.filter(p => {
    const avg = p.totalAnswered ? Math.round(p.score / p.totalAnswered) : 0
    return avg >= 80 && avg < 140
  }).length
  return (count / quizData.value.players.length) * 100
})

const lowPerfPercentage = computed(() => {
  if (!quizData.value?.players?.length) return 0
  const count = quizData.value.players.filter(p => {
    const avg = p.totalAnswered ? Math.round(p.score / p.totalAnswered) : 0
    return avg < 80
  }).length
  return (count / quizData.value.players.length) * 100
})

const scoreHistory = ref([])
const topPlayersByProgression = computed(() => {
  if (!scoreHistory.value.length) return []

  const top5 = [...quizData.value.players]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)

  return top5.map(player => {
    const progression = []
    scoreHistory.value.forEach(snapshot => {
      const p = snapshot.players?.find(sp => sp.name === player.name)
      if (p) progression.push(p.score || 0)
    })
    return {
      name: player.name,
      scoreProgression: progression.length ? progression : [player.score || 0]
    }
  })
})

function buildScoreHistory(players, totalQuestions) {
  if (!players || !players.length) return []
  const history = []
  for (let q = 0; q < totalQuestions; q++) {
    const snapshotPlayers = players.map(p => {
      const answer = p.answers?.find(a => a.questionIndex === q)
      return {
        name: p.name,
        score: answer ? answer.pts : 0
      }
    })
    history.push({ timestamp: Date.now(), players: snapshotPlayers })
  }
  return history
}

watch(() => props.show, async (newVal) => {
  if (newVal && props.quiz) {
    loading.value = true
    try {
      const res = await axios.get(`${API}/api/sessions/${props.quiz.code}`)
      quizData.value = res.data
      scoreHistory.value = buildScoreHistory(quizData.value.players, quizData.value.questions?.length || 0)
    } catch (err) {
      console.error('Error loading quiz data:', err)
    } finally {
      loading.value = false
    }
  }
})

function close() {
  emit('close')
  quizData.value = null
  scoreHistory.value = []
}

function goToEdit() {
  close()
  router.push(`/admin?code=${props.quiz.code}`)
}

function startQuiz() {
  close()
  router.push(`/host?code=${props.quiz.code}`)
}

function confirmDelete() {
  showDeleteConfirm.value = true
}

async function deleteQuiz() {
  try {
    await axios.delete(`${API}/api/sessions/${props.quiz.code}`)
    showDeleteConfirm.value = false
    close()
    emit('deleted', props.quiz.code)
  } catch (err) {
    console.error('Error deleting quiz:', err)
    alert('Error al eliminar el quiz')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-container.small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
  border-radius: 24px 24px 0 0;
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #059669;
  font-size: 1.25rem;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 1.75rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #ef4444;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #d1fae5;
  border-top-color: #059669;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.summary-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1rem;
  text-align: center;
  transition: all 0.2s;
}

.summary-card:hover {
  border-color: #059669;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);
}

.summary-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  color: #059669;
}

.summary-label {
  font-size: 0.7rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Analytics Sections */
.analytics-section h3 {
  color: #1f2937;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

/* Top Players Table */
.top-players-table {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 40px 1fr 80px 80px 60px;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}

.table-header {
  background: #f3f4f6;
  color: #4b5563;
  font-size: 0.75rem;
  font-weight: 700;
  border-bottom: 1px solid #e5e7eb;
}

.table-row {
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  font-size: 0.85rem;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.top-three {
  background: linear-gradient(90deg, rgba(5, 150, 105, 0.05), transparent);
}

.rank { font-weight: 700; color: #059669; }
.name { font-weight: 500; color: #1f2937; }
.score { color: #f59e0b; font-weight: 600; }
.correct { color: #3b82f6; }
.bonus { color: #ef4444; font-weight: 600; }

/* Distribution */
.distribution-container {
  background: #f9fafb;
  border-radius: 16px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.distribution-bars {
  display: flex;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.dist-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  transition: width 0.3s ease;
}

.dist-bar.high { background: #22c55e; }
.dist-bar.medium { background: #eab308; }
.dist-bar.low { background: #ef4444; }

.distribution-legend {
  display: flex;
  gap: 1rem;
  justify-content: center;
  font-size: 0.7rem;
  color: #6b7280;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.dot.high { background: #22c55e; }
.dot.medium { background: #eab308; }
.dot.low { background: #ef4444; }

/* Evolution Chart */
.evolution-chart {
  display: flex;
  gap: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1rem;
  min-height: 200px;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #6b7280;
  padding-right: 0.5rem;
}

.chart-bars-container {
  flex: 1;
  display: flex;
  gap: 1rem;
  overflow-x: auto;
}

.player-evolution {
  flex: 1;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.player-name {
  font-size: 0.7rem;
  color: #4b5563;
  text-align: center;
  word-break: break-word;
  font-weight: 600;
}

.bars-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  width: 100%;
}

.evolution-bar {
  flex: 1;
  background: linear-gradient(180deg, #059669, #10b981);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.evolution-bar:hover {
  background: linear-gradient(180deg, #10b981, #34d399);
  transform: scaleX(1.05);
}

.tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  white-space: nowrap;
  display: none;
  z-index: 10;
}

.evolution-bar:hover .tooltip {
  display: block;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #059669, #10b981);
  border: none;
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.btn-danger:hover {
  background: #fee2e2;
}

.warning-text {
  font-size: 0.8rem;
  color: #f97316;
  margin-top: 0.5rem;
}

/* Transiciones */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>