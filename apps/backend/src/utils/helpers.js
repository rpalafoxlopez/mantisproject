export function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// export function calculateScore(timeLimit, timeUsed) {
//   const ratio = timeUsed / timeLimit;
//   if (ratio < 0.5) return 150;
//   if (ratio < 0.8) return 100;
//   return Math.max(50, Math.round(100 - (ratio - 0.5) * 100));
// }

export function calculateScore(timeLimit, timeUsed) {
  const base = 100;
  const maxBonus = 50;
  const ratio = Math.max(0, Math.min(1, timeUsed / timeLimit));
  const bonus = Math.round(maxBonus * (1 - ratio));
  return base + bonus;
}
