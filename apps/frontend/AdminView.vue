<template>
  <div class="admin-container">
    <header class="admin-header">
      <div class="logo-section">
        <img src="/img/logo.png" alt="MANTIS" class="admin-logo" />
        <span class="logo-text">MANTIS</span>
      </div>
      <div class="header-actions">
        <span class="user-badge">{{ authStore.user?.name || 'Admin' }}</span>
        <button class="btn-logout" @click="authStore.logout">
          <span class="material-icons">logout</span>
        </button>
      </div>
    </header>

    <main class="admin-main">
      <section v-if="step === 1" class="step-section">
        <div class="step-header">
          <div class="step-badge">1</div>
          <h2>Crear Nueva Partida</h2>
          <p class="step-desc">Configura los detalles basicos de tu partida</p>
        </div>
        <div class="form-card">
          <div class="form-group">
            <label for="sessionTitle">Titulo de la Partida</label>
            <input id="sessionTitle" v-model="sessionTitle" type="text"
              placeholder="Ej: Evaluacion de Pensamiento Critico - Grupo A" maxlength="100" />
          </div>
          <div class="form-group">
            <label>Configuracion de Tiempo</label>
            <div class="settings-row">
              <div class="setting-item">
                <span class="setting-label">Tiempo por pregunta</span>
                <div class="time-selector">
                  <button @click="timePerQuestion = Math.max(5, timePerQuestion - 5)">-</button>
                  <span class="time-value">{{ timePerQuestion }}s</span>
                  <button @click="timePerQuestion = Math.min(120, timePerQuestion + 5)">+</button>
                </div>
              </div>
              <div class="setting-item">
                <label class="toggle-label">
                  <input type="checkbox" v-model="showLeaderboard" />
                  <span class="toggle-slider"></span>
                  <span class="toggle-text">Mostrar leaderboard entre preguntas</span>
                </label>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-primary btn-large" @click="goToStep2" :disabled="!sessionTitle.trim()">
              <span class="material-icons">arrow_forward</span>
              Siguiente: Agregar Preguntas
            </button>
          </div>
        </div>
      </section>

      <section v-if="step === 2" class="step-section">
        <div class="step-header">
          <div class="step-badge">2</div>
          <h2>Agregar Preguntas</h2>
          <p class="step-desc">
            <span class="badge badge-info">Solo Opcion Multiple</span>
            Cada pregunta debe tener entre 2 y 6 opciones y una respuesta correcta.
          </p>
        </div>
        <div class="questions-container">
          <div v-for="(q, index) in questions" :key="q.id" class="question-card"
            :class="{ 'has-error': q.errors.length > 0 }">
            <div class="question-header">
              <span class="question-number">Pregunta {{ index + 1 }}</span>
              <div class="question-actions">
                <button class="btn-icon" @click="moveQuestion(index, -1)" :disabled="index === 0">
                  <span class="material-icons">arrow_upward</span>
                </button>
                <button class="btn-icon" @click="moveQuestion(index, 1)" :disabled="index === questions.length - 1">
                  <span class="material-icons">arrow_downward</span>
                </button>
                <button class="btn-icon btn-danger" @click="removeQuestion(index)">
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>Texto de la Pregunta <span class="required">*</span></label>
              <textarea v-model="q.question" rows="2" placeholder="Escribe tu pregunta aqui..."
                @blur="validateQuestion(index)"></textarea>
            </div>
            <div class="options-section">
              <label>Opciones de Respuesta <span class="required">*</span>
                <span class="hint">(Minimo 2, Maximo 6)</span>
              </label>
              <div class="options-list">
                <div v-for="(opt, optIndex) in q.options" :key="optIndex" class="option-row"
                  :class="{ 'correct-option': q.correctAnswer === optIndex }">
                  <span class="option-letter">{{ ['A','B','C','D','E','F'][optIndex] }}</span>
                  <input v-model="q.options[optIndex]" type="text"
                    :placeholder="'Opcion ' + ['A','B','C','D','E','F'][optIndex]"
                    @blur="validateQuestion(index)" />
                  <label class="correct-radio" title="Marcar como correcta">
                    <input type="radio" :name="'correct-' + q.id" :value="optIndex"
                      v-model="q.correctAnswer" @change="validateQuestion(index)" />
                    <span class="radio-indicator">
                      <span class="material-icons">check_circle</span>
                    </span>
                  </label>
                  <button v-if="q.options.length > 2" class="btn-icon btn-sm btn-danger"
                    @click="removeOption(index, optIndex)">
                    <span class="material-icons">close</span>
                  </button>
                </div>
              </div>
              <button v-if="q.options.length < 6" class="btn-add-option" @click="addOption(index)">
                <span class="material-icons">add_circle</span> Agregar Opcion
              </button>
            </div>
            <div class="question-settings">
              <div class="setting-field">
                <label>Tiempo (s)</label>
                <input v-model.number="q.timeLimit" type="number" min="5" max="120" />
              </div>
              <div class="setting-field">
                <label>Puntos</label>
                <input v-model.number="q.points" type="number" min="10" max="1000" step="10" />
              </div>
              <div class="setting-field">
                <label>Dificultad</label>
                <select v-model="q.difficulty">
                  <option value="easy">Facil</option>
                  <option value="medium">Media</option>
                  <option value="hard">Dificil</option>
                </select>
              </div>
            </div>
            <div v-if="q.errors.length > 0" class="errors-box">
              <span class="material-icons">error</span>
              <ul><li v-for="err in q.errors" :key="err">{{ err }}</li></ul>
            </div>
          </div>
          <button class="btn-add-question" @click="addQuestion" :disabled="questions.length >= 25">
            <span class="material-icons">add</span>
            <span>Agregar Pregunta</span>
            <span class="count">({{ questions.length }}/25)</span>
          </button>
        </div>
        <div class="form-actions step-nav">
          <button class="btn-secondary" @click="step = 1">
            <span class="material-icons">arrow_back</span> Atras
          </button>
          <button class="btn-primary btn-large" @click="goToStep3" :disabled="!isQuestionsValid">
            <span class="material-icons">arrow_forward</span> Revisar y Crear Partida
          </button>
        </div>
      </section>

      <section v-if="step === 3" class="step-section">
        <div class="step-header">
          <div class="step-badge">3</div>
          <h2>Revisar y Crear</h2>
          <p class="step-desc">Verifica los detalles antes de crear la partida</p>
        </div>
        <div class="review-card">
          <div class="review-section">
            <h3>Detalles de la Partida</h3>
            <div class="review-row">
              <span class="review-label">Titulo:</span>
              <span class="review-value">{{ sessionTitle }}</span>
            </div>
            <div class="review-row">
              <span class="review-label">Preguntas:</span>
              <span class="review-value">{{ questions.length }}</span>
            </div>
            <div class="review-row">
              <span class="review-label">Tiempo por pregunta:</span>
              <span class="review-value">{{ timePerQuestion }}s</span>
            </div>
            <div class="review-row">
              <span class="review-label">Leaderboard:</span>
              <span class="review-value">{{ showLeaderboard ? 'Si' : 'No' }}</span>
            </div>
          </div>
          <div class="review-section">
            <h3>Resumen de Preguntas</h3>
            <div class="questions-summary">
              <div v-for="(q, i) in questions" :key="i" class="summary-item">
                <span class="summary-num">{{ i + 1 }}</span>
                <span class="summary-text">{{ q.question }}</span>
                <span class="summary-badge">{{ q.options.length }} opciones</span>
                <span class="summary-correct">Correcta: {{ ['A','B','C','D','E','F'][q.correctAnswer] }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="form-actions step-nav">
          <button class="btn-secondary" @click="step = 2">
            <span class="material-icons">arrow_back</span> Editar Preguntas
          </button>
          <button class="btn-primary btn-large btn-create" @click="createSession" :disabled="isCreating">
            <span v-if="isCreating" class="spinner"></span>
            <span v-else class="material-icons">sports_esports</span>
            {{ isCreating ? 'Creando...' : 'Crear Partida' }}
          </button>
        </div>
      </section>

      <section v-if="step === 4 && createdSession" class="step-section">
        <div class="success-card">
          <div class="success-icon">
            <span class="material-icons">check_circle</span>
          </div>
          <h2>Partida Creada!</h2>
          <p class="success-subtitle">Tu partida esta lista para comenzar</p>
          <div class="code-section">
            <label>Codigo de Sala</label>
            <div class="code-display" @click="copyCode">
              <span class="code-text">{{ createdSession.code }}</span>
              <button class="btn-copy" :class="{ 'copied': copied }">
                <span class="material-icons">{{ copied ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
            <span v-if="copied" class="copy-feedback">Copiado!</span>
          </div>
          <div class="share-section">
            <h3>Compartir con los jugadores</h3>
            <div class="share-buttons">
              <button class="btn-share btn-whatsapp" @click="shareWhatsApp">
                <img src="/img/whatsapp-icon.svg" alt="WA" class="share-icon" /> WhatsApp
              </button>
              <button class="btn-share btn-telegram" @click="shareTelegram">
                <img src="/img/telegram-icon.svg" alt="TG" class="share-icon" /> Telegram
              </button>
              <button class="btn-share btn-email" @click="shareEmail">
                <span class="material-icons">email</span> Email
              </button>
              <button class="btn-share btn-copy-link" @click="copyLink">
                <span class="material-icons">link</span> Copiar Link
              </button>
            </div>
          </div>
          <div class="qr-section">
            <p>O escanea el codigo QR para unirse:</p>
            <div class="qr-placeholder">
              <span class="material-icons">qr_code_2</span>
              <span>QR: {{ createdSession.code }}</span>
            </div>
          </div>
          <div class="success-actions">
            <router-link :to="'/host/' + createdSession.code" class="btn-primary btn-large">
              <span class="material-icons">play_arrow</span> Ir al Panel del Host
            </router-link>
            <button class="btn-secondary" @click="resetAndNew">
              <span class="material-icons">add</span> Crear Otra Partida
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const step = ref(1)
const isCreating = ref(false)
const createdSession = ref(null)
const copied = ref(false)
const sessionTitle = ref('')
const timePerQuestion = ref(20)
const showLeaderboard = ref(true)

let questionIdCounter = 0
function createEmptyQuestion() {
  questionIdCounter++
  return {
    id: questionIdCounter, question: '', options: ['', ''],
    correctAnswer: null, category: 'Pensamiento Critico',
    difficulty: 'medium', timeLimit: 20, points: 100, errors: []
  }
}

const questions = ref([createEmptyQuestion()])

function addQuestion() {
  if (questions.value.length < 25) questions.value.push(createEmptyQuestion())
}
function removeQuestion(index) {
  if (questions.value.length > 1) questions.value.splice(index, 1)
}
function moveQuestion(index, direction) {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex < questions.value.length) {
    const temp = questions.value[index]
    questions.value[index] = questions.value[newIndex]
    questions.value[newIndex] = temp
  }
}
function addOption(questionIndex) {
  const q = questions.value[questionIndex]
  if (q.options.length < 6) q.options.push('')
}
function removeOption(questionIndex, optionIndex) {
  const q = questions.value[questionIndex]
  if (q.options.length > 2) {
    q.options.splice(optionIndex, 1)
    if (q.correctAnswer === optionIndex) q.correctAnswer = null
    else if (q.correctAnswer > optionIndex) q.correctAnswer--
  }
}
function validateQuestion(index) {
  const q = questions.value[index]
  const errors = []
  if (!q.question || q.question.trim().length === 0) errors.push('El texto de la pregunta es obligatorio')
  if (!q.options || q.options.length < 2) errors.push('Debe tener al menos 2 opciones (solo opcion multiple)')
  const emptyOptions = q.options.filter(opt => !opt || opt.trim() === '')
  if (emptyOptions.length > 0) errors.push('Todas las opciones deben tener texto')
  if (q.correctAnswer === null || q.correctAnswer === undefined) errors.push('Debes seleccionar la respuesta correcta')
  else if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) errors.push('La respuesta correcta no es valida')
  q.errors = errors
  return errors.length === 0
}
function validateAllQuestions() {
  let allValid = true
  for (let i = 0; i < questions.value.length; i++) {
    if (!validateQuestion(i)) allValid = false
  }
  return allValid
}

const isQuestionsValid = computed(() => {
  if (questions.value.length === 0) return false
  return questions.value.every(q =>
    q.question.trim() !== '' && q.options.length >= 2 &&
    q.options.every(opt => opt.trim() !== '') &&
    q.correctAnswer !== null && q.correctAnswer >= 0 && q.correctAnswer < q.options.length
  )
})

function goToStep2() { if (sessionTitle.value.trim()) step.value = 2 }
function goToStep3() { if (validateAllQuestions()) step.value = 3 }

async function createSession() {
  if (!validateAllQuestions()) return
  isCreating.value = true
  try {
    const payload = {
      title: sessionTitle.value.trim(),
      questions: questions.value.map(q => ({
        question: q.question.trim(), options: q.options.map(opt => opt.trim()),
        correctAnswer: q.correctAnswer, category: q.category,
        difficulty: q.difficulty, timeLimit: q.timeLimit, points: q.points
      })),
      settings: { timePerQuestion: timePerQuestion.value, showLeaderboard: showLeaderboard.value }
    }
    const res = await axios.post(`${API_URL}/api/sessions/create-with-questions`, payload)
    if (res.data.success) {
      createdSession.value = res.data.session
      step.value = 4
    }
  } catch (err) {
    alert(err.response?.data?.error || 'Error al crear la partida')
  } finally {
    isCreating.value = false
  }
}

function copyCode() {
  navigator.clipboard.writeText(createdSession.value.code)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
function copyLink() {
  const link = `${window.location.origin}/join?code=${createdSession.value.code}`
  navigator.clipboard.writeText(link)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
function shareWhatsApp() {
  const text = encodeURIComponent(`🎮 Unete a mi partida en MANTIS!\n\nCodigo: *${createdSession.value.code}*\nTitulo: ${sessionTitle.value}\n\nEntra aqui: ${window.location.origin}/join?code=${createdSession.value.code}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}
function shareTelegram() {
  const text = encodeURIComponent(`🎮 Unete a mi partida en MANTIS!\n\nCodigo: ${createdSession.value.code}\nTitulo: ${sessionTitle.value}`)
  const url = encodeURIComponent(`${window.location.origin}/join?code=${createdSession.value.code}`)
  window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank')
}
function shareEmail() {
  const subject = encodeURIComponent(`Invitacion a partida MANTIS: ${sessionTitle.value}`)
  const body = encodeURIComponent(`Hola!\n\nTe invito a unirte a mi partida en MANTIS.\n\nCodigo de sala: ${createdSession.value.code}\nTitulo: ${sessionTitle.value}\n\nPara unirte, visita: ${window.location.origin}/join?code=${createdSession.value.code}\n\nNos vemos en el juego!`)
  window.open(`mailto:?subject=${subject}&body=${body}`)
}
function resetAndNew() {
  step.value = 1
  sessionTitle.value = ''
  timePerQuestion.value = 20
  showLeaderboard.value = true
  questions.value = [createEmptyQuestion()]
  createdSession.value = null
  questionIdCounter = 0
}
</script>

<style scoped>
.admin-container { min-height: 100vh; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%); color: #e0e0e0; }
.admin-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1); }
.logo-section { display: flex; align-items: center; gap: 0.75rem; }
.admin-logo { height: 40px; width: auto; }
.logo-text { font-size: 1.5rem; font-weight: 800; background: linear-gradient(135deg, #00d4aa, #00a8e8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.header-actions { display: flex; align-items: center; gap: 1rem; }
.user-badge { padding: 0.4rem 1rem; background: rgba(0,212,170,0.15); border: 1px solid rgba(0,212,170,0.3); border-radius: 20px; font-size: 0.875rem; color: #00d4aa; }
.btn-logout { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #e0e0e0; padding: 0.5rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.btn-logout:hover { background: rgba(255,50,50,0.2); border-color: rgba(255,50,50,0.4); color: #ff4444; }
.admin-main { max-width: 900px; margin: 0 auto; padding: 2rem; }
.step-section { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.step-header { text-align: center; margin-bottom: 2rem; }
.step-badge { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: linear-gradient(135deg, #00d4aa, #00a8e8); border-radius: 50%; font-size: 1.25rem; font-weight: 700; color: #0f0f1a; margin-bottom: 1rem; }
.step-header h2 { font-size: 1.75rem; margin-bottom: 0.5rem; color: #fff; }
.step-desc { color: #888; font-size: 1rem; }
.badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-right: 0.5rem; }
.badge-info { background: rgba(0,168,232,0.2); color: #00a8e8; border: 1px solid rgba(0,168,232,0.3); }
.form-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #ccc; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 0.75rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; color: #fff; font-size: 1rem; transition: all 0.2s; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #00d4aa; box-shadow: 0 0 0 3px rgba(0,212,170,0.1); }
.form-group textarea { resize: vertical; min-height: 60px; }
.required { color: #ff6b6b; }
.hint { color: #666; font-size: 0.8rem; font-weight: 400; margin-left: 0.5rem; }
.settings-row { display: flex; gap: 2rem; flex-wrap: wrap; }
.setting-item { flex: 1; min-width: 200px; }
.setting-label { display: block; margin-bottom: 0.5rem; color: #aaa; font-size: 0.9rem; }
.time-selector { display: flex; align-items: center; gap: 0.75rem; }
.time-selector button { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; cursor: pointer; font-size: 1.2rem; transition: all 0.2s; }
.time-selector button:hover:not(:disabled) { background: rgba(0,212,170,0.2); border-color: #00d4aa; }
.time-value { font-size: 1.25rem; font-weight: 600; color: #00d4aa; min-width: 60px; text-align: center; }
.toggle-label { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
.toggle-label input { display: none; }
.toggle-slider { width: 48px; height: 26px; background: rgba(255,255,255,0.15); border-radius: 13px; position: relative; transition: all 0.3s; flex-shrink: 0; }
.toggle-slider::after { content: ''; position: absolute; width: 20px; height: 20px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: all 0.3s; }
.toggle-label input:checked + .toggle-slider { background: #00d4aa; }
.toggle-label input:checked + .toggle-slider::after { left: 25px; }
.toggle-text { color: #aaa; font-size: 0.9rem; }
.questions-container { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
.question-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.5rem; transition: all 0.2s; }
.question-card:hover { border-color: rgba(255,255,255,0.2); }
.question-card.has-error { border-color: rgba(255,100,100,0.4); background: rgba(255,50,50,0.05); }
.question-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.question-number { font-weight: 600; color: #00d4aa; font-size: 1.1rem; }
.question-actions { display: flex; gap: 0.25rem; }
.options-section { margin: 1rem 0; }
.options-section label { display: block; margin-bottom: 0.75rem; font-weight: 500; color: #ccc; }
.options-list { display: flex; flex-direction: column; gap: 0.5rem; }
.option-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 10px; transition: all 0.2s; }
.option-row.correct-option { background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.3); }
.option-letter { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); border-radius: 8px; font-weight: 700; color: #888; flex-shrink: 0; }
.option-row.correct-option .option-letter { background: #00d4aa; color: #0f0f1a; }
.option-row input { flex: 1; padding: 0.6rem 0.75rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 0.95rem; }
.option-row input:focus { outline: none; border-color: #00a8e8; }
.correct-radio { cursor: pointer; padding: 0.25rem; }
.correct-radio input { display: none; }
.radio-indicator { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; color: #555; transition: all 0.2s; }
.correct-radio input:checked + .radio-indicator { color: #00d4aa; }
.radio-indicator .material-icons { font-size: 24px; }
.btn-icon { background: transparent; border: none; color: #888; cursor: pointer; padding: 0.4rem; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-icon:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-icon.btn-danger:hover { background: rgba(255,50,50,0.2); color: #ff4444; }
.btn-icon.btn-sm { padding: 0.2rem; }
.btn-icon.btn-sm .material-icons { font-size: 18px; }
.btn-add-option { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; padding: 0.5rem 1rem; background: transparent; border: 1px dashed rgba(0,168,232,0.4); color: #00a8e8; border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
.btn-add-option:hover { background: rgba(0,168,232,0.1); border-style: solid; }
.question-settings { display: flex; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); }
.setting-field { flex: 1; }
.setting-field label { display: block; font-size: 0.8rem; color: #888; margin-bottom: 0.25rem; }
.setting-field input, .setting-field select { width: 100%; padding: 0.4rem 0.6rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; font-size: 0.9rem; }
.errors-box { display: flex; align-items: flex-start; gap: 0.5rem; margin-top: 0.75rem; padding: 0.75rem; background: rgba(255,50,50,0.1); border-radius: 8px; color: #ff6b6b; font-size: 0.85rem; }
.errors-box .material-icons { font-size: 18px; flex-shrink: 0; }
.errors-box ul { margin: 0; padding-left: 1rem; }
.btn-add-question { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 1rem; background: rgba(0,212,170,0.1); border: 2px dashed rgba(0,212,170,0.3); color: #00d4aa; border-radius: 12px; cursor: pointer; font-size: 1rem; font-weight: 500; transition: all 0.2s; }
.btn-add-question:hover:not(:disabled) { background: rgba(0,212,170,0.2); border-style: solid; }
.btn-add-question:disabled { opacity: 0.4; cursor: not-allowed; }
.count { color: #888; font-size: 0.85rem; }
.form-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; }
.form-actions.step-nav { justify-content: space-between; }
.btn-primary, .btn-secondary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; text-decoration: none; }
.btn-primary { background: linear-gradient(135deg, #00d4aa, #00a8e8); color: #0f0f1a; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,212,170,0.3); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: rgba(255,255,255,0.1); color: #ccc; border: 1px solid rgba(255,255,255,0.2); }
.btn-secondary:hover { background: rgba(255,255,255,0.15); color: #fff; }
.btn-large { padding: 1rem 2rem; font-size: 1.1rem; }
.btn-create { min-width: 200px; justify-content: center; }
.review-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; }
.review-section { margin-bottom: 2rem; }
.review-section:last-child { margin-bottom: 0; }
.review-section h3 { color: #00d4aa; margin-bottom: 1rem; font-size: 1.1rem; }
.review-row { display: flex; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.review-label { width: 180px; color: #888; flex-shrink: 0; }
.review-value { color: #fff; font-weight: 500; }
.questions-summary { display: flex; flex-direction: column; gap: 0.5rem; }
.summary-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; }
.summary-num { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: rgba(0,212,170,0.2); color: #00d4aa; border-radius: 6px; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
.summary-text { flex: 1; color: #ddd; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.summary-badge { padding: 0.2rem 0.5rem; background: rgba(0,168,232,0.15); color: #00a8e8; border-radius: 4px; font-size: 0.75rem; flex-shrink: 0; }
.summary-correct { padding: 0.2rem 0.5rem; background: rgba(0,212,170,0.15); color: #00d4aa; border-radius: 4px; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }
.success-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(0,212,170,0.2); border-radius: 20px; padding: 3rem 2rem; text-align: center; max-width: 600px; margin: 0 auto; }
.success-icon { margin-bottom: 1rem; }
.success-icon .material-icons { font-size: 64px; color: #00d4aa; }
.success-card h2 { font-size: 2rem; color: #fff; margin-bottom: 0.5rem; }
.success-subtitle { color: #888; margin-bottom: 2rem; }
.code-section { margin: 2rem 0; }
.code-section label { display: block; color: #888; margin-bottom: 0.5rem; font-size: 0.9rem; }
.code-display { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1.5rem 2rem; background: linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,168,232,0.15)); border: 2px solid rgba(0,212,170,0.4); border-radius: 16px; cursor: pointer; transition: all 0.2s; }
.code-display:hover { border-color: #00d4aa; box-shadow: 0 0 30px rgba(0,212,170,0.2); }
.code-text { font-size: 3rem; font-weight: 800; letter-spacing: 8px; color: #00d4aa; font-family: 'Courier New', monospace; }
.btn-copy { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 0.5rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.btn-copy:hover, .btn-copy.copied { background: rgba(0,212,170,0.2); border-color: #00d4aa; color: #00d4aa; }
.copy-feedback { display: block; margin-top: 0.5rem; color: #00d4aa; font-size: 0.9rem; }
.share-section { margin: 2rem 0; }
.share-section h3 { color: #ccc; margin-bottom: 1rem; font-size: 1rem; }
.share-buttons { display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; }
.btn-share { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 10px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s; }
.btn-whatsapp { background: #25d366; color: #fff; }
.btn-whatsapp:hover { background: #1ebe57; }
.btn-telegram { background: #0088cc; color: #fff; }
.btn-telegram:hover { background: #0077b3; }
.btn-email { background: #ea4335; color: #fff; }
.btn-email:hover { background: #d33b28; }
.btn-copy-link { background: rgba(255,255,255,0.1); color: #ccc; border: 1px solid rgba(255,255,255,0.2); }
.btn-copy-link:hover { background: rgba(255,255,255,0.2); color: #fff; }
.share-icon { width: 18px; height: 18px; }
.qr-section { margin: 1.5rem 0; color: #888; }
.qr-section p { margin-bottom: 0.5rem; }
.qr-placeholder { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); border-radius: 12px; color: #666; }
.qr-placeholder .material-icons { font-size: 32px; }
.success-actions { display: flex; flex-direction: column; gap: 1rem; margin-top: 2rem; }
.success-actions .btn-primary, .success-actions .btn-secondary { justify-content: center; }
.spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(15,15,26,0.3); border-top-color: #0f0f1a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .admin-main { padding: 1rem; }
  .code-text { font-size: 2rem; letter-spacing: 4px; }
  .share-buttons { flex-direction: column; align-items: stretch; }
  .btn-share { justify-content: center; }
  .form-actions.step-nav { flex-direction: column; }
  .question-settings { flex-direction: column; gap: 0.5rem; }
}
</style>
