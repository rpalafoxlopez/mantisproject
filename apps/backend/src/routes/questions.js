import express from 'express';
import Question from '../models/Question.js';

const router = express.Router();

// Get all questions
router.get('/', async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single question
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create question (Admin)
router.post('/', async (req, res) => {
  try {
    const { question, options, correctAnswer, category, difficulty, timeLimit, points } = req.body;

    // Validation
    if (!question || !options || options.length < 2 || correctAnswer === undefined) {
      return res.status(400).json({ 
        error: 'Question, at least 2 options, and correctAnswer are required' 
      });
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({ error: 'correctAnswer must be a valid option index' });
    }

    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      category: category || 'Pensamiento Crítico',
      difficulty: difficulty || 'medium',
      timeLimit: timeLimit || 20,
      points: points || 100
    });

    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
