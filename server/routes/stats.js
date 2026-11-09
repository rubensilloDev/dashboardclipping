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
statsRouter.get('/', (req, res) => {
  const stats = db.getStats();
  return res.json(stats);
});

