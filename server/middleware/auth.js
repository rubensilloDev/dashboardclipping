/**
 * Middlewares de seguridad:
 * 1. Control de intentos de inicio de sesión contra ataques de fuerza bruta.
 * 2. Validación de tokens de sesión firmados en cabecera Authorization: Bearer <token>.
 */

import { verifySessionToken } from '../utils/crypto.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos de bloqueo

// Memoria volátil para rastreo de intentos fallidos por dirección IP
const loginAttempts = new Map();

/**
 * Obtiene la dirección IP del cliente desde la petición HTTP
 * @param {import('express').Request} req - Objeto de petición Express
 * @returns {string} Dirección IP
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * Middleware para bloquear intentos de fuerza bruta en la ruta de inicio de sesión
 */
export function loginRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    // Si ya pasó la ventana de bloqueo de 15 minutos, reinicia el contador
    if (now - record.firstAttemptTime > LOCKOUT_WINDOW_MS) {
      loginAttempts.delete(ip);
    } else if (record.failedCount >= MAX_FAILED_ATTEMPTS) {
      const remainingMinutes = Math.ceil((LOCKOUT_WINDOW_MS - (now - record.firstAttemptTime)) / 60000);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Acceso bloqueado por seguridad durante ${remainingMinutes} minuto(s).`
      });
    }
  }

  next();
}

/**
 * Registra un intento de login fallido para la IP del cliente
 * @param {import('express').Request} req - Objeto de petición Express
 */
export function recordFailedLogin(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAttemptTime > LOCKOUT_WINDOW_MS) {
    loginAttempts.set(ip, {
      failedCount: 1,
      firstAttemptTime: now
    });
  } else {
    record.failedCount += 1;
  }
}

/**
 * Restablece los intentos fallidos tras un login satisfactorio
 * @param {import('express').Request} req - Objeto de petición Express
 */
export function resetLoginAttempts(req) {
  const ip = getClientIp(req);
  loginAttempts.delete(ip);
}

/**
 * Middleware que verifica que el usuario cuente con un token de sesión válido
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Se requiere un token de sesión.' });
  }

  const token = authHeader.substring(7).trim();
  const sessionSecret = process.env.SESSION_SECRET || 'fallback_secret_clipping_2026';
  const payload = verifySessionToken(token, sessionSecret);

  if (!payload) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido. Por favor, inicia sesión nuevamente.' });
  }

  req.user = payload;
  next();
}

