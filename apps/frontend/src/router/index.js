import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue')
  },
  {
    path: '/host/:sessionCode?',
    name: 'Host',
    component: () => import('@/views/HostView.vue'),
    props: true
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

export default router
