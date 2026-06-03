<template>
  <div class="admin-view">
    <header class="admin-header">
      <div class="header-inner">
        <router-link to="/dashboard" class="back-link">← Dashboard</router-link>
        <span class="logo">
          <img src="/img/quizhive.png" width="120" alt="QuizHive Logo">
        </span>
        <h1>Editor de Quiz</h1>
      </div>
    </header>

    <main class="admin-main">
      <!-- ✅ FIX: Estado de carga mientras se resuelve la sesión -->
      <section v-if="loading" class="card create-card">
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando sesión...</p>
        </div>
      </section>

      <section v-else-if="!currentSession" class="card create-card">
        <h2>Nueva Partida</h2>
        <p class="subtitle">Crea una partida, escribe tus preguntas y comparte el código con los jugadores.</p>
        <div class="field">
          <label>Título de la partida</label>
          <input v-model="newTitle" type="text" placeholder="Ej. Quiz de Historia, Trivia del equipo…" maxlength="100" @keyup.enter="createSession" />
        </div>
        <button class="btn-primary" :disabled="creating || !newTitle.trim()" @click="createSession">
          <span v-if="creating">Creando…</span><span v-else>🚀 Crear Partida</span>
        </button>
        <p v-if="createError" class="error-msg">{{ createError }}</p>

        <div v-if="waitingSessions.length" class="prev-sessions">
          <h3>Partidas anteriores</h3>
          <div v-for="s in waitingSessions" :key="s.code" class="prev-item" @click="loadSession(s.code)">
            <span class="prev-title">{{ s.title }}</span>
            <span class="prev-code">{{ s.code }}</span>
            <span class="prev-count">{{ s.questions.length }} preg.</span>
          </div>
        </div>
      </section>

      <template v-else>
        <section class="card code-card">
          <div class="code-top">
            <div><h2>{{ currentSession.title }}</h2><p class="subtitle">Comparte este código con los jugadores</p></div>
            <button class="btn-ghost" @click="exitSession">← Salir</button>
          </div>
          <div class="code-display">
            <span class="room-code">{{ currentSession.code }}</span>
            <button class="btn-copy" @click="copyCode" :class="{ copied: codeCopied }">{{ codeCopied ? '✅ Copiado' : '📋 Copiar' }}</button>
          </div>
          <div class="share-row">
            <input class="share-input" readonly :value="shareUrl" />
            <button class="btn-share" @click="shareLink">🔗 Compartir enlace</button>
          </div>
          <div class="session-meta">
            <span class="badge badge-waiting" v-if="currentSession.status === 'waiting'">En espera</span>
            <span class="badge badge-active" v-else-if="currentSession.status === 'active'">En juego</span>
            <span class="badge badge-finished" v-else-if="currentSession.status === 'finished'">Finalizado</span>
            <span>{{ currentSession.questions.length }} preguntas</span>
            <button class="btn-danger-sm" @click="deleteSession">🗑 Eliminar partida</button>
          </div>
        </section>

        <section class="card questions-card">
          <div class="questions-header">
            <h2>Preguntas</h2>
            <button class="btn-primary" @click="openQuestionForm(null)">+ Agregar pregunta</button>
          </div>
          <div v-if="!currentSession.questions.length" class="empty-state"><p>Aún no hay preguntas. ¡Agrega la primera!</p></div>
          <TransitionGroup name="qlist" tag="div" class="question-list">
            <div v-for="(q, idx) in currentSession.questions" :key="idx" class="question-item">
              <div class="question-num">{{ idx + 1 }}</div>
              <div class="question-body">
                <p class="question-text">{{ q.text }}</p>
                <div class="options-preview">
                  <span v-for="(opt, oi) in q.options" :key="oi" class="opt-chip" :class="{ correct: opt.isCorrect }">{{ opt.text }}</span>
                </div>
                <span class="time-label">⏱ {{ q.timeLimit }}s</span>
              </div>
              <div class="question-actions">
                <button class="btn-icon" title="Editar" @click="openQuestionForm(idx)">✏️</button>
                <button class="btn-icon btn-del" title="Eliminar" @click="deleteQuestion(idx)">🗑</button>
              </div>
            </div>
          </TransitionGroup>
        </section>
      </template>
    </main>

    <Transition name="modal">
      <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
        <div class="modal-card">
          <h2>{{ editIndex === null ? 'Nueva Pregunta' : 'Editar Pregunta' }}</h2>
          <div class="field">
            <label>Pregunta *</label>
            <textarea v-model="form.text" placeholder="Escribe la pregunta aquí…" rows="2" maxlength="500" />
          </div>
          <div class="field">
            <label>Tiempo límite (segundos)</label>
            <input v-model.number="form.timeLimit" type="number" min="5" max="120" />
          </div>
          <div class="options-section">
            <div class="options-header-row"><label>Opciones de respuesta *</label><span class="options-hint">Selecciona cuál es la correcta</span></div>
            <p class="options-rule">⚠️ Mínimo 2, máximo 6 opciones. Exactamente 1 correcta.</p>
            <div v-for="(opt, i) in form.options" :key="i" class="option-row" :class="{ 'option-correct': opt.isCorrect }">
              <button class="correct-toggle" :class="{ active: opt.isCorrect }" @click="setCorrect(i)" type="button" title="Marcar como correcta">{{ opt.isCorrect ? '✅' : '○' }}</button>
              <input v-model="opt.text" type="text" :placeholder="`Opción ${i + 1}`" maxlength="200" class="option-input" />
              <button v-if="form.options.length > 2" class="btn-icon btn-del" @click="removeOption(i)" type="button">×</button>
            </div>
            <button v-if="form.options.length < 6" class="btn-add-option" @click="addOption" type="button">+ Agregar opción</button>
          </div>
          <p v-if="formError" class="error-msg">{{ formError }}</p>
          <div class="modal-actions">
            <button class="btn-ghost" @click="closeForm">Cancelar</button>
            <button class="btn-primary" :disabled="saving" @click="saveQuestion">{{ saving ? 'Guardando…' : (editIndex === null ? 'Agregar' : 'Guardar') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
function authHeaders() {
  return { headers: { Authorization: `Bearer ${authStore.token}` } }
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const currentSession = ref(null)
const waitingSessions = ref([])
const newTitle = ref('')
const creating = ref(false)
const createError = ref('')
const codeCopied = ref(false)
const showForm = ref(false)
const editIndex = ref(null)
const saving = ref(false)
const formError = ref('')
const loading = ref(true)  // ✅ FIX: Estado de carga
const form = ref(emptyForm())

function emptyForm() {
  return { text: '', timeLimit: 20, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }
}

const shareUrl = computed(() => currentSession.value ? `${window.location.origin}/join?code=${currentSession.value.code}` : '')

// ✅ FIX: Lógica de onMounted completamente reescrita
onMounted(async () => {
  loading.value = true
  currentSession.value = null

  try {
    // 1. Cargar lista de sesiones en espera (para el panel "Nueva Partida")
    await fetchWaitingSessions()

    // 2. PRIORIDAD 1: Código desde query param (?code=XYZ)
    const codeFromUrl = route.query.code
    if (codeFromUrl) {
      console.log('🔍 Cargando sesión desde URL:', codeFromUrl)
      const loaded = await loadSession(codeFromUrl.toUpperCase())
      if (loaded) {
        loading.value = false
        return
      }
      // Si falla la carga desde URL, continuar con fallback
    }

    // 3. PRIORIDAD 2: Código guardado en localStorage
    const saved = localStorage.getItem('quizhive_admin_code')
    if (saved) {
      console.log('🔍 Cargando sesión desde localStorage:', saved)
      const loaded = await loadSession(saved.toUpperCase())
      if (loaded) {
        loading.value = false
        return
      }
      // Si no existe más, limpiar
      localStorage.removeItem('quizhive_admin_code')
    }

    // 4. Ninguna sesión cargada — mostrar "Nueva Partida"
    console.log('📭 No hay sesión activa, mostrando formulario de creación')
    currentSession.value = null

  } catch (err) {
    console.error('❌ Error en onMounted:', err)
    currentSession.value = null
  } finally {
    loading.value = false
  }
})

async function fetchWaitingSessions() {
  try { 
    const { data } = await axios.get(`${API}/api/sessions`, authHeaders())
    // ✅ FIX: Incluir 'waiting' y 'active' (sesiones editables)
    waitingSessions.value = data.filter(s => s.status === 'waiting' || s.status === 'active')
  } catch { /* silent */ }
}

async function createSession() {
  if (!newTitle.value.trim()) return
  creating.value = true; createError.value = ''
  try {
    const { data } = await axios.post(`${API}/api/sessions/create`, { title: newTitle.value.trim() }, authHeaders())
    currentSession.value = data
    localStorage.setItem('quizhive_admin_code', data.code)
    newTitle.value = ''
  } catch (e) { 
    createError.value = e.response?.data?.error || 'Error al crear la partida.' 
  } finally { 
    creating.value = false 
  }
}

// ✅ FIX: loadSession ahora retorna booleano y maneja errores correctamente
async function loadSession(code) {
  if (!code) return false
  try { 
    const { data } = await axios.get(`${API}/api/sessions/${code}`, authHeaders())
    // ✅ FIX: Aceptar 'waiting' y 'active' como estados editables
    if (data && (data.status === 'waiting' || data.status === 'active')) {
      currentSession.value = data
      localStorage.setItem('quizhive_admin_code', data.code)
      console.log('✅ Sesión cargada:', data.title, '-', data.code, '- status:', data.status)
      return true
    } else {
      console.log('⚠️ Sesión no editable, status:', data?.status)
      return false
    }
  } catch (err) { 
    console.error('❌ Error cargando sesión:', code, err.message)
    return false
  }
}

function exitSession() { 
  currentSession.value = null
  localStorage.removeItem('quizhive_admin_code')
  router.push('/dashboard') 
}

async function deleteSession() {
  if (!confirm('¿Eliminar esta partida y todas sus preguntas?')) return
  try { 
    await axios.delete(`${API}/api/sessions/${currentSession.value.code}`, authHeaders())
    localStorage.removeItem('quizhive_admin_code')
    exitSession() 
  } catch { 
    alert('Error al eliminar la partida.') 
  }
}

function copyCode() { 
  navigator.clipboard.writeText(currentSession.value.code)
  codeCopied.value = true
  setTimeout(() => (codeCopied.value = false), 2000) 
}

function shareLink() { 
  if (navigator.share) { 
    navigator.share({ title: currentSession.value.title, url: shareUrl.value }) 
  } else { 
    navigator.clipboard.writeText(shareUrl.value)
    alert('Enlace copiado al portapapeles.') 
  } 
}

function openQuestionForm(index) {
  editIndex.value = index
  formError.value = ''
  if (index === null) { 
    form.value = emptyForm() 
  } else { 
    const q = currentSession.value.questions[index]
    form.value = { 
      text: q.text, 
      timeLimit: q.timeLimit, 
      options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })) 
    } 
  }
  showForm.value = true
}

