import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/host/:sessionCode?',
    name: 'Host',
    component: () => import('@/views/HostView.vue'),
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/join',
    name: 'Join',
    component: () => import('@/views/JoinView.vue')
  },
  {
    path: '/play/:sessionCode',
    name: 'Play',
    component: () => import('@/views/PlayView.vue'),
    props: true
  },
  {
    path: '/results/:sessionCode',
    name: 'Results',
    component: () => import('@/views/ResultsView.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Redirect authenticated users away from login/register
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next('/')
  }

  // Require auth
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/login')
  }

  // Require admin
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next('/')
  }

  next()
})

export default router
