<template>
  <div>
    <!-- Hero Section -->
    <section class="relative pt-16 pb-24 overflow-hidden bg-background lg:pt-20 lg:pb-32">
      <div class="grid items-center gap-12 px-6 mx-auto max-w-7xl lg:px-10 lg:grid-cols-2">
        <div class="z-10">
          <div class="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1.5 rounded-full text-sm font-medium mb-6">
            <span class="text-base material-symbols-outlined">verified</span>
            <span>Enterprise Ready Platform</span>
          </div>

          <h1 class="mb-6 text-4xl font-bold leading-tight lg:text-5xl text-primary">
            QuizHive, potencia a tu equipo
          </h1>

          <p class="max-w-xl mb-10 text-lg text-on-surface-variant">
            Evalúa la capacidad de análisis en tiempo real con nuestra plataforma de cuestionarios corporativos diseñada para el alto rendimiento.
          </p>

          <div class="flex flex-wrap gap-4">
            <template v-if="authStore.isAuthenticated">
              <router-link to="/host" class="px-8 py-4 text-base btn btn-primary">
                <span class="material-symbols-outlined">add_circle</span>
                Crear Partida
              </router-link>
            </template>
            <template v-else>
              <router-link to="/register" class="px-8 py-4 text-base btn btn-primary">
                <span class="material-symbols-outlined">add_circle</span>
                Crear Partida
              </router-link>
            </template>

            <router-link to="/join" class="px-8 py-4 text-base btn btn-secondary">
              <span class="material-symbols-outlined">group</span>
              Soy jugador
            </router-link>
          </div>

          <div v-if="authStore.isAdmin" class="flex items-center gap-3 mt-8">
            <span class="material-symbols-outlined text-secondary">settings_suggest</span>
            <router-link to="/dashboard" class="text-sm underline transition-colors text-on-surface-variant hover:text-secondary underline-offset-4">
              Panel de Administración
            </router-link>
          </div>
        </div>

        <!-- Dashboard Visualization -->
        <div class="relative hidden lg:block">
          <div class="relative flex items-center justify-center w-full aspect-square">
            <div class="absolute inset-0 rounded-full bg-secondary/5 blur-3xl"></div>
            <div class="relative w-4/5 p-6 overflow-hidden bg-white border shadow-2xl h-4/5 rounded-xl border-border-subtle">
              <div class="flex items-center justify-between pb-4 mb-6 border-b border-border-subtle">
                <div class="w-32 h-4 bg-gray-100 rounded-full"></div>
                <div class="flex gap-2">
                  <div class="w-6 h-6 rounded-full bg-secondary/20"></div>
                  <div class="w-6 h-6 rounded-full bg-secondary/20"></div>
                </div>
              </div>
              <div class="space-y-4">
                <div class="flex items-center gap-4">
                  <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/10 text-secondary">
                    <span class="material-symbols-outlined">analytics</span>
                  </div>
                  <div class="flex-1 space-y-2">
                    <div class="w-full h-3 bg-gray-100 rounded-full"></div>
                    <div class="w-3/4 h-3 rounded-full bg-gray-100/50"></div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4 pt-4">
                  <div class="h-20 p-3 rounded-lg bg-gray-50">
                    <div class="w-12 h-2 mb-2 rounded-full bg-secondary/30"></div>
                    <div class="w-16 h-5 rounded-full bg-secondary/10"></div>
                  </div>
                  <div class="h-20 p-3 rounded-lg bg-gray-50">
                    <div class="w-12 h-2 mb-2 rounded-full bg-secondary/30"></div>
                    <div class="w-16 h-5 rounded-full bg-secondary/10"></div>
                  </div>
                </div>
                <div class="pt-2">
                  <div class="flex items-end w-full gap-2 p-4 rounded-lg h-28 bg-secondary">
                    <div class="w-full rounded-t bg-white/20 h-1/2"></div>
                    <div class="w-full rounded-t bg-white/40 h-3/4"></div>
                    <div class="w-full rounded-t bg-white/30 h-1/4"></div>
                    <div class="w-full h-full rounded-t bg-white/60"></div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Floating icons -->
            <div class="absolute right-0 flex items-center justify-center transition-transform duration-500 transform bg-white border shadow-lg top-8 h-14 w-14 rounded-xl border-border-subtle text-secondary rotate-12 hover:rotate-0">
              <span class="text-2xl material-symbols-outlined">query_stats</span>
            </div>
            <div class="absolute left-0 flex items-center justify-center transition-transform duration-500 transform bg-white border shadow-lg bottom-8 h-14 w-14 rounded-xl border-border-subtle text-secondary -rotate-12 hover:rotate-0">
              <span class="text-2xl material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">military_tech</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-20 bg-white">
      <div class="px-6 mx-auto max-w-7xl lg:px-10">
        <div class="max-w-2xl mx-auto mb-16 text-center">
          <h2 class="mb-4 text-3xl font-bold text-primary">Herramientas de Evaluación Corporativa</h2>
          <p class="text-on-surface-variant">Elevamos los estándares de capacitación empresarial mediante analítica avanzada y metodologías de evaluación comprobadas.</p>
        </div>

        <div class="grid gap-8 md:grid-cols-3">
          <div class="p-8 transition-all duration-300 border bg-background rounded-xl border-border-subtle hover:border-secondary/30 group hover:-translate-y-2">
            <div class="flex items-center justify-center mb-6 transition-colors duration-300 h-14 w-14 rounded-xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white">
              <span class="text-2xl material-symbols-outlined">timer</span>
            </div>
            <h3 class="mb-3 text-xl font-semibold text-primary">Tiempo Real</h3>
            <p class="text-on-surface-variant">Respuestas instantáneas y análisis de datos en vivo para una retroalimentación inmediata durante las sesiones.</p>
          </div>

          <div class="p-8 transition-all duration-300 border bg-background rounded-xl border-border-subtle hover:border-secondary/30 group hover:-translate-y-2">
            <div class="flex items-center justify-center mb-6 transition-colors duration-300 h-14 w-14 rounded-xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white">
              <span class="text-2xl material-symbols-outlined">leaderboard</span>
            </div>
            <h3 class="mb-3 text-xl font-semibold text-primary">Panel de Resultados</h3>
            <p class="text-on-surface-variant">Ranking en vivo y métricas detalladas por participante que permiten identificar brechas de conocimiento críticas.</p>
          </div>

          <div class="p-8 transition-all duration-300 border bg-background rounded-xl border-border-subtle hover:border-secondary/30 group hover:-translate-y-2">
            <div class="flex items-center justify-center mb-6 transition-colors duration-300 h-14 w-14 rounded-xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white">
              <span class="text-2xl material-symbols-outlined">psychology</span>
            </div>
            <h3 class="mb-3 text-xl font-semibold text-primary">Evaluación Estratégica</h3>
            <p class="text-on-surface-variant">Preguntas diseñadas para evaluar razonamiento lógico y resolución de problemas bajo presión profesional.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 bg-background">
      <div class="px-6 mx-auto max-w-7xl lg:px-10">
        <div class="relative overflow-hidden shadow-2xl rounded-2xl h-80">
          <div class="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70"></div>
          <div class="relative flex items-center h-full p-12">
            <div class="max-w-lg text-white">
              <h2 class="mb-4 text-3xl font-bold">Transforma la cultura de tu empresa</h2>
              <p class="mb-8 text-white/90">Nuestras herramientas ayudan a las organizaciones a desarrollar habilidades cognitivas esenciales para la toma de decisiones.</p>
              <router-link to="/register" class="inline-flex items-center gap-2 px-6 py-3 font-semibold transition-all bg-white rounded-lg text-primary hover:bg-secondary hover:text-white">
                Comenzar Ahora
                <span class="material-symbols-outlined">arrow_forward</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="w-full py-12 border-t bg-tertiary border-primary-container">
      <div class="grid gap-8 px-6 mx-auto max-w-7xl lg:px-10 md:grid-cols-2">
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-lg font-bold text-white">
            <span class="material-symbols-outlined text-secondary">hive</span>
            QuizHive Enterprise
          </div>
          <p class="max-w-sm text-sm text-white/70">
            La plataforma líder en evaluaciones críticas para el entorno corporativo. Ayudamos a equipos globales a pensar mejor, más rápido y con mayor precisión.
          </p>
          <p class="text-xs text-white/50">© 2024 QuizHive Enterprise. All rights reserved.</p>
        </div>
        <div class="flex flex-wrap gap-x-12 gap-y-6 md:justify-end">
          <div class="flex flex-col gap-2">
            <h4 class="mb-1 text-sm font-semibold text-white">Plataforma</h4>
            <a href="#" class="text-sm transition-colors text-white/60 hover:text-white">Features</a>
            <a href="#" class="text-sm transition-colors text-white/60 hover:text-white">Security</a>
          </div>
          <div class="flex flex-col gap-2">
            <h4 class="mb-1 text-sm font-semibold text-white">Legal</h4>
            <a href="#" class="text-sm transition-colors text-white/60 hover:text-white">Terms</a>
            <a href="#" class="text-sm transition-colors text-white/60 hover:text-white">Privacy</a>
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
