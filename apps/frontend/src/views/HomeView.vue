<template>
  <div class="home-view">
    <div class="hero">
      <div class="hero-content">
        <h1 class="hero-title">🧠 Pensamiento Crítico</h1>
        <p class="hero-subtitle">
          Pon a prueba tu capacidad de análisis en tiempo real.
          <br />Compite con tus amigos y demuestra quién piensa más rápido.
        </p>

        <div class="hero-actions">
          <router-link to="/join" class="btn btn-primary btn-lg">
            🎮 Unirse a Partida
          </router-link>
          <router-link to="/host" class="btn btn-secondary btn-lg">
            👑 Crear Partida
          </router-link>
        </div>

        <div class="hero-admin">
          <router-link to="/admin" class="admin-link">
            ⚙️ Panel de Administración
          </router-link>
        </div>
      </div>

      <div class="hero-visual">
        <div class="floating-cards">
          <div class="float-card card-1">❓</div>
          <div class="float-card card-2">⚡</div>
          <div class="float-card card-3">🏆</div>
          <div class="float-card card-4">🎯</div>
        </div>
      </div>
    </div>

    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">⏱️</div>
        <h3>Tiempo Real</h3>
        <p>Responde antes de que se acabe el tiempo. Más rápido = más puntos.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>Leaderboard</h3>
        <p>Ranking en vivo después de cada pregunta. ¡Ve subiendo posiciones!</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🧩</div>
        <h3>Pensamiento Crítico</h3>
        <p>Preguntas diseñadas para evaluar tu capacidad de análisis y razonamiento.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  min-height: 70vh;
  padding: 2rem 0;
}

.hero-content {
  text-align: left;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 900;
  color: white;
  margin-bottom: 1rem;
  text-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.hero-subtitle {
  font-size: 1.3rem;
  color: rgba(255,255,255,0.9);
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.btn-lg {
  padding: 1.2rem 3rem;
  font-size: 1.2rem;
}

.hero-admin {
  margin-top: 1rem;
}

.admin-link {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.3s;
}

.admin-link:hover {
  color: white;
}

.hero-visual {
  position: relative;
  height: 400px;
}

.floating-cards {
  position: relative;
  width: 100%;
  height: 100%;
}

.float-card {
  position: absolute;
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  animation: float 3s ease-in-out infinite;
}

.card-1 { top: 10%; left: 20%; animation-delay: 0s; }
.card-2 { top: 30%; right: 10%; animation-delay: 0.5s; }
.card-3 { bottom: 20%; left: 10%; animation-delay: 1s; }
.card-4 { bottom: 10%; right: 25%; animation-delay: 1.5s; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 4rem;
}

.feature-card {
  background: rgba(255,255,255,0.95);
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  color: #667eea;
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
}

.feature-card p {
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero-title {
    font-size: 2.5rem;
  }
  .hero-actions {
    justify-content: center;
  }
  .features {
    grid-template-columns: 1fr;
  }
  .hero-visual {
    display: none;
  }
}
</style>
