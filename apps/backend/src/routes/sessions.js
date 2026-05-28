import express from 'express';
import Session from '../models/Session.js';
import { generateRoomCode } from '../utils/helpers.js';

const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'El título de la partida es requerido.' });
    let code; let attempts = 0;
    do { code = generateRoomCode(); attempts++; if (attempts > 20) return res.status(500).json({ error: 'No se pudo generar un código único.' }); }
    while (await Session.findOne({ code }));
    const session = new Session({ title: title.trim(), code, questions: [] });
    await session.save();
    res.status(201).json(session);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try { const sessions = await Session.find().select('code title status questions createdAt').sort({ createdAt: -1 }); res.json(sessions); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:code', async (req, res) => {
  try { const session = await Session.findOne({ code: req.params.code.toUpperCase() }); if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' }); res.json(session); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:code/title', async (req, res) => {
  try {
    const { title } = req.body; if (!title || !title.trim()) return res.status(400).json({ error: 'Título requerido.' });
    const session = await Session.findOneAndUpdate({ code: req.params.code.toUpperCase(), status: 'waiting' }, { title: title.trim() }, { new: true });
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada o ya iniciada.' }); res.json(session);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:code/questions', async (req, res) => {
  try {
    const { text, options, timeLimit } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'El texto de la pregunta es requerido.' });
    if (!options || !Array.isArray(options) || options.length < 2) return res.status(400).json({ error: 'Se requieren al menos 2 opciones.' });
    if (options.filter(o => o.isCorrect).length !== 1) return res.status(400).json({ error: 'Debe haber exactamente 1 respuesta correcta.' });
    const session = await Session.findOne({ code: req.params.code.toUpperCase(), status: 'waiting' });
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada o ya iniciada.' });
    session.questions.push({ text: text.trim(), options, timeLimit: timeLimit || 20 });
    await session.save(); res.status(201).json(session);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:code/questions/:index', async (req, res) => {
  try {
    const { text, options, timeLimit } = req.body; const idx = parseInt(req.params.index);
    const session = await Session.findOne({ code: req.params.code.toUpperCase(), status: 'waiting' });
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada o ya iniciada.' });
    if (idx < 0 || idx >= session.questions.length) return res.status(400).json({ error: 'Índice inválido.' });
    if (!options || !Array.isArray(options) || options.length < 2) return res.status(400).json({ error: 'Se requieren al menos 2 opciones.' });
    if (options.filter(o => o.isCorrect).length !== 1) return res.status(400).json({ error: 'Debe haber exactamente 1 respuesta correcta.' });
    session.questions[idx] = { text: text.trim(), options, timeLimit: timeLimit || 20 };
    await session.save(); res.json(session);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:code/questions/:index', async (req, res) => {
  try {
    const idx = parseInt(req.params.index);
    const session = await Session.findOne({ code: req.params.code.toUpperCase(), status: 'waiting' });
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });
    if (idx < 0 || idx >= session.questions.length) return res.status(400).json({ error: 'Índice inválido.' });
    session.questions.splice(idx, 1); await session.save(); res.json(session);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:code', async (req, res) => {
  try { const session = await Session.findOneAndDelete({ code: req.params.code.toUpperCase() }); if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' }); res.json({ message: 'Sesión eliminada.' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
