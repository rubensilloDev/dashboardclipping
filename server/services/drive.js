/**
 * Servicio de integración con Google Drive API v3.
 * Extrae IDs de carpetas desde URLs complejas o identificadores limpios,
 * consulta la lista de vídeos y sincroniza conservando los estados editados por el usuario.
 */

import { db } from '../storage/db.js';

/**
 * Extrae el ID de una carpeta de Google Drive a partir de un enlace o ID directo
 * @param {string} input - Enlace completo de Google Drive o ID de carpeta
 * @returns {string} ID de la carpeta limpio
 */
export function extractFolderId(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const trimmed = input.trim();

  // Patrón 1: /folders/ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Patrón 2: id=ID en query params
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // Si no tiene barras ni símbolos de URL, asumimos que es el ID directo
  return trimmed;
}

/**
 * Consulta los vídeos de una carpeta de Google Drive mediante:
 * 1. Opción A (Recomendada): Google Apps Script Web App (100% gratis, sin Google Cloud Console).
 * 2. Opción B: Google Drive API v3 (con API Key oficial de Google Cloud).
 * 3. Fallback: Simulación para desarrollo local cuando no hay credenciales configuradas.
 * 
 * @param {string} folderId - ID de la carpeta en Drive
 * @param {Object|string} [options={}] - Opciones de autenticación { appsScriptUrl, apiKey } o apiKey como string
 * @returns {Promise<Array<Object>>} Lista de vídeos detectados
 */
export async function fetchDriveVideos(folderInput, options = {}) {
  const folderId = extractFolderId(folderInput);
  if (!folderId) {
    return [];
  }

  const appsScriptUrl = typeof options === 'object' ? options?.appsScriptUrl : undefined;
  const apiKey = typeof options === 'string' ? options : options?.apiKey;

  // 1. Prioridad: Google Apps Script Web App (100% gratuito)
  if (appsScriptUrl && typeof appsScriptUrl === 'string' && appsScriptUrl.trim()) {
    try {
      const cleanUrl = appsScriptUrl.trim();
      const requestUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}folderId=${encodeURIComponent(folderId)}`;

      const response = await fetch(requestUrl, {
        redirect: 'follow',
        headers: {
          Accept: 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          const mappedFiles = Array.isArray(data.files)
            ? data.files.map((file) => {
                const fileId = file.id || file.driveFileId;
                const rawTitle = file.name || file.title || 'Clip sin título';
                return {
                  driveFileId: fileId,
                  title: rawTitle.replace(/\.[^/.]+$/, ''), // Elimina la extensión del archivo
                  thumbnailUrl: file.thumbnailLink || file.thumbnailUrl || `https://lh3.googleusercontent.com/d/${fileId}=w600`,
                  duration: file.duration || '00:45'
                };
              })
            : [];

          const mappedSubfolders = Array.isArray(data.subfolders)
            ? data.subfolders.map((sub) => ({
                id: sub.id,
                name: sub.name,
                files: Array.isArray(sub.files)
                  ? sub.files.map((f) => ({
                      driveFileId: f.id || f.driveFileId,
                      title: (f.name || f.title || 'Clip sin título').replace(/\.[^/.]+$/, ''),
                      thumbnailUrl: f.thumbnailLink || f.thumbnailUrl || `https://lh3.googleusercontent.com/d/${f.id || f.driveFileId}=w600`,
                      duration: f.duration || '00:45'
                    }))
                  : []
              }))
            : [];

          const result = mappedFiles;
          result.subfolders = mappedSubfolders;
          return result;
        }
      }
    } catch {
      // Si la llamada a Google Apps Script falla, continúa con el intento de API Key o simulación
    }
  }

  // 2. Opción B: Google Drive API v3 oficial con API Key
  if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
    try {
      const cleanKey = apiKey.trim();
      const query = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'video/' and trashed = false`);
      const fields = encodeURIComponent('files(id, name, thumbnailLink, videoMediaMetadata, createdTime)');
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${cleanKey}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.files) && data.files.length > 0) {
          return data.files.map((file) => {
            const durationMs = file.videoMediaMetadata?.durationMillis;
            let durationStr = '00:45';
            if (durationMs) {
              const totalSec = Math.floor(Number(durationMs) / 1000);
              const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
              const sec = String(totalSec % 60).padStart(2, '0');
              durationStr = `${min}:${sec}`;
            }

            return {
              driveFileId: file.id,
              title: file.name.replace(/\.[^/.]+$/, ''), // Elimina la extensión del archivo
              thumbnailUrl: file.thumbnailLink || `https://lh3.googleusercontent.com/d/${file.id}=w600`,
              duration: durationStr
            };
          });
        }
      }
    } catch {
      // Si falla la petición HTTP externa a Google Drive, continúa con el fallback de desarrollo
    }
  }

  // Si no se encontraron vídeos o no hay credenciales, devolver lista vacía sin inventar clips
  return [];
}

