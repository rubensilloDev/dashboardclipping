/**
 * Componente para renderizar tarjetas de vídeo dinámicas en el catálogo.
 * Soporta tanto el modo cuadrícula como el modo tabla compacta.
 * Integra fallback cinematográfico de alta fidelidad para prevenir imágenes rotas.
 */

'use strict';

import { createElement } from '../utils/dom.js';
import { getPlatformSvgHtml } from '../utils/platform-icons.js';

/**
 * Aplica una postal cinematográfica de élite cuando la miniatura de Drive no carga o está protegida
 * @param {HTMLElement} mediaContainer - Contenedor .video-card__media
 * @param {Object} video - Datos del clip
 * @param {Object} [campaign] - Campaña asociada
 */
export function applyCinematicFallback(mediaContainer, video, campaign) {
  if (!mediaContainer) return;
  if (mediaContainer.querySelector('.video-card__cinematic-fallback')) return;

  const existingImg = mediaContainer.querySelector('img.video-card__thumbnail');
  if (existingImg) {
    existingImg.style.display = 'none';
  }

  const accentColor = campaign?.color || '#6366f1';

  const fallback = createElement(
    'div',
    {
      className: 'video-card__cinematic-fallback',
      style: {
        '--card-accent': accentColor,
        background: `radial-gradient(ellipse at 80% 20%, ${accentColor}2a 0%, rgba(13, 17, 26, 0.95) 75%, #08090d 100%)`
      }
    },
    [
      // Marca de agua cinematográfica con icono de claqueta / celuloide
      createElement('div', { className: 'video-card__film-watermark', 'aria-hidden': 'true' }, [
        createElement('svg', {
          viewBox: '0 0 24 24',
          width: '56',
          height: '56',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '1.4',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        }, [
          createElement('path', { d: 'M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4z' }),
          createElement('path', { d: 'm4 11 16-6' }),
          createElement('path', { d: 'm8 9.5 2-4' }),
          createElement('path', { d: 'm14 7.5 2-4' })
        ])
      ]),

      // Título sutil en la base
      createElement('div', { className: 'video-card__fallback-title-wrap' }, [
        createElement('span', { className: 'video-card__fallback-title' }, video.title)
      ])
    ]
  );

  mediaContainer.prepend(fallback);
}

/**
 * Genera el elemento DOM de la tarjeta de vídeo
 * @param {Object} video - Datos del clip
 * @param {Object} campaign - Datos de la campaña asociada
 * @param {Function} onClick - Callback al pulsar sobre el clip
 * @returns {HTMLElement} Elemento article.video-card
 */
export function createVideoCardElement(video, campaign, onClick) {
  const platforms = video.platforms || {};

  // Estado de edición
  const editBadge = video.isEdited
    ? createElement('span', { className: 'badge badge--success' }, 'Editado')
    : createElement('span', { className: 'badge badge--danger' }, 'Sin editar');

  // Campaña
  const campaignName = campaign ? campaign.name : 'Sin campaña';
  const campaignBadge = createElement(
    'span',
    {
      className: 'badge',
      style: {
        backgroundColor: campaign ? `${campaign.color}22` : 'rgba(99, 102, 241, 0.15)',
        color: campaign ? campaign.color : '#818cf8',
        border: `1px solid ${campaign ? campaign.color : '#818cf8'}44`
      }
    },
    campaignName
  );

  // Subcarpeta opcional
  const subfolderBadge = video.subfolder
    ? createElement(
      'span',
      {
        className: 'badge badge--subtle font-mono',
        style: 'max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.6875rem;',
        title: `Subcarpeta: ${video.subfolder}`
      },
      video.subfolder
    )
    : null;

  // Tags de Plataformas con Logos Oficiales en SVG
  const createPlatformTag = (platformName, isActive) => {
    const activeClass = isActive
      ? `platform-tag--active platform-tag--${platformName}`
      : 'platform-tag--inactive';

    const tag = document.createElement('span');
    tag.className = `platform-tag ${activeClass}`;
    tag.title = `${platformName.toUpperCase()} ${isActive ? '(Subido)' : '(Pendiente)'}`;
    tag.innerHTML = getPlatformSvgHtml(platformName, 16);
    return tag;
  };

  const platformsRow = createElement('div', { className: 'video-card__platforms' }, [
    createPlatformTag('youtube', Boolean(platforms.youtube)),
    createPlatformTag('tiktok', Boolean(platforms.tiktok)),
    createPlatformTag('instagram', Boolean(platforms.instagram)),
    createPlatformTag('facebook', Boolean(platforms.facebook))
  ]);

  // Contenedor Media con manejo blindado de imagen o fallback cinematográfico
  const mediaContainer = createElement('div', { className: 'video-card__media' });

  if (video.thumbnailUrl && video.thumbnailUrl.trim()) {
    const img = createElement('img', {
      src: video.thumbnailUrl,
      alt: `Miniatura de ${video.title}`,
      className: 'video-card__thumbnail',
      loading: 'lazy'
    });

    img.onerror = () => {
      applyCinematicFallback(mediaContainer, video, campaign);
    };

    mediaContainer.appendChild(img);
  } else {
    applyCinematicFallback(mediaContainer, video, campaign);
  }

  // Duración con tipografía JetBrains Mono y botón de play glassmórfico
  mediaContainer.appendChild(
    createElement('span', { className: 'video-card__duration font-mono' }, video.duration || '00:45')
  );
  mediaContainer.appendChild(
    createElement('div', { className: 'video-card__play-badge', 'aria-hidden': 'true' }, [
      createElement('i', { 'data-lucide': 'play' })
    ])
  );

  const metaBadges = [campaignBadge, editBadge];
  if (subfolderBadge) metaBadges.push(subfolderBadge);

  const card = createElement(
    'article',
    {
      className: 'video-card',
      'data-id': video.id,
      tabindex: '0',
      role: 'button',
      'aria-label': `Abrir ${video.title}`,
      onClick: () => {
        if (typeof onClick === 'function') {
          onClick(video);
        }
      }
    },
    [
      mediaContainer,
      createElement('div', { className: 'video-card__body' }, [
        createElement('div', { className: 'video-card__header-meta' }, metaBadges),
        createElement('h3', { className: 'video-card__title' }, video.title),
        platformsRow
      ])
    ]
  );

  return card;
}
