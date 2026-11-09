/**
 * Base de datos documental ligera y segura basada en archivo JSON.
 * Utiliza escrituras atómicas mediante archivo temporal y renombrado atómico en disco
 * para prevenir corrupción de datos en caídas del proceso o cortes repentinos.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const DB_TMP_PATH = path.join(DATA_DIR, 'db.tmp.json');

/**
 * Semilla inicial con campañas y vídeos representativos para arrancar el sistema
 */
function createInitialSeed() {
  return {
    campaigns: [
      {
        id: 'camp-tech',
        name: 'Podcast Tech Clips',
        color: '#a855f7',
        driveFolderId: '1AbC_Podcast_Tech_Drive_Folder',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
      },
      {
        id: 'camp-finanzas',
        name: 'Finanzas Personales',
        color: '#10b981',
        driveFolderId: '2BcD_Finanzas_Drive_Folder',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
      },
      {
        id: 'camp-fitness',
        name: 'Fitness & Motivación',
        color: '#f59e0b',
        driveFolderId: '3CdE_Fitness_Drive_Folder',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      {
        id: 'camp-ecommerce',
        name: 'E-commerce Tips',
        color: '#06b6d4',
        driveFolderId: '4DeF_Ecommerce_Drive_Folder',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
      }
    ],
    videos: [
      {
        id: 'vid-01',
        campaignId: 'camp-tech',
        driveFileId: '1f32a76SOLID_Principles',
        title: 'Clip #01: Principios SOLID explicados con ejemplos',
        thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
        duration: '00:58',
        isEdited: true,
        platforms: {
          youtube: true,
          tiktok: true,
          instagram: true,
          facebook: true
        },
        postUrls: {
          youtube: 'https://youtube.com/shorts/sample1',
          tiktok: 'https://tiktok.com/@clip/video/sample1',
          instagram: 'https://instagram.com/reel/sample1',
          facebook: 'https://facebook.com/watch/sample1'
        },
        notes: 'Corte dinámico con subtítulos amarillos en palabras clave.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: 'vid-02',
        campaignId: 'camp-tech',
        driveFileId: '2b44c88Hexagonal_Arch',
        title: 'Clip #14: Arquitectura hexagonal en 60 segundos',
        thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
        duration: '01:02',
        isEdited: true,
        platforms: {
          youtube: false,
          tiktok: false,
          instagram: false,
          facebook: false
        },
        postUrls: {},
        notes: 'Pendiente de programar en TikTok y YouTube Shorts.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 3600000).toISOString()
      },
      {
        id: 'vid-03',
        campaignId: 'camp-finanzas',
        driveFileId: '3c55d99Compound_Interest',
        title: 'Clip #22: Interés compuesto: Cómo duplicar tu capital',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop&q=80',
        duration: '00:45',
        isEdited: true,
        platforms: {
          youtube: true,
          tiktok: true,
          instagram: true,
          facebook: false
        },
        postUrls: {
          youtube: 'https://youtube.com/shorts/sample22',
          tiktok: 'https://tiktok.com/@clip/video/sample22',
          instagram: 'https://instagram.com/reel/sample22'
        },
        notes: 'Falta publicar en Facebook Reels.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 3600000).toISOString()
      },
      {
        id: 'vid-04',
        campaignId: 'camp-fitness',
        driveFileId: '4d66e00Morning_Routine',
        title: 'Clip #33: Rutina matutina de 15 minutos para energía',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
        duration: '01:15',
        isEdited: false,
        platforms: {
          youtube: false,
          tiktok: false,
          instagram: false,
          facebook: false
        },
        postUrls: {},
        notes: 'Falta recortar la introducción y añadir música de fondo.',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: 'vid-05',
        campaignId: 'camp-ecommerce',
        driveFileId: '5e77f11Shopify_Funnels',
        title: 'Clip #45: Estrategia de embudos para comercio electrónico',
        thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600&auto=format&fit=crop&q=80',
        duration: '00:42',
        isEdited: true,
        platforms: {
          youtube: true,
          tiktok: true,
          instagram: false,
          facebook: true
        },
        postUrls: {
          youtube: 'https://youtube.com/shorts/sample45',
          tiktok: 'https://tiktok.com/@clip/video/sample45',
          facebook: 'https://facebook.com/watch/sample45'
        },
        notes: 'Muy buen rendimiento en TikTok.',
        createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 3600000).toISOString()
      },
      {
        id: 'vid-06',
        campaignId: 'camp-tech',
        driveFileId: '6f88a22Microservices_Premature',
        title: 'Clip #18: Por qué deberías evitar los microservicios prematuros',
        thumbnailUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80',
        duration: '01:05',
        isEdited: false,
        platforms: {
          youtube: false,
          tiktok: false,
          instagram: false,
          facebook: false
        },
        postUrls: {},
        notes: 'Vídeo importado directamente de Drive sin cortar.',
        createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 3600000).toISOString()
      }
    ],
    activities: [
      {
        id: 'act-01',
        type: 'upload_status',
        text: 'Marcado como subido en TikTok e Instagram en "Clip #38: Estrategia de indexados"',
        timestamp: new Date(Date.now() - 25 * 60000).toISOString()
      },
      {
        id: 'act-02',
        type: 'edit_status',
        text: 'Estado de edición actualizado a Editado: Sí en "Clip #14: Arquitectura hexagonal en 60s"',
        timestamp: new Date(Date.now() - 110 * 60000).toISOString()
      },
      {
        id: 'act-03',
        type: 'drive_sync',
        text: 'Sincronización automática de Google Drive: detectados 3 vídeos nuevos en la carpeta Fitness & Motivación',
        timestamp: new Date(Date.now() - 240 * 60000).toISOString()
      },
      {
        id: 'act-04',
        type: 'post_url',
        text: 'Añadido enlace de post de YouTube Shorts en "Clip #05: Microservicios vs Monolito"',
        timestamp: new Date(Date.now() - 900 * 60000).toISOString()
      }
    ],
    config: {
      googleDriveApiKey: '',
      googleAppsScriptUrl: ''
    }
  };
}

