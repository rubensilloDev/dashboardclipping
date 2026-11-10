/**
 * Rutas de gestión de campañas (carpetas de Google Drive).
 * Permite listar, crear, editar nombre/color y eliminar campañas.
 */

import { Router } from 'express';
import { db } from '../storage/db.js';
import { extractFolderId, syncCampaignVideos } from '../services/drive.js';
import { requireAuth } from '../middleware/auth.js';

export const campaignsRouter = Router();

// Todas las rutas de campañas requieren autenticación
campaignsRouter.use(requireAuth);

/**
 * GET /api/campaigns
 * Lista todas las campañas registradas
 */
campaignsRouter.get('/', async (req, res) => {
  try {
    const campaigns = await db.getCampaigns();
    return res.json(campaigns);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al obtener campañas.' });
  }
});

/**
 * POST /api/campaigns
 * Crea una nueva campaña a partir de un enlace o ID de carpeta de Google Drive
 */
campaignsRouter.post('/', async (req, res) => {
  const { name, color, folderInput } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la campaña es obligatorio.' });
  }

  if (!folderInput || typeof folderInput !== 'string' || !folderInput.trim()) {
    return res.status(400).json({ error: 'Debes indicar el enlace o ID de la carpeta de Drive.' });
  }

  const driveFolderId = extractFolderId(folderInput);
  if (!driveFolderId) {
    return res.status(400).json({ error: 'No se pudo determinar el ID de la carpeta de Drive.' });
  }

  try {
    const campaign = await db.createCampaign({
      name: name.trim(),
      color: color || '#6366f1',
      driveFolderId
    });

    await db.addActivity(`Creada la nueva campaña "${campaign.name}"`, 'campaign');

    // Sincronización inicial automática de la nueva campaña
    const storedConfig = await db.getConfig();
    const appsScriptUrl = storedConfig?.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL;
    const apiKey = storedConfig?.googleDriveApiKey || process.env.GOOGLE_DRIVE_API_KEY;
    try {
      await syncCampaignVideos(campaign.id, { appsScriptUrl, apiKey });
    } catch {
      // Si falla la sincronización inmediata, la campaña ya está creada y se podrá sincronizar luego
    }

    return res.status(201).json(campaign);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al crear la campaña.' });
  }
});

/**
 * Controlador para actualizar una campaña existente (soporta PUT y PATCH)
 */
async function handleUpdateCampaign(req, res) {
  const { id } = req.params;
  const { name, color, folderInput, driveFolderId, isCompleted } = req.body || {};

  const updates = {};
  if (name && typeof name === 'string' && name.trim()) {
    updates.name = name.trim();
  }
  if (color && typeof color === 'string' && color.trim()) {
    updates.color = color.trim();
  }

  if (folderInput && typeof folderInput === 'string' && folderInput.trim()) {
    const extractedId = extractFolderId(folderInput);
    if (extractedId) updates.driveFolderId = extractedId;
  } else if (driveFolderId && typeof driveFolderId === 'string' && driveFolderId.trim()) {
    updates.driveFolderId = driveFolderId.trim();
  }

  if (typeof isCompleted === 'boolean') {
    updates.isCompleted = isCompleted;
  }

  try {
    const updated = await db.updateCampaign(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Campaña no encontrada.' });
    }

    const statusAction = typeof isCompleted === 'boolean'
      ? (isCompleted ? `Marcada como finalizada la campaña "${updated.name}"` : `Reactivada la campaña "${updated.name}"`)
      : `Actualizada la campaña "${updated.name}"`;

    await db.addActivity(statusAction, 'campaign');
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al actualizar la campaña.' });
  }
}

campaignsRouter.patch('/:id', handleUpdateCampaign);
campaignsRouter.put('/:id', handleUpdateCampaign);

/**
 * DELETE /api/campaigns/:id
 * Elimina una campaña y todos sus vídeos asociados
 */
campaignsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await db.getCampaignById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Campaña no encontrada.' });
    }

    await db.deleteCampaign(id);
    await db.addActivity(`Eliminada la campaña "${existing.name}" y sus clips vinculados`, 'campaign');

    return res.json({ message: `Campaña ${existing.name} eliminada exitosamente.` });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al eliminar la campaña.' });
  }
});
