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

const PlayerAnswerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  answerIndex: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  timeUsed: { type: Number, default: 0 },
  pts: { type: Number, default: 0 },
  answeredAt: { type: Date, default: Date.now }
}, { _id: false });

const PlayerSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  playerId: { type: String, required: true, default: () => 'pid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11) },
  name: { type: String, required: true, trim: true },
  score: { type: Number, default: 0 },
  answers: { type: [PlayerAnswerSchema], default: [] }
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  questions: {
    type: [QuestionSchema],
    default: [],
    validate: { validator: qs => qs.length <= 100, message: 'Una partida puede tener como máximo 100 preguntas.' }
  },
  status: { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting' },
  players: { type: [PlayerSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

export default mongoose.model('Session', SessionSchema);
