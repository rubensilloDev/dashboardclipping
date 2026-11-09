/**
 * Generador de Logos Oficiales de Plataformas en SVG de Alta Definición.
 * Proporciona los gráficos vectoriales exactos de YouTube, TikTok, Instagram y Facebook.
 */

'use strict';

/**
 * Devuelve el SVG oficial de la plataforma solicitada
 * @param {'youtube'|'tiktok'|'instagram'|'facebook'} platform - Nombre de la red
 * @param {number} size - Tamaño en píxeles (ancho y alto)
 * @returns {string} Código SVG seguro
 */
export function getPlatformSvgHtml(platform, size = 18) {
  const norm = String(platform).toLowerCase();

  if (norm === 'youtube') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="brand-svg brand-svg--youtube" aria-hidden="true">
      <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
      <polygon fill="#FFFFFF" points="9.545,15.568 15.818,12 9.545,8.432"/>
    </svg>`;
  }

  if (norm === 'tiktok') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="brand-svg brand-svg--tiktok" aria-hidden="true">
      <path fill="#00F2FE" transform="translate(-1, -1)" opacity="0.9" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-6.62 6.32 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.06a8.27 8.27 0 0 0 4.19 1.13V6.74c-.34 0-.67-.02-1-.05z"/>
      <path fill="#FE2C55" transform="translate(1, 1)" opacity="0.9" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-6.62 6.32 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.06a8.27 8.27 0 0 0 4.19 1.13V6.74c-.34 0-.67-.02-1-.05z"/>
      <path fill="#FFFFFF" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-6.62 6.32 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.06a8.27 8.27 0 0 0 4.19 1.13V6.74c-.34 0-.67-.02-1-.05z"/>
    </svg>`;
  }

  if (norm === 'instagram') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="brand-svg brand-svg--instagram" aria-hidden="true">
      <defs>
        <linearGradient id="igGradientBrand" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f09433"/>
          <stop offset="25%" stop-color="#e6683c"/>
          <stop offset="50%" stop-color="#dc2743"/>
          <stop offset="75%" stop-color="#cc2366"/>
          <stop offset="100%" stop-color="#bc1888"/>
        </linearGradient>
      </defs>
      <rect width="20" height="20" x="2" y="2" rx="5" fill="none" stroke="url(#igGradientBrand)" stroke-width="2"/>
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="url(#igGradientBrand)" stroke-width="2"/>
      <circle cx="17.2" cy="6.8" r="1.2" fill="#bc1888"/>
    </svg>`;
  }

  if (norm === 'facebook') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="brand-svg brand-svg--facebook" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      <path fill="#FFFFFF" d="M16.67 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.514V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.47h3.047v8.385a12.09 12.09 0 0 0 3.75 0v-8.385h2.795z"/>
    </svg>`;
  }

  return '';
}

/**
 * Crea un nodo HTMLElement con el SVG de la plataforma
 * @param {'youtube'|'tiktok'|'instagram'|'facebook'} platform - Red social
 * @param {number} size - Tamaño
 * @returns {HTMLElement}
 */
export function createPlatformSvgElement(platform, size = 18) {
  const container = document.createElement('span');
  container.className = `platform-icon-wrapper platform-icon-wrapper--${platform}`;
  container.innerHTML = getPlatformSvgHtml(platform, size);
  return container;
}

