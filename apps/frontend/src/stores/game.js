import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameStore = defineStore('game', () => {
  const sessionCode = ref('')
  const isHost = ref(false)
  const playerName = ref('')
  const playerAvatar = ref('')

  const status = ref('waiting')
  const currentQuestion = ref(null)
  const currentQuestionIndex = ref(0)
  const totalQuestions = ref(0)
  const timeLeft = ref(0)
  const answered = ref(false)
  const answerResult = ref(null)

  const players = ref([])
  const leaderboard = ref([])

  const questionResults = ref(null)
  const finalResults = ref(null)

  const isWaiting = computed(() => status.value === 'waiting')
  const isPlaying = computed(() => status.value === 'playing')
  const isFinished = computed(() => status.value === 'finished')
  const hasAnswered = computed(() => answered.value)

  const myRank = computed(() => {
    const index = leaderboard.value.findIndex(p => p.name === playerName.value)
    return index !== -1 ? index + 1 : null
  })

  const myScore = computed(() => {
    const player = leaderboard.value.find(p => p.name === playerName.value)
    return player?.score || 0
  })

  function setSession(code, host = false) {
    sessionCode.value = code
    isHost.value = host
  }

  function setPlayer(name, avatar) {
    playerName.value = name
    playerAvatar.value = avatar
  }

  function setStatus(newStatus) {
    status.value = newStatus
  }

  function setQuestion(question, index, total) {
    currentQuestion.value = question
    currentQuestionIndex.value = index
    totalQuestions.value = total
    answered.value = false
    answerResult.value = null
    timeLeft.value = question?.timeLimit || 20
  }

  function setTimeLeft(time) {
    timeLeft.value = time
  }

  function submitAnswer() {
    answered.value = true
  }

  function setAnswerResult(result) {
    answerResult.value = result
  }

  function setPlayers(newPlayers) {
    players.value = newPlayers
  }

  function setLeaderboard(newLeaderboard) {
    leaderboard.value = newLeaderboard
  }

  function setQuestionResults(results) {
    questionResults.value = results
  }

  function setFinalResults(results) {
    finalResults.value = results
    status.value = 'finished'
  }

  function reset() {
    sessionCode.value = ''
    isHost.value = false
    playerName.value = ''
    playerAvatar.value = ''
    status.value = 'waiting'
    currentQuestion.value = null
    currentQuestionIndex.value = 0
    totalQuestions.value = 0
    timeLeft.value = 0
    answered.value = false
    answerResult.value = null
    players.value = []
    leaderboard.value = []
    questionResults.value = null
    finalResults.value = null
  }

  return {
    sessionCode, isHost, playerName, playerAvatar,
    status, currentQuestion, currentQuestionIndex, totalQuestions,
    timeLeft, answered, answerResult,
    players, leaderboard, questionResults, finalResults,
    isWaiting, isPlaying, isFinished, hasAnswered, myRank, myScore,
    setSession, setPlayer, setStatus, setQuestion, setTimeLeft,
    submitAnswer, setAnswerResult, setPlayers, setLeaderboard,
    setQuestionResults, setFinalResults, reset
  }
})
