<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-secondary/10 text-secondary mb-4">
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1;">hive</span>
        </div>
        <h1 class="text-2xl font-bold text-primary">Welcome back to QuizHive</h1>
        <p class="text-on-surface-variant mt-2">Sign in to your account to continue</p>
      </div>

      <!-- Form Card -->
      <div class="card p-8">
        <form @submit.prevent="handleLogin">
          <div class="space-y-5">
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
                placeholder="••••••••"
                required
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
              <span v-else>Sign In</span>
            </button>
          </div>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-on-surface-variant">
            Don't have an account? 
            <router-link to="/register" class="text-secondary font-semibold hover:underline">
              Get Started
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
  email: '',
  password: ''
})

async function handleLogin() {
  const result = await authStore.login(form.email, form.password)
  if (result.success) {
    router.push('/')
  }
}
</script>