function closeForm() { 
  showForm.value = false
  formError.value = '' 
}

function addOption() { 
  if (form.value.options.length < 6) form.value.options.push({ text: '', isCorrect: false }) 
}

function removeOption(i) { 
  if (form.value.options.length <= 2) return
  const wasCorrect = form.value.options[i].isCorrect
  form.value.options.splice(i, 1)
  if (wasCorrect) form.value.options[0].isCorrect = true 
}

function setCorrect(i) { 
  form.value.options.forEach((o, idx) => (o.isCorrect = idx === i)) 
}

function validateForm() {
  if (!form.value.text.trim()) return 'El texto de la pregunta es requerido.'
  if (form.value.options.length < 2) return 'Se requieren al menos 2 opciones.'
  if (form.value.options.some(o => !o.text.trim())) return 'Todas las opciones deben tener texto.'
  const correctCount = form.value.options.filter(o => o.isCorrect).length
  if (correctCount !== 1) return 'Debe haber exactamente 1 respuesta correcta.'
  return null
}

async function saveQuestion() {
  const err = validateForm()
  if (err) { 
    formError.value = err
    return 
  }
  saving.value = true
  formError.value = ''
  const code = currentSession.value.code
  const payload = { 
    text: form.value.text.trim(), 
    options: form.value.options, 
    timeLimit: form.value.timeLimit 
  }
  try {
    let res
    if (editIndex.value === null) { 
      res = await axios.post(`${API}/api/sessions/${code}/questions`, payload, authHeaders()) 
    } else { 
      res = await axios.put(`${API}/api/sessions/${code}/questions/${editIndex.value}`, payload, authHeaders()) 
    }
    currentSession.value = res.data
    closeForm()
  } catch (e) { 
    formError.value = e.response?.data?.error || 'Error al guardar la pregunta.' 
  } finally { 
    saving.value = false 
  }
}

