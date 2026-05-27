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
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    // Dashboard: vista principal del admin, muestra todos los quizzes
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: 'Dashboard — MANTIS' }
  },
  {
    // Editor de quiz: se accede con ?code=XXXXXX
    // Si no hay code, AdminView crea uno nuevo al aterrizar
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { title: 'Editor de Quiz — MANTIS' }
  },
  {
    path: '/host',
    name: 'host',
    component: HostView,
    meta: { title: 'Host — MANTIS' }
  },
  {
    path: '/join',
    name: 'join',
    component: JoinView,
    meta: { title: 'Unirse — MANTIS' }
  },
  {
    path: '/play',
    name: 'play',
    component: PlayView,
    meta: { title: 'Jugar — MANTIS' }
  },
  {
    path: '/results',
    name: 'results',
    component: ResultsView,
    meta: { title: 'Resultados — MANTIS' }
  },
  // Redirigir rutas desconocidas al home
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// Actualizar <title> de la página
router.afterEach((to) => {
  document.title = to.meta.title || 'MANTIS'
})

export default router
