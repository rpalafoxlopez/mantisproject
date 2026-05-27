<template>
  <div class="home-container">
    <section class="hero">
      <div class="hero-content">
        <div class="logo-hero">
          <img src="/img/logo.png" alt="MANTIS" class="hero-logo" />
          <h1 class="hero-title">MANTIS</h1>
        </div>
        <p class="hero-tagline">Potencia el <span class="highlight">Pensamiento Critico</span> en tu Equipo</p>
        <p class="hero-subtitle">Evalua la capacidad de analisis en tiempo real con nuestra plataforma de cuestionarios disenada para el alto rendimiento.</p>
        <div class="hero-actions">
          <router-link to="/admin" class="btn-primary btn-large" v-if="authStore.isAdmin">
            <span class="material-icons">add_circle</span> Crear Partida
          </router-link>
          <router-link to="/login" class="btn-primary btn-large" v-else-if="!authStore.isAuthenticated">
            <span class="material-icons">login</span> Iniciar Sesion
          </router-link>
          <router-link to="/join" class="btn-secondary btn-large">
            <span class="material-icons">group</span> Unirse a Partida
          </router-link>
        </div>
      </div>
      <div class="hero-visual">
        <div class="floating-card card-1"><span class="material-icons">timer</span><span>Tiempo Real</span></div>
        <div class="floating-card card-2"><span class="material-icons">psychology</span><span>Pensamiento Critico</span></div>
        <div class="floating-card card-3"><span class="material-icons">emoji_events</span><span>Leaderboard</span></div>
      </div>
    </section>

    <section class="features">
      <h2 class="section-title">Herramientas de Evaluacion</h2>
      <p class="section-subtitle">Elevamos los estandares de capacitacion mediante analitica avanzada y metodologias comprobadas.</p>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><span class="material-icons">timer</span></div>
          <h3>Tiempo Real</h3>
          <p>Respuestas instantaneas y analisis de datos en vivo para retroalimentacion inmediata.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><span class="material-icons">leaderboard</span></div>
          <h3>Panel de Resultados</h3>
          <p>Ranking en vivo y metricas detalladas por participante.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><span class="material-icons">psychology</span></div>
          <h3>Evaluacion Estrategica</h3>
          <p>Preguntas disenadas para evaluar razonamiento logico bajo presion.</p>
        </div>
      </div>
    </section>

    <section class="how-it-works">
      <h2 class="section-title">Como Funciona?</h2>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <h3>Crea una Partida</h3>
          <p>El administrador configura las preguntas de opcion multiple y genera un codigo unico.</p>
        </div>
        <div class="step-arrow"><span class="material-icons">arrow_forward</span></div>
        <div class="step">
          <div class="step-num">2</div>
          <h3>Comparte el Codigo</h3>
          <p>Los jugadores se unen usando el codigo de sala desde cualquier dispositivo.</p>
        </div>
        <div class="step-arrow"><span class="material-icons">arrow_forward</span></div>
        <div class="step">
          <div class="step-num">3</div>
          <h3>Juega en Vivo</h3>
          <p>Responde preguntas contra el tiempo y compite en el leaderboard en tiempo real.</p>
        </div>
      </div>
    </section>

    <footer class="home-footer">
      <div class="footer-logo">
        <img src="/img/logo.png" alt="MANTIS" class="footer-logo-img" />
        <span>MANTIS</span>
      </div>
      <p class="footer-text">Pon a prueba tu mente. En tiempo real.</p>
    </footer>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'
const authStore = useAuthStore()
</script>

<style scoped>
.home-container { min-height: 100vh; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%); color: #e0e0e0; }
.hero { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; padding: 4rem 2rem; min-height: 80vh; gap: 4rem; }
.hero-content { flex: 1; max-width: 600px; }
.logo-hero { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.hero-logo { width: 64px; height: 64px; }
.hero-title { font-size: 3.5rem; font-weight: 800; background: linear-gradient(135deg, #00d4aa, #00a8e8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-tagline { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 1rem; line-height: 1.3; }
.highlight { background: linear-gradient(135deg, #00d4aa, #00a8e8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-subtitle { font-size: 1.1rem; color: #888; margin-bottom: 2rem; line-height: 1.6; }
.hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
.btn-primary, .btn-secondary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1.75rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; border: none; }
.btn-primary { background: linear-gradient(135deg, #00d4aa, #00a8e8); color: #0f0f1a; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 25px rgba(0,212,170,0.4); }
.btn-secondary { background: rgba(255,255,255,0.1); color: #ccc; border: 1px solid rgba(255,255,255,0.2); }
.btn-secondary:hover { background: rgba(255,255,255,0.15); color: #fff; }
.btn-large { padding: 1rem 2rem; font-size: 1.1rem; }
.hero-visual { position: relative; width: 400px; height: 400px; flex-shrink: 0; }
.floating-card { position: absolute; display: flex; align-items: center; gap: 0.5rem; padding: 1rem 1.25rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; backdrop-filter: blur(10px); animation: float 6s ease-in-out infinite; }
.floating-card .material-icons { color: #00d4aa; font-size: 1.5rem; }
.card-1 { top: 20%; left: 10%; animation-delay: 0s; }
.card-2 { top: 50%; right: 5%; animation-delay: -2s; }
.card-3 { bottom: 20%; left: 20%; animation-delay: -4s; }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
.features { max-width: 1200px; margin: 0 auto; padding: 4rem 2rem; text-align: center; }
.section-title { font-size: 2rem; color: #fff; margin-bottom: 0.75rem; }
.section-subtitle { color: #888; max-width: 600px; margin: 0 auto 3rem; line-height: 1.6; }
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
.feature-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2rem; transition: all 0.3s; }
.feature-card:hover { transform: translateY(-5px); border-color: rgba(0,212,170,0.3); box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
.feature-icon { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(0,212,170,0.2), rgba(0,168,232,0.2)); border-radius: 16px; margin: 0 auto 1rem; }
.feature-icon .material-icons { font-size: 1.75rem; color: #00d4aa; }
.feature-card h3 { color: #fff; margin-bottom: 0.75rem; font-size: 1.25rem; }
.feature-card p { color: #888; font-size: 0.95rem; line-height: 1.5; }
.how-it-works { max-width: 1200px; margin: 0 auto; padding: 4rem 2rem; text-align: center; }
.steps { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 3rem; flex-wrap: wrap; }
.step { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2rem; max-width: 280px; text-align: center; }
.step-num { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #00d4aa, #00a8e8); border-radius: 50%; font-size: 1.25rem; font-weight: 700; color: #0f0f1a; margin: 0 auto 1rem; }
.step h3 { color: #fff; margin-bottom: 0.75rem; font-size: 1.1rem; }
.step p { color: #888; font-size: 0.9rem; line-height: 1.5; }
.step-arrow { color: rgba(0,212,170,0.5); }
.step-arrow .material-icons { font-size: 2rem; }
.home-footer { text-align: center; padding: 3rem 2rem; border-top: 1px solid rgba(255,255,255,0.05); }
.footer-logo { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.footer-logo-img { width: 32px; height: 32px; }
.footer-logo span { font-size: 1.25rem; font-weight: 700; background: linear-gradient(135deg, #00d4aa, #00a8e8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.footer-text { color: #666; font-size: 0.9rem; }
@media (max-width: 968px) {
  .hero { flex-direction: column; text-align: center; padding: 2rem 1rem; }
  .hero-visual { width: 300px; height: 300px; }
  .features-grid { grid-template-columns: 1fr; }
  .steps { flex-direction: column; }
  .step-arrow { transform: rotate(90deg); }
}
</style>
