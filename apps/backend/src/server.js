import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import { socketAuth } from './middleware/socketAuth.js';
import GameEngine from './utils/gameEngine.js';
import setupSocketHandlers from './socket/socketHandler.js';

// Routes
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import sessionRoutes from './routes/sessions.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://*.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.io setup
const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket authentication middleware
io.use(socketAuth);

// Initialize game engine
const gameEngine = new GameEngine(io);

// Setup socket handlers
setupSocketHandlers(io, gameEngine);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check endpoint (required for Render)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Critical Thinking Game API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      questions: '/api/questions',
      sessions: '/api/sessions',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io, gameEngine };
