<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-background pt-16 pb-24 lg:pt-20 lg:pb-32">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-center">
        <div class="z-10">
          <div class="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1.5 rounded-full text-sm font-medium mb-6">
            <span class="material-symbols-outlined text-base">verified</span>
            <span>Enterprise Ready Platform</span>
          </div>

          <h1 class="text-4xl lg:text-5xl font-bold text-primary mb-6 leading-tight">
            Potencia el Pensamiento Crítico en tu Equipo
          </h1>

          <p class="text-lg text-on-surface-variant mb-10 max-w-xl">
            Evalúa la capacidad de análisis en tiempo real con nuestra plataforma de cuestionarios corporativos diseñada para el alto rendimiento.
          </p>

          <div class="flex flex-wrap gap-4">
            <template v-if="authStore.isAuthenticated">
              <router-link to="/host" class="btn btn-primary px-8 py-4 text-base">
                <span class="material-symbols-outlined">add_circle</span>
                Crear Partida
              </router-link>
            </template>
            <template v-else>
              <router-link to="/register" class="btn btn-primary px-8 py-4 text-base">
                <span class="material-symbols-outlined">add_circle</span>
                Crear Partida
              </router-link>
            </template>

            <router-link to="/join" class="btn btn-secondary px-8 py-4 text-base">
              <span class="material-symbols-outlined">group</span>
              Unirse a Partida
            </router-link>
          </div>

          <div v-if="authStore.isAdmin" class="mt-8 flex items-center gap-3">
            <span class="material-symbols-outlined text-secondary">settings_suggest</span>
            <router-link to="/admin" class="text-sm text-on-surface-variant hover:text-secondary transition-colors underline underline-offset-4">
              Panel de Administración
            </router-link>
          </div>
        </div>

        <!-- Dashboard Visualization -->
        <div class="relative hidden lg:block">
          <div class="relative w-full aspect-square flex items-center justify-center">
            <div class="absolute inset-0 bg-secondary/5 rounded-full blur-3xl"></div>
            <div class="relative w-4/5 h-4/5 bg-white rounded-xl shadow-2xl border border-border-subtle p-6 overflow-hidden">
              <div class="flex justify-between items-center mb-6 border-b border-border-subtle pb-4">
                <div class="h-4 w-32 bg-gray-100 rounded-full"></div>
                <div class="flex gap-2">
                  <div class="h-6 w-6 rounded-full bg-secondary/20"></div>
                  <div class="h-6 w-6 rounded-full bg-secondary/20"></div>
                </div>
              </div>
              <div class="space-y-4">
                <div class="flex items-center gap-4">
                  <div class="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <span class="material-symbols-outlined">analytics</span>
                  </div>
                  <div class="flex-1 space-y-2">
                    <div class="h-3 w-full bg-gray-100 rounded-full"></div>
                    <div class="h-3 w-3/4 bg-gray-100/50 rounded-full"></div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4 pt-4">
                  <div class="h-20 bg-gray-50 rounded-lg p-3">
                    <div class="h-2 w-12 bg-secondary/30 rounded-full mb-2"></div>
                    <div class="h-5 w-16 bg-secondary/10 rounded-full"></div>
                  </div>
                  <div class="h-20 bg-gray-50 rounded-lg p-3">
                    <div class="h-2 w-12 bg-secondary/30 rounded-full mb-2"></div>
                    <div class="h-5 w-16 bg-secondary/10 rounded-full"></div>
                  </div>
                </div>
                <div class="pt-2">
                  <div class="h-28 w-full bg-secondary rounded-lg flex items-end p-4 gap-2">
                    <div class="w-full bg-white/20 h-1/2 rounded-t"></div>
                    <div class="w-full bg-white/40 h-3/4 rounded-t"></div>
                    <div class="w-full bg-white/30 h-1/4 rounded-t"></div>
                    <div class="w-full bg-white/60 h-full rounded-t"></div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Floating icons -->
            <div class="absolute top-8 right-0 h-14 w-14 bg-white rounded-xl shadow-lg border border-border-subtle flex items-center justify-center text-secondary transform rotate-12 hover:rotate-0 transition-transform duration-500">
              <span class="material-symbols-outlined text-2xl">query_stats</span>
            </div>
            <div class="absolute bottom-8 left-0 h-14 w-14 bg-white rounded-xl shadow-lg border border-border-subtle flex items-center justify-center text-secondary transform -rotate-12 hover:rotate-0 transition-transform duration-500">
              <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">military_tech</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-6 lg:px-10">
        <div class="text-center mb-16 max-w-2xl mx-auto">
          <h2 class="text-3xl font-bold text-primary mb-4">Herramientas de Evaluación Corporativa</h2>
          <p class="text-on-surface-variant">Elevamos los estándares de capacitación empresarial mediante analítica avanzada y metodologías de evaluación comprobadas.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-background p-8 rounded-xl border border-border-subtle hover:border-secondary/30 transition-all duration-300 group hover:-translate-y-2">
            <div class="h-14 w-14 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
              <span class="material-symbols-outlined text-2xl">timer</span>
            </div>
            <h3 class="text-xl font-semibold text-primary mb-3">Tiempo Real</h3>
            <p class="text-on-surface-variant">Respuestas instantáneas y análisis de datos en vivo para una retroalimentación inmediata durante las sesiones.</p>
          </div>

          <div class="bg-background p-8 rounded-xl border border-border-subtle hover:border-secondary/30 transition-all duration-300 group hover:-translate-y-2">
            <div class="h-14 w-14 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
              <span class="material-symbols-outlined text-2xl">leaderboard</span>
            </div>
            <h3 class="text-xl font-semibold text-primary mb-3">Panel de Resultados</h3>
            <p class="text-on-surface-variant">Ranking en vivo y métricas detalladas por participante que permiten identificar brechas de conocimiento críticas.</p>
          </div>

          <div class="bg-background p-8 rounded-xl border border-border-subtle hover:border-secondary/30 transition-all duration-300 group hover:-translate-y-2">
            <div class="h-14 w-14 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
              <span class="material-symbols-outlined text-2xl">psychology</span>
            </div>
            <h3 class="text-xl font-semibold text-primary mb-3">Evaluación Estratégica</h3>
            <p class="text-on-surface-variant">Preguntas diseñadas para evaluar razonamiento lógico y resolución de problemas bajo presión profesional.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 bg-background">
      <div class="max-w-7xl mx-auto px-6 lg:px-10">
        <div class="relative rounded-2xl overflow-hidden h-80 shadow-2xl">
          <div class="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70"></div>
          <div class="relative h-full flex items-center p-12">
            <div class="max-w-lg text-white">
              <h2 class="text-3xl font-bold mb-4">Transforma la cultura de tu empresa</h2>
              <p class="text-white/90 mb-8">Nuestras herramientas ayudan a las organizaciones a desarrollar habilidades cognitivas esenciales para la toma de decisiones.</p>
              <router-link to="/register" class="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-secondary hover:text-white transition-all">
                Comenzar Ahora
                <span class="material-symbols-outlined">arrow_forward</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="w-full py-12 bg-tertiary border-t border-primary-container">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-8">
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-white font-bold text-lg">
            <span class="material-symbols-outlined text-secondary">hive</span>
            QuizHive Enterprise
          </div>
          <p class="text-white/70 text-sm max-w-sm">
            La plataforma líder en evaluaciones críticas para el entorno corporativo. Ayudamos a equipos globales a pensar mejor, más rápido y con mayor precisión.
          </p>
          <p class="text-xs text-white/50">© 2024 QuizHive Enterprise. All rights reserved.</p>
        </div>
        <div class="flex flex-wrap gap-x-12 gap-y-6 md:justify-end">
          <div class="flex flex-col gap-2">
            <h4 class="text-white font-semibold text-sm mb-1">Plataforma</h4>
            <a href="#" class="text-white/60 hover:text-white text-sm transition-colors">Features</a>
            <a href="#" class="text-white/60 hover:text-white text-sm transition-colors">Security</a>
          </div>
          <div class="flex flex-col gap-2">
            <h4 class="text-white font-semibold text-sm mb-1">Legal</h4>
            <a href="#" class="text-white/60 hover:text-white text-sm transition-colors">Terms</a>
            <a href="#" class="text-white/60 hover:text-white text-sm transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
</script>

<style scoped>
.bg-tertiary { background-color: #7d40a0; }
.border-primary-container { border-color: #4aa4ff; }
.text-secondary { color: #0e59b6; }
</style>
