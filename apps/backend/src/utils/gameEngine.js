import Session from '../models/Session.js';
import Question from '../models/Question.js';

class GameEngine {
  constructor(io) {
    this.io = io;
    this.activeTimers = new Map(); // sessionCode -> timer
    this.questionTimers = new Map(); // sessionCode -> { questionIndex, timer, startTime }
  }

  // Generate unique session code
  generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.activeTimers.has(code));
    return code;
  }

  // Create a new game session
  async createSession(hostId, title, description, questionIds, settings = {}) {
    const code = this.generateSessionCode();

    const session = new Session({
      code,
      hostId,
      title: title || 'Partida de Pensamiento Crítico',
      description,
      questions: questionIds,
      status: 'waiting',
      settings: {
        timePerQuestion: settings.timePerQuestion || 25,
        showLeaderboard: settings.showLeaderboard !== false,
        showCorrectAnswer: settings.showCorrectAnswer !== false,
        allowLateJoin: settings.allowLateJoin !== false,
        ...settings
      }
    });

    await session.save();
    return session;
  }

  // Player joins a session
  async joinSession(sessionCode, playerData) {
    const session = await Session.findOne({ code: sessionCode.toUpperCase() });

    if (!session) {
      throw new Error('Sala no encontrada');
    }

    if (session.status === 'finished') {
      throw new Error('La partida ya ha terminado');
    }

    if (session.status === 'playing' && !session.settings.allowLateJoin) {
      throw new Error('La partida ya comenzó y no permite ingresos tardíos');
    }

    if (session.players.length >= session.maxPlayers) {
      throw new Error('La sala está llena');
    }

    // Check if player already exists (reconnecting)
    const existingPlayer = session.players.find(p => 
      p.socketId === playerData.socketId || 
      (playerData.username && p.username === playerData.username)
    );

    if (existingPlayer) {
      existingPlayer.socketId = playerData.socketId;
      existingPlayer.isActive = true;
      await session.save();
      return { session, player: existingPlayer, isReconnect: true };
    }

    const newPlayer = {
      socketId: playerData.socketId,
      username: playerData.username || `Jugador ${session.players.length + 1}`,
      displayName: playerData.displayName || playerData.username,
      avatar: playerData.avatar || '',
      totalScore: 0,
      correctAnswers: 0,
      streak: 0,
      isActive: true
    };

    session.players.push(newPlayer);
    await session.save();

    return { session, player: newPlayer, isReconnect: false };
  }

  // Start the game
  async startGame(sessionCode) {
    const session = await Session.findOne({ code: sessionCode.toUpperCase() })
      .populate('questions');

    if (!session) throw new Error('Sala no encontrada');
    if (session.status !== 'waiting') throw new Error('La partida ya comenzó');
    if (session.players.length === 0) throw new Error('No hay jugadores en la sala');

    session.status = 'playing';
    session.currentQuestionIndex = -1;
    session.startedAt = new Date();
    await session.save();

    // Notify all players
    this.io.to(sessionCode).emit('game:started', {
      totalQuestions: session.questions.length,
      settings: session.settings
    });

    // Start first question after a short delay
    setTimeout(() => {
      this.nextQuestion(sessionCode);
    }, 3000);

    return session;
  }

  // Move to next question
  async nextQuestion(sessionCode) {
    const session = await Session.findOne({ code: sessionCode.toUpperCase() })
      .populate('questions');

    if (!session || session.status !== 'playing') return;

    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex >= session.questions.length) {
      await this.endGame(sessionCode);
      return;
    }

    session.currentQuestionIndex = nextIndex;
    await session.save();

    const question = session.questions[nextIndex];
    const timeLimit = question.timeLimit || session.settings.timePerQuestion;

    // Prepare question data (without revealing correct answer)
    const questionData = {
      index: nextIndex,
      totalQuestions: session.questions.length,
      text: question.text,
      options: question.options.map((opt, idx) => ({
        index: idx,
        text: opt.text
      })),
      category: question.category,
      difficulty: question.difficulty,
      timeLimit: timeLimit,
      points: question.points
    };

    // Start question timer
    const startTime = Date.now();
    this.questionTimers.set(sessionCode, {
      questionIndex: nextIndex,
      startTime,
      timeLimit: timeLimit * 1000
    });

    // Send question to all players
    this.io.to(sessionCode).emit('question:new', questionData);

    // Set timer to auto-end question
    const timer = setTimeout(() => {
      this.endQuestion(sessionCode, nextIndex);
    }, timeLimit * 1000);

    this.activeTimers.set(sessionCode, timer);
  }

  // Player submits answer
  async submitAnswer(sessionCode, socketId, answerIndex) {
    const session = await Session.findOne({ code: sessionCode.toUpperCase() })
      .populate('questions');

    if (!session || session.status !== 'playing') {
      throw new Error('Partida no activa');
    }

    const timerData = this.questionTimers.get(sessionCode);
    if (!timerData) {
      throw new Error('No hay pregunta activa');
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];

    // Check if player already answered
    const existingResult = session.results.find(
      r => r.questionId?.toString() === currentQuestion._id.toString()
    );

    if (existingResult) {
      const alreadyAnswered = existingResult.answers.find(
        a => a.playerId === socketId
      );
      if (alreadyAnswered) {
        throw new Error('Ya respondiste esta pregunta');
      }
    }

    const timeTaken = Date.now() - timerData.startTime;
    const timeLimit = timerData.timeLimit;
    const isCorrect = currentQuestion.options[answerIndex]?.isCorrect || false;

    // Calculate points
    let pointsEarned = 0;
    if (isCorrect) {
      // Base points + speed bonus
      const timeBonus = Math.max(0, 1 - (timeTaken / timeLimit));
      pointsEarned = Math.round(currentQuestion.points * (0.5 + 0.5 * timeBonus));
    }

    // Update player stats
    const player = session.players.find(p => p.socketId === socketId);
    if (player) {
      player.totalScore += pointsEarned;
      if (isCorrect) {
        player.correctAnswers += 1;
        player.streak += 1;
      } else {
        player.streak = 0;
      }
    }

    // Record answer
    let questionResult = session.results.find(
      r => r.questionId?.toString() === currentQuestion._id.toString()
    );

    if (!questionResult) {
      questionResult = {
        questionId: currentQuestion._id,
        questionText: currentQuestion.text,
        correctAnswerIndex: currentQuestion.options.findIndex(o => o.isCorrect),
        answers: [],
        startedAt: new Date(timerData.startTime)
      };
      session.results.push(questionResult);
    }

    questionResult.answers.push({
      playerId: socketId,
      answerIndex,
      timeTaken,
      pointsEarned,
      isCorrect
    });

    await session.save();

    // Send immediate feedback to player
    this.io.to(socketId).emit('answer:confirmed', {
      isCorrect,
      pointsEarned,
      timeTaken: Math.round(timeTaken / 1000 * 10) / 10,
      correctAnswerIndex: questionResult.correctAnswerIndex
    });

    // Check if all players answered
    const allAnswered = session.players.every(p => {
      if (!p.isActive) return true;
      return questionResult.answers.some(a => a.playerId === p.socketId);
    });

    if (allAnswered) {
      // Cancel timer and end question early
      const timer = this.activeTimers.get(sessionCode);
      if (timer) {
        clearTimeout(timer);
        this.activeTimers.delete(sessionCode);
      }
      this.endQuestion(sessionCode, session.currentQuestionIndex);
    }

    return { isCorrect, pointsEarned };
  }

  // End current question and show results
  async endQuestion(sessionCode, questionIndex) {
    const session = await Session.findOne({ code: sessionCode.toUpperCase() })
      .populate('questions');

    if (!session || session.currentQuestionIndex !== questionIndex) return;

    // Clean up timer
    this.activeTimers.delete(sessionCode);
    this.questionTimers.delete(sessionCode);

    const currentQuestion = session.questions[questionIndex];
    const questionResult = session.results.find(
      r => r.questionId?.toString() === currentQuestion._id.toString()
    );

    if (questionResult) {
      questionResult.endedAt = new Date();
    }

    await session.save();

    // Prepare results data
    const correctIndex = currentQuestion.options.findIndex(o => o.isCorrect);
    const answerStats = currentQuestion.options.map((opt, idx) => ({
      index: idx,
      text: opt.text,
      count: questionResult ? questionResult.answers.filter(a => a.answerIndex === idx).length : 0
    }));

    // Get leaderboard
    const leaderboard = this.getLeaderboard(session.players);

    // Send results to all players
    this.io.to(sessionCode).emit('question:ended', {
      correctAnswerIndex: correctIndex,
      explanation: currentQuestion.explanation,
      answerStats,
      leaderboard: session.settings.showLeaderboard ? leaderboard : null
    });

    // Wait before next question
    setTimeout(() => {
      this.nextQuestion(sessionCode);
    }, 5000);
  }

  // End the game
  async endGame(sessionCode) {
    const session = await Session.findOne({ code: sessionCode.toUpperCase() });

    if (!session) return;

    session.status = 'finished';
    session.endedAt = new Date();
    await session.save();

    const finalLeaderboard = this.getLeaderboard(session.players);

    this.io.to(sessionCode).emit('game:ended', {
      finalLeaderboard,
      totalQuestions: session.questions.length,
      stats: {
        totalPlayers: session.players.length,
        averageScore: session.players.reduce((sum, p) => sum + p.totalScore, 0) / session.players.length
      }
    });

    // Clean up
    this.activeTimers.delete(sessionCode);
    this.questionTimers.delete(sessionCode);
  }

  // Get sorted leaderboard
  getLeaderboard(players) {
    return players
      .filter(p => p.isActive)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((p, index) => ({
        rank: index + 1,
        username: p.username,
        displayName: p.displayName,
        avatar: p.avatar,
        score: p.totalScore,
        correctAnswers: p.correctAnswers,
        streak: p.streak
      }));
  }

  // Player disconnects
  async playerDisconnect(sessionCode, socketId) {
    const session = await Session.findOne({ code: sessionCode.toUpperCase() });

    if (!session) return;

    const player = session.players.find(p => p.socketId === socketId);
    if (player) {
      player.isActive = false;
      await session.save();
    }

    // Notify others
    this.io.to(sessionCode).emit('player:left', {
      username: player?.username,
      playersCount: session.players.filter(p => p.isActive).length
    });
  }

  // Get session state for reconnecting players
  async getSessionState(sessionCode) {
    const session = await Session.findOne({ code: sessionCode.toUpperCase() })
      .populate('questions');

    if (!session) return null;

    return {
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      players: session.players.filter(p => p.isActive).map(p => ({
        username: p.username,
        displayName: p.displayName,
        score: p.totalScore
      })),
      settings: session.settings
    };
  }
}

export default GameEngine;
