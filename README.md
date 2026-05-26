# 🦗 MANTIS

> **Mantis** es la plataforma de juegos de preguntas en tiempo real detrás de **QuizHive**.
> Diseñada para evaluar y potenciar el pensamiento crítico mediante sesiones interactivas estilo Kahoot.

---

## 🏗️ Arquitectura

```
MANTIS/
├── apps/
│   ├── backend/     → Node.js + Express + Socket.io + MongoDB (Render)
│   └── frontend/    → Vue 3 + Vite + Pinia + Socket.io Client (Vercel)
```

| Capa | Tecnología | Deploy |
|------|-----------|--------|
| **Frontend** | Vue 3 + Vite + Pinia | Vercel |
| **Backend** | Node.js + Express + Socket.io | Render |
| **Database** | MongoDB Atlas | Cloud |
| **Real-time** | Socket.io (WebSockets) | — |

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- MongoDB Atlas (o local)
- Cuenta en Render y Vercel (para deploy)

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd MANTIS
```

### 2. Backend

```bash
cd apps/backend
cp .env.example .env
# Editar .env con tu MONGODB_URI
npm install
npm run dev
```

Servidor corriendo en `http://localhost:3000`

### 3. Frontend

```bash
cd apps/frontend
cp .env.example .env
# Editar .env: VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

App corriendo en `http://localhost:5173`

---

## 📁 Estructura del Monorepo

```
MANTIS/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.js              # Entry point
│   │   │   ├── models/
│   │   │   │   ├── Question.js       # Schema de preguntas
│   │   │   │   └── Session.js        # Schema de sesiones/partidas
│   │   │   ├── routes/
│   │   │   │   ├── questions.js      # CRUD de preguntas
│   │   │   │   └── sessions.js       # Gestión de sesiones
│   │   │   ├── socket/
│   │   │   │   └── gameSocket.js     # 🎮 Game Engine en tiempo real
│   │   │   └── utils/
│   │   │       └── helpers.js        # Room codes + scoring
│   │   ├── package.json
│   │   ├── render.yaml               # Config de deploy en Render
│   │   └── .env.example
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.js
│       │   ├── App.vue
│       │   ├── router/
│       │   │   └── index.js          # Rutas: Home, Admin, Host, Join, Play, Results
│       │   ├── stores/
│       │   │   ├── socket.js         # Store de Socket.io
│       │   │   └── game.js           # Store de estado del juego
│       │   ├── views/
│       │   │   ├── HomeView.vue      # Landing page
│       │   │   ├── AdminView.vue     # CRUD de preguntas
│       │   │   ├── HostView.vue      # Panel del host (lobby + control)
│       │   │   ├── JoinView.vue      # Unirse a partida
│       │   │   ├── PlayView.vue      # 🎮 Pantalla de juego
│       │   │   └── ResultsView.vue   # Resultados finales
│       │   └── components/
│       │       └── FinalLeaderboard.vue  # Podium + ranking
│       ├── package.json
│       ├── vite.config.js
│       └── .env.example
│
└── README.md                           # Este archivo
```

---

## 🎮 Flujo del Juego

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ADMIN     │────→│   HOST      │────→│  JUGADORES  │
│  (Crea      │     │  (Genera    │     │  (Se unen   │
│  preguntas) │     │   código)   │     │   con código)│
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   LOBBY     │
                    │  (Esperando │
                    │   jugadores)│
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   JUEGO     │←───→│   TIMER     │
                    │  (Preguntas │     │   20s       │
                    │   en vivo)  │     │   por pregunta
                    └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  RESULTADOS │
                    │  (Podium +  │
                    │   ranking)  │
                    └─────────────┘
```

---

## 🔌 API Endpoints

### Questions
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/questions` | Listar todas |
| GET | `/api/questions/:id` | Obtener una |
| POST | `/api/questions` | Crear nueva |
| PUT | `/api/questions/:id` | Actualizar |
| DELETE | `/api/questions/:id` | Eliminar |

### Sessions
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/sessions/create` | Crear sesión |
| GET | `/api/sessions/:code` | Obtener por código |
| GET | `/api/sessions` | Listar activas |
| DELETE | `/api/sessions/:code` | Eliminar |

---

## 📡 Socket.io Events

### Host → Server
- `host:join` — Unirse como host
- `host:start` — Iniciar juego
- `host:next` — Siguiente pregunta
- `host:end` — Terminar juego

### Player → Server
- `player:join` — Unirse a sesión
- `player:answer` — Enviar respuesta

### Server → Client
- `game:started` — Juego iniciado
- `question:show` — Mostrar pregunta
- `answer:result` — Resultado de respuesta
- `leaderboard:show` — Leaderboard entre preguntas
- `question:results` — Resultados de pregunta
- `game:ended` — Juego terminado
- `players:update` — Lista de jugadores actualizada

---

## 🏆 Sistema de Puntaje

| Situación | Puntos |
|-----------|--------|
| Correcta + rápida (< 50% del tiempo) | **150 pts** (base 100 + bonus 50%) |
| Correcta + normal | **100 pts** |
| Correcta + lenta | **50-99 pts** |
| Incorrecta | **0 pts** |
| Sin responder | **0 pts** |

---

## 🚀 Deploy

### Backend en Render
1. Subir repo a GitHub
2. New Web Service en Render → conectar repo
3. Root Directory: `apps/backend`
4. Build: `npm install` | Start: `npm start`
5. Environment Variables:
   - `MONGODB_URI` = tu URI de Atlas
   - `FRONTEND_URL` = URL del frontend en Vercel

### Frontend en Vercel
1. New Project → importar repo
2. Root Directory: `apps/frontend`
3. Framework: Vite
4. Environment Variables:
   - `VITE_API_URL` = URL del backend en Render

---

## 🛠️ Stack Técnico

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Node.js | 18+ | Runtime backend |
| Express | ^4.18 | Framework HTTP |
| Socket.io | ^4.7 | WebSockets en tiempo real |
| Mongoose | ^8.0 | ODM MongoDB |
| Vue | ^3.4 | Framework frontend |
| Vite | ^5.0 | Build tool |
| Pinia | ^2.1 | State management |
| Vue Router | ^4.2 | Routing |
| Axios | ^1.6 | HTTP client |

---

## 📝 Licencia

MIT © QuizHive Team

---

> **QuizHive** — *"Pon a prueba tu mente. En tiempo real."*
