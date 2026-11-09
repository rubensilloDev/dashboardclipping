/**
 * Rutas para gestión de la configuración del sistema (ej. API Key de Google Drive).
 * Permite al creador consultar y actualizar su clave de API desde la interfaz gráfica.
 */

import { Router } from 'express';
import { db } from '../storage/db.js';
import { requireAuth } from '../middleware/auth.js';

export const configRouter = Router();

// Requiere autenticación
configRouter.use(requireAuth);

/**
 * GET /api/config
 * Devuelve la configuración pública/enmascarada del sistema
 */
configRouter.get('/', (req, res) => {
  const storedConfig = db.getConfig();
  const effectiveAppsScriptUrl = storedConfig.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || '';
  const effectiveKey = storedConfig.googleDriveApiKey || process.env.GOOGLE_DRIVE_API_KEY || '';

  const maskedKey = effectiveKey.length > 8
    ? `${effectiveKey.substring(0, 4)}••••••••${effectiveKey.substring(effectiveKey.length - 4)}`
    : effectiveKey ? '••••••••' : '';

  return res.json({
    hasAppsScript: Boolean(effectiveAppsScriptUrl),
    appsScriptUrl: effectiveAppsScriptUrl,
    appsScriptSource: storedConfig.googleAppsScriptUrl ? 'database' : (process.env.GOOGLE_APPS_SCRIPT_URL ? 'env' : 'none'),
    hasApiKey: Boolean(effectiveKey),
    apiKeyMasked: maskedKey,
    apiKeySource: storedConfig.googleDriveApiKey ? 'database' : (process.env.GOOGLE_DRIVE_API_KEY ? 'env' : 'none')
  });
});

/**
 * POST /api/config
 * Actualiza la URL de Google Apps Script y/o la clave de API de Google Drive
 */
configRouter.post('/', (req, res) => {
  const { googleAppsScriptUrl, googleDriveApiKey } = req.body || {};

  const updates = {};

  if (googleAppsScriptUrl !== undefined) {
    if (typeof googleAppsScriptUrl !== 'string') {
      return res.status(400).json({ error: 'La URL de Google Apps Script debe ser un texto.' });
    }
    updates.googleAppsScriptUrl = googleAppsScriptUrl.trim();
  }

  if (googleDriveApiKey !== undefined) {
    if (typeof googleDriveApiKey !== 'string') {
      return res.status(400).json({ error: 'La clave de API debe ser un texto.' });
    }
    updates.googleDriveApiKey = googleDriveApiKey.trim();
  }

  const updated = db.updateConfig(updates);

  db.addActivity('Configuración de conexión con Google Drive actualizada', 'config');

  return res.json({
    message: 'Configuración guardada correctamente.',
    hasAppsScript: Boolean(updated.googleAppsScriptUrl),
    appsScriptUrl: updated.googleAppsScriptUrl,
    hasApiKey: Boolean(updated.googleDriveApiKey)
  });
});

