<template>
  <div class="join-view">
    <header class="join-header">
      <router-link to="/" class="back-link">← Inicio</router-link>
      <span class="logo"><img src="/img/quizhive.png" width="120" alt="QuizHive Logo"></span>
    </header>

    <main class="join-main">
      <section class="card join-card">
        <h2>🎮 Unirse a un Quiz</h2>
        <p class="subtitle">Ingresa el código y tu nombre para comenzar.</p>

        <div class="field">
          <label>Código del quiz</label>
          <input v-model="code" type="text" placeholder="Ej. ABC123" maxlength="6" @keyup.enter="focusName" />
        </div>

        <div class="field">
          <label>Tu nombre</label>
          <input ref="nameInput" v-model="name" type="text" placeholder="Ej. Juanito" maxlength="20" @keyup.enter="joinQuiz" />
        </div>

        <button class="btn-primary btn-large" :disabled="joining || !code.trim() || !name.trim()" @click="joinQuiz">
          <span v-if="joining">Uniendo…</span><span v-else>🚀 ¡Vamos!</span>
        </button>

        <p v-if="error" class="error-msg">{{ error }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const code = ref('')
const name = ref('')
const joining = ref(false)
const error = ref('')
const nameInput = ref(null)

let socket = null

onMounted(() => {
  const codeFromUrl = route.query.code
  if (codeFromUrl) code.value = codeFromUrl.toUpperCase()
})

onUnmounted(() => {
  if (socket) {
    socket.off('player:joined')
    socket.off('error')
    socket.off('connect_error')
  }
})

function focusName() { nameInput.value?.focus() }

function joinQuiz() {
  if (!code.value.trim() || !name.value.trim() || joining.value) return

  joining.value = true
  error.value = ''

  if (!socket || !socket.connected) {
    socket = io(API, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    })
  }

  socket.off('player:joined')
  socket.off('error')
  socket.off('connect_error')

  socket.once('player:joined', ({ code: c, title }) => {
    console.log('✅ Unido al quiz:', title)
    localStorage.setItem('quizhive_player_code', c)
    localStorage.setItem('quizhive_player_name', name.value.trim())
    router.push(`/play?code=${c}&name=${encodeURIComponent(name.value.trim())}`)
  })

  socket.once('error', ({ message }) => {
    console.log('❌ Error:', message)
    error.value = message
    joining.value = false
  })

  socket.once('connect_error', () => {
    error.value = 'No se pudo conectar al servidor.'
    joining.value = false
  })

  setTimeout(() => {
    if (joining.value) {
      error.value = 'El servidor no respondió. Intenta de nuevo.'
      joining.value = false
    }
  }, 8000)

  socket.emit('player:join', {
    code: code.value.trim(),
    name: name.value.trim()
  })
}
</script>

<style scoped>
.join-view { min-height: 100vh; background: #f8fafc; color: #1e293b; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
.join-header { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
.back-link { color: #64748b; text-decoration: none; font-size: .85rem; padding: .3rem .7rem; border: 1px solid #e2e8f0; border-radius: 6px; transition: all .2s; }
.back-link:hover { color: #0f172a; border-color: #cbd5e1; }
.logo { font-size: 1.3rem; color: #16a34a; font-weight: 700; margin-left: auto; }
.join-main { max-width: 400px; margin: 3rem auto; padding: 0 1rem; }
.card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
h2 { margin: 0 0 .4rem; font-size: 1.25rem; color: #0f172a; }
.subtitle { color: #64748b; font-size: .9rem; margin: 0 0 1.2rem; }
.field { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1rem; }
.field label { font-size: .85rem; color: #475569; font-weight: 500; }
input { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b; padding: .6rem .8rem; font-size: .95rem; outline: none; transition: border-color .2s, box-shadow .2s; }
input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
.btn-primary { background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: .6rem 1.2rem; font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .2s; width: 100%; }
.btn-primary:hover:not(:disabled) { background: #15803d; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-large { font-size: 1.1rem; padding: .8rem; }
.error-msg { color: #dc2626; font-size: .85rem; margin-top: .4rem; text-align: center; }
</style>
