// Generate a random 4-character room code (e.g., PENS-4821)
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Calculate score based on time taken and correctness
export function calculateScore(timeLimit, timeTaken, basePoints, isCorrect) {
  if (!isCorrect) return 0;

  // Faster = more points. Max bonus for answering in first 50% of time
  const timeRatio = timeTaken / (timeLimit * 1000); // timeTaken in ms
  const speedBonus = Math.max(0, 1 - timeRatio);
  const bonusMultiplier = 1 + (speedBonus * 0.5); // up to 50% bonus

  return Math.round(basePoints * bonusMultiplier);
}
