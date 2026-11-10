/**
 * Rutas para gestión de vídeos y sincronización con Google Drive.
 * Permite filtrar, sincronizar carpetas y actualizar estados de edición y plataformas.
 */

import { Router } from 'express';
import { db } from '../storage/db.js';
import { syncCampaignVideos } from '../services/drive.js';
import { requireAuth } from '../middleware/auth.js';

export const videosRouter = Router();

// Todas las rutas de vídeos requieren autenticación
videosRouter.use(requireAuth);

/**
 * GET /api/videos
 * Obtiene el listado de vídeos con filtros opcionales (campaña, estado, buscador)
 */
videosRouter.get('/', async (req, res) => {
  const { campaignId, status, search, sort, subfolder } = req.query;

  try {
    const videos = await db.getVideos({
      campaignId: campaignId ? String(campaignId) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
      sort: sort ? String(sort) : undefined,
      subfolder: subfolder !== undefined ? String(subfolder) : undefined
    });

    return res.json(videos);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al obtener vídeos.' });
  }
});

/**
 * POST /api/videos/sync
 * Dispara la sincronización con las carpetas de Google Drive
 */
videosRouter.post('/sync', async (req, res) => {
  const { campaignId, apiKey: customApiKey, appsScriptUrl: customAppsScriptUrl } = req.body || {};

  try {
    const storedConfig = await db.getConfig();
    const appsScriptUrl = customAppsScriptUrl || storedConfig?.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL;
    const apiKey = customApiKey || storedConfig?.googleDriveApiKey || process.env.GOOGLE_DRIVE_API_KEY;

    const campaigns = campaignId && campaignId !== 'all'
      ? [(await db.getCampaignById(campaignId))].filter(Boolean)
      : await db.getCampaigns();

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'No se encontraron campañas para sincronizar.' });
    }

    let totalNewVideos = 0;
    let totalNewCampaigns = 0;

    for (const camp of campaigns) {
      const result = await syncCampaignVideos(camp.id, { appsScriptUrl, apiKey });
      totalNewVideos += result.newVideosCount;
      totalNewCampaigns += (result.newCampaignsCount || 0);
    }

    let msg = totalNewVideos > 0
      ? `Sincronización con Drive completada: ${totalNewVideos} vídeos nuevos detectados.`
      : 'Sincronización con Google Drive completada. No se encontraron clips nuevos.';

    if (totalNewCampaigns > 0) {
      msg += ` (${totalNewCampaigns} nuevas campañas hijas creadas automáticamente)`;
    }

    return res.json({
      message: msg,
      totalNewVideos,
      totalNewCampaigns,
      campaignsSynced: campaigns.length
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error durante la sincronización.' });
  }
});

/**
 * PATCH /api/videos/:id
 * Actualiza los estados de un clip: isEdited, plataformas, enlaces y notas
 */
videosRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { isEdited, platforms, postUrls, notes } = req.body || {};

  try {
    const currentVideo = await db.getVideoById(id);
    if (!currentVideo) {
      return res.status(404).json({ error: 'Vídeo no encontrado.' });
    }

    const updates = {};
    if (typeof isEdited === 'boolean') {
      updates.isEdited = isEdited;
      if (isEdited !== currentVideo.isEdited) {
        const stateText = isEdited ? 'Editado: Sí' : 'Editado: No';
        await db.addActivity(`Estado de edición actualizado a "${stateText}" en "${currentVideo.title}"`, 'edit_status');
      }
    }

    if (platforms && typeof platforms === 'object') {
      updates.platforms = platforms;

      // Detectar plataformas recién marcadas como subidas para el feed de actividad
      const newlyUploaded = [];
      ['youtube', 'tiktok', 'instagram', 'facebook'].forEach((net) => {
        if (platforms[net] && !currentVideo.platforms?.[net]) {
          newlyUploaded.push(net.toUpperCase());
        }
      });

      if (newlyUploaded.length > 0) {
        await db.addActivity(
          `Marcado como subido en ${newlyUploaded.join(', ')} en "${currentVideo.title}"`,
          'upload_status'
        );
      }
    }

    if (postUrls && typeof postUrls === 'object') {
      updates.postUrls = postUrls;
    }

    if (typeof notes === 'string') {
      updates.notes = notes.trim();
    }

    const updatedVideo = await db.updateVideo(id, updates);
    return res.json(updatedVideo);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al actualizar el vídeo.' });
  }
});
