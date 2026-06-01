<template>
  <div class="score-analytics">
    <div class="analytics-grid">
      <div class="analytics-card">
        <div class="card-icon">📊</div>
        <div class="card-content">
          <span class="card-label">Puntaje Promedio</span>
          <span class="card-value">{{ avgScore }}</span>
        </div>
      </div>

      <div class="analytics-card">
        <div class="card-icon">🏆</div>
        <div class="card-content">
          <span class="card-label">Líder</span>
          <span class="card-value">{{ topPlayer?.name || '—' }}</span>
          <span class="card-subvalue">{{ topPlayer?.score || 0 }} pts</span>
        </div>
      </div>

      <div class="analytics-card">
        <div class="card-icon">📈</div>
        <div class="card-content">
          <span class="card-label">Distribución</span>
          <div class="score-distribution">
            <div class="dist-bar" :style="{ width: highPerfPercentage + '%', background: '#22c55e' }" title="Alto rendimiento (150 pts)"></div>
            <div class="dist-bar" :style="{ width: midPerfPercentage + '%', background: '#eab308' }" title="Rendimiento medio (100 pts)"></div>
            <div class="dist-bar" :style="{ width: lowPerfPercentage + '%', background: '#ef4444' }" title="Bajo rendimiento (0-99 pts)"></div>
          </div>
          <div class="dist-labels">
            <span><span class="dot green"></span> Alto</span>
            <span><span class="dot yellow"></span> Medio</span>
            <span><span class="dot red"></span> Bajo</span>
          </div>
        </div>
      </div>
    </div>

    <div class="score-chart" v-if="scoreHistory.length > 0">
      <h4>Evolución de puntajes</h4>
      <div class="chart-container">
        <div class="chart-y-axis">
          <span>150</span>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div class="chart-bars">
          <div v-for="(player, idx) in topPlayersByScore" :key="player.name" class="player-chart">
            <div class="player-name">{{ player.name }}</div>
            <div class="bars-container">
              <div 
                v-for="(score, qIdx) in player.scoreProgression" 
                :key="qIdx"
                class="score-bar"
                :style="{ height: (score / 150 * 100) + '%' }"
                :title="`Pregunta ${qIdx + 1}: ${score} pts`"
              >
                <span class="bar-tooltip">{{ score }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="performance-table">
      <h4>📋 Rendimiento Detallado</h4>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Puntaje</th>
              <th>Correctas</th>
              <th>Bonus 🚀</th>
              <th>Promedio</th>
              <th>Racha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(player, idx) in playersWithStats" :key="player.name" :class="{ 'is-leader': idx === 0 }">
              <td class="rank">{{ idx + 1 }}</td>
              <td class="player-name">
                {{ player.name }}
                <span v-if="idx === 0" class="leader-badge">👑</span>
              </td>
              <td class="score">{{ player.score }}</td>
              <td class="correct">
                {{ player.correctCount }}/{{ totalQuestions }}
                <span class="percentage">({{ Math.round(player.correctCount/totalQuestions*100) }}%)</span>
              </td>
              <td class="bonus">{{ player.bonusCount }}x</td>
              <td class="avg">{{ player.avgPerQuestion }} pts</td>
              <td class="streak">
                <span class="streak-flames" v-if="player.currentStreak >= 3">
                  🔥 {{ player.currentStreak }}
                </span>
                <span v-else>{{ player.currentStreak }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="performance-alerts" v-if="alerts.length > 0">
      <h4>⚡ Eventos Destacados</h4>
      <div v-for="alert in alerts" :key="alert.id" class="alert-item" :class="alert.type">
        <span class="alert-icon">{{ alert.icon }}</span>
        <span class="alert-message">{{ alert.message }}</span>
        <span class="alert-time">{{ alert.time }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  players: {
    type: Array,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  scoreHistory: {
    type: Array,
    default: () => []
  }
})

// Calcular estadísticas avanzadas
const avgScore = computed(() => {
  if (!props.players.length) return 0
  const total = props.players.reduce((sum, p) => sum + (p.score || 0), 0)
  return Math.round(total / props.players.length)
})

const topPlayer = computed(() => {
  if (!props.players.length) return null
  return [...props.players].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
})

// Distribución de rendimiento
const highPerfPercentage = computed(() => {
  const count = props.players.filter(p => p.avgPerQuestion >= 140).length
  return (count / props.players.length) * 100 || 0
})

const midPerfPercentage = computed(() => {
  const count = props.players.filter(p => p.avgPerQuestion >= 80 && p.avgPerQuestion < 140).length
  return (count / props.players.length) * 100 || 0
})

const lowPerfPercentage = computed(() => {
  const count = props.players.filter(p => p.avgPerQuestion < 80).length
  return (count / props.players.length) * 100 || 0
})

// Top players para gráfico
const topPlayersByScore = computed(() => {
  return [...props.players]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)
    .map(p => ({
      ...p,
      scoreProgression: p.scoreProgression || []
    }))
})

// Players con estadísticas completas
const playersWithStats = computed(() => {
  return props.players.map(player => ({
    ...player,
    correctCount: player.correctCount || 0,
    bonusCount: player.bonusCount || 0,
    avgPerQuestion: player.totalAnswered ? Math.round(player.score / player.totalAnswered) : 0,
    currentStreak: player.currentStreak || 0
  })).sort((a, b) => (b.score || 0) - (a.score || 0))
})

// Alertas de rendimiento
const alerts = ref([])

// Monitorear cambios en jugadores para generar alertas
watch(() => props.players, (newPlayers, oldPlayers) => {
  if (!oldPlayers) return
  
  newPlayers.forEach(player => {
    const oldPlayer = oldPlayers.find(p => p.name === player.name)
    if (oldPlayer && player.score > oldPlayer.score) {
      const pointsGained = player.score - oldPlayer.score
      if (pointsGained === 150) {
        addAlert('success', `🎯 ${player.name} respondió con BONUS MÁXIMO! +150 pts`)
      } else if (pointsGained === 100) {
        addAlert('info', `📝 ${player.name} respuesta correcta +100 pts`)
      } else if (pointsGained === 0 && oldPlayer.score === player.score) {
        addAlert('warning', `❌ ${player.name} falló la pregunta`)
      }
    }
  })
}, { deep: true })

function addAlert(type, message) {
  alerts.value.unshift({
    id: Date.now(),
    type,
    message,
    icon: type === 'success' ? '🎉' : type === 'info' ? '✅' : '⚠️',
    time: new Date().toLocaleTimeString()
  })
  // Mantener solo últimas 10 alertas
  if (alerts.value.length > 10) alerts.value.pop()
  
  // Auto-limpiar después de 5 segundos
  setTimeout(() => {
    alerts.value = alerts.value.filter(a => a.id !== Date.now())
  }, 5000)
}
</script>

<style scoped>
.score-analytics {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.analytics-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s;
}

.analytics-card:hover {
  transform: translateY(-2px);
  background: rgba(255,255,255,0.08);
}

.card-icon {
  font-size: 2rem;
}

.card-content {
  flex: 1;
}

.card-label {
  display: block;
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 0.25rem;
}

.card-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #00d4aa;
}

