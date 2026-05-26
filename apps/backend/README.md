# 🦗 MANTIS — Backend

> API REST + WebSockets para QuizHive.
> Node.js + Express + Socket.io + MongoDB.

---

## 🚀 Inicio Rápido

```bash
cd apps/backend
cp .env.example .env
# Editar .env con tu MONGODB_URI
npm install
npm run dev
```

Servidor en `http://localhost:3000`

---

## 📁 Estructura

```
src/
├── index.js              # Entry point: Express + HTTP + Socket.io
├── models/
│   ├── Question.js       # Schema: pregunta, opciones, respuesta, categoría, dificultad, tiempo, puntos
│   └── Session.js        # Schema: código, host, estado, preguntas, jugadores, settings
├── routes/
│   ├── questions.js      # CRUD completo de preguntas (Admin)
│   └── sessions.js       # Crear, obtener, listar, eliminar sesiones
├── socket/
│   └── gameSocket.js     # 🎮 GAME ENGINE — Todo el flujo en tiempo real
└── utils/
    └── helpers.js        # generateRoomCode() + calculateScore()
```

---

## 🔧 Variables de Entorno (.env)

```env
PORT=10000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/critical-thinking-game
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

---

## 📡 API Endpoints

### Questions
```
GET    /api/questions          → Listar todas (ordenadas por fecha)
GET    /api/questions/:id      → Obtener una por ID
POST   /api/questions          → Crear nueva
PUT    /api/questions/:id      → Actualizar
DELETE /api/questions/:id      → Eliminar
```

**Body POST/PUT:**
```json
{
  "question": "¿Qué es el pensamiento crítico?",
  "options": ["Aceptar todo", "Analizar y evaluar", "Ignorar", "Memorizar"],
  "correctAnswer": 1,
  "category": "Pensamiento Crítico",
  "difficulty": "medium",
  "timeLimit": 20,
  "points": 100
}
```

### Sessions
```
POST   /api/sessions/create    → Crear nueva sesión
GET    /api/sessions/:code     → Obtener por código (ej: AB2D)
GET    /api/sessions           → Listar activas (waiting/playing)
DELETE /api/sessions/:code     → Eliminar sesión
```

**Body POST /api/sessions/create:**
```json
{
  "hostId": "socket-id-del-host",
  "questionIds": ["id1", "id2", "id3"],
  "settings": {
    "timePerQuestion": 20,
    "showLeaderboard": true,
    "allowLateJoin": false
  }
}
```

---

## ⚡ Socket.io — Game Engine

### Eventos que recibe el servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `host:join` | `{ sessionCode }` | Host se une a sala |
| `host:start` | `{ sessionCode }` | Iniciar juego |
| `host:next` | `{ sessionCode }` | Avanzar a siguiente pregunta |
| `host:end` | `{ sessionCode }` | Terminar juego manualmente |
| `player:join` | `{ sessionCode, playerName, avatar }` | Jugador se une |
| `player:answer` | `{ sessionCode, questionIndex, selectedOption }` | Enviar respuesta |

### Eventos que envía el servidor

| Evento | Payload | Destino |
|--------|---------|---------|
| `game:started` | `{ totalQuestions, players }` | Todos |
| `question:show` | `{ index, totalQuestions, question, options, timeLimit, category }` | Jugadores (sin respuesta correcta) |
| `question:host` | `{ ...question:show, correctAnswer }` | Solo host |
| `answer:result` | `{ correct, correctAnswer, pointsEarned, totalScore }` | Jugador que respondió |
| `leaderboard:show` | `{ leaderboard, nextQuestionIn }` | Todos |
| `question:results` | `{ correctAnswer, optionCounts, totalAnswers, correctCount }` | Todos |
| `game:ended` | `{ leaderboard, stats, totalQuestions }` | Todos |
| `players:update` | `players[]` | Todos |
| `join:error` | `{ message }` | Jugador que intentó unirse |
| `error` | `{ message }` | Cliente específico |

---

## 🎮 Lógica del Juego (gameSocket.js)

```
1. Host crea sesión → código de 4 chars generado
2. Jugadores se unen con nombre + avatar
3. Host inicia → estado: 'playing', índice: 0
4. Se envía pregunta a todos + timer inicia
5. Jugadores responden → puntaje calculado en tiempo real
6. Cuando todos responden o se acaba el tiempo → resultados
7. Leaderboard (3s) → siguiente pregunta
8. Última pregunta → resultados finales + podium
```

### Cálculo de Puntaje
```javascript
// calculateScore(timeLimit, timeTaken, basePoints, isCorrect)
if (!isCorrect) return 0

timeRatio = timeTaken / (timeLimit * 1000)  // 0.0 - 1.0+
speedBonus = max(0, 1 - timeRatio)           // 1.0 = instantáneo
bonusMultiplier = 1 + (speedBonus * 0.5)     // hasta 1.5x

return round(basePoints * bonusMultiplier)   // 100 - 150 pts
```

### Room Codes
- 4 caracteres: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- Sin caracteres confusos: 0, O, I, 1
- Únicos por sesión activa

---

## 🚀 Deploy en Render

1. Crear cuenta en [render.com](https://render.com)
2. New Web Service → conectar repo de GitHub
3. Configurar:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Environment Variables:
   - `MONGODB_URI`: tu URI de MongoDB Atlas
   - `FRONTEND_URL`: URL del frontend en Vercel
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
5. Deploy!

El archivo `render.yaml` ya tiene la configuración lista.

---

## 🧪 Health Check

```bash
curl https://your-backend.onrender.com/health
```

Respuesta:
```json
{ "status": "ok", "timestamp": "2026-05-26T10:00:00.000Z" }
```

---

## 📦 Dependencias

```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.2",
  "mongoose": "^8.0.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "uuid": "^9.0.0"
}
```

---

> **MANTIS** — *"Precisión en cada respuesta."*
