# 🐝 QuizHive — Frontend

> Interfaz de juego para Mantis.
> Vue 3 + Vite + Pinia + Socket.io Client.
> Diseño estilo Kahoot: oscuro, colorido, rápido.

---

## 🚀 Inicio Rápido

```bash
cd apps/frontend
cp .env.example .env
# Editar .env: VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

App en `http://localhost:5173`

---

## 📁 Estructura

```
src/
├── main.js                 # Entry point: Vue + Pinia + Router
├── App.vue                 # Root component + estilos globales
├── router/
│   └── index.js            # Rutas de la aplicación
├── stores/
│   ├── socket.js           # Store de Socket.io (conexión, emit, on/off)
│   └── game.js             # Store de estado del juego (reactivo, computado)
├── views/
│   ├── HomeView.vue        # 🏠 Landing page (hero + features)
│   ├── AdminView.vue       # ⚙️ CRUD de preguntas (formulario + lista)
│   ├── HostView.vue        # 👑 Panel del host (lobby + juego en vivo)
│   ├── JoinView.vue        # 🎮 Unirse a partida (código + nombre + avatar)
│   ├── PlayView.vue        # 🎯 Pantalla de juego (timer + opciones + feedback)
│   └── ResultsView.vue     # 🏆 Resultados finales
└── components/
    └── FinalLeaderboard.vue    # Podium animado + ranking + stats
```

---

## 🔧 Variables de Entorno (.env)

```env
# Desarrollo
VITE_API_URL=http://localhost:3000

# Producción (ejemplo)
# VITE_API_URL=https://mantis-api.onrender.com
```

---

## 🛣️ Rutas

| Ruta | Nombre | Descripción | Acceso |
|------|--------|-------------|--------|
| `/` | Home | Landing con opciones de jugar/crear | Público |
| `/admin` | Admin | CRUD completo de preguntas | Admin |
| `/host` | Host | Crear nueva sala (genera código) | Host |
| `/host/:code` | Host | Unirse como host a sala existente | Host |
| `/join` | Join | Formulario para unirse a sala | Jugador |
| `/play/:code` | Play | Pantalla de juego en vivo | Jugador |
| `/results/:code` | Results | Resultados finales de la partida | Todos |

---

## 🎨 Diseño Visual

### Paleta de Colores
```
Primario:     #667eea → #764ba2 (gradiente morado)
Acierto:      #4facfe → #00f2fe (azul cian)
Error:        #f5576c → #f093fb (rosa/rojo)
Advertencia:  #ffd700 (amarillo/dorado)
Fondo juego:  #1a1a2e → #16213e (oscuro)
Fondo app:    gradiente morado (home)
Texto:        blanco (juego) / #333 (admin)
```

### Opciones de Respuesta (Formas)
| Índice | Forma | Color | Tecla |
|--------|-------|-------|-------|
| 0 | ▲ Triángulo | Rojo `#ff6b6b` | 1 |
| 1 | ● Círculo | Verde `#4ecdc4` | 2 |
| 2 | ■ Cuadrado | Amarillo `#ffe66d` | 3 |
| 3 | ★ Estrella | Morado `#a29bfe` | 4 |

---

## 🎮 Flujo de Pantallas

### 1. Crear Partida (Host)
```
Home → Click "Crear Partida" → /host
  → Se genera código automáticamente (ej: AB2D)
  → Se cargan todas las preguntas de la BD
  → Lobby: esperando jugadores
  → Host click "Iniciar Juego"
  → Juego en vivo con controles
```

### 2. Unirse a Partida (Jugador)
```
Home → Click "Unirse a Partida" → /join
  → Ingresar código de 4 caracteres
  → Elegir nombre (único en la sala)
  → Seleccionar avatar (o aleatorio)
  → Click "¡Entrar!"
  → /play/:code (esperando inicio)
```

### 3. Juego en Curso (PlayView)
```
Timer animado (barra superior)
  → Pregunta centrada
  → 4 opciones grandes con formas/colores
  → Click en opción → deshabilitado
  → Feedback inmediato:
      ✅ Correcto: +150 pts (animación pulse)
      ❌ Incorrecto: 0 pts (animación shake)
  → Esperar siguiente pregunta...
  → Leaderboard (3 segundos)
  → Siguiente pregunta
```

### 4. Resultados Finales
```
Podio animado (top 3 con barras de altura)
  → Ranking completo con animación escalonada
  → Stats: jugadores, preguntas, precisión
  → Botón "Jugar de Nuevo"
```

---

## 📡 Comunicación con Backend (Socket.io)

### Store: `socket.js`
```javascript
const socketStore = useSocketStore()

// Conectar
socketStore.connect()

// Emitir evento
socketStore.emit('player:answer', {
  sessionCode: 'AB2D',
  questionIndex: 0,
  selectedOption: 2
})

// Escuchar evento
socketStore.on('answer:result', (result) => {
  console.log(result)  // { correct: true, pointsEarned: 150, ... }
})
```

### Store: `game.js`
```javascript
const gameStore = useGameStore()

// Estado reactivo
gameStore.status           // 'waiting' | 'playing' | 'finished'
gameStore.currentQuestion  // { question, options, timeLimit, ... }
gameStore.timeLeft         // segundos restantes
gameStore.hasAnswered      // boolean
gameStore.leaderboard      // [{ name, avatar, score, ... }]

// Computed
gameStore.isWaiting
gameStore.isPlaying
gameStore.isFinished
gameStore.myRank
gameStore.myScore
```

---

## 🎬 Animaciones

| Elemento | Animación | Trigger |
|----------|-----------|---------|
| Opción correcta | `pulse` (escala) | Al revelar resultado |
| Opción incorrecta | `shake` (horizontal) | Al revelar resultado |
| Timer ≤ 5s | `pulse` + rojo | Tiempo crítico |
| Leaderboard | `slideIn` escalonado | Entre preguntas |
| Podium | `popUp` + altura proporcional | Resultados finales |
| Avatares en lobby | `popIn` | Nuevo jugador se une |
| Avatar esperando | `bounce` | Pantalla de espera |

---

## 📱 Responsive

| Breakpoint | Cambios |
|------------|---------|
| Desktop (>768px) | Opciones en grid 2x2, sidebar host |
| Mobile (≤768px) | Opciones en columna, layout vertical |
| Small (≤600px) | Podium más compacto, timer más grande |

---

## 🚀 Deploy en Vercel

1. Crear cuenta en [vercel.com](https://vercel.com)
2. New Project → Importar repo de GitHub
3. Configurar:
   - **Root Directory**: `apps/frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Environment Variables:
   - `VITE_API_URL`: URL del backend en Render
5. Deploy!

---

## 📦 Dependencias

```json
{
  "vue": "^3.4.0",
  "vue-router": "^4.2.5",
  "pinia": "^2.1.7",
  "socket.io-client": "^4.7.2",
  "axios": "^1.6.2"
}
```

---

## 🎯 Características Destacadas

- ✅ **Timer animado** con barra de progreso y cambio de color
- ✅ **Opciones grandes** con formas geométricas distintivas
- ✅ **Feedback inmediato** con animaciones y puntos ganados
- ✅ **Leaderboard en vivo** entre cada pregunta
- ✅ **Podium animado** al final con top 3
- ✅ **Avatares aleatorios** para cada jugador
- ✅ **Fondo oscuro** estilo Kahoot durante el juego
- ✅ **Responsive** para móviles y desktop
- ✅ **Reconexión automática** de WebSockets

---

> **QuizHive** — *"Pon a prueba tu mente. En tiempo real."*
