<template>
  <div class="results-container">
    <div class="results-card card">
      <div class="trophy">🏆</div>
      <h1>Resultados Finales</h1>
      <p class="subtitle">Sala: {{ sessionCode }}</p>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Cargando resultados...</p>
      </div>

      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <router-link to="/" class="btn btn-primary">
          🏠 Volver al inicio
        </router-link>
      </div>

      <div v-else class="results-content">
        <!-- Winner highlight -->
        <div v-if="leaderboard.length > 0" class="winner-section">
          <div class="winner-avatar">{{ leaderboard[0].avatar }}</div>
          <h2 class="winner-name">{{ leaderboard[0].name }}</h2>
          <p class="winner-score">{{ leaderboard[0].score }} puntos</p>
          <span class="winner-badge">🥇 Ganador</span>
        </div>

        <!-- Full leaderboard -->
        <div class="full-leaderboard">
          <h3>Leaderboard Completo</h3>
          <div 
            v-for="(player, index) in leaderboard" 
            :key="player.name"
            class="result-row"
            :class="{ top3: index < 3, me: player.name === playerName }"
          >
            <span class="result-rank">{{ index + 1 }}</span>
            <span class="result-avatar">{{ player.avatar }}</span>
            <span class="result-name">{{ player.name }}</span>
            <span class="result-score">{{ player.score }}</span>
            <span class="result-correct">{{ player.correctAnswers }}/{{ totalQuestions }} ✅</span>
          </div>
        </div>

        <!-- Game stats -->
        <div v-if="stats" class="game-stats">
          <div class="stat-box">
            <span class="stat-number">{{ stats.totalPlayers }}</span>
            <span class="stat-desc">Jugadores</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">{{ stats.totalQuestions }}</span>
            <span class="stat-desc">Preguntas</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">{{ stats.accuracy }}%</span>
            <span class="stat-desc">Precisión</span>
          </div>
        </div>

        <div class="results-actions">
          <router-link to="/join" class="btn btn-primary">
            🎮 Jugar de Nuevo
          </router-link>
          <router-link to="/" class="btn btn-secondary">
            🏠 Inicio
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const route = useRoute()

const sessionCode = ref(route.params.sessionCode)
const loading = ref(true)
const error = ref('')
const leaderboard = ref([])
const stats = ref(null)
const totalQuestions = ref(0)
const playerName = ref('')

onMounted(async () => {
  try {
    const response = await axios.get(`${API_URL}/api/sessions/${sessionCode.value}`)
    const session = response.data

    if (session.status !== 'finished') {
      error.value = 'El juego aún no ha terminado.'
      loading.value = false
      return
    }

    totalQuestions.value = session.questions?.length || 0

    // Build leaderboard from players
    leaderboard.value = session.players
      .map(p => ({
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        correctAnswers: p.answers.filter(a => a.correct).length,
        totalAnswered: p.answers.length
      }))
      .sort((a, b) => b.score - a.score)

    // Calculate stats
    const totalAnswers = session.players.reduce((sum, p) => sum + p.answers.length, 0)
    const correctAnswers = session.players.reduce(
      (sum, p) => sum + p.answers.filter(a => a.correct).length, 0
    )

    stats.value = {
      totalPlayers: session.players.length,
      totalQuestions: totalQuestions.value,
      accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
    }

    loading.value = false
  } catch (err) {
    console.error('Error loading results:', err)
    error.value = 'No se pudieron cargar los resultados. La sesión puede haber sido eliminada.'
    loading.value = false
  }
})
</script>

<style scoped>
.results-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
}

.results-card {
  text-align: center;
  padding: 3rem 2rem;
}

.trophy {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.results-card h1 {
  color: #667eea;
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #888;
  margin-bottom: 2rem;
}

.winner-section {
  background: linear-gradient(135deg, #ffd70015, #ffed4e15);
  border: 2px solid #ffd700;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.winner-avatar {
  font-size: 4rem;
  margin-bottom: 0.5rem;
}

.winner-name {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 0.3rem;
}

.winner-score {
  font-size: 1.2rem;
  color: #667eea;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.winner-badge {
  display: inline-block;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #333;
  padding: 0.3rem 1rem;
  border-radius: 20px;
  font-weight: 700;
}

.full-leaderboard {
  margin-bottom: 2rem;
}

.full-leaderboard h3 {
  color: #555;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 0.5rem;
}

.result-row.top3 {
  background: linear-gradient(135deg, #ffd70010, #ffed4e10);
}

.result-row.me {
  background: linear-gradient(135deg, #667eea15, #764ba215);
  border: 2px solid #667eea;
}

.result-rank {
  font-weight: 900;
  min-width: 30px;
  font-size: 1.2rem;
}

.result-row.top3 .result-rank {
  color: #ffd700;
}

.result-avatar {
  font-size: 1.5rem;
}

.result-name {
  flex: 1;
  font-weight: 600;
  text-align: left;
}

.result-score {
  font-weight: 900;
  color: #667eea;
  font-size: 1.1rem;
}

.result-correct {
  color: #28a745;
  font-size: 0.85rem;
  font-weight: 600;
}

.game-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.results-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.error-message {
  text-align: center;
  padding: 2rem;
}

.error-message p {
  color: #f5576c;
  margin-bottom: 1.5rem;
}
</style>
