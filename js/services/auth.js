/**
 * Servicio de Autenticación en el Frontend.
 * Administra el almacenamiento seguro del token y estado de sesión del creador.
 */

'use strict';

import { apiRequest } from './api.js';

const TOKEN_KEY = 'clipflow_token';

export const authService = {
  /**
   * Comprueba si existe un token almacenado en memoria local o de sesión
   * @returns {boolean} True si hay token disponible
   */
  isAuthenticated() {
    return Boolean(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY));
  },

  /**
   * Obtiene el token activo
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },

  /**
   * Inicia sesión en el servidor con usuario y contraseña
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña en texto plano
   * @param {boolean} rememberMe - Mantener sesión iniciada
   * @returns {Promise<Object>} Datos del usuario y token
   */
  async login(username, password, rememberMe = false) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, rememberMe })
    });

    if (data.token) {
      if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, data.token);
        sessionStorage.removeItem(TOKEN_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, data.token);
        localStorage.removeItem(TOKEN_KEY);
      }
    }

    return data;
  },

  /**
   * Obtiene la sesión activa desde el servidor
   * @returns {Promise<Object>}
   */
  async getCurrentUser() {
    return apiRequest('/auth/me');
  },

  /**
   * Cierra la sesión activa en el servidor y limpia el almacenamiento
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar fallos de red al cerrar sesión
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('auth:required'));
    }
  }
};

