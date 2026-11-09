/**
 * Utilidades para manipulación segura del DOM y formateo de datos.
 * Evita inyección XSS mediante createElement y saneamiento de cadenas.
 */

'use strict';

/**
 * Sanea una cadena de texto para evitar inyecciones XSS
 * @param {string} text - Texto a sanear
 * @returns {string} Texto seguro
 */
export function escapeHTML(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Crea un elemento del DOM de forma declarativa y segura
 * @param {string} tag - Nombre de la etiqueta HTML
 * @param {Object} attributes - Atributos y propiedades
 * @param {Array<HTMLElement|string>} children - Hijos del elemento
 * @returns {HTMLElement} Elemento DOM construido
 */
export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;

    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key.startsWith('data-') || key.startsWith('aria-') || key === 'role') {
      element.setAttribute(key, value);
    } else if (key in element) {
      element[key] = value;
    } else {
      element.setAttribute(key, value);
    }
  }

  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    if (child === null || child === undefined) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Formatea una fecha ISO a tiempo relativo legible en español
 * @param {string} isoString - Fecha en formato ISO
 * @returns {string} Texto relativo (ej. "Hace 5 min", "Hoy a las 11:30", "Ayer")
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return 'Reciente';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'Hace unos segundos';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Hoy a las ${hours}:${minutes}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Ayer a las ${hours}:${minutes}`;
  }

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

/**
 * Muestra una notificación Toast flotante accesible y temporal
 * @param {string} message - Texto del mensaje
 * @param {'success'|'error'|'info'} type - Tipo de alerta
 * @param {number} duration - Duración en milisegundos
 */
export function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}
