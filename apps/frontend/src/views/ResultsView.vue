<template>
  <div class="results-view">
    <header class="results-header">
      <router-link to="/" class="back-link">← Inicio</router-link>
       <span class="logo"><img src="/img/quizhive.png" width="120" alt="QuizHive Logo"></span>
    </header>

    <main class="results-main">
      <section class="card results-card">
        <h2>🏆 Resultados Finales</h2>
        <p class="subtitle">¡Gracias por jugar!</p>

        <div class="podium">
          <div v-if="leaderboard[1]" class="podium-place second">
            <div class="podium-avatar">{{ leaderboard[1].name.charAt(0).toUpperCase() }}</div>
            <div class="podium-name">{{ leaderboard[1].name }}</div>
            <div class="podium-score">{{ leaderboard[1].score }}</div>
            <div class="podium-bar"></div>
          </div>
          <div v-if="leaderboard[0]" class="podium-place first">
            <div class="podium-avatar">{{ leaderboard[0].name.charAt(0).toUpperCase() }}</div>
            <div class="podium-name">{{ leaderboard[0].name }}</div>
            <div class="podium-score">{{ leaderboard[0].score }}</div>
            <div class="podium-bar"></div>
          </div>
          <div v-if="leaderboard[2]" class="podium-place third">
            <div class="podium-avatar">{{ leaderboard[2].name.charAt(0).toUpperCase() }}</div>
            <div class="podium-name">{{ leaderboard[2].name }}</div>
            <div class="podium-score">{{ leaderboard[2].score }}</div>
            <div class="podium-bar"></div>
          </div>
        </div>

        <div class="full-list">
          <div v-for="(p, i) in leaderboard" :key="i" class="list-row" :class="{ me: p.name === playerName }">
            <span class="list-rank">{{ i + 1 }}</span>
            <span class="list-name">{{ p.name }}</span>
            <span class="list-score">{{ p.score }} pts</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn-primary" @click="goHome">← Volver al inicio</button>
          <button class="btn-ghost" @click="goJoin">🎮 Jugar otra partida</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const leaderboard = ref([])
const playerName = ref('')

onMounted(() => {
  const lb = localStorage.getItem('quizhive_last_leaderboard')
  if (lb) leaderboard.value = JSON.parse(lb)
  playerName.value = localStorage.getItem('quizhive_player_name') || ''
})

function goHome() { router.push('/') }
function goJoin() { router.push('/join') }
</script>

<style scoped>
.results-view { min-height: 100vh; background: #f8fafc; color: #1e293b; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
.results-header { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
.back-link { color: #64748b; text-decoration: none; font-size: .85rem; padding: .3rem .7rem; border: 1px solid #e2e8f0; border-radius: 6px; transition: all .2s; }
.back-link:hover { color: #0f172a; border-color: #cbd5e1; }
.logo { font-size: 1.3rem; color: #16a34a; font-weight: 700; margin-left: auto; }
.results-main { max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
.card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); text-align: center; }
h2 { margin: 0 0 .4rem; font-size: 1.25rem; color: #0f172a; }
.subtitle { color: #64748b; font-size: .9rem; margin: 0 0 1.5rem; }

.podium { display: flex; justify-content: center; align-items: flex-end; gap: 1rem; margin: 2rem 0; }
.podium-place { display: flex; flex-direction: column; align-items: center; }
.podium-avatar { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 1.3rem; margin-bottom: .3rem; }
.podium-place.first .podium-avatar { background: #fbbf24; width: 75px; height: 75px; font-size: 1.6rem; }
.podium-place.second .podium-avatar { background: #94a3b8; }
.podium-place.third .podium-avatar { background: #b45309; }
.podium-name { font-size: .85rem; font-weight: 600; color: #0f172a; }
.podium-score { font-size: 1rem; font-weight: 800; color: #16a34a; }
.podium-bar { width: 60px; border-radius: 4px 4px 0 0; margin-top: .3rem; }
.podium-place.first .podium-bar { height: 80px; background: #fbbf24; }
.podium-place.second .podium-bar { height: 55px; background: #94a3b8; }
.podium-place.third .podium-bar { height: 40px; background: #b45309; }

.full-list { max-width: 350px; margin: 1.5rem auto; text-align: left; }
.list-row { display: flex; align-items: center; gap: .75rem; padding: .5rem 0; border-bottom: 1px solid #f1f5f9; }
.list-row.me { background: #f0fdf4; border-radius: 6px; padding: .5rem .6rem; }
.list-rank { width: 28px; text-align: center; font-weight: 700; color: #16a34a; }
.list-name { flex: 1; font-size: .9rem; }
.list-score { font-weight: 700; color: #0f172a; }

.actions { display: flex; justify-content: center; gap: .75rem; margin-top: 1.5rem; }
.btn-primary { background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: .6rem 1.2rem; font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .2s; }
.btn-primary:hover { background: #15803d; }
.btn-ghost { background: transparent; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px; padding: .5rem 1rem; cursor: pointer; font-size: .9rem; transition: all .2s; }
.btn-ghost:hover { color: #0f172a; border-color: #cbd5e1; }
</style>