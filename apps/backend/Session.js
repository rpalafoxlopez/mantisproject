import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: '🤔' },
  score: { type: Number, default: 0 },
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
    correct: Boolean,
    timeTaken: Number,
    pointsEarned: Number
  }],
  connected: { type: Boolean, default: true }
});

const sessionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'Partida sin título' },
  hostId: { type: String, required: true },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  currentQuestionIndex: { type: Number, default: -1 },
  players: [playerSchema],
  settings: {
    timePerQuestion: { type: Number, default: 20 },
    showLeaderboard: { type: Boolean, default: true },
    allowLateJoin: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  finishedAt: { type: Date }
});

export default mongoose.model('Session', sessionSchema);
