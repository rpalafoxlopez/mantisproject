import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // index of correct option (0-3)
  category: { type: String, default: 'Pensamiento Crítico' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  timeLimit: { type: Number, default: 20 }, // seconds
  points: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Question', questionSchema);
