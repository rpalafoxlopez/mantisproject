<template>
  <div id="app" class="min-h-screen bg-background">
    <!-- Top Navigation -->
    <header 
      v-if="showNav" 
      class="w-full sticky top-0 bg-surface-white border-b border-border-subtle shadow-sm z-50"
    >
      <div class="flex justify-between items-center h-20 px-6 lg:px-10 max-w-7xl mx-auto">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2 text-primary font-bold text-xl">
          <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">hive</span>
          QuizHive
        </router-link>

        <!-- Nav Links -->
        <nav class="hidden md:flex gap-8">
          <router-link 
            to="/" 
            class="text-label-md font-label-md transition-colors"
            :class="$route.path === '/' ? 'text-secondary font-bold border-b-2 border-secondary pb-1' : 'text-on-surface-variant hover:text-secondary'"
          >
            Home
          </router-link>
          <router-link 
            v-if="authStore.isAdmin"
            to="/admin" 
            class="text-label-md font-label-md transition-colors"
            :class="$route.path === '/admin' ? 'text-secondary font-bold border-b-2 border-secondary pb-1' : 'text-on-surface-variant hover:text-secondary'"
          >
            Admin
          </router-link>
        </nav>

        <!-- Auth Buttons -->
        <div class="flex items-center gap-4">
          <template v-if="authStore.isAuthenticated">
            <div class="flex items-center gap-3">
              <span class="text-body-sm font-body-sm text-on-surface-variant hidden sm:block">
                {{ authStore.user?.name }}
              </span>
              <button 
                @click="authStore.logout"
                class="text-on-surface-variant hover:text-error transition-colors text-label-md font-label-md"
              >
                Logout
              </button>
            </div>
          </template>
          <template v-else>
            <router-link 
              to="/login" 
              class="text-on-surface-variant hover:text-secondary px-4 py-2 text-label-md font-label-md transition-colors"
            >
              Login
            </router-link>
            <router-link 
              to="/register" 
              class="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-label-md font-label-md hover:bg-secondary transition-all"
            >
              Get Started
            </router-link>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

const route = useRoute()
const authStore = useAuthStore()

const showNav = computed(() => !['Play', 'Host'].includes(route.name))

onMounted(() => {
  authStore.fetchUser()
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: #f7f9fb;
  color: #1b2e51;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Tailwind-like utility classes */
.bg-background { background-color: #f5f6ff; }
.bg-surface-white { background-color: #ffffff; }
.text-primary { color: #005ea1; }
.text-secondary { color: #0e59b6; }
.text-on-surface { color: #1b2e51; }
.text-on-surface-variant { color: #495b80; }
.text-on-primary { color: #edf3ff; }
.text-error { color: #b31b25; }
.border-border-subtle { border-color: #E2E8F0; }
.bg-primary { background-color: #005ea1; }
.hover\:bg-secondary:hover { background-color: #0e59b6; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #005ea1, #0e59b6);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 94, 161, 0.3);
}

.btn-secondary {
  background: white;
  color: #005ea1;
  border: 2px solid #005ea1;
}

.btn-secondary:hover {
  background: #005ea1;
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #b31b25, #fb5151);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #2F855A, #48bb78);
  color: white;
}

.card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #E2E8F0;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #E2E8F0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}

.input:focus {
  outline: none;
  border-color: #005ea1;
  box-shadow: 0 0 0 3px rgba(0, 94, 161, 0.1);
}

.error-text {
  color: #b31b25;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
