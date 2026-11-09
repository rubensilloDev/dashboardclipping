/**
 * Cliente API centralizado para comunicarse con los endpoints del backend Express.
 * Inyecta automáticamente el token de sesión y gestiona redirecciones ante 401.
 */

'use strict';

const API_BASE_URL = '/api';

/**
 * Obtiene el token de sesión guardado (local o de sesión)
 * @returns {string|null} Token actual o null
 */
function getStoredToken() {
  return localStorage.getItem('clipflow_token') || sessionStorage.getItem('clipflow_token');
}

/**
 * Realiza una petición HTTP contra la API del backend
 * @param {string} endpoint - Ruta del endpoint (ej. '/videos')
 * @param {Object} options - Opciones de fetch
 * @returns {Promise<any>} Datos devueltos en formato JSON
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Sesión expirada o inválida: notificar a la aplicación para desplegar el modal de login
    window.dispatchEvent(new CustomEvent('auth:required'));
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Sesión no autorizada o expirada.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error en la petición: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

