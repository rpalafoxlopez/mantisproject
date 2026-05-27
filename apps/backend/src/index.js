import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import sessionRoutes from './routes/sessions.js';
import { setupGameSocket } from './socket/gameSocket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS - Allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://quizhive.rpalafox.com',
  'https://mantisproject-gfkbij3wz-rpalafoxlopezs-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizhive')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'QuizHive API', timestamp: new Date().toISOString() });
});

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setupGameSocket(io);

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => {
  console.log(`🐝 QuizHive API running on port ${PORT}`);
  console.log(`🐝 Allowed origins: ${allowedOrigins.join(', ')}`);
});
