<template>
  <div class="final-leaderboard">
    <div class="results-header">
      <h1>🎉 ¡Juego Terminado!</h1>
      <p class="results-subtitle">Aquí están los resultados finales</p>
    </div>

    <!-- Podium top 3 -->
    <div v-if="leaderboard && leaderboard.length > 0" class="podium">
      <div 
        v-for="(player, i) in podiumPlayers" 
        :key="player.name"
        class="podium-item"
        :class="`place-${player.rank}`"
        :style="{ animationDelay: (i * 0.2) + 's' }"
      >
        <div class="podium-avatar">{{ player.avatar }}</div>
        <div class="podium-rank">{{ getRankIcon(player.rank) }}</div>
        <div class="podium-name">{{ player.name }}</div>
        <div class="podium-score">{{ player.score }} pts</div>
        <div class="podium-bar" :style="{ height: getPodiumHeight(player.score) + 'px' }"></div>
      </div>
    </div>

    <!-- Full ranking table -->
    <div v-if="leaderboard && leaderboard.length > 3" class="full-ranking">
      <h3>Clasificación Completa</h3>
      <div class="ranking-list">
        <div 
          v-for="(player, i) in restOfPlayers" 
          :key="player.name"
          class="ranking-row"
          :style="{ animationDelay: ((i + 3) * 0.1) + 's' }"
        >
          <span class="rank-num">{{ player.rank }}</span>
          <span class="rank-avatar">{{ player.avatar }}</span>
          <span class="rank-name">{{ player.name }}</span>
          <span class="rank-correct">✓ {{ player.correctAnswers }}</span>
          <span class="rank-score">{{ player.score }} pts</span>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="game-stats">
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalPlayers }}</span>
        <span class="stat-label">Jugadores</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalQuestions }}</span>
        <span class="stat-label">Preguntas</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.accuracy }}%</span>
        <span class="stat-label">Precisión</span>
      </div>
    </div>

    <div class="results-actions">
      <router-link to="/" class="btn btn-primary">Jugar de Nuevo</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  leaderboard: {
    type: Array,
    default: () => []
  },
  stats: {
    type: Object,
    default: null
  }
})

const rankedLeaderboard = computed(() => {
  return props.leaderboard.map((p, i) => ({ ...p, rank: i + 1 }))
})

const podiumPlayers = computed(() => {
  return rankedLeaderboard.value.slice(0, 3).sort((a, b) => {
    const order = { 1: 1, 2: 3, 3: 2 }
    return order[a.rank] - order[b.rank]
  })
})

const restOfPlayers = computed(() => {
  return rankedLeaderboard.value.slice(3)
})

function getRankIcon(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank
}

function getPodiumHeight(score) {
  const max = Math.max(...props.leaderboard.map(p => p.score), 1)
  return Math.max(60, (score / max) * 150)
}
</script>

<style scoped>
.final-leaderboard {
  background: white;
  border-radius: 24px;
  padding: 2.5rem;
  max-width: 700px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  text-align: center;
}

.results-header {
  margin-bottom: 2rem;
}

.results-header h1 {
  color: #667eea;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.results-subtitle {
  color: #888;
  font-size: 1.1rem;
}

/* PODIUM */
.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 2.5rem;
  min-height: 250px;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: popUp 0.5s ease forwards;
  opacity: 0;
  transform: translateY(50px);
}

@keyframes popUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.podium-item.place-1 {
  order: 2;
}

.podium-item.place-2 {
  order: 1;
}

.podium-item.place-3 {
  order: 3;
}

.podium-avatar {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.podium-rank {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.podium-name {
  font-weight: 700;
  color: #333;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.podium-score {
  font-weight: 900;
  color: #667eea;
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.podium-bar {
  width: 80px;
  border-radius: 10px 10px 0 0;
  transition: height 1s ease;
}

.place-1 .podium-bar {
  background: linear-gradient(180deg, #ffd700, #ffb700);
  width: 100px;
}

.place-2 .podium-bar {
  background: linear-gradient(180deg, #c0c0c0, #a0a0a0);
}

.place-3 .podium-bar {
  background: linear-gradient(180deg, #cd7f32, #b87333);
}

/* FULL RANKING */
.full-ranking {
  margin-bottom: 2rem;
}

.full-ranking h3 {
  color: #555;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ranking-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 12px;
  animation: slideIn 0.4s ease forwards;
  opacity: 0;
  transform: translateX(-30px);
}

@keyframes slideIn {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.rank-num {
  font-weight: 900;
  color: #667eea;
  width: 30px;
  text-align: center;
}

.rank-avatar {
  font-size: 1.3rem;
}

.rank-name {
  flex: 1;
  font-weight: 600;
  text-align: left;
}

.rank-correct {
  color: #4facfe;
  font-weight: 600;
  font-size: 0.9rem;
}

.rank-score {
  font-weight: 900;
  color: #667eea;
}

/* STATS */
.game-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea08, #764ba208);
  border-radius: 15px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 900;
  color: #667eea;
}

.stat-label {
  font-size: 0.85rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.results-actions {
  margin-top: 1rem;
}

@media (max-width: 600px) {
  .final-leaderboard {
    padding: 1.5rem;
  }
  .podium {
    gap: 0.5rem;
  }
  .podium-bar {
    width: 60px;
  }
  .place-1 .podium-bar {
    width: 80px;
  }
  .game-stats {
    gap: 1rem;
  }
  .stat-value {
    font-size: 1.5rem;
  }
}
</style>
