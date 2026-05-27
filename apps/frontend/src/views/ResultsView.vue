<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
    <FinalLeaderboard 
      v-if="gameStore.finalResults"
      :leaderboard="gameStore.finalResults.leaderboard"
      :stats="gameStore.finalResults.stats"
    />
    <div v-else class="text-center text-white">
      <span class="material-symbols-outlined text-6xl mb-4 text-slate-600">hourglass_empty</span>
      <h2 class="text-xl mb-4">No hay resultados disponibles</h2>
      <router-link to="/" class="btn btn-primary">Volver al inicio</router-link>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/game.js'
import FinalLeaderboard from '../components/FinalLeaderboard.vue'

const gameStore = useGameStore()
</script>
