import Session from '../models/Session.js';
import { calculateScore } from '../utils/helpers.js';

function calculateCurrentStreak(answers) {
  let streak = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (answers[i].isCorrect) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
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
          players: session.players
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
    // ✅ FIX 2: Mejorar reconexión en player:join
    // ═══════════════════════════════════════════════════════
   // REEMPLAZA el handler de player:join en gameSocket.js con ESTO:
   socket.on('player:join', async ({ code, name }) => {
      try {
        const cleanCode = code.toUpperCase().trim();
        const cleanName = name.trim();

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

        // 🧹 Limpiar zombies PRIMERO
        const connectedSocketIds = Array.from(io.sockets.sockets.keys());
        const originalCount = session.players?.length || 0;

        if (session.players && session.players.length > 0) {
          session.players = session.players.filter(p => {
            const isAlive = connectedSocketIds.includes(p.socketId);
            if (!isAlive) console.log(`🧹 Zombie eliminado: ${p.name} (${p.socketId})`);
            return isAlive;
          });
        }

        if ((session.players?.length || 0) < originalCount) {
          console.log(`🧹 Limpiados ${originalCount - session.players.length} zombies de ${originalCount}`);
        }

        // 🔍 DEBUG: Mostrar estado actual
        console.log(`🔍 [${cleanCode}] Buscando nombre: "${cleanName}"`);
        console.log(`🔍 Jugadores actuales:`, session.players?.map(p => ({ name: p.name, socketId: p.socketId })) || []);

        // 🔄 Verificar si este socket YA está registrado (reconexión del mismo socket)
        const myOldEntry = session.players.find(p => p.socketId === socket.id);
        if (myOldEntry) {
          console.log(`🔄 Reconexión del MISMO socket: ${cleanName} (socket.id: ${socket.id})`);
          // Ya está registrado con este socket, no hacer nada más
        } else {
          // Buscar si el nombre ya existe
          const existingIndex = (session.players || []).findIndex(p => p.name === cleanName);
          
          if (existingIndex !== -1) {
            const existing = session.players[existingIndex];
            const oldSocket = io.sockets.sockets.get(existing.socketId);
            
            console.log(`🔍 Nombre "${cleanName}" encontrado. socketId guardado: ${existing.socketId}`);
            console.log(`🔍 oldSocket existe: ${!!oldSocket}`);
            console.log(`🔍 oldSocket.connected: ${oldSocket?.connected}`);
            console.log(`🔍 socket.id actual: ${socket.id}`);
            console.log(`🔍 ¿Son diferentes?: ${existing.socketId !== socket.id}`);

            // Si el socket anterior está vivo Y es diferente al actual → rechazar
            if (oldSocket && oldSocket.connected && existing.socketId !== socket.id) {
              console.log(`🚫 RECHAZADO: ${cleanName} ya está conectado con socket ${existing.socketId}`);
              return socket.emit('error', { message: 'Ese nombre ya está en uso.' });
            }
            
            // Si el socket anterior está muerto O es el mismo navegador con nuevo socket → reemplazar
            console.log(`🔄 Reconectando: ${cleanName} (viejo: ${existing.socketId} → nuevo: ${socket.id})`);
            session.players[existingIndex].socketId = socket.id;
          } else {
            // Nuevo jugador
            console.log(`✅ Nuevo jugador: ${cleanName} (socket: ${socket.id})`);
            if (!session.players) session.players = [];
            session.players.push({
              socketId: socket.id,
              name: cleanName,
              score: 0,
              answers: []
            });
          }
        }

        await session.save();

        socket.join(cleanCode);
        socket.data.role = 'player';
        socket.data.code = cleanCode;
        socket.data.name = cleanName;

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
          players: (session.players || []).map(p => ({
            name: p.name,
            score: p.score || 0,
            totalAnswered: (p.answers || []).length
          }))
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

        // Verificar si ya respondió esta pregunta
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

        // ═══════════════════════════════════════════════════════
        // ✅ FIX: players:update con streak, bonus y correctCount
        // ═══════════════════════════════════════════════════════
        io.to(cleanCode).emit('players:update', {
          players: session.players
            .map(p => ({
              name: p.name,
              score: p.score || 0,
              totalAnswered: (p.answers || []).length,
              correctCount: (p.answers || []).filter(a => a.isCorrect).length,
              bonusCount: (p.answers || []).filter(a => a.pts === 150).length,
              currentStreak: calculateCurrentStreak(p.answers || [])
            }))
            .sort((a, b) => b.score - a.score)
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
    socket.on('disconnect', async (reason) => {
      console.log('🔌 Desconectado:', socket.id, 'Razón:', reason);
      if (!socket.data.code) return;

      setTimeout(async () => {
        try {
          const reconnected = io.sockets.sockets.get(socket.id);
          if (reconnected) {
            console.log(`🔄 ${socket.data.name} se reconectó, no eliminar`);
            return;
          }

          await Session.updateOne(
            { code: socket.data.code },
            { $pull: { players: { socketId: socket.id } } }
          );

          const updated = await Session.findOne({ code: socket.data.code });
          io.to(socket.data.code).emit('players:update', {
            players: updated?.players.map(p => ({
              name: p.name,
              score: p.score,
              totalAnswered: p.answers.length
            })) || []
          });

          console.log(`🗑️ Eliminado tras grace period: ${socket.data.name || socket.id}`);
        } catch (err) {
          console.error('❌ disconnect cleanup error:', err);
        }
      }, 5000);
    });

    function calculateStreak(answers) {
        let streak = 0
        for (let i = answers.length - 1; i >= 0; i--) {
          if (answers[i].isCorrect) streak++
          else break
        }
        return streak
      }

      // En 'player:answer' y 'player:join', enviar métricas enriquecidas
      const playersUpdate = session.players.map(p => ({
        name: p.name,
        score: p.score,
        totalAnswered: p.answers.length,
        correctCount: p.answers.filter(a => a.isCorrect).length,
        bonusCount: p.answers.filter(a => a.pts === 150).length,
        currentStreak: calculateStreak(p.answers)
      }))
  });
}