async function deleteQuestion(idx) {
  if (!confirm('¿Eliminar esta pregunta?')) return
  try { 
    const { data } = await axios.delete(`${API}/api/sessions/${currentSession.value.code}/questions/${idx}`, authHeaders())
    currentSession.value = data 
  } catch { 
    alert('Error al eliminar la pregunta.') 
  }
}
</script>

<style scoped>
.admin-view { min-height: 100vh; background: #f8fafc; color: #1e293b; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
.admin-header { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; }
.header-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; gap: 1rem; }
.logo { font-size: 1.5rem; color: #16a34a; font-weight: 700; }
h1 { font-size: 1.2rem; font-weight: 600; color: #0f172a; margin: 0; }
.back-link { color: #64748b; text-decoration: none; font-size: .85rem; padding: .3rem .7rem; border: 1px solid #e2e8f0; border-radius: 6px; transition: all .2s; white-space: nowrap; }
.back-link:hover { color: #0f172a; border-color: #cbd5e1; }
.admin-main { max-width: 900px; margin: 2rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1.5rem; }
.card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
h2 { margin: 0 0 .4rem; font-size: 1.25rem; color: #0f172a; }
.subtitle { color: #64748b; font-size: .9rem; margin: 0 0 1.2rem; }
.create-card { max-width: 540px; margin: 0 auto; width: 100%; }
.code-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.code-display { display: flex; align-items: center; gap: 1rem; background: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; padding: .8rem 1.2rem; margin-bottom: 1rem; }
.room-code { font-size: 2.8rem; font-weight: 800; letter-spacing: .4rem; color: #16a34a; font-family: 'Courier New', monospace; flex: 1; }
.share-row { display: flex; gap: .5rem; margin-bottom: 1rem; }
.share-input { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; padding: .4rem .8rem; font-size: .85rem; }
.session-meta { display: flex; align-items: center; gap: 1rem; font-size: .9rem; color: #64748b; }
.questions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.empty-state { text-align: center; padding: 2rem; color: #94a3b8; border: 2px dashed #e2e8f0; border-radius: 8px; }
.question-list { display: flex; flex-direction: column; gap: .75rem; }
.question-item { display: flex; align-items: flex-start; gap: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: .9rem 1rem; transition: border-color .2s; }
.question-item:hover { border-color: #16a34a; }
.question-num { min-width: 28px; height: 28px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; flex-shrink: 0; }
.question-body { flex: 1; }
.question-text { margin: 0 0 .5rem; font-size: .95rem; color: #1e293b; }
.options-preview { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: .4rem; }
.opt-chip { font-size: .75rem; padding: .15rem .55rem; border-radius: 20px; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
.opt-chip.correct { background: #dcfce7; color: #16a34a; border-color: #16a34a; font-weight: 600; }
.time-label { font-size: .75rem; color: #94a3b8; }
.question-actions { display: flex; gap: .4rem; flex-shrink: 0; }
.field { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1rem; }
.field label { font-size: .85rem; color: #475569; font-weight: 500; }
input[type="text"], input[type="number"], textarea { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b; padding: .6rem .8rem; font-size: .95rem; outline: none; transition: border-color .2s, box-shadow .2s; font-family: inherit; resize: vertical; }
input:focus, textarea:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
input[type="number"] { width: 80px; }
.btn-primary { background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: .6rem 1.2rem; font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .2s, opacity .2s; }
.btn-primary:hover:not(:disabled) { background: #15803d; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px; padding: .5rem 1rem; cursor: pointer; font-size: .9rem; transition: color .2s, border-color .2s; }
.btn-ghost:hover { color: #0f172a; border-color: #cbd5e1; }
.btn-copy { background: #f8fafc; border: 1px solid #e2e8f0; color: #1e293b; border-radius: 6px; padding: .4rem .9rem; cursor: pointer; font-size: .85rem; transition: background .2s; }
.btn-copy.copied { background: #dcfce7; color: #16a34a; border-color: #16a34a; }
.btn-share { background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: .4rem .9rem; cursor: pointer; font-size: .85rem; white-space: nowrap; }
.btn-icon { background: transparent; border: 1px solid #e2e8f0; border-radius: 6px; padding: .3rem .5rem; cursor: pointer; font-size: .9rem; color: #94a3b8; transition: all .2s; }
.btn-icon:hover { border-color: #cbd5e1; color: #475569; }
.btn-icon.btn-del:hover { border-color: #fca5a5; color: #dc2626; }
.btn-danger-sm { background: transparent; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: .3rem .7rem; font-size: .8rem; cursor: pointer; margin-left: auto; transition: background .2s; }
.btn-danger-sm:hover { background: #fef2f2; }
.btn-add-option { background: transparent; border: 1px dashed #e2e8f0; color: #64748b; border-radius: 6px; padding: .4rem 1rem; width: 100%; cursor: pointer; font-size: .85rem; margin-top: .4rem; transition: all .2s; }
.btn-add-option:hover { border-color: #16a34a; color: #16a34a; }
.badge { font-size: .75rem; padding: .2rem .6rem; border-radius: 20px; font-weight: 600; }
.badge-waiting { background: #dcfce7; color: #16a34a; }
.badge-active { background: #fef3c7; color: #b45309; }
.badge-finished { background: #f3f4f6; color: #6b7280; }
.error-msg { color: #dc2626; font-size: .85rem; margin-top: .4rem; }
.prev-sessions { margin-top: 1.5rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
.prev-sessions h3 { font-size: .9rem; color: #64748b; margin-bottom: .7rem; }
.prev-item { display: flex; align-items: center; gap: .75rem; padding: .5rem .75rem; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: border-color .2s; margin-bottom: .4rem; }
.prev-item:hover { border-color: #16a34a; }
.prev-title { flex: 1; font-size: .9rem; color: #1e293b; }
.prev-code { font-family: monospace; font-size: .85rem; color: #16a34a; font-weight: 700; }
.prev-count { font-size: .8rem; color: #94a3b8; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.1); }
.modal-card h2 { margin: 0 0 1.2rem; color: #0f172a; }
.modal-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1.2rem; }
.options-section { margin-bottom: 1rem; }
.options-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: .3rem; }
.options-hint { font-size: .8rem; color: #94a3b8; }
.options-rule { font-size: .8rem; color: #b45309; margin-bottom: .7rem; }
.option-row { display: flex; align-items: center; gap: .5rem; margin-bottom: .4rem; padding: .4rem .6rem; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; transition: border-color .2s; }
.option-row.option-correct { border-color: #16a34a; background: #f0fdf4; }
.correct-toggle { background: transparent; border: none; cursor: pointer; font-size: 1rem; padding: 0; min-width: 1.5rem; }
.option-input { flex: 1; background: transparent; border: none; color: #1e293b; font-size: .9rem; outline: none; padding: .1rem 0; }
.modal-enter-active, .modal-leave-active { transition: opacity .2s, transform .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.96); }
.qlist-enter-active, .qlist-leave-active { transition: all .25s; }
.qlist-enter-from { opacity: 0; transform: translateY(-8px); }
.qlist-leave-to { opacity: 0; transform: translateX(10px); }

/* ✅ FIX: Estado de carga */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem; color: #64748b; }
.loading-state .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>