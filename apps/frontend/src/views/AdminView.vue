<template>
  <div class="admin-view">
    <div class="admin-header">
      <h1>⚙️ Panel de Administración</h1>
      <p>Gestiona las preguntas del juego de Pensamiento Crítico</p>
    </div>

    <div class="admin-content">
      <!-- Form to add/edit question -->
      <div class="question-form card">
        <h2>{{ editingId ? '✏️ Editar Pregunta' : '➕ Nueva Pregunta' }}</h2>

        <div class="form-group">
          <label>Pregunta</label>
          <textarea 
            v-model="form.question" 
            class="input"
            rows="3"
            placeholder="Escribe la pregunta..."
          ></textarea>
        </div>

        <div class="form-group">
          <label>Opciones (mínimo 2)</label>
          <div class="options-inputs">
            <div v-for="(opt, i) in form.options" :key="i" class="option-input-row">
              <input 
                v-model="form.options[i]" 
                class="input"
                :placeholder="'Opción ' + (i + 1)"
              />
              <button 
                v-if="form.options.length > 2" 
                class="btn-remove"
                @click="removeOption(i)"
              >
                ✕
              </button>
            </div>
            <button class="btn-add-option" @click="addOption">
              + Agregar opción
            </button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Respuesta Correcta</label>
            <select v-model="form.correctAnswer" class="input">
              <option v-for="(opt, i) in form.options" :key="i" :value="i">
                {{ ['A','B','C','D','E'][i] }} - {{ opt || 'Opción ' + (i + 1) }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Categoría</label>
            <input v-model="form.category" class="input" placeholder="Pensamiento Crítico" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Dificultad</label>
            <select v-model="form.difficulty" class="input">
              <option value="easy">Fácil</option>
              <option value="medium">Media</option>
              <option value="hard">Difícil</option>
            </select>
          </div>

          <div class="form-group">
            <label>Tiempo (segundos)</label>
            <input 
              v-model.number="form.timeLimit" 
              type="number" 
              class="input"
              min="5"
              max="120"
            />
          </div>

          <div class="form-group">
            <label>Puntos base</label>
            <input 
              v-model.number="form.points" 
              type="number" 
              class="input"
              min="10"
              max="1000"
            />
          </div>
        </div>

        <div v-if="formError" class="error">{{ formError }}</div>

        <div class="form-actions">
          <button class="btn btn-primary" @click="saveQuestion" :disabled="saving">
            {{ saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar') }}
          </button>
          <button v-if="editingId" class="btn btn-secondary" @click="cancelEdit">
            Cancelar
          </button>
        </div>
      </div>

      <!-- Questions list -->
      <div class="questions-list card">
        <div class="list-header">
          <h2>📋 Preguntas ({{ questions.length }})</h2>
          <div class="list-filters">
            <input 
              v-model="searchQuery" 
              class="input search-input"
              placeholder="🔍 Buscar pregunta..."
            />
          </div>
        </div>

        <div v-if="loading" class="loading">
          <div class="spinner"></div>
        </div>

        <div v-else-if="filteredQuestions.length === 0" class="empty-state">
          <p>No hay preguntas. ¡Crea la primera!</p>
        </div>

        <div v-else class="question-items">
          <div 
            v-for="q in filteredQuestions" 
            :key="q._id"
            class="question-item"
            :class="{ editing: editingId === q._id }"
          >
            <div class="q-header">
              <span class="q-badge" :class="q.difficulty">{{ q.difficulty }}</span>
              <span class="q-time">⏱️ {{ q.timeLimit }}s</span>
              <span class="q-points">{{ q.points }} pts</span>
            </div>

            <p class="q-text">{{ q.question }}</p>

            <div class="q-options">
              <span 
                v-for="(opt, i) in q.options" 
                :key="i"
                class="q-option"
                :class="{ correct: i === q.correctAnswer }"
              >
                {{ ['A','B','C','D','E'][i] }}. {{ opt }}
              </span>
            </div>

            <div class="q-actions">
              <button class="btn-edit" @click="editQuestion(q)">✏️ Editar</button>
              <button class="btn-delete" @click="deleteQuestion(q._id)">🗑️ Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const questions = ref([])
const loading = ref(false)
const saving = ref(false)
const editingId = ref(null)
const searchQuery = ref('')
const formError = ref('')

const form = ref({
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  category: 'Pensamiento Crítico',
  difficulty: 'medium',
  timeLimit: 20,
  points: 100
})

const filteredQuestions = computed(() => {
  if (!searchQuery.value) return questions.value
  const q = searchQuery.value.toLowerCase()
  return questions.value.filter(qs => 
    qs.question.toLowerCase().includes(q) ||
    qs.category.toLowerCase().includes(q)
  )
})

onMounted(() => {
  loadQuestions()
})

async function loadQuestions() {
  loading.value = true
  try {
    const res = await axios.get(`${API_URL}/api/questions`)
    questions.value = res.data
  } catch (error) {
    console.error('Error loading questions:', error)
  } finally {
    loading.value = false
  }
}

function addOption() {
  form.value.options.push('')
}

function removeOption(index) {
  if (form.value.options.length <= 2) return
  form.value.options.splice(index, 1)
  if (form.value.correctAnswer >= form.value.options.length) {
    form.value.correctAnswer = form.value.options.length - 1
  }
}

function validateForm() {
  if (!form.value.question.trim()) return 'La pregunta es obligatoria'
  if (form.value.options.some(o => !o.trim())) return 'Todas las opciones deben tener texto'
  if (form.value.options.length < 2) return 'Mínimo 2 opciones'
  if (form.value.correctAnswer < 0 || form.value.correctAnswer >= form.value.options.length) {
    return 'Selecciona una respuesta correcta válida'
  }
  return null
}

async function saveQuestion() {
  const error = validateForm()
  if (error) {
    formError.value = error
    return
  }
  formError.value = ''
  saving.value = true

  try {
    const payload = {
      ...form.value,
      options: form.value.options.filter(o => o.trim())
    }

    if (editingId.value) {
      await axios.put(`${API_URL}/api/questions/${editingId.value}`, payload)
    } else {
      await axios.post(`${API_URL}/api/questions`, payload)
    }

    resetForm()
    await loadQuestions()
  } catch (error) {
    formError.value = error.response?.data?.error || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

function editQuestion(q) {
  editingId.value = q._id
  form.value = {
    question: q.question,
    options: [...q.options],
    correctAnswer: q.correctAnswer,
    category: q.category,
    difficulty: q.difficulty,
    timeLimit: q.timeLimit,
    points: q.points
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
  resetForm()
}

function resetForm() {
  editingId.value = null
  form.value = {
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: 'Pensamiento Crítico',
    difficulty: 'medium',
    timeLimit: 20,
    points: 100
  }
  formError.value = ''
}

async function deleteQuestion(id) {
  if (!confirm('¿Eliminar esta pregunta?')) return
  try {
    await axios.delete(`${API_URL}/api/questions/${id}`)
    await loadQuestions()
  } catch (error) {
    console.error('Error deleting:', error)
  }
}
</script>

<style scoped>
.admin-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.admin-header {
  text-align: center;
  margin-bottom: 2rem;
  color: white;
}

.admin-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.admin-header p {
  opacity: 0.8;
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.question-form h2 {
  color: #667eea;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.options-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-input-row {
  display: flex;
  gap: 0.5rem;
}

.option-input-row .input {
  flex: 1;
}

.btn-remove {
  background: #f5576c;
  color: white;
  border: none;
  border-radius: 10px;
  width: 40px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-add-option {
  background: transparent;
  border: 2px dashed #667eea;
  color: #667eea;
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-add-option:hover {
  background: #667eea10;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.questions-list {
  margin-top: 1rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.list-header h2 {
  color: #667eea;
}

.search-input {
  width: 250px;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #888;
}

.question-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-item {
  background: #f8f9fa;
  border-radius: 15px;
  padding: 1.25rem;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.question-item.editing {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea08, #764ba208);
}

.q-header {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  align-items: center;
}

.q-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.q-badge.easy { background: #4facfe30; color: #4facfe; }
.q-badge.medium { background: #ffe66d30; color: #b8860b; }
.q-badge.hard { background: #f5576c30; color: #f5576c; }

.q-time, .q-points {
  font-size: 0.85rem;
  color: #888;
}

.q-text {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.75rem;
  font-size: 1.05rem;
}

.q-options {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.q-option {
  font-size: 0.9rem;
  color: #666;
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
}

.q-option.correct {
  background: linear-gradient(135deg, #4facfe20, #00f2fe20);
  color: #4facfe;
  font-weight: 700;
}

.q-actions {
  display: flex;
  gap: 0.5rem;
}

.q-actions button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-edit {
  background: #667eea20;
  color: #667eea;
}

.btn-edit:hover {
  background: #667eea;
  color: white;
}

.btn-delete {
  background: #f5576c20;
  color: #f5576c;
}

.btn-delete:hover {
  background: #f5576c;
  color: white;
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input {
    width: 100%;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
