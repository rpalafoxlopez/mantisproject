<template>
  <div class="dashboard">
    <aside class="sidebar">
      <!-- <div class="sidebar-logo">
        <span class="logo"><img src="/img/quizhive.png" width="120" alt="QuizHive Logo"></span>
      </div> -->
      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-item active">
          <span class="nav-icon">📋</span> Mis Quizzes
        </router-link>
        <router-link to="/host" class="nav-item">
          <span class="nav-icon">▶️</span> Iniciar partida
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="admin-chip">
          <span class="admin-avatar">A</span>
          <span>Admin</span>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="topbar-left">
          <h1>Mis Quizzes</h1>
          <span class="quiz-count">{{ sessions.length }} {{ sessions.length === 1 ? 'partida' : 'partidas' }}</span>
        </div>
        <button class="btn-new" @click="openCreateModal">
          <span class="plus">+</span> Nuevo Quiz
        </button>
      </header>

      <div class="filters">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input v-model="search" type="text" placeholder="Buscar por nombre o código…" class="search-input" />
        </div>
        <div class="filter-tabs">
          <button v-for="f in filters" :key="f.value" class="filter-tab" :class="{ active: activeFilter === f.value }" @click="activeFilter = f.value">{{ f.label }}</button>
        </div>
      </div>

      <div v-if="loading" class="loading-grid">
        <div v-for="i in 6" :key="i" class="skeleton-card" />
      </div>

      <div v-else-if="!filtered.length" class="empty-state">
        <div class="empty-icon">🐝</div>
        <h3>{{ search ? 'Sin resultados' : 'Aún no hay quizzes' }}</h3>
        <p>{{ search ? 'Intenta con otro término de búsqueda.' : 'Crea tu primer quiz y comparte el código con tus jugadores.' }}</p>
        <button v-if="!search" class="btn-new" @click="openCreateModal">+ Crear primer Quiz</button>
      </div>

      <TransitionGroup v-else name="cards" tag="div" class="quiz-grid">
        <div v-for="s in filtered" :key="s.code" class="quiz-card" :class="`status-${s.status}`">
          <!-- Link principal que cubre toda la tarjeta (excepto botones) -->
          <a 
            href="#" 
            class="card-link" 
            @click.prevent="goToEdit(s.code)"
          >
            <div class="card-accent" :style="{ background: statusColor(s.status) }" />
            <div class="card-body">
              <div class="card-header-row">
                <span class="status-dot" :style="{ background: statusColor(s.status) }" />
                <span class="status-label">{{ statusLabel(s.status) }}</span>
                <!-- Menú con stopPropagation para evitar que el anchor lo capture -->
                <div class="card-menu" @click.stop>
                  <button class="menu-btn" @click.stop="toggleMenu(s.code)">
                    <span class="menu-dots">⋯</span>
                  </button>
                  <div v-if="openMenu === s.code" class="dropdown" @click.stop>
                    <button @click.stop="goToEdit(s.code)" class="dropdown-item">
                      <span class="dropdown-icon">✏️</span> Editar Quiz
                    </button>
                    <button @click.stop="viewAnalytics(s)" class="dropdown-item">
                      <span class="dropdown-icon">📊</span> Ver Estadísticas
                    </button>
                    <button 
                      @click.stop="startSession(s.code)" 
                      class="dropdown-item"
                      :disabled="s.status !== 'waiting' || !s.questions.length"
                    >
                      <span class="dropdown-icon">▶️</span> Iniciar Partida
                    </button>
                    <button class="dropdown-item danger" @click.stop="confirmDelete(s)">
                      <span class="dropdown-icon">🗑</span> Eliminar Quiz
                    </button>
                  </div>
                </div>
              </div>
              <h2 class="card-title">{{ s.title }}</h2>
              <div class="card-stats">
                <div class="stat">
                  <span class="stat-num">{{ s.questions.length }}</span>
                  <span class="stat-lbl">preguntas</span>
                </div>
                <div class="stat-divider" />
                <div class="stat">
                  <span class="stat-num code-mono">{{ s.code }}</span>
                  <span class="stat-lbl">código</span>
                </div>
                <div class="stat-divider" />
                <div class="stat">
                  <span class="stat-num">{{ formatDate(s.createdAt) }}</span>
                  <span class="stat-lbl">creado</span>
                </div>
              </div>
              <p v-if="!s.questions.length" class="card-warn">⚠️ Sin preguntas — agrega al menos una para poder iniciar</p>
            </div>
          </a>
          
          <!-- Footer con botones (fuera del anchor) -->
          <div class="card-footer">
            <button 
              class="btn-code" 
              @click.stop="copyCode(s.code)" 
              :class="{ copied: copiedCode === s.code }"
            >
              📋 {{ s.code }}
            </button>
            <button class="btn-edit" @click.stop="goToEdit(s.code)">
              Editar →
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <Transition name="modal">
      <div v-if="showCreate" class="modal-overlay" @click.self="closeCreate">
        <div class="modal-card">
          <div class="modal-header"><h2>Nuevo Quiz</h2><button class="modal-close" @click="closeCreate">×</button></div>
          <p class="modal-subtitle">Dale un nombre a tu quiz. Después podrás agregar las preguntas de opción múltiple.</p>
          <div class="field">
            <label>Nombre del quiz *</label>
            <input ref="titleInput" v-model="newTitle" type="text" placeholder="Ej. Trivia de Historia, Quiz del equipo…" maxlength="100" @keyup.enter="createQuiz" />
            <span class="field-hint">{{ newTitle.length }}/100</span>
          </div>
          <p v-if="createError" class="error-msg">{{ createError }}</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="closeCreate">Cancelar</button>
            <button class="btn-create" :disabled="creating || !newTitle.trim()" @click="createQuiz"><span v-if="creating" class="spinner" /><span v-else>Crear Quiz →</span></button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal-card modal-sm">
          <h2>¿Eliminar quiz?</h2>
          <p class="modal-subtitle">Se eliminará <strong>{{ deleteTarget.title }}</strong> y todas sus preguntas. Esta acción no se puede deshacer.</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="deleteTarget = null">Cancelar</button>
            <button class="btn-danger" :disabled="deleting" @click="doDelete">{{ deleting ? 'Eliminando…' : 'Sí, eliminar' }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="openMenu" class="click-outside" @click="openMenu = null" />

    <QuizAnalyticsModal
      :show="showAnalyticsModal"
      :quiz="selectedQuiz"
      @close="showAnalyticsModal = false"
      @deleted="onQuizDeleted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import QuizAnalyticsModal from './QuizAnalyticsModal.vue'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const router = useRouter()

const sessions = ref([])
const loading = ref(true)
const search = ref('')
const activeFilter = ref('all')
const openMenu = ref(null)
const copiedCode = ref(null)
const showCreate = ref(false)
const newTitle = ref('')
const creating = ref(false)
const createError = ref('')
const titleInput = ref(null)
const deleteTarget = ref(null)
const deleting = ref(false)

const showAnalyticsModal = ref(false)
const selectedQuiz = ref(null)

const filters = [
  { label: 'Todos', value: 'all' },
  { label: 'En espera', value: 'waiting' },
  { label: 'En juego', value: 'active' },
  { label: 'Finalizados', value: 'finished' },
]

const filtered = computed(() => {
  let list = sessions.value
  if (activeFilter.value !== 'all') list = list.filter(s => s.status === activeFilter.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(s => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
  }
  return list
})

// Función para cerrar menú al hacer clic fuera
function handleClickOutside(event) {
  if (openMenu.value && !event.target.closest('.card-menu')) {
    openMenu.value = null
  }
}

onMounted(() => {
  fetchSessions()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

async function fetchSessions() {
  loading.value = true
  try {
    const { data } = await axios.get(`${API}/api/sessions`)
    sessions.value = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch { /* silent */ }
  finally { loading.value = false }
}

function openCreateModal() {
  showCreate.value = true
  newTitle.value = ''
  createError.value = ''
  nextTick(() => titleInput.value?.focus())
}
function closeCreate() { showCreate.value = false }

async function createQuiz() {
  if (!newTitle.value.trim() || creating.value) return
  creating.value = true
  createError.value = ''
  try {
    const { data } = await axios.post(`${API}/api/sessions/create`, { title: newTitle.value.trim() })
    sessions.value.unshift(data)
    closeCreate()
    router.push(`/admin?code=${data.code}`)
  } catch (e) {
    createError.value = e.response?.data?.error || 'Error al crear el quiz.'
  } finally { creating.value = false }
}

function goToEdit(code) { openMenu.value = null; router.push(`/admin?code=${code}`) }
function startSession(code) { openMenu.value = null; router.push(`/host?code=${code}`) }
function toggleMenu(code) { openMenu.value = openMenu.value === code ? null : code }
function confirmDelete(session) { openMenu.value = null; deleteTarget.value = session }

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await axios.delete(`${API}/api/sessions/${deleteTarget.value.code}`)
    sessions.value = sessions.value.filter(s => s.code !== deleteTarget.value.code)
    deleteTarget.value = null
  } catch { alert('Error al eliminar.') }
  finally { deleting.value = false }
}

async function copyCode(code) {
  await navigator.clipboard.writeText(code)
  copiedCode.value = code
  setTimeout(() => { if (copiedCode.value === code) copiedCode.value = null }, 2000)
}

function statusLabel(s) { return { waiting: 'En espera', active: 'En juego', finished: 'Finalizado' }[s] ?? s }
function statusColor(s) { return { waiting: '#16a34a', active: '#f59e0b', finished: '#9ca3af' }[s] ?? '#6b7280' }
function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) }

function viewAnalytics(quiz) {
  selectedQuiz.value = quiz
  showAnalyticsModal.value = true
  openMenu.value = null
}

function onQuizDeleted(code) {
  sessions.value = sessions.value.filter(s => s.code !== code)
  showAnalyticsModal.value = false
  selectedQuiz.value = null
}
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.dashboard { display: flex; min-height: 100vh; background: #f8fafc; color: #1e293b; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
.sidebar { width: 240px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 0; height: 100vh; }
.sidebar-logo { display: flex; align-items: center; gap: .6rem; padding: 1.4rem 1.2rem; border-bottom: 1px solid #e2e8f0; }
.logo-icon { font-size: 1.4rem; }
.logo-text { font-size: 1.15rem; font-weight: 800; letter-spacing: .08rem; color: #16a34a; }
.sidebar-nav { flex: 1; padding: 1rem .6rem; display: flex; flex-direction: column; gap: .25rem; }
.nav-item { display: flex; align-items: center; gap: .6rem; padding: .55rem .8rem; border-radius: 8px; color: #64748b; text-decoration: none; font-size: .88rem; font-weight: 500; transition: background .15s, color .15s; }
.nav-item:hover, .nav-item.active { background: #f0fdf4; color: #16a34a; }
.nav-icon { font-size: .9rem; }
.sidebar-footer { padding: 1rem 1.2rem; border-top: 1px solid #e2e8f0; }
.admin-chip { display: flex; align-items: center; gap: .5rem; font-size: .85rem; color: #64748b; }
.admin-avatar { width: 28px; height: 28px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 2rem 2.5rem; gap: 1.5rem; }
.topbar { display: flex; justify-content: space-between; align-items: flex-end; }
.topbar-left { display: flex; align-items: baseline; gap: .75rem; }
h1 { font-size: 1.6rem; font-weight: 800; color: #0f172a; }
.quiz-count { font-size: .85rem; color: #64748b; background: #ffffff; border: 1px solid #e2e8f0; padding: .2rem .6rem; border-radius: 20px; }
.btn-new { background: #16a34a; color: #fff; border: none; border-radius: 8px; padding: .55rem 1.2rem; font-size: .9rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: .4rem; transition: background .2s, transform .15s; }
.btn-new:hover { background: #15803d; transform: translateY(-1px); }
.plus { font-size: 1.1rem; line-height: 1; }
.filters { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 340px; }
.search-icon { position: absolute; left: .75rem; top: 50%; transform: translateY(-50%); font-size: .85rem; pointer-events: none; }
.search-input { width: 100%; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b; padding: .5rem .75rem .5rem 2.2rem; font-size: .88rem; outline: none; transition: border-color .2s, box-shadow .2s; }
.search-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
.filter-tabs { display: flex; gap: .3rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: .25rem; }
.filter-tab { background: transparent; border: none; color: #64748b; padding: .3rem .75rem; border-radius: 6px; cursor: pointer; font-size: .82rem; font-weight: 500; transition: background .15s, color .15s; }
.filter-tab.active { background: #dcfce7; color: #16a34a; }
.quiz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; align-content: start; }

/* Quiz Card */
.quiz-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.2s ease; position: relative; }
.quiz-card:hover { border-color: #bbf7d0; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }

.card-link { display: block; text-decoration: none; color: inherit; cursor: pointer; flex: 1; }
.card-link:hover { text-decoration: none; }

.card-accent { height: 4px; width: 100%; }
.card-body { padding: 1rem 1rem 0.6rem; }

.card-header-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; position: relative; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-label { font-size: 0.7rem; color: #64748b; flex: 1; text-transform: uppercase; letter-spacing: 0.05rem; font-weight: 700; }

/* Menú desplegable mejorado */
.card-menu { position: relative; z-index: 10; }
.menu-btn { background: transparent; border: none; cursor: pointer; padding: 8px 12px; border-radius: 8px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
.menu-dots { font-size: 1.4rem; font-weight: 700; color: #94a3b8; letter-spacing: 2px; line-height: 1; }
.menu-btn:hover { background: #f1f5f9; }
.menu-btn:hover .menu-dots { color: #475569; }

.dropdown { position: absolute; right: 0; top: calc(100% + 8px); background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; min-width: 220px; z-index: 50; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02); overflow: hidden; animation: dropdownFadeIn 0.15s ease-out; }

.dropdown-item { display: flex; align-items: center; gap: 0.75rem; width: 100%; background: transparent; border: none; color: #334155; padding: 0.75rem 1rem; text-align: left; font-size: 0.9rem; cursor: pointer; transition: all 0.15s ease; }
.dropdown-item:hover { background: #f8fafc; }
.dropdown-item:active { background: #f1f5f9; }
.dropdown-icon { font-size: 1.1rem; width: 28px; text-align: center; }
.dropdown-item.danger { color: #dc2626; border-top: 1px solid #f1f5f9; margin-top: 4px; }
.dropdown-item.danger:hover { background: #fef2f2; }
.dropdown-item:disabled { opacity: 0.4; cursor: not-allowed; }

@keyframes dropdownFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-title { font-size: 1rem; font-weight: 700; line-height: 1.35; margin-bottom: 0.85rem; cursor: pointer; transition: color 0.15s; color: #0f172a; }
.card-link:hover .card-title { color: #16a34a; }

.card-stats { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
.stat { display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
.stat-lbl { font-size: 0.68rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04rem; }
.code-mono { font-family: 'Courier New', monospace; letter-spacing: 0.1rem; color: #16a34a; font-size: 0.82rem; }
.stat-divider { width: 1px; height: 28px; background: #e2e8f0; }
.card-warn { font-size: 0.75rem; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 0.3rem 0.6rem; margin-top: 0.4rem; }

/* Footer */
.card-footer { padding: 0.75rem 1rem; border-top: 1px solid #f1f5f9; display: flex; gap: 0.5rem; justify-content: space-between; align-items: center; background: #ffffff; }
.btn-code { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; border-radius: 8px; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-family: 'Courier New', monospace; cursor: pointer; transition: all 0.2s; font-weight: 500; }
.btn-code:hover { border-color: #16a34a; color: #16a34a; background: #f0fdf4; }
.btn-code.copied { border-color: #16a34a; color: #16a34a; background: #dcfce7; }
.btn-edit { background: transparent; border: none; color: #16a34a; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0.4rem 0.8rem; transition: all 0.15s; border-radius: 6px; }
.btn-edit:hover { background: #f0fdf4; color: #15803d; }

.loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
.skeleton-card { height: 200px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.empty-state { text-align: center; padding: 4rem 2rem; color: #94a3b8; }
.empty-icon { font-size: 3rem; margin-bottom: 1rem; }
.empty-state h3 { font-size: 1.1rem; color: #334155; margin-bottom: 0.4rem; }
.empty-state p { font-size: 0.9rem; margin-bottom: 1.5rem; }

/* Modales */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
.modal-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 1.75rem; width: 100%; max-width: 460px; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
.modal-sm { max-width: 380px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.modal-header h2 { font-size: 1.2rem; color: #0f172a; }
.modal-close { background: transparent; border: none; color: #94a3b8; font-size: 1.4rem; cursor: pointer; line-height: 1; padding: 0.1rem 0.3rem; border-radius: 6px; transition: all 0.2s; }
.modal-close:hover { background: #f1f5f9; color: #475569; }
.modal-subtitle { color: #64748b; font-size: 0.88rem; margin-bottom: 1.2rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.5rem; }
.field label { font-size: 0.82rem; color: #475569; font-weight: 600; }
.field input { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; color: #1e293b; padding: 0.6rem 0.8rem; font-size: 0.95rem; outline: none; transition: all 0.2s; }
.field input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
.field-hint { font-size: 0.7rem; color: #94a3b8; align-self: flex-end; }
.error-msg { color: #dc2626; font-size: 0.8rem; margin-bottom: 0.5rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.2rem; }
.btn-cancel { background: transparent; border: 1px solid #e2e8f0; color: #64748b; border-radius: 10px; padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
.btn-cancel:hover { background: #f8fafc; border-color: #cbd5e1; }
.btn-create { background: #16a34a; color: #fff; border: none; border-radius: 10px; padding: 0.55rem 1.3rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s; }
.btn-create:hover:not(:disabled) { background: #15803d; transform: translateY(-1px); }
.btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { background: #dc2626; color: #fff; border: none; border-radius: 10px; padding: 0.55rem 1.1rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-danger:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.click-outside { position: fixed; inset: 0; z-index: 40; }

/* Transiciones */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
.cards-enter-active, .cards-leave-active { transition: all 0.22s ease; }
.cards-enter-from { opacity: 0; transform: translateY(10px); }
.cards-leave-to { opacity: 0; transform: scale(0.95); }

/* Responsive */
@media (max-width: 768px) { 
  .sidebar { display: none; } 
  .main { padding: 1rem; } 
  .topbar { flex-direction: column; align-items: flex-start; gap: 0.75rem; } 
  .filters { flex-direction: column; align-items: stretch; } 
  .search-wrap { max-width: 100%; }
  .quiz-grid { grid-template-columns: 1fr; }
}
</style>