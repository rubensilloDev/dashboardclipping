/**
 * Componente para renderizar tarjetas de vídeo dinámicas en el catálogo.
 * Soporta tanto el modo cuadrícula como el modo tabla compacta.
 */

'use strict';

import { createElement } from '../utils/dom.js';
import { getPlatformSvgHtml } from '../utils/platform-icons.js';

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
      // Media container (con viñeta inferior y chip monoespaciado)
      createElement('div', { className: 'video-card__media' }, [
        createElement('img', {
          src: video.thumbnailUrl,
          alt: `Miniatura de ${video.title}`,
          className: 'video-card__thumbnail',
          loading: 'lazy'
        }),
        createElement('span', { className: 'video-card__duration font-mono' }, video.duration || '00:00'),
        createElement('div', { className: 'video-card__play-badge', 'aria-hidden': 'true' }, [
          createElement('i', { 'data-lucide': 'play' })
        ])
      ]),

      // Cuerpo informativo
      createElement('div', { className: 'video-card__body' }, [
        createElement('div', { className: 'video-card__header-meta' }, [campaignBadge, editBadge]),
        createElement('h3', { className: 'video-card__title' }, video.title),
        platformsRow
      ])
    ]
  );

  return card;
}
