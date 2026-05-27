<template>
  <div class="min-h-screen bg-background py-8 px-4 lg:px-10">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-primary flex items-center gap-3">
          <span class="material-symbols-outlined text-secondary">settings</span>
          Panel de Administración
        </h1>
        <p class="text-on-surface-variant mt-2">Gestiona las preguntas del juego. Máximo 25 preguntas por sesión.</p>
      </div>

      <div class="grid lg:grid-cols-5 gap-8">
        <!-- Form -->
        <div class="lg:col-span-2">
          <div class="card sticky top-24">
            <h2 class="text-lg font-semibold text-primary mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">{{ editingId ? 'edit' : 'add_circle' }}</span>
              {{ editingId ? 'Editar Pregunta' : 'Nueva Pregunta' }}
            </h2>

            <form @submit.prevent="saveQuestion" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-on-surface mb-1.5">Pregunta</label>
                <textarea 
                  v-model="form.question" 
                  class="input"
                  rows="3"
                  placeholder="Escribe la pregunta..."
                  required
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-on-surface mb-1.5">Opciones</label>
                <div class="space-y-2">
                  <div v-for="(opt, i) in form.options" :key="i" class="flex gap-2">
                    <input 
                      v-model="form.options[i]" 
                      class="input"
                      :placeholder="'Opción ' + (i + 1)"
                      required
                    />
                    <button 
                      v-if="form.options.length > 2" 
                      type="button"
                      class="text-error hover:bg-error/10 px-2 rounded-lg transition-colors"
                      @click="removeOption(i)"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  <button 
                    type="button"
                    class="text-sm text-secondary font-medium flex items-center gap-1 hover:underline"
                    @click="addOption"
                  >
                    <span class="material-symbols-outlined text-base">add</span>
                    Agregar opción
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-on-surface mb-1.5">Respuesta Correcta</label>
                  <select v-model="form.correctAnswer" class="input">
                    <option v-for="(opt, i) in form.options" :key="i" :value="i">
                      {{ ['A','B','C','D','E'][i] }} - {{ opt || 'Opción ' + (i + 1) }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-on-surface mb-1.5">Dificultad</label>
                  <select v-model="form.difficulty" class="input">
                    <option value="easy">Fácil</option>
                    <option value="medium">Media</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-on-surface mb-1.5">Tiempo (s)</label>
                  <input 
                    v-model.number="form.timeLimit" 
                    type="number"
                    class="input"
                    min="5"
                    max="120"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-on-surface mb-1.5">Puntos</label>
                  <input 
                    v-model.number="form.points" 
                    type="number"
                    class="input"
                    min="10"
                    max="1000"
                  />
                </div>
              </div>

              <div v-if="formError" class="error-text flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">error</span>
                {{ formError }}
              </div>

              <div class="flex gap-3 pt-2">
                <button 
                  type="submit"
                  class="btn btn-primary flex-1"
                  :disabled="saving"
                >
                  <span v-if="saving" class="spinner"></span>
                  <span v-else>{{ editingId ? 'Actualizar' : 'Guardar' }}</span>
                </button>
                <button 
                  v-if="editingId"
                  type="button"
                  class="btn btn-secondary"
                  @click="cancelEdit"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- List -->
        <div class="lg:col-span-3">
          <div class="card">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-lg font-semibold text-primary">
                Preguntas ({{ questions.length }})
              </h2>
              <div class="text-sm text-on-surface-variant">
                <span class="material-symbols-outlined text-base align-middle">info</span>
                Max 25 por sesión
              </div>
            </div>

            <div v-if="loading" class="flex justify-center py-12">
              <div class="spinner border-4 border-gray-200 border-t-primary w-8 h-8"></div>
            </div>

            <div v-else-if="questions.length === 0" class="text-center py-12 text-on-surface-variant">
              <span class="material-symbols-outlined text-4xl mb-3">quiz</span>
              <p>No hay preguntas. ¡Crea la primera!</p>
            </div>

            <div v-else class="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              <div 
                v-for="q in questions" 
                :key="q._id"
                class="p-4 rounded-lg border transition-all"
                :class="editingId === q._id ? 'border-secondary bg-secondary/5' : 'border-border-subtle hover:border-secondary/30'"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <span 
                        class="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                        :class="{
                          'bg-green-100 text-green-700': q.difficulty === 'easy',
                          'bg-yellow-100 text-yellow-700': q.difficulty === 'medium',
                          'bg-red-100 text-red-700': q.difficulty === 'hard'
                        }"
                      >
                        {{ q.difficulty }}
                      </span>
                      <span class="text-xs text-on-surface-variant">⏱️ {{ q.timeLimit }}s</span>
                      <span class="text-xs text-on-surface-variant">{{ q.points }} pts</span>
                    </div>
                    <p class="font-medium text-on-surface text-sm mb-2">{{ q.question }}</p>
                    <div class="flex flex-wrap gap-2">
                      <span 
                        v-for="(opt, i) in q.options" 
                        :key="i"
                        class="text-xs px-2 py-1 rounded-md"
                        :class="i === q.correctAnswer ? 'bg-green-100 text-green-700 font-semibold' : 'bg-gray-100 text-gray-600'"
                      >
                        {{ ['A','B','C','D','E'][i] }}. {{ opt }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-1 flex-shrink-0">
                    <button 
                      class="p-2 text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
                      @click="editQuestion(q)"
                    >
                      <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button 
                      class="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                      @click="deleteQuestion(q._id)"
                    >
                      <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const questions = ref([])
const loading = ref(false)
const saving = ref(false)
const editingId = ref(null)
const formError = ref('')

const form = reactive({
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  difficulty: 'medium',
  timeLimit: 20,
  points: 100
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
    if (error.response?.status === 401) {
      formError.value = 'Sesión expirada. Por favor inicia sesión de nuevo.'
    }
  } finally {
    loading.value = false
  }
}

function addOption() {
  if (form.options.length >= 5) return
  form.options.push('')
}

function removeOption(index) {
  if (form.options.length <= 2) return
  form.options.splice(index, 1)
  if (form.correctAnswer >= form.options.length) {
    form.correctAnswer = form.options.length - 1
  }
}

function validateForm() {
  if (!form.question.trim()) return 'La pregunta es obligatoria'
  if (form.options.some(o => !o.trim())) return 'Todas las opciones deben tener texto'
  if (form.options.length < 2) return 'Mínimo 2 opciones'
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
      ...form,
      options: form.options.filter(o => o.trim())
    }

    if (editingId.value) {
      await axios.put(`${API_URL}/api/questions/${editingId.value}`, payload)
    } else {
      await axios.post(`${API_URL}/api/questions`, payload)
    }

    resetForm()
    await loadQuestions()
  } catch (err) {
    formError.value = err.response?.data?.error || 'Error al guardar'
    if (err.response?.status === 401) {
      formError.value = 'No autorizado. Solo administradores pueden gestionar preguntas.'
    }
  } finally {
    saving.value = false
  }
}

function editQuestion(q) {
  editingId.value = q._id
  form.question = q.question
  form.options = [...q.options]
  form.correctAnswer = q.correctAnswer
  form.difficulty = q.difficulty
  form.timeLimit = q.timeLimit
  form.points = q.points
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
  resetForm()
}

function resetForm() {
  editingId.value = null
  form.question = ''
  form.options = ['', '', '', '']
  form.correctAnswer = 0
  form.difficulty = 'medium'
  form.timeLimit = 20
  form.points = 100
  formError.value = ''
}

async function deleteQuestion(id) {
  if (!confirm('¿Eliminar esta pregunta?')) return
  try {
    await axios.delete(`${API_URL}/api/questions/${id}`)
    await loadQuestions()
  } catch (err) {
    alert(err.response?.data?.error || 'Error al eliminar')
  }
}
</script>
