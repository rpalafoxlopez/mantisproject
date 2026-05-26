<template>
  <div class="join-view">
    <div class="join-card card">
      <h1>🎮 Unirse a Partida</h1>
      <p class="subtitle">Ingresa el código de sala y tu nombre</p>

      <div class="form-group">
        <label>Código de Sala</label>
        <input 
          v-model="sessionCode" 
          class="input code-input"
          placeholder="Ej: AB2D"
          maxlength="4"
          @input="sessionCode = sessionCode.toUpperCase()"
        />
      </div>

      <div class="form-group">
        <label>Tu Nombre</label>
        <input 
          v-model="playerName" 
          class="input"
          placeholder="¿Cómo te llamas?"
          maxlength="20"
        />
      </div>

      <div class="form-group">
        <label>Elige tu Avatar</label>
        <div class="avatar-selector">
          <button
            v-for="avatar in avatars"
            :key="avatar"
            class="avatar-btn"
            :class="{ selected: selectedAvatar === avatar }"
            @click="selectedAvatar = avatar"
          >
            {{ avatar }}
          </button>
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <button 
        class="btn btn-primary btn-full"
        :disabled="!canJoin || joining"
        @click="joinGame"
      >
        <span v-if="joining" class="spinner-small"></span>
        <span v-else>¡Entrar!</span>
      </button>

      <router-link to="/" class="back-link">← Volver al inicio</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocketStore } from '../stores/socket.js'
import { useGameStore } from '../stores/game.js'

const router = useRouter()
const socketStore = useSocketStore()
const gameStore = useGameStore()

const sessionCode = ref('')
const playerName = ref('')
const selectedAvatar = ref('')
const error = ref('')
const joining = ref(false)

const avatars = ['🦁', '🦊', '🐼', '🐨', '🐯', '🐷', '🐸', '🐙', '🦄', '🐲']

const canJoin = computed(() => 
  sessionCode.value.length === 4 && 
  playerName.value.trim().length >= 2
)

onMounted(() => {
  socketStore.connect()
  if (!selectedAvatar.value) {
    selectedAvatar.value = avatars[Math.floor(Math.random() * avatars.length)]
  }
})

function joinGame() {
  if (!canJoin.value) return

  joining.value = true
  error.value = ''

  socketStore.emit('player:join', {
    sessionCode: sessionCode.value,
    playerName: playerName.value.trim(),
    avatar: selectedAvatar.value
  })

  socketStore.on('player:joined', ({ sessionCode, player, sessionStatus, totalQuestions }) => {
    gameStore.setSession(sessionCode, false)
    gameStore.setPlayer(player.name, player.avatar)
    gameStore.setStatus(sessionStatus)
    gameStore.totalQuestions = totalQuestions
    joining.value = false
    router.push(`/play/${sessionCode}`)
  })

  socketStore.on('join:error', ({ message }) => {
    error.value = message
    joining.value = false
  })
}
</script>

<style scoped>
.join-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 2rem;
}

.join-card {
  width: 100%;
  max-width: 450px;
  text-align: center;
}

.join-card h1 {
  color: #667eea;
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

.subtitle {
  color: #888;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.code-input {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.5rem;
  text-transform: uppercase;
}

.avatar-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}

.avatar-btn {
  width: 50px;
  height: 50px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-btn:hover {
  border-color: #667eea;
  transform: scale(1.1);
}

.avatar-btn.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea20, #764ba220);
  transform: scale(1.1);
}

.btn-full {
  width: 100%;
  margin-top: 1rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.back-link {
  display: block;
  margin-top: 1.5rem;
  color: #888;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  color: #667eea;
}
</style>
