import express from 'express';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import { generateRoomCode } from '../utils/helpers.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const MAX_QUESTIONS_PER_SESSION = 25;

// Create new session (requires auth)
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

    // Validate questions exist
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

    // Only host or admin can delete
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
