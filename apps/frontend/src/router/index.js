// apps/frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

import HomeView       from '../views/HomeView.vue'
import LoginView      from '../views/LoginView.vue'
import RegisterView   from '../views/RegisterView.vue'
import DashboardView  from '../views/DashboardView.vue'
import AdminView      from '../views/AdminView.vue'
import HostView       from '../views/HostView.vue'
import JoinView       from '../views/JoinView.vue'
import PlayView       from '../views/PlayView.vue'
import ResultsView    from '../views/ResultsView.vue'
import ScoreAnalytics from '../views/ScoreAnalytics.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/login', name: 'login', component: LoginView, meta: { title: 'Login — QuizHive', hideNav: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: 'Register — QuizHive', hideNav: true } },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard — QuizHive', requiresAuth: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { title: 'Editor de Quiz — QuizHive', requiresAuth: true } },
  { path: '/host', name: 'host', component: HostView, meta: { title: 'Host — QuizHive' } },
  { path: '/join', name: 'join', component: JoinView, meta: { title: 'Unirse — QuizHive', hideNav: true } },
  { path: '/score', name: 'score', component: ScoreAnalytics, meta: { title: 'Puntaje — QuizHive', hideNav: true } },
  { path: '/play', name: 'play', component: PlayView, meta: { title: 'Jugar — QuizHive', hideNav: true } },
  { path: '/results', name: 'results', component: ResultsView, meta: { title: 'Resultados — QuizHive', hideNav: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('quizhive_token')

  // Update title
  document.title = to.meta.title || 'QuizHive'

  // Redirect authenticated users away from login/register
  if (token && ['login', 'register'].includes(to.name)) {
    next('/dashboard')
    return
  }

  // Require auth for protected routes
  if (to.meta.requiresAuth && !token) {
    next('/login')
    return
  }

  next()
})

export default router
