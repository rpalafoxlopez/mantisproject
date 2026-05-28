// apps/frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

import HomeView       from '../views/HomeView.vue'
import DashboardView  from '../views/DashboardView.vue'
import AdminView      from '../views/AdminView.vue'
import HostView       from '../views/HostView.vue'
import JoinView       from '../views/JoinView.vue'
import PlayView       from '../views/PlayView.vue'
import ResultsView    from '../views/ResultsView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard — QuizHive' } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { title: 'Editor de Quiz — QuizHive' } },
  { path: '/host', name: 'host', component: HostView, meta: { title: 'Host — QuizHive' } },
  { path: '/join', name: 'join', component: JoinView, meta: { title: 'Unirse — QuizHive' } },
  { path: '/play', name: 'play', component: PlayView, meta: { title: 'Jugar — QuizHive' } },
  { path: '/results', name: 'results', component: ResultsView, meta: { title: 'Resultados — QuizHive' } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.afterEach((to) => {
  document.title = to.meta.title || 'QuizHive'
})

export default router
