import Session from '../models/Session.js';
import { calculateScore } from '../utils/helpers.js';

function calculateCurrentStreak(answers) {
  let streak = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (answers[i].isCorrect) streak++;
    else break;
  }
  return streak;
}

function buildPlayerUpdate(players) {
  return (players || []).map(p => ({
    name: p.name,
    score: p.score || 0,
    totalAnswered: (p.answers || []).length,
    correctCount: (p.answers || []).filter(a => a.isCorrect).length,
    bonusCount: (p.answers || []).filter(a => a.pts === 150).length,
    currentStreak: calculateCurrentStreak(p.answers || [])
  }));
}

export function setupGameSocket(io) {
  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    // ========== HOST ==========
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
          players: buildPlayerUpdate(session.players)
        });
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
        if (!session) return;

        const leaderboard = session.players
          .map(p => ({
            name: p.name,
            score: p.score,
            correctCount: p.answers.filter(a => a.isCorrect).length,
            totalAnswered: p.answers.length
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        io.to(code).emit('quiz:finalResults', {
          title: session.title,
          leaderboard,
          totalQuestions: session.questions.length,
          totalPlayers: session.players.length
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ========== PLAYER ==========
    // ═══════════════════════════════════════════════════════
    // ✅ FIX DEFINITIVO: playerId persistente + reconexión robusta
    // ═══════════════════════════════════════════════════════
    socket.on('player:join', async ({ code, name, playerId }) => {
      try {
        const cleanCode = code.toUpperCase().trim();
        const cleanName = name.trim();
        const persistentId = playerId || socket.id;

        if (!cleanName || cleanName.length < 1) {
          return socket.emit('error', { message: 'El nombre no puede estar vacío.' });
        }

        let session = await Session.findOne({ code: cleanCode });
        if (!session) {
          return socket.emit('error', { message: 'Código de partida inválido.' });
        }

        if (session.status === 'waiting') {
          session.status = 'active';
          console.log(`🔄 Migrando sesión ${cleanCode}: waiting → active`);
        }

        if (session.status === 'finished') {
          return socket.emit('error', { message: 'Este quiz ya terminó.' });
        }

        // 🧹 Limpiar zombies: sockets que ya no están conectados
        const connectedSocketIds = Array.from(io.sockets.sockets.keys());
        const originalCount = session.players?.length || 0;

        if (session.players && session.players.length > 0) {
          session.players = session.players.filter(p => {
            const isAlive = connectedSocketIds.includes(p.socketId);
            if (!isAlive) console.log(`🧹 Zombie eliminado: ${p.name} (socket: ${p.socketId})`);
            return isAlive;
          });
        }

        if ((session.players?.length || 0) < originalCount) {
          console.log(`🧹 Limpiados ${originalCount - session.players.length} zombies de ${originalCount}`);
        }

        // 🔍 DEBUG
        console.log(`🔍 [${cleanCode}] Intentando unir: "${cleanName}" playerId: ${persistentId}`);
        console.log(`🔍 Jugadores actuales:`, session.players?.map(p => ({ name: p.name, playerId: p.playerId, socketId: p.socketId })) || []);

        // 🔄 ESTRATEGIA DE RECONEXIÓN:
        // 1. Buscar por playerId (mismo navegador, recarga)
        // 2. Buscar por nombre (navegador diferente, mismo nombre)
        // 3. Nuevo jugador

        const existingById = session.players?.findIndex(p => p.playerId === persistentId);
        const existingByName = session.players?.findIndex(p => p.name === cleanName);

        if (existingById !== -1 && existingById !== undefined) {
          // Mismo navegador recargó → actualizar socketId
          const oldSocketId = session.players[existingById].socketId;
          console.log(`🔄 Reconexión por playerId: ${cleanName} (socket ${oldSocketId} → ${socket.id})`);
          session.players[existingById].socketId = socket.id;
          session.players[existingById].name = cleanName;
        } else if (existingByName !== -1 && existingByName !== undefined) {
          // Mismo nombre, diferente navegador → verificar si el socket viejo sigue vivo
          const existing = session.players[existingByName];
          const oldSocket = io.sockets.sockets.get(existing.socketId);

          console.log(`🔍 Nombre "${cleanName}" existe. Socket guardado: ${existing.socketId}`);
          console.log(`🔍 oldSocket existe: ${!!oldSocket}, connected: ${oldSocket?.connected}`);

          if (oldSocket && oldSocket.connected) {
            console.log(`🚫 RECHAZADO: ${cleanName} ya conectado con socket ${existing.socketId}`);
            return socket.emit('error', { message: 'Ese nombre ya está en uso.' });
          }

          // Socket muerto → reemplazar
          console.log(`🔄 Reconectando por nombre: ${cleanName} (socket ${existing.socketId} → ${socket.id})`);
          session.players[existingByName].socketId = socket.id;
          session.players[existingByName].playerId = persistentId;
        } else {
          // Nuevo jugador
          console.log(`✅ Nuevo jugador: ${cleanName} (playerId: ${persistentId}, socket: ${socket.id})`);
          if (!session.players) session.players = [];
          session.players.push({
            socketId: socket.id,
            playerId: persistentId,
            name: cleanName,
            score: 0,
            answers: []
          });
        }

        await session.save();

        socket.join(cleanCode);
        socket.data.role = 'player';
        socket.data.code = cleanCode;
        socket.data.name = cleanName;
        socket.data.playerId = persistentId;

        socket.emit('player:joined', {
          name: cleanName,
          code: cleanCode,
          title: session.title,
          questions: (session.questions || []).map(q => ({
            text: q.text,
            options: (q.options || []).map(o => ({ text: o.text })),
            timeLimit: q.timeLimit || 20
          })),
          totalQuestions: (session.questions || []).length
        });

        io.to(cleanCode).emit('players:update', {
          players: buildPlayerUpdate(session.players)
        });

      } catch (err) {
        console.error('❌ player:join ERROR:', err);
        socket.emit('error', { message: 'Error al unirse: ' + err.message });
      }
    });

    socket.on('player:answer', async ({ code, questionIndex, answerIndex, timeUsed }) => {
      try {
        const cleanCode = code.toUpperCase();
        const session = await Session.findOne({ code: cleanCode });
        if (!session || session.status !== 'active') return;

        const question = session.questions[questionIndex];
        if (!question) return;

        const player = session.players.find(p => p.socketId === socket.id);
        if (!player) return;

        const alreadyAnswered = player.answers.find(a => a.questionIndex === questionIndex);
        if (alreadyAnswered) {
          return socket.emit('error', { message: 'Ya respondiste esta pregunta.' });
        }

        const isCorrect = question.options[answerIndex]?.isCorrect === true;
        const pts = isCorrect ? calculateScore(question.timeLimit, timeUsed || question.timeLimit) : 0;

        player.answers.push({
          questionIndex,
          answerIndex,
          isCorrect,
          timeUsed: timeUsed || 0,
          pts,
          answeredAt: new Date()
        });

        player.score += pts;
        await session.save();

        socket.emit('answer:confirmed', {
          questionIndex,
          isCorrect,
          points: pts,
          yourScore: player.score,
          correctIndex: question.options.findIndex(o => o.isCorrect)
        });

        io.to(cleanCode).emit('players:update', {
          players: buildPlayerUpdate(session.players)
        });

      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('player:requestResults', async ({ code }) => {
      try {
        const session = await Session.findOne({ code: code.toUpperCase() });
        if (!session) return;

        const player = session.players.find(p => p.socketId === socket.id);
        if (!player) return;

        const leaderboard = session.players
          .map(p => ({
            name: p.name,
            score: p.score,
            correctCount: p.answers.filter(a => a.isCorrect).length,
            totalAnswered: p.answers.length
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        const playerRank = session.players
          .sort((a, b) => b.score - a.score)
          .findIndex(p => p.socketId === socket.id) + 1;

        socket.emit('quiz:personalResults', {
          yourScore: player.score,
          yourRank: playerRank,
          totalPlayers: session.players.length,
          correctCount: player.answers.filter(a => a.isCorrect).length,
          totalQuestions: session.questions.length,
          leaderboard,
          answers: player.answers
        });

      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ========== DISCONNECT ==========
    // ═══════════════════════════════════════════════════════
    // ✅ FIX: Grace period reducido + playerId para reconexión rápida
    // ═══════════════════════════════════════════════════════
    socket.on('disconnect', async (reason) => {
      console.log('🔌 Desconectado:', socket.id, 'Razón:', reason);
      if (!socket.data.code) return;

      const gracePeriod = (reason === 'transport close' || reason === 'ping timeout') ? 2000 : 0;

      setTimeout(async () => {
        try {
          const session = await Session.findOne({ code: socket.data.code });
          if (!session) return;

          // Verificar si el jugador se reconectó con otro socket (mismo playerId)
          const reconnected = session.players.find(p => 
            p.playerId === socket.data.playerId && p.socketId !== socket.id
          );

          if (reconnected) {
            console.log(`🔄 ${socket.data.name} reconectado con nuevo socket, no eliminar`);
            return;
          }

          // Verificar si el socket original sigue en la lista
          const stillThere = session.players.find(p => p.socketId === socket.id);
          if (!stillThere) {
            console.log(`🗑️ ${socket.data.name} ya fue eliminado`);
            return;
          }

          await Session.updateOne(
            { code: socket.data.code },
            { $pull: { players: { socketId: socket.id } } }
          );

          const updated = await Session.findOne({ code: socket.data.code });
          io.to(socket.data.code).emit('players:update', {
            players: buildPlayerUpdate(updated?.players)
          });

          console.log(`🗑️ Eliminado tras grace period: ${socket.data.name || socket.id}`);
        } catch (err) {
          console.error('❌ disconnect cleanup error:', err);
        }
      }, gracePeriod);
    });
  });
}