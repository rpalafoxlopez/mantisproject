import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  isCorrect: { type: Boolean, required: true, default: false }
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  options: {
    type: [OptionSchema],
    validate: {
      validator: function (opts) {
        if (!opts || opts.length < 2 || opts.length > 6) return false;
        const correctCount = opts.filter(o => o.isCorrect).length;
        return correctCount === 1;
      },
      message: 'Cada pregunta debe tener entre 2 y 6 opciones y exactamente 1 respuesta correcta.'
    }
  },
  timeLimit: { type: Number, default: 20, min: 5, max: 120 }
});

const SessionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  questions: {
    type: [QuestionSchema],
    default: [],
    validate: {
      validator: qs => qs.length <= 100,
      message: 'Una partida puede tener como máximo 100 preguntas.'
    }
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  currentQuestion: { type: Number, default: 0 },
  players: [{
    socketId: String,
    name: String,
    score: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

export default mongoose.model('Session', SessionSchema);
