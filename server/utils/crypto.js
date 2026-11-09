/**
 * Utilidades criptográficas para autenticación y gestión de sesiones seguras.
 * Emplea scrypt para derivación y verificación de contraseñas contra timing attacks,
 * y tokens HMAC-SHA256 con firma digital y expiración programable.
 */

import crypto from 'node:crypto';

const KEY_LENGTH = 64;
const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas
const EXTENDED_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

/**
 * Codifica un objeto o cadena en Base64URL
 * @param {string|Buffer} input - Entrada a codificar
 * @returns {string} Cadena en formato Base64URL
 */
function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf-8');
  return buffer.toString('base64url');
}

/**
 * Decodifica una cadena en Base64URL a texto UTF-8
 * @param {string} input - Cadena en formato Base64URL
 * @returns {string} Texto decodificado
 */
function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

/**
 * Verifica si una contraseña coincide con el hash scrypt almacenado
 * @param {string} password - Contraseña en texto plano
 * @param {string} storedHash - Hash con formato 'salt:derivedKeyHex'
 * @returns {boolean} True si coincide exactamente
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) {
    return false;
  }

  const originalKeyBuffer = Buffer.from(keyHex, 'hex');
  const derivedKeyBuffer = crypto.scryptSync(password, salt, KEY_LENGTH);

  // timingSafeEqual previene vulnerabilidades de ataque por canal lateral (timing attack)
  if (originalKeyBuffer.length !== derivedKeyBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(originalKeyBuffer, derivedKeyBuffer);
}

/**
 * Genera un token de sesión firmado mediante HMAC-SHA256
 * @param {string} username - Nombre de usuario autenticado
 * @param {boolean} rememberMe - Si debe durar 30 días en lugar de 24 horas
 * @param {string} secret - Clave secreta para firmar el token
 * @returns {string} Token de sesión compacto con formato 'payloadBase64.firmaBase64'
 */
export function createSessionToken(username, rememberMe = false, secret) {
  const now = Date.now();
  const duration = rememberMe ? EXTENDED_SESSION_DURATION_MS : DEFAULT_SESSION_DURATION_MS;

  const payload = {
    sub: username,
    iat: now,
    exp: now + duration,
    rememberMe: Boolean(rememberMe)
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifica y decodifica un token de sesión
 * @param {string} token - Token de sesión recibido
 * @param {string} secret - Clave secreta para comprobar la firma
 * @returns {Object|null} Objeto de payload si es válido y no ha expirado, o null
 */
export function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest();
  const receivedSignature = Buffer.from(encodedSignature, 'base64url');

  if (expectedSignature.length !== receivedSignature.length) {
    return null;
  }

  const isSignatureValid = crypto.timingSafeEqual(expectedSignature, receivedSignature);
  if (!isSignatureValid) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Token expirado
    }
    return payload;
  } catch {
    return null;
  }
}

