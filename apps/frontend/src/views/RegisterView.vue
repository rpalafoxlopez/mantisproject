<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-secondary/10 text-secondary mb-4">
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1;">hive</span>
        </div>
        <h1 class="text-2xl font-bold text-primary">Create your QuizHive account</h1>
        <p class="text-on-surface-variant mt-2">Start creating engaging quizzes for your team</p>
      </div>

      <!-- Form Card -->
      <div class="card p-8">
        <form @submit.prevent="handleRegister">
          <div class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-on-surface mb-1.5">Full Name</label>
              <input 
                v-model="form.name" 
                type="text"
                class="input"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-on-surface mb-1.5">Email</label>
              <input 
                v-model="form.email" 
                type="email"
                class="input"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-on-surface mb-1.5">Password</label>
              <input 
                v-model="form.password" 
                type="password"
                class="input"
                placeholder="Min. 6 characters"
                required
                minlength="6"
              />
            </div>

            <div v-if="authStore.error" class="error-text">
              {{ authStore.error }}
            </div>

            <button 
              type="submit"
              class="btn btn-primary w-full"
              :disabled="authStore.loading"
            >
              <span v-if="authStore.loading" class="spinner"></span>
              <span v-else>Create Account</span>
            </button>
          </div>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-on-surface-variant">
            Already have an account? 
            <router-link to="/login" class="text-secondary font-semibold hover:underline">
              Sign In
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  name: '',
  email: '',
  password: ''
})

async function handleRegister() {
  const result = await authStore.register(form.email, form.password, form.name)
  if (result.success) {
    router.push('/')
  }
}
</script>
