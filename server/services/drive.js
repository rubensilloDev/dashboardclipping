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
                thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
                duration: file.duration || '00:45',
                subfolder: file.subfolder || null
              };
            })
            : [];

          const mappedSubfolders = Array.isArray(data.subfolders)
            ? data.subfolders.map((sub) => ({
              id: sub.id,
              name: sub.name,
              files: Array.isArray(sub.files)
                ? sub.files.map((f) => {
                  const fId = f.id || f.driveFileId;
                  return {
                    driveFileId: fId,
                    title: (f.name || f.title || 'Clip sin título').replace(/\.[^/.]+$/, ''),
                    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fId}&sz=w600`,
                    duration: f.duration || '00:45',
                    subfolder: f.subfolder || sub.name || null
                  };
                })
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
              thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w600`,
              duration: durationStr,
              subfolder: null
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

  // Verificamos si este folder es la Carpeta Padre Raíz (contiene múltiples subcarpetas y representa la colección de campañas)
  // Regla: La carpeta padre NO es una campaña. Sus hijas directas de primer nivel son las campañas.
  const isParentRootFolder = (
    subfolders.length > 0 &&
    (
      campaign.driveFolderId === '1m9BC2awrAAbNse_nhCegfibop09b2vp0' ||
      campaign.name.toLowerCase().includes('campañas de clipping') ||
      (directVideos.length === 0 && subfolders.length >= 3)
    )
  );

  let newVideosCount = 0;
  let newCampaignsCount = 0;

  if (isParentRootFolder) {
    // Es una carpeta padre: cada subcarpeta de primer nivel se convierte en una Campaña
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
            subfolder: subVid.subfolder || null,
            driveFileId: subVid.driveFileId,
            title: subVid.title,
            thumbnailUrl: subVid.thumbnailUrl || `https://drive.google.com/thumbnail?id=${subVid.driveFileId}&sz=w600`,
            duration: subVid.duration,
            isEdited: false,
            platforms: {
              youtube: false,
              tiktok: false,
              instagram: false,
              facebook: false
            },
            postUrls: {},
            notes: subVid.subfolder ? `Subcarpeta "${subVid.subfolder}" en Drive` : `Carpeta raíz de "${sub.name}" en Drive`
          });
          newVideosCount++;
        }
      }
    }

    // Eliminamos la carpeta padre como campaña para que nunca aparezca en catálogo ni dashboard
    db.deleteCampaign(campaignId);

    db.addActivity(
      `Sincronización de Carpeta Padre: ${newCampaignsCount} campañas hijas procesadas, ${newVideosCount} vídeos vinculados`,
      'drive_sync'
    );

    return {
      newVideosCount,
      newCampaignsCount,
      totalVideosCount: newVideosCount
    };
  }

  // Es una Campaña individual (ej: clips_feijoo o ruben holgado)
  const existingVideos = db.getVideos({ campaignId });
  const existingDriveIds = new Set(existingVideos.map((v) => v.driveFileId));

  // 1. Sincronizar vídeos directos en la raíz de esta campaña
  for (const driveVid of directVideos) {
    if (!existingDriveIds.has(driveVid.driveFileId)) {
      db.createVideo({
        campaignId,
        subfolder: null,
        driveFileId: driveVid.driveFileId,
        title: driveVid.title,
        thumbnailUrl: driveVid.thumbnailUrl || `https://drive.google.com/thumbnail?id=${driveVid.driveFileId}&sz=w600`,
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

  // 2. Si la campaña contiene subcarpetas internas (ej: 🔴 DIRECTO..., video_avispas_asesinas, Semana 1)
  // NO se crean campañas nuevas; se asocian a esta misma campaña con la propiedad subfolder
  if (subfolders.length > 0) {
    for (const sub of subfolders) {
      for (const subVid of (sub.files || [])) {
        if (!existingDriveIds.has(subVid.driveFileId)) {
          const subfolderPath = subVid.subfolder || sub.name;
          db.createVideo({
            campaignId,
            subfolder: subfolderPath,
            driveFileId: subVid.driveFileId,
            title: subVid.title,
            thumbnailUrl: subVid.thumbnailUrl || `https://drive.google.com/thumbnail?id=${subVid.driveFileId}&sz=w600`,
            duration: subVid.duration,
            isEdited: false,
            platforms: {
              youtube: false,
              tiktok: false,
              instagram: false,
              facebook: false
            },
            postUrls: {},
            notes: `Subcarpeta "${subfolderPath}" en Drive`
          });
          newVideosCount++;
        }
      }
    }
  }

  if (newVideosCount > 0) {
    db.addActivity(
      `Sincronización con Drive: ${newVideosCount} vídeos añadidos a "${campaign.name}"`,
      'drive_sync'
    );
  }

  const updatedVideos = db.getVideos({ campaignId });

  return {
    newVideosCount,
    newCampaignsCount: 0,
    totalVideosCount: updatedVideos.length
  };
}

