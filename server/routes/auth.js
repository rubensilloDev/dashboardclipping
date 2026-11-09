/**
 * Rutas de autenticación simple y segura para el creador.
 * Gestiona el inicio de sesión, validación de estado activo y cierre de sesión.
 */

import { Router } from 'express';
import { verifyPassword, createSessionToken } from '../utils/crypto.js';
import { loginRateLimiter, recordFailedLogin, resetLoginAttempts, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Inicia sesión verificando credenciales contra las variables de entorno
 */
authRouter.post('/login', loginRateLimiter, (req, res) => {
  const { username, password, rememberMe } = req.body || {};

  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const sessionSecret = process.env.SESSION_SECRET || 'fallback_secret_clipping_2026';

  if (!username || !password) {
    recordFailedLogin(req);
    return res.status(400).json({ error: 'Debes proporcionar usuario y contraseña.' });
  }

  // Comprobar usuario
  if (username.trim() !== expectedUsername) {
    recordFailedLogin(req);
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  // Comprobar hash de contraseña
  const isPasswordValid = verifyPassword(password, expectedPasswordHash);
  if (!isPasswordValid) {
    recordFailedLogin(req);
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  // Éxito: restablecer intentos fallidos y emitir token
  resetLoginAttempts(req);
  const token = createSessionToken(username, Boolean(rememberMe), sessionSecret);

  return res.json({
    message: 'Sesión iniciada con éxito.',
    token,
    user: {
      username,
      rememberMe: Boolean(rememberMe)
    }
  });
});

/**
 * GET /api/auth/me
 * Obtiene la información del usuario autenticado actual
 */
authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({
    username: req.user.sub,
    rememberMe: req.user.rememberMe,
    expiresAt: new Date(req.user.exp).toISOString()
  });
});

/**
 * POST /api/auth/logout
 * Cierre de sesión (el cliente elimina el token localmente)
 */
authRouter.post('/logout', requireAuth, (req, res) => {
  return res.json({ message: 'Sesión cerrada exitosamente.' });
});

