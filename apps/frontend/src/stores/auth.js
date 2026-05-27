import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('quizhive_token') || null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isHost = computed(() => ['admin', 'host'].includes(user.value?.role))

  // Set auth header on axios
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  async function login(email, password) {
    loading.value = true
    error.value = null

    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password })

      token.value = res.data.token
      user.value = res.data.user

      localStorage.setItem('quizhive_token', res.data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`

      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.error || 'Login failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function register(email, password, name) {
    loading.value = true
    error.value = null

    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { 
        email, 
        password, 
        name,
        role: 'host'
      })

      token.value = res.data.token
      user.value = res.data.user

      localStorage.setItem('quizhive_token', res.data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`

      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.error || 'Registration failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return

    try {
      const res = await axios.get(`${API_URL}/api/auth/me`)
      user.value = res.data.user
    } catch (err) {
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('quizhive_token')
    delete axios.defaults.headers.common['Authorization']
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isHost,
    login,
    register,
    fetchUser,
    logout
  }
})
