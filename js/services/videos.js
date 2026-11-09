/**
 * Servicio para gestión de vídeos, sincronización y analítica del Dashboard.
 */

'use strict';

import { apiRequest } from './api.js';

export const videoService = {
  /**
   * Obtiene la lista de vídeos aplicando filtros
   * @param {Object} filters - { campaignId, status, search }
   * @returns {Promise<Array<Object>>}
   */
  async fetchVideos(filters = {}) {
    const params = new URLSearchParams();
    if (filters.campaignId && filters.campaignId !== 'all') {
      params.append('campaignId', filters.campaignId);
    }
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters.search && filters.search.trim()) {
      params.append('search', filters.search.trim());
    }
    if (filters.sort && filters.sort !== 'newest') {
      params.append('sort', filters.sort);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/videos?${queryString}` : '/videos';
    return apiRequest(endpoint);
  },

  /**
   * Actualiza el estado de edición, plataformas, enlaces y notas de un vídeo
   * @param {string} id - ID del vídeo
   * @param {Object} updates - Campos actualizados
   * @returns {Promise<Object>} Vídeo actualizado
   */
  async updateVideo(id, updates) {
    return apiRequest(`/videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  /**
   * Sincroniza las carpetas de Google Drive con la base de datos
   * @param {string} campaignId - ID de la campaña o 'all'
   * @returns {Promise<Object>} Resumen de sincronización
   */
  async syncVideos(campaignId = 'all') {
    return apiRequest('/videos/sync', {
      method: 'POST',
      body: JSON.stringify({ campaignId })
    });
  },

  /**
   * Obtiene las métricas y datos consolidados del dashboard
   * @returns {Promise<Object>} Estadísticas agregadas
   */
  async fetchStats() {
    return apiRequest('/stats');
  }
};

