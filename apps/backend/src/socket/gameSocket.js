import Session from '../models/Session.js';
import Question from '../models/Question.js';
import { calculateScore } from '../utils/helpers.js';

// In-memory game state (for real-time operations)
const gameStates = new Map(); // sessionCode -> gameState

export function setupGameSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ==================== HOST ACTIONS ====================

    // Host creates/joins a session room
    socket.on('host:join', async ({ sessionCode }) => {
      try {
        const session = await Session.findOne({ code: sessionCode.toUpperCase() });
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        socket.join(sessionCode.toUpperCase());
        socket.sessionCode = sessionCode.toUpperCase();
        socket.isHost = true;

        // Initialize game state if not exists
        if (!gameStates.has(sessionCode.toUpperCase())) {
          gameStates.set(sessionCode.toUpperCase(), {
            answers: new Map(), // socketId -> { questionIndex, selectedOption, timestamp }
            timer: null,
            questionStartTime: null
          });
        }

        socket.emit('host:joined', { session });

        // Send current players to host
        socket.emit('players:update', session.players);

        console.log(`👑 Host joined session: ${sessionCode}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Host starts the game
    socket.on('host:start', async ({ sessionCode }) => {
      try {
        const session = await Session.findOne({ code: sessionCode.toUpperCase() })
          .populate('questions');

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (session.questions.length === 0) {
          socket.emit('error', { message: 'No questions in this session' });
          return;
        }

        session.status = 'playing';
        session.currentQuestionIndex = 0;
        session.startedAt = new Date();
        await session.save();

        // Reset game state
        const gameState = gameStates.get(sessionCode.toUpperCase()) || {
          answers: new Map(),
          timer: null,
          questionStartTime: null
        };
        gameState.answers.clear();
        gameStates.set(sessionCode.toUpperCase(), gameState);

        io.to(sessionCode.toUpperCase()).emit('game:started', {
          totalQuestions: session.questions.length,
          players: session.players
        });

        // Send first question after brief delay
        setTimeout(() => {
          sendQuestion(io, sessionCode.toUpperCase(), 0);
        }, 2000);

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Host moves to next question (manual override or auto)
    socket.on('host:next', async ({ sessionCode }) => {
      try {
        const session = await Session.findOne({ code: sessionCode.toUpperCase() })
          .populate('questions');

        if (!session) return;

        const nextIndex = session.currentQuestionIndex + 1;

        if (nextIndex >= session.questions.length) {
          // Game over
          await endGame(io, sessionCode.toUpperCase());
          return;
        }

        session.currentQuestionIndex = nextIndex;
        await session.save();

        // Clear previous answers
        const gameState = gameStates.get(sessionCode.toUpperCase());
        if (gameState) {
          gameState.answers.clear();
        }

        // Show leaderboard briefly before next question
        if (session.settings.showLeaderboard) {
          const leaderboard = getLeaderboard(session);
          io.to(sessionCode.toUpperCase()).emit('leaderboard:show', { 
            leaderboard,
            nextQuestionIn: 3 
          });

          setTimeout(() => {
            sendQuestion(io, sessionCode.toUpperCase(), nextIndex);
          }, 3000);
        } else {
          sendQuestion(io, sessionCode.toUpperCase(), nextIndex);
        }

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Host ends game manually
    socket.on('host:end', async ({ sessionCode }) => {
      await endGame(io, sessionCode.toUpperCase());
    });

    // ==================== PLAYER ACTIONS ====================

    // Player joins a session
    socket.on('player:join', async ({ sessionCode, playerName, avatar }) => {
      try {
        const code = sessionCode.toUpperCase();
        const session = await Session.findOne({ code });

        if (!session) {
          socket.emit('join:error', { message: 'Session not found. Check the code and try again.' });
          return;
        }

        if (session.status !== 'waiting') {
          if (!session.settings.allowLateJoin) {
            socket.emit('join:error', { message: 'Game already started. Late join is disabled.' });
            return;
          }
        }

        // Check if name already exists
        const existingPlayer = session.players.find(p => p.name === playerName);
        if (existingPlayer) {
          socket.emit('join:error', { message: 'Name already taken. Choose another one.' });
          return;
        }

        const player = {
          socketId: socket.id,
          name: playerName,
          avatar: avatar || ['🦁', '🦊', '🐼', '🐨', '🐯', '🐷', '🐸', '🐙'][Math.floor(Math.random() * 8)],
          score: 0,
          answers: [],
          connected: true
        };

        session.players.push(player);
        await session.save();

        socket.join(code);
        socket.sessionCode = code;
        socket.isHost = false;
        socket.playerName = playerName;

        socket.emit('player:joined', { 
          sessionCode: code,
          player,
          sessionStatus: session.status,
          totalQuestions: session.questions.length
        });

        // Notify host and other players
        io.to(code).emit('players:update', session.players);

        console.log(`🎮 Player ${playerName} joined session: ${code}`);

      } catch (error) {
        socket.emit('join:error', { message: error.message });
      }
    });

    // Player submits answer
    socket.on('player:answer', async ({ sessionCode, questionIndex, selectedOption }) => {
      try {
        const code = sessionCode.toUpperCase();
        const session = await Session.findOne({ code }).populate('questions');

        if (!session || session.status !== 'playing') return;
        if (session.currentQuestionIndex !== questionIndex) return;

        const gameState = gameStates.get(code);
        if (!gameState) return;

        // Check if already answered
        if (gameState.answers.has(socket.id)) return;

        const question = session.questions[questionIndex];
        const timeTaken = Date.now() - gameState.questionStartTime;
        const isCorrect = selectedOption === question.correctAnswer;

        const pointsEarned = calculateScore(
          question.timeLimit,
          timeTaken,
          question.points,
          isCorrect
        );

        // Store answer
        gameState.answers.set(socket.id, {
          questionIndex,
          selectedOption,
          timeTaken,
          isCorrect,
          pointsEarned
        });

        // Update player in session
        const playerIndex = session.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          session.players[playerIndex].answers.push({
            questionIndex,
            selectedOption,
            correct: isCorrect,
            timeTaken,
            pointsEarned
          });
          session.players[playerIndex].score += pointsEarned;
          await session.save();
        }

        // Send immediate feedback to player
        socket.emit('answer:result', {
          correct: isCorrect,
          correctAnswer: question.correctAnswer,
          pointsEarned,
          totalScore: session.players[playerIndex]?.score || 0
        });

        // Notify host that player answered
        const hostSocket = Array.from(io.sockets.adapter.rooms.get(code) || [])
          .map(socketId => io.sockets.sockets.get(socketId))
          .find(s => s?.isHost);

        if (hostSocket) {
          hostSocket.emit('player:answered', {
            playerName: socket.playerName,
            socketId: socket.id,
            totalAnswered: gameState.answers.size,
            totalPlayers: session.players.filter(p => p.connected).length
          });
        }

        // Check if all players answered
        const connectedPlayers = session.players.filter(p => p.connected).length;
        if (gameState.answers.size >= connectedPlayers) {
          // Small delay then show results
          setTimeout(() => {
            showQuestionResults(io, code, question, gameState.answers, session);
          }, 1000);
        }

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ==================== DISCONNECT ====================

    socket.on('disconnect', async () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      if (socket.sessionCode) {
        const session = await Session.findOne({ code: socket.sessionCode });
        if (session) {
          const playerIndex = session.players.findIndex(p => p.socketId === socket.id);
          if (playerIndex !== -1) {
            session.players[playerIndex].connected = false;
            await session.save();

            // Notify others
            io.to(socket.sessionCode).emit('players:update', session.players);
          }

          // If host disconnects, end session
          if (socket.isHost) {
            session.status = 'finished';
            await session.save();
            io.to(socket.sessionCode).emit('session:ended', { reason: 'Host disconnected' });
            gameStates.delete(socket.sessionCode);
          }
        }
      }
    });
  });
}

// ==================== HELPER FUNCTIONS ====================

async function sendQuestion(io, sessionCode, questionIndex) {
  try {
    const session = await Session.findOne({ code: sessionCode }).populate('questions');
    if (!session || session.status !== 'playing') return;

    const question = session.questions[questionIndex];
    if (!question) return;

    const gameState = gameStates.get(sessionCode);
    if (gameState) {
      gameState.questionStartTime = Date.now();
      gameState.answers.clear();

      // Clear any existing timer
      if (gameState.timer) {
        clearTimeout(gameState.timer);
      }

      // Set timer for auto-advance
      const timeLimit = question.timeLimit * 1000;
      gameState.timer = setTimeout(() => {
        handleTimeUp(io, sessionCode, questionIndex);
      }, timeLimit + 2000); // +2s buffer for network lag
    }

    // Send question to all players (without correct answer)
    const questionForPlayers = {
      index: questionIndex,
      totalQuestions: session.questions.length,
      question: question.question,
      options: question.options,
      timeLimit: question.timeLimit,
      category: question.category
    };

    io.to(sessionCode).emit('question:show', questionForPlayers);

    // Send full question to host (with correct answer)
    const hostSocket = Array.from(io.sockets.adapter.rooms.get(sessionCode) || [])
      .map(socketId => io.sockets.sockets.get(socketId))
      .find(s => s?.isHost);

    if (hostSocket) {
      hostSocket.emit('question:host', {
        ...questionForPlayers,
        correctAnswer: question.correctAnswer
      });
    }

  } catch (error) {
    console.error('Error sending question:', error);
  }
}

async function handleTimeUp(io, sessionCode, questionIndex) {
  try {
    const session = await Session.findOne({ code: sessionCode }).populate('questions');
    if (!session) return;

    const gameState = gameStates.get(sessionCode);
    if (!gameState) return;

    const question = session.questions[questionIndex];

    // Mark unanswered players as wrong
    const connectedPlayers = session.players.filter(p => p.connected);
    for (const player of connectedPlayers) {
      if (!gameState.answers.has(player.socketId)) {
        const playerIndex = session.players.findIndex(p => p.socketId === player.socketId);
        if (playerIndex !== -1) {
          session.players[playerIndex].answers.push({
            questionIndex,
            selectedOption: -1, // No answer
            correct: false,
            timeTaken: question.timeLimit * 1000,
            pointsEarned: 0
          });
        }
      }
    }
    await session.save();

    showQuestionResults(io, sessionCode, question, gameState.answers, session);

  } catch (error) {
    console.error('Error handling time up:', error);
  }
}

async function showQuestionResults(io, sessionCode, question, answers, session) {
  // Calculate stats
  const totalAnswers = answers.size;
  const correctAnswers = Array.from(answers.values()).filter(a => a.isCorrect).length;

  const optionCounts = new Array(question.options.length).fill(0);
  for (const answer of answers.values()) {
    if (answer.selectedOption >= 0) {
      optionCounts[answer.selectedOption]++;
    }
  }

  const results = {
    correctAnswer: question.correctAnswer,
    optionCounts,
    totalAnswers,
    correctCount: correctAnswers,
    questionIndex: session.currentQuestionIndex
  };

  io.to(sessionCode).emit('question:results', results);

  // Auto advance after showing results
  setTimeout(() => {
    // Check if there are more questions
    const nextIndex = session.currentQuestionIndex + 1;
    if (nextIndex >= session.questions.length) {
      endGame(io, sessionCode);
    } else {
      // Trigger next question through host socket
      const hostSocket = Array.from(io.sockets.adapter.rooms.get(sessionCode) || [])
        .map(socketId => io.sockets.sockets.get(socketId))
        .find(s => s?.isHost);

      if (hostSocket) {
        hostSocket.emit('host:next:auto', { sessionCode });
      }
    }
  }, 5000); // Show results for 5 seconds
}

async function endGame(io, sessionCode) {
  try {
    const session = await Session.findOne({ code: sessionCode }).populate('questions');
    if (!session) return;

    session.status = 'finished';
    session.finishedAt = new Date();
    await session.save();

    const leaderboard = getLeaderboard(session);
    const stats = getGameStats(session);

    io.to(sessionCode).emit('game:ended', {
      leaderboard,
      stats,
      totalQuestions: session.questions.length
    });

    // Clean up game state
    const gameState = gameStates.get(sessionCode);
    if (gameState && gameState.timer) {
      clearTimeout(gameState.timer);
    }
    gameStates.delete(sessionCode);

  } catch (error) {
    console.error('Error ending game:', error);
  }
}

function getLeaderboard(session) {
  return session.players
    .filter(p => p.connected)
    .map(p => ({
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      correctAnswers: p.answers.filter(a => a.correct).length,
      totalAnswered: p.answers.length
    }))
    .sort((a, b) => b.score - a.score);
}

function getGameStats(session) {
  const totalAnswers = session.players.reduce((sum, p) => sum + p.answers.length, 0);
  const correctAnswers = session.players.reduce(
    (sum, p) => sum + p.answers.filter(a => a.correct).length, 
    0
  );

  return {
    totalPlayers: session.players.length,
    totalQuestions: session.questions.length,
    totalAnswers,
    correctAnswers,
    accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
  };
}
