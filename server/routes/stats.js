/**
 * Rutas de analítica y métricas del Dashboard.
 * Devuelve agregados de vídeos, estados por plataforma, progreso de campañas y actividad.
 */

import { Router } from 'express';
import { db } from '../storage/db.js';
import { requireAuth } from '../middleware/auth.js';

export const statsRouter = Router();

// Requiere autenticación
statsRouter.use(requireAuth);

/**
 * GET /api/stats
 * Devuelve todas las estadísticas consolidadas del panel
 */
statsRouter.get('/', async (req, res) => {
  try {
    const stats = await db.getStats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al obtener estadísticas.' });
  }
});
