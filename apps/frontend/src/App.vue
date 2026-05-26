<template>
  <div id="app-container">
    <nav v-if="showNav" class="navbar">
      <router-link to="/" class="logo">
        🧠 Pensamiento Crítico
      </router-link>
      <div class="nav-links">
        <router-link to="/">Inicio</router-link>
        <router-link to="/admin">Admin</router-link>
      </div>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showNav = computed(() => !['Play', 'Host'].includes(route.name))
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Poppins', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;
}

#app-container {
  min-height: 100vh;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0,0,0,0.1);
}

.logo {
  font-size: 1.5rem;
  font-weight: 900;
  color: #667eea;
  text-decoration: none;
}

.nav-links a {
  margin-left: 2rem;
  text-decoration: none;
  color: #555;
  font-weight: 600;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #667eea;
}

main {
  padding: 2rem;
}

.btn {
  display: inline-block;
  padding: 1rem 2.5rem;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #667eea;
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.input {
  width: 100%;
  padding: 1rem 1.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 15px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
}

.input:focus {
  outline: none;
  border-color: #667eea;
}

.error {
  color: #f5576c;
  font-weight: 600;
  margin-top: 0.5rem;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  main {
    padding: 1rem;
  }
  .navbar {
    padding: 1rem;
  }
  .logo {
    font-size: 1.2rem;
  }
}
</style>
