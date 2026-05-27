<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-secondary/10 text-secondary mb-4">
          <span class="material-symbols-outlined text-3xl">group</span>
        </div>
        <h1 class="text-2xl font-bold text-primary">Unirse a Partida</h1>
        <p class="text-on-surface-variant mt-2">Ingresa el código y prepárate para competir</p>
      </div>

      <div class="card p-8">
        <form @submit.prevent="joinGame" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-on-surface mb-1.5">Código de Sala</label>
            <input 
              v-model="sessionCode" 
              class="input text-center text-2xl font-black tracking-widest uppercase"
              placeholder="AB2D"
              maxlength="4"
              @input="sessionCode = sessionCode.toUpperCase().replace(/[^A-Z0-9]/g, '')"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-on-surface mb-1.5">Tu Nombre</label>
            <input 
              v-model="playerName" 
              class="input"
              placeholder="¿Cómo te llamas?"
              maxlength="20"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-on-surface mb-1.5">Elige tu Avatar</label>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="avatar in avatars"
                :key="avatar"
                type="button"
                class="h-12 rounded-xl border-2 text-xl transition-all hover:scale-110"
                :class="selectedAvatar === avatar ? 'border-secondary bg-secondary/10' : 'border-gray-200 hover:border-secondary/50'"
                @click="selectedAvatar = avatar"
              >
                {{ avatar }}
              </button>
            </div>
          </div>

          <div v-if="error" class="error-text flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">error</span>
            {{ error }}
          </div>

          <button 
            type="submit"
            class="btn btn-primary w-full"
            :disabled="!canJoin || joining"
          >
            <span v-if="joining" class="spinner"></span>
            <span v-else class="flex items-center gap-2">
              <span class="material-symbols-outlined">login</span>
              ¡Entrar!
            </span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <router-link to="/" class="text-sm text-on-surface-variant hover:text-secondary transition-colors flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-base">arrow_back</span>
            Volver al inicio
          </router-link>
        </div>
      </div>
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
