/**
 * Genera un código alfanumérico de 6 caracteres para la sala.
 * Excluye caracteres confusos (0, O, I, 1) para facilitar lectura.
 */
export function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Calcula puntos basado en tiempo de respuesta.
 * @param {number} timeLimit - Tiempo total de la pregunta en segundos
 * @param {number} timeUsed  - Tiempo usado en segundos
 * @returns {number} Puntos obtenidos
 */
export function calculateScore(timeLimit, timeUsed) {
  const ratio = timeUsed / timeLimit;
  if (ratio < 0.5) return 150;
  if (ratio < 0.8) return 100;
  return Math.max(50, Math.round(100 - (ratio - 0.5) * 100));
}