.card-subvalue {
  display: block;
  font-size: 0.8rem;
  color: #666;
}

.score-distribution {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.dist-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.dist-labels {
  display: flex;
  gap: 1rem;
  font-size: 0.7rem;
  color: #888;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.dot.green { background: #22c55e; }
.dot.yellow { background: #eab308; }
.dot.red { background: #ef4444; }

/* Gráfico */
.score-chart {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1rem;
}

.score-chart h4 {
  margin-bottom: 1rem;
  color: #fff;
  font-size: 0.9rem;
}

.chart-container {
  display: flex;
  gap: 1rem;
  min-height: 200px;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #666;
  padding: 0 0.5rem 0 0;
}

.chart-bars {
  flex: 1;
  display: flex;
  gap: 1rem;
  overflow-x: auto;
}

.player-chart {
  flex: 1;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.player-name {
  font-size: 0.75rem;
  color: #ccc;
  text-align: center;
  word-break: break-word;
}

.bars-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 150px;
  width: 100%;
}

.score-bar {
  flex: 1;
  background: linear-gradient(180deg, #00d4aa, #00a8e8);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.score-bar:hover {
  background: #00ffd5;
  transform: scaleX(1.1);
}

.bar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  white-space: nowrap;
  display: none;
}

.score-bar:hover .bar-tooltip {
  display: block;
}

/* Tabla de rendimiento */
.performance-table {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1rem;
}

.performance-table h4 {
  margin-bottom: 1rem;
  color: #fff;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th {
  text-align: left;
  padding: 0.75rem;
  color: #888;
  font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

tr.is-leader {
  background: rgba(0,212,170,0.1);
  border-left: 3px solid #00d4aa;
}

.rank {
  font-weight: 700;
  color: #888;
}

.player-name {
  font-weight: 600;
  color: #fff;
  position: relative;
}

.leader-badge {
  margin-left: 0.5rem;
}

.score {
  color: #00d4aa;
  font-weight: 700;
}

.correct .percentage {
  font-size: 0.7rem;
  color: #666;
  margin-left: 0.25rem;
}

.bonus {
  color: #f59e0b;
}

.avg {
  color: #60a5fa;
}

.streak-flames {
  color: #f97316;
  font-weight: 700;
}

/* Alertas */
.performance-alerts {
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  padding: 1rem;
}

.performance-alerts h4 {
  margin-bottom: 0.75rem;
  color: #fff;
  font-size: 0.9rem;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  animation: slideIn 0.3s ease;
}

.alert-item.success {
  border-left: 3px solid #22c55e;
}

.alert-item.info {
  border-left: 3px solid #3b82f6;
}

.alert-item.warning {
  border-left: 3px solid #f59e0b;
}

.alert-icon {
  font-size: 1.2rem;
}

.alert-message {
  flex: 1;
  font-size: 0.85rem;
  color: #ddd;
}

.alert-time {
  font-size: 0.7rem;
  color: #666;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-bars {
    flex-direction: column;
  }
  
  .player-chart {
    min-width: 100%;
  }
  
  .bars-container {
    height: 80px;
  }
}
</style>