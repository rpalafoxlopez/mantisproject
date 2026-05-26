import express from 'express';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import { generateRoomCode } from '../utils/helpers.js';

const router = express.Router();

// Create new session (Host)
router.post('/create', async (req, res) => {
  try {
    const { hostId, questionIds, settings } = req.body;

    if (!hostId) {
      return res.status(400).json({ error: 'hostId is required' });
    }

    // Validate questions exist
    let questions = [];
    if (questionIds && questionIds.length > 0) {
      questions = await Question.find({ _id: { $in: questionIds } });
      if (questions.length === 0) {
        return res.status(400).json({ error: 'No valid questions found' });
      }
    }

    const code = generateRoomCode();

    const session = new Session({
      code,
      hostId,
      questions: questions.map(q => q._id),
      settings: settings || {}
    });

    await session.save();

    // Populate questions for response
    await session.populate('questions');

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session by code
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

// Get all active sessions
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

// Delete session
router.delete('/:code', async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({ code: req.params.code.toUpperCase() });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
