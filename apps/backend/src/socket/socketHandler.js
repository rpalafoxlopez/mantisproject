import GameEngine from '../utils/gameEngine.js';

const setupSocketHandlers = (io, gameEngine) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Host creates a session
    socket.on('session:create', async (data, callback) => {
      try {
        const { title, description, questionIds, settings } = data;

        // For now, use a default host or require auth
        const hostId = socket.user?._id || '000000000000000000000000';

        const session = await gameEngine.createSession(
          hostId, title, description, questionIds, settings
        );

        socket.join(session.code);
        socket.sessionCode = session.code;
        socket.isHost = true;

        callback({
          success: true,
          session: {
            code: session.code,
            title: session.title,
            status: session.status
          }
        });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Player joins a session
    socket.on('session:join', async (data, callback) => {
      try {
        const { sessionCode, username, displayName, avatar } = data;

        const playerData = {
          socketId: socket.id,
          username: username || `Jugador ${Math.floor(Math.random() * 9999)}`,
          displayName: displayName || username,
          avatar: avatar || ''
        };

        const { session, player, isReconnect } = await gameEngine.joinSession(
          sessionCode, playerData
        );

        socket.join(sessionCode);
        socket.sessionCode = sessionCode;
        socket.isHost = false;

        // Notify other players
        socket.to(sessionCode).emit('player:joined', {
          username: player.username,
          displayName: player.displayName,
          avatar: player.avatar,
          playersCount: session.players.filter(p => p.isActive).length
        });

        // Get current session state for reconnecting players
        const sessionState = await gameEngine.getSessionState(sessionCode);

        callback({
          success: true,
          player: {
            username: player.username,
            displayName: player.displayName,
            score: player.totalScore
          },
          session: sessionState,
          isReconnect
        });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Host starts the game
    socket.on('game:start', async (data, callback) => {
      try {
        if (!socket.isHost) {
          throw new Error('Solo el host puede iniciar la partida');
        }

        const session = await gameEngine.startGame(socket.sessionCode);

        callback({ success: true, session });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Player submits answer
    socket.on('answer:submit', async (data, callback) => {
      try {
        const { answerIndex } = data;

        const result = await gameEngine.submitAnswer(
          socket.sessionCode,
          socket.id,
          answerIndex
        );

        callback({ success: true, ...result });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Host requests to skip to next question (manual override)
    socket.on('question:skip', async (data, callback) => {
      try {
        if (!socket.isHost) {
          throw new Error('Solo el host puede saltar preguntas');
        }

        const session = await gameEngine.endQuestion(
          socket.sessionCode,
          data.questionIndex
        );

        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Get leaderboard (for host or players)
    socket.on('leaderboard:get', async (data, callback) => {
      try {
        const session = await Session.findOne({ code: socket.sessionCode.toUpperCase() });

        if (!session) {
          throw new Error('Sala no encontrada');
        }

        const leaderboard = gameEngine.getLeaderboard(session.players);

        callback({ success: true, leaderboard });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Player disconnects
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);

      if (socket.sessionCode) {
        await gameEngine.playerDisconnect(socket.sessionCode, socket.id);
      }
    });

    // Ping/Pong for connection health check
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback({ timestamp: Date.now() });
      }
    });
  });
};

export default setupSocketHandlers;
