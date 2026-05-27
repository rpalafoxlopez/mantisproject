<template>
  <div class="w-full max-w-lg mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">🎉 ¡Juego Terminado!</h1>
      <p class="text-slate-400">Aquí están los resultados finales</p>
    </div>

    <!-- Podium -->
    <div v-if="leaderboard && leaderboard.length > 0" class="flex justify-center items-end gap-4 mb-8 min-h-[200px]">
      <div 
        v-for="(player, i) in podiumPlayers" 
        :key="player.name"
        class="flex flex-col items-center animate-pop-up"
        :style="{ animationDelay: (i * 0.2) + 's' }"
      >
        <div class="text-3xl mb-2">{{ player.avatar }}</div>
        <div class="text-2xl mb-1">{{ getRankIcon(player.rank) }}</div>
        <div class="text-sm font-semibold text-white mb-1">{{ player.name }}</div>
        <div class="text-lg font-black text-blue-400 mb-2">{{ player.score }} pts</div>
        <div 
          class="w-16 rounded-t-lg transition-all duration-1000"
          :class="{
            'bg-gradient-to-t from-yellow-600 to-yellow-400': player.rank === 1,
            'bg-gradient-to-t from-gray-400 to-gray-300': player.rank === 2,
            'bg-gradient-to-t from-amber-700 to-amber-500': player.rank === 3
          }"
          :style="{ height: getPodiumHeight(player.score) + 'px' }"
        ></div>
      </div>
    </div>

    <!-- Full Ranking -->
    <div v-if="leaderboard && leaderboard.length > 3" class="mb-6">
      <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Clasificación Completa</h3>
      <div class="space-y-2">
        <div 
          v-for="(player, i) in restOfPlayers" 
          :key="player.name"
          class="flex items-center gap-3 p-3 rounded-xl bg-slate-800 animate-slide-in"
          :style="{ animationDelay: ((i + 3) * 0.1) + 's' }"
        >
          <span class="w-6 text-center font-bold text-slate-500">{{ player.rank }}</span>
          <span class="text-lg">{{ player.avatar }}</span>
          <span class="flex-1 text-sm font-medium text-white">{{ player.name }}</span>
          <span class="text-xs text-blue-400">✓ {{ player.correctAnswers }}</span>
          <span class="font-black text-blue-400">{{ player.score }}</span>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="grid grid-cols-3 gap-4 mb-8">
      <div class="text-center p-4 rounded-xl bg-slate-800">
        <div class="text-2xl font-black text-blue-400">{{ stats.totalPlayers }}</div>
        <div class="text-xs text-slate-400 uppercase">Jugadores</div>
      </div>
      <div class="text-center p-4 rounded-xl bg-slate-800">
        <div class="text-2xl font-black text-blue-400">{{ stats.totalQuestions }}</div>
        <div class="text-xs text-slate-400 uppercase">Preguntas</div>
      </div>
      <div class="text-center p-4 rounded-xl bg-slate-800">
        <div class="text-2xl font-black text-blue-400">{{ stats.accuracy }}%</div>
        <div class="text-xs text-slate-400 uppercase">Precisión</div>
      </div>
    </div>

    <div class="text-center">
      <router-link to="/" class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all">
        <span class="material-symbols-outlined">replay</span>
        Jugar de Nuevo
      </router-link>
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
  return Math.max(40, (score / max) * 120)
}
</script>

<style scoped>
@keyframes pop-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-pop-up {
  animation: pop-up 0.5s ease forwards;
  opacity: 0;
}

.animate-slide-in {
  animation: slide-in 0.4s ease forwards;
  opacity: 0;
}
</style>