/**
 * Sincroniza los vídeos de una campaña con los archivos de Google Drive
 * Preserva en todo momento los estados guardados por el usuario si el vídeo ya existía.
 * 
 * @param {string} campaignId - Identificador de la campaña
 * @param {Object|string} [options={}] - Opciones de conexión { appsScriptUrl, apiKey } o apiKey directa
 * @returns {Promise<{ newVideosCount: number, totalVideosCount: number }>}
 */
export async function syncCampaignVideos(campaignId, options = {}) {
  const campaign = db.getCampaignById(campaignId);
  if (!campaign) {
    throw new Error(`Campaña con ID ${campaignId} no encontrada.`);
  }

  const driveVideos = await fetchDriveVideos(campaign.driveFolderId, options);
  const directVideos = Array.isArray(driveVideos) ? driveVideos : [];
  const subfolders = driveVideos.subfolders || [];

  const existingVideos = db.getVideos({ campaignId });
  const existingDriveIds = new Set(existingVideos.map((v) => v.driveFileId));

  let newVideosCount = 0;
  let newCampaignsCount = 0;

  // 1. Sincronizar vídeos directos de esta carpeta/campaña
  for (const driveVid of directVideos) {
    if (!existingDriveIds.has(driveVid.driveFileId)) {
      db.createVideo({
        campaignId,
        driveFileId: driveVid.driveFileId,
        title: driveVid.title,
        thumbnailUrl: driveVid.thumbnailUrl,
        duration: driveVid.duration,
        isEdited: false,
        platforms: {
          youtube: false,
          tiktok: false,
          instagram: false,
          facebook: false
        },
        postUrls: {},
        notes: 'Detectado automáticamente en Google Drive'
      });
      newVideosCount++;
    }
  }

  // 2. Si la carpeta consultada contiene subcarpetas (Carpeta Padre de Campañas)
  // Crear o vincular cada subcarpeta como una Campaña hija independiente
  if (subfolders.length > 0) {
    const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6'];

    for (let i = 0; i < subfolders.length; i++) {
      const sub = subfolders[i];
      let subCamp = db.getCampaigns().find((c) =>
        c.driveFolderId === sub.id ||
        c.driveFolderId === `https://drive.google.com/drive/folders/${sub.id}` ||
        c.name.trim().toLowerCase() === sub.name.trim().toLowerCase()
      );

      if (!subCamp) {
        const color = PALETTE[(db.getCampaigns().length + i) % PALETTE.length];
        subCamp = db.createCampaign({
          name: sub.name,
          color,
          driveFolderId: sub.id
        });
        newCampaignsCount++;
      }

      const subExistingVideos = db.getVideos({ campaignId: subCamp.id });
      const subExistingIds = new Set(subExistingVideos.map((v) => v.driveFileId));

      for (const subVid of (sub.files || [])) {
        if (!subExistingIds.has(subVid.driveFileId)) {
          db.createVideo({
            campaignId: subCamp.id,
            driveFileId: subVid.driveFileId,
            title: subVid.title,
            thumbnailUrl: subVid.thumbnailUrl,
            duration: subVid.duration,
            isEdited: false,
            platforms: {
              youtube: false,
              tiktok: false,
              instagram: false,
              facebook: false
            },
            postUrls: {},
            notes: `Importado de subcarpeta "${sub.name}" en Drive`
          });
          newVideosCount++;
        }
      }
    }
  }

  if (newVideosCount > 0 || newCampaignsCount > 0) {
    const extraMsg = newCampaignsCount > 0 ? ` (${newCampaignsCount} campañas hijas detectadas)` : '';
    db.addActivity(
      `Sincronización con Drive: ${newVideosCount} vídeos añadidos a "${campaign.name}"${extraMsg}`,
      'drive_sync'
    );
  }

  const updatedVideos = db.getVideos({ campaignId });

  return {
    newVideosCount,
    newCampaignsCount,
    totalVideosCount: updatedVideos.length
  };
}

