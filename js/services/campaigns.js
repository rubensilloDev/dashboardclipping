/**
 * Servicio para gestión de campañas y vinculación con carpetas de Google Drive.
 */

'use strict';

import { apiRequest } from './api.js';

export const campaignService = {
  /**
   * Obtiene la lista completa de campañas registradas
   * @returns {Promise<Array<Object>>}
   */
  async fetchCampaigns() {
    return apiRequest('/campaigns');
  },

  /**
   * Crea una nueva campaña a partir de un enlace o ID de carpeta de Drive
   * @param {Object} campaignData - Datos de la campaña { name, color, folderInput }
   * @returns {Promise<Object>}
   */
  async createCampaign(campaignData) {
    return apiRequest('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData)
    });
  },

  /**
   * Actualiza el nombre o color de una campaña
   * @param {string} id - ID de la campaña
   * @param {Object} updates - Campos a modificar
   * @returns {Promise<Object>}
   */
  async updateCampaign(id, updates) {
    return apiRequest(`/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  /**
   * Elimina una campaña y sus clips asociados
   * @param {string} id - ID de la campaña
   * @returns {Promise<Object>}
   */
  async deleteCampaign(id) {
    return apiRequest(`/campaigns/${id}`, {
      method: 'DELETE'
    });
  }
};

