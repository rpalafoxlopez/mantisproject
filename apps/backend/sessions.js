import express from 'express';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import { generateRoomCode } from '../utils/helpers.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const MAX_QUESTIONS_PER_SESSION = 25;

// ============================================
// CREATE SESSION WITH INLINE QUESTIONS
// Admin creates a game session with questions embedded
// ============================================
router.post('/create-with-questions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, questions, settings } = req.body;
    const hostId = req.user._id.toString();

    // Validate questions
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    if (questions.length > MAX_QUESTIONS_PER_SESSION) {
      return res.status(400).json({
        error: `Maximum ${MAX_QUESTIONS_PER_SESSION} questions per session. You provided ${questions.length}.`
      });
    }

    // Validate each question - FORCE MULTIPLE CHOICE ONLY
    const validatedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
        return res.status(400).json({ error: `Question ${i + 1}: text is required` });
      }

      // FORCE: Must have options (multiple choice only - NO open questions allowed)
      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ 
          error: `Question ${i + 1}: At least 2 options are required. Open questions are NOT allowed.` 
        });
      }

      if (q.options.length > 6) {
        return res.status(400).json({ error: `Question ${i + 1}: Maximum 6 options allowed` });
      }

      // Check for empty options
      const emptyOptions = q.options.filter(opt => !opt || opt.trim() === '');
      if (emptyOptions.length > 0) {
        return res.status(400).json({ error: `Question ${i + 1}: All options must have text` });
      }

      if (q.correctAnswer === undefined || q.correctAnswer === null) {
        return res.status(400).json({ error: `Question ${i + 1}: correctAnswer index is required` });
      }

      if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        return res.status(400).json({ 
          error: `Question ${i + 1}: correctAnswer must be a valid option index (0-${q.options.length - 1})` 
        });
      }

      validatedQuestions.push({
        question: q.question.trim(),
        options: q.options.map(opt => opt.trim()),
        correctAnswer: q.correctAnswer,
        category: q.category || 'Pensamiento Crítico',
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        timeLimit: Math.min(Math.max(parseInt(q.timeLimit) || 20, 5), 120),
        points: Math.min(Math.max(parseInt(q.points) || 100, 10), 1000)
      });
    }

    // Save all questions to DB
    const savedQuestions = await Question.insertMany(validatedQuestions);

    // Generate unique room code
    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      const existing = await Session.findOne({ code });
      if (!existing) break;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Could not generate unique room code. Please try again.' });
    }

    // Create session
    const session = new Session({
      code,
      hostId,
      title: title || 'Partida sin título',
      questions: savedQuestions.map(q => q._id),
      settings: {
        timePerQuestion: settings?.timePerQuestion || 20,
        showLeaderboard: settings?.showLeaderboard !== false,
        allowLateJoin: settings?.allowLateJoin === true
      }
    });

    await session.save();
    await session.populate('questions');

    res.status(201).json({
      success: true,
      session: {
        _id: session._id,
        code: session.code,
        title: session.title,
        status: session.status,
        questionCount: session.questions.length,
        questions: session.questions.map(q => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          timeLimit: q.timeLimit,
          points: q.points
        })),
        settings: session.settings,
        createdAt: session.createdAt,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join?code=${code}`
      }
    });

  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy: Create session from existing question IDs
router.post('/create', authenticate, async (req, res) => {
  try {
    const { questionIds, settings } = req.body;
    const hostId = req.user._id.toString();

    if (!questionIds || questionIds.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    if (questionIds.length > MAX_QUESTIONS_PER_SESSION) {
      return res.status(400).json({
        error: `Maximum ${MAX_QUESTIONS_PER_SESSION} questions per session. You selected ${questionIds.length}.`
      });
    }

    const questions = await Question.find({ _id: { $in: questionIds } });
    if (questions.length === 0) {
      return res.status(400).json({ error: 'No valid questions found' });
    }

    if (questions.length !== questionIds.length) {
      return res.status(400).json({ error: 'Some question IDs are invalid' });
    }

    const code = generateRoomCode();

    const session = new Session({
      code,
      hostId,
      questions: questions.map(q => q._id),
      settings: settings || {}
    });

    await session.save();
    await session.populate('questions');

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session by code (public)
router.get('/:code', async (req, res) => {
  try {
    const session = await Session.findOne({ code: req.params.code.toUpperCase() })
      .populate('questions');

    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all active sessions (public)
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({ status: { $in: ['waiting', 'playing'] } })
      .populate('questions', 'question category')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session (requires auth, only host or admin)
router.delete('/:code', authenticate, async (req, res) => {
  try {
    const session = await Session.findOne({ code: req.params.code.toUpperCase() });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.hostId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the host or admin can delete this session' });
    }

    await Session.findOneAndDelete({ code: req.params.code.toUpperCase() });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
