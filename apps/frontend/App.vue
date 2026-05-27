<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth.js'

const authStore = useAuthStore()

onMounted(() => {
  setTimeout(() => {
    const loader = document.getElementById('app-loading')
    if (loader) {
      loader.classList.add('hidden')
      setTimeout(() => loader.remove(), 500)
    }
  }, 500)
  if (authStore.token) authStore.fetchUser()
})
</script>

<style>
#app { min-height: 100vh; }
</style>
