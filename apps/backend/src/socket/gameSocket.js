import Session from '../models/Session.js';
import { calculateScore } from '../utils/helpers.js';

export function setupGameSocket(io) {

  // answers buffer: roomCode → Map<playerSocketId, { answer, timeUsed }>
  const answers = new Map();

  io.on('connection', (socket) => {

    // ───────────── HOST ─────────────

    socket.on('host:join', async ({ code }) => {
      try {
        const session = await Session.findOne({ code: code.toUpperCase() });
        if (!session) return socket.emit('error', { message: 'Sesión no encontrada.' });
        if (!session.questions.length) return socket.emit('error', { message: 'La partida no tiene preguntas.' });

        socket.join(code);
        socket.data.role = 'host';
        socket.data.code = code;
        socket.emit('host:joined', {
          code,
          title: session.title,
          questionCount: session.questions.length,
          players: session.players
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('host:start', async ({ code }) => {
      try {
        const session = await Session.findOne({ code: code.toUpperCase() });
        if (!session) return;

        session.status = 'active';
        session.currentQuestion = 0;
        await session.save();

        io.to(code).emit('game:started', { questionCount: session.questions.length });
        sendQuestion(io, socket, session, answers);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('host:next', async ({ code }) => {
      try {
        const session = await Session.findOne({ code: code.toUpperCase() });
        if (!session) return;

        session.currentQuestion += 1;

        if (session.currentQuestion >= session.questions.length) {
          session.status = 'finished';
          await session.save();
          io.to(code).emit('game:ended', { leaderboard: session.players.sort((a, b) => b.score - a.score) });
          return;
        }

        await session.save();
        sendQuestion(io, socket, session, answers);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('host:end', async ({ code }) => {
      try {
        const session = await Session.findOneAndUpdate(
          { code: code.toUpperCase() },
          { status: 'finished' },
          { new: true }
        );
        if (session) {
          io.to(code).emit('game:ended', {
            leaderboard: session.players.sort((a, b) => b.score - a.score)
          });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ───────────── PLAYER ─────────────

    socket.on('player:join', async ({ code, name }) => {
      try {
        const session = await Session.findOne({ code: code.toUpperCase() });
        if (!session) return socket.emit('error', { message: 'Código de partida inválido.' });
        if (session.status === 'finished') return socket.emit('error', { message: 'Esta partida ya terminó.' });

        const nameExists = session.players.some(p => p.name === name);
        if (nameExists) return socket.emit('error', { message: 'Ese nombre ya está en uso.' });

        session.players.push({ socketId: socket.id, name, score: 0 });
        await session.save();

        socket.join(code);
        socket.data.role = 'player';
        socket.data.code = code;
        socket.data.name = name;

        socket.emit('player:joined', { name, code, title: session.title });
        io.to(code).emit('players:update', { players: session.players });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('player:answer', async ({ code, answerIndex, timeUsed }) => {
      try {
        const session = await Session.findOne({ code: code.toUpperCase() });
        if (!session || session.status !== 'active') return;

        const q = session.questions[session.currentQuestion];
        if (!q) return;

        if (!answers.has(code)) answers.set(code, new Map());
        const roomAnswers = answers.get(code);

        if (roomAnswers.has(socket.id)) return;

        const isCorrect = q.options[answerIndex]?.isCorrect === true;
        const pts = isCorrect ? calculateScore(q.timeLimit, timeUsed) : 0;

        roomAnswers.set(socket.id, { answerIndex, timeUsed, isCorrect, pts });

        const player = session.players.find(p => p.socketId === socket.id);
        if (player) {
          player.score += pts;
          await session.save();
        }

        socket.emit('answer:result', {
          isCorrect,
          points: pts,
          correctIndex: q.options.findIndex(o => o.isCorrect)
        });

        const activePlayers = session.players.filter(p => io.sockets.sockets.get(p.socketId));
        if (roomAnswers.size >= activePlayers.length) {
          io.to(code).emit('question:results', {
            correctIndex: q.options.findIndex(o => o.isCorrect),
            leaderboard: session.players.sort((a, b) => b.score - a.score).slice(0, 5)
          });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ───────────── DISCONNECT ─────────────

    socket.on('disconnect', async () => {
      if (!socket.data.code) return;
      try {
        await Session.updateOne(
          { code: socket.data.code },
          { $pull: { players: { socketId: socket.id } } }
        );
        io.to(socket.data.code).emit('players:update', {
          players: (await Session.findOne({ code: socket.data.code }))?.players || []
        });
      } catch { /* silent */ }
    });

  });
}

// ── Helpers ──
async function sendQuestion(io, socket, session, answers) {
  const code = session.code;
  const q = session.questions[session.currentQuestion];

  answers.set(code, new Map());

  io.to(code).emit('question:show', {
    index: session.currentQuestion,
    total: session.questions.length,
    text: q.text,
    options: q.options.map(o => ({ text: o.text })),
    timeLimit: q.timeLimit
  });
}
