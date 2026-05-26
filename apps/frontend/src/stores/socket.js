import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null)
  const connected = ref(false)
  const error = ref(null)

  const isConnected = computed(() => connected.value)

  function connect() {
    if (socket.value?.connected) return

    socket.value = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    socket.value.on('connect', () => {
      connected.value = true
      error.value = null
      console.log('✅ Socket connected')
    })

    socket.value.on('disconnect', () => {
      connected.value = false
      console.log('❌ Socket disconnected')
    })

    socket.value.on('connect_error', (err) => {
      error.value = err.message
      console.error('Socket error:', err)
    })
  }

  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    connected.value = false
  }

  function emit(event, data) {
    socket.value?.emit(event, data)
  }

  function on(event, callback) {
    socket.value?.on(event, callback)
  }

  function off(event) {
    socket.value?.off(event)
  }

  return {
    socket,
    connected,
    error,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off
  }
})