/**
 * Clase controladora de la persistencia de datos atómica
 */
class JsonDatabase {
  constructor() {
    this.ensureDatabaseFile();
  }

  /**
   * Garantiza que la carpeta data/ y el archivo db.json existan
   */
  ensureDatabaseFile() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
      const initialData = createInitialSeed();
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }

  /**
   * Lee sincrónicamente los datos actuales del disco
   * @returns {Object} Contenido del archivo db.json
   */
  read() {
    try {
      this.ensureDatabaseFile();
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch {
      const seed = createInitialSeed();
      this.write(seed);
      return seed;
    }
  }

  /**
   * Escritura atómica: primero a db.tmp.json y luego renombrado atómico a db.json
   * @param {Object} data - Datos a persistir
   */
  write(data) {
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_TMP_PATH, serialized, 'utf-8');
    fs.renameSync(DB_TMP_PATH, DB_PATH);
  }

  // ============================================================================
  // Operaciones de Campañas
  // ============================================================================
  getCampaigns() {
    const data = this.read();
    return (data.campaigns || []).map((c) => ({
      ...c,
      isCompleted: Boolean(c.isCompleted) || false,
      completedAt: c.completedAt || null
    }));
  }

  getCampaignById(id) {
    const campaigns = this.getCampaigns();
    return campaigns.find((c) => c.id === id) || null;
  }

  createCampaign({ name, color, driveFolderId, isCompleted = false }) {
    const data = this.read();
    const newCampaign = {
      id: `camp-${Date.now()}`,
      name: name.trim(),
      color: color || '#6366f1',
      driveFolderId: driveFolderId.trim(),
      isCompleted: Boolean(isCompleted),
      completedAt: isCompleted ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    };
    data.campaigns.push(newCampaign);
    this.write(data);
    return newCampaign;
  }

  updateCampaign(id, updates) {
    const data = this.read();
    const index = data.campaigns.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const current = data.campaigns[index];
    const updated = {
      ...current,
      ...updates,
      id // Garantiza que no se sobreescriba el id
    };

    if ('isCompleted' in updates) {
      updated.isCompleted = Boolean(updates.isCompleted);
      if (updated.isCompleted && !current.isCompleted) {
        updated.completedAt = updates.completedAt || new Date().toISOString();
      } else if (!updated.isCompleted) {
        updated.completedAt = null;
      }
    }

    data.campaigns[index] = updated;
    this.write(data);
    return updated;
  }

  deleteCampaign(id) {
    const data = this.read();
    data.campaigns = data.campaigns.filter((c) => c.id !== id);
    // Elimina también los vídeos asociados en cascada
    data.videos = data.videos.filter((v) => v.campaignId !== id);
    this.write(data);
    return true;
  }

  // ============================================================================
  // Operaciones de Vídeos
  // ============================================================================
  getVideos({ campaignId, status, search, sort = 'newest' } = {}) {
    const data = this.read();
    let result = [...data.videos];

    if (campaignId && campaignId !== 'all') {
      result = result.filter((v) => v.campaignId === campaignId);
    }

    if (status && status !== 'all') {
      if (status === 'edited') {
        result = result.filter((v) => v.isEdited);
      } else if (status === 'pending') {
        result = result.filter((v) => !v.isEdited);
      } else if (status === 'uploaded' || status === 'all_platforms') {
        result = result.filter((v) => {
          const platforms = v.platforms || {};
          return Boolean(platforms.youtube && platforms.tiktok && platforms.instagram && platforms.facebook);
        });
      } else if (status === 'ready_to_publish') {
        // Editados pero no subidos en ninguna plataforma
        result = result.filter((v) => {
          if (!v.isEdited) return false;
          const platforms = v.platforms || {};
          return !platforms.youtube && !platforms.tiktok && !platforms.instagram && !platforms.facebook;
        });
      } else if (status === 'youtube') {
        result = result.filter((v) => Boolean(v.platforms?.youtube));
      } else if (status === 'tiktok') {
        result = result.filter((v) => Boolean(v.platforms?.tiktok));
      } else if (status === 'instagram') {
        result = result.filter((v) => Boolean(v.platforms?.instagram));
      } else if (status === 'facebook') {
        result = result.filter((v) => Boolean(v.platforms?.facebook));
      }
    }

    if (search && search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((v) => v.title.toLowerCase().includes(query));
    }

    // Ordenación
    const parseDurationSec = (dur) => {
      if (!dur || typeof dur !== 'string') return 0;
      const parts = dur.split(':').map((p) => parseInt(p, 10) || 0);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 0;
    };

    if (sort === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt));
    } else if (sort === 'duration_desc') {
      result.sort((a, b) => parseDurationSec(b.duration) - parseDurationSec(a.duration));
    } else if (sort === 'duration_asc') {
      result.sort((a, b) => parseDurationSec(a.duration) - parseDurationSec(b.duration));
    } else if (sort === 'title_asc') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
    } else {
      // Por defecto: 'newest'
      result.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    }

    return result;
  }

  getVideoById(id) {
    const data = this.read();
    return data.videos.find((v) => v.id === id) || null;
  }

  createVideo(videoData) {
    const data = this.read();
    const newVideo = {
      id: `vid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      campaignId: videoData.campaignId,
      driveFileId: videoData.driveFileId,
      title: videoData.title,
      thumbnailUrl: videoData.thumbnailUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
      duration: videoData.duration || '00:00',
      isEdited: Boolean(videoData.isEdited),
      platforms: videoData.platforms || {
        youtube: false,
        tiktok: false,
        instagram: false,
        facebook: false
      },
      postUrls: videoData.postUrls || {},
      notes: videoData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.videos.push(newVideo);
    this.write(data);
    return newVideo;
  }

  updateVideo(id, updates) {
    const data = this.read();
    const index = data.videos.findIndex((v) => v.id === id);
    if (index === -1) return null;

    const current = data.videos[index];
    data.videos[index] = {
      ...current,
      ...updates,
      id,
      platforms: updates.platforms ? { ...current.platforms, ...updates.platforms } : current.platforms,
      postUrls: updates.postUrls ? { ...current.postUrls, ...updates.postUrls } : current.postUrls,
      updatedAt: new Date().toISOString()
    };
    this.write(data);
    return data.videos[index];
  }

  deleteVideo(id) {
    const data = this.read();
    data.videos = data.videos.filter((v) => v.id !== id);
    this.write(data);
    return true;
  }

  // ============================================================================
  // Operaciones de Actividad Reciente
  // ============================================================================
  addActivity(text, type = 'general') {
    const data = this.read();
    const entry = {
      id: `act-${Date.now()}`,
      type,
      text,
      timestamp: new Date().toISOString()
    };
    data.activities.unshift(entry);
    // Limitar histórico a 50 actividades
    if (data.activities.length > 50) {
      data.activities = data.activities.slice(0, 50);
    }
    this.write(data);
    return entry;
  }

  getActivities(limit = 10) {
    const data = this.read();
    return (data.activities || []).slice(0, limit);
  }

  // ============================================================================
  // Estadísticas Agregadas
  // ============================================================================
  getStats() {
    const data = this.read();
    const videos = data.videos || [];
    const campaigns = data.campaigns || [];

    const totalVideos = videos.length;
    const editedVideos = videos.filter((v) => v.isEdited).length;
    const pendingEditVideos = totalVideos - editedVideos;

    let youtubeCount = 0;
    let tiktokCount = 0;
    let instagramCount = 0;
    let facebookCount = 0;

    videos.forEach((v) => {
      const p = v.platforms || {};
      if (p.youtube) youtubeCount++;
      if (p.tiktok) tiktokCount++;
      if (p.instagram) instagramCount++;
      if (p.facebook) facebookCount++;
    });

    const totalUploads = youtubeCount + tiktokCount + instagramCount + facebookCount;

    // Progreso por campaña
    const campaignProgress = campaigns.map((c) => {
      const campVideos = videos.filter((v) => v.campaignId === c.id);
      const totalInCamp = campVideos.length;
      const uploadedInCamp = campVideos.filter((v) => {
        const p = v.platforms || {};
        return Boolean(p.youtube || p.tiktok || p.instagram || p.facebook);
      }).length;
      const percentage = totalInCamp > 0 ? Math.round((uploadedInCamp / totalInCamp) * 100) : 0;

      return {
        id: c.id,
        name: c.name,
        color: c.color,
        isCompleted: Boolean(c.isCompleted) || false,
        completedAt: c.completedAt || null,
        totalVideos: totalInCamp,
        uploadedVideos: uploadedInCamp,
        percentage
      };
    });

    // Vídeos pendientes de publicar (editados pero sin subir a ninguna red)
    const pendingPublishVideos = videos
      .filter((v) => {
        if (!v.isEdited) return false;
        const p = v.platforms || {};
        return !p.youtube && !p.tiktok && !p.instagram && !p.facebook;
      })
      .map((v) => {
        const camp = campaigns.find((c) => c.id === v.campaignId);
        return {
          id: v.id,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          duration: v.duration,
          campaignName: camp ? camp.name : 'Sin campaña',
          campaignColor: camp ? camp.color : '#6366f1'
        };
      });

    return {
      totals: {
        totalVideos,
        editedVideos,
        pendingEditVideos,
        totalUploads
      },
      platforms: {
        youtube: youtubeCount,
        tiktok: tiktokCount,
        instagram: instagramCount,
        facebook: facebookCount
      },
      campaignProgress,
      pendingPublishVideos,
      recentActivities: this.getActivities(6)
    };
  }

  // ============================================================================
  // Configuración del Servidor y Claves de API
  // ============================================================================
  getConfig() {
    const data = this.read();
    return {
      googleDriveApiKey: '',
      googleAppsScriptUrl: '',
      ...(data.config || {})
    };
  }

  updateConfig(updates) {
    const data = this.read();
    data.config = {
      ...(data.config || {}),
      ...updates
    };
    this.write(data);
    return data.config;
  }
}

export const db = new JsonDatabase();
