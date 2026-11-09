/**
 * Componente para renderizado de Estadísticas, KPIs, Progreso y Gráficos del Dashboard.
 */

'use strict';

import { createElement, formatRelativeTime } from '../utils/dom.js';

let platformChartInstance = null;

const PLATFORM_COLORS = {
  YOUTUBE: '#ff0033',
  TIKTOK: '#fe2c55',
  INSTAGRAM: '#e1306c',
  FACEBOOK: '#1877f2'
};

export class StatsComponent {
  /**
   * @param {Object} options
   * @param {Function} options.onOpenVideo - Callback para abrir el reproductor de un vídeo
   */
  constructor({ onOpenVideo } = {}) {
    this.onOpenVideo = onOpenVideo;

    // Elementos de KPIs principales
    this.totalVideosEl = document.getElementById('statTotalVideos');
    this.editedVideosEl = document.getElementById('statEditedVideos');
    this.pendingVideosEl = document.getElementById('statPendingVideos');
    this.uploadedVideosEl = document.getElementById('statUploadedVideos');

    // Métricas por plataforma
    this.countYoutubeEl = document.getElementById('statCountYoutube');
    this.countTiktokEl = document.getElementById('statCountTiktok');
    this.countInstagramEl = document.getElementById('statCountInstagram');
    this.countFacebookEl = document.getElementById('statCountFacebook');

    // Contenedores
    this.campaignProgressListEl = document.getElementById('campaignProgressList');
    this.pendingPublishListEl = document.getElementById('pendingPublishList');
    this.activityTimelineEl = document.getElementById('activityTimeline');
    this.platformCanvasEl = document.getElementById('platformChart');
  }

  /**
   * Actualiza todos los módulos visuales de estadísticas con los datos recibidos del servidor
   * @param {Object} statsData - Datos obtenidos de /api/stats
   */
  render(statsData) {
    if (!statsData) return;

    this.renderKPIs(statsData.totals);
    this.renderPlatforms(statsData.platforms);
    this.renderCampaignProgress(statsData.campaignProgress);
    this.renderPendingPublish(statsData.pendingPublishVideos);
    this.renderActivities(statsData.recentActivities);

    // Re-ejecutar iconos de Lucide si está cargada la librería
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }

  renderKPIs(totals = {}) {
    if (this.totalVideosEl) this.totalVideosEl.textContent = totals.totalVideos ?? 0;
    if (this.editedVideosEl) this.editedVideosEl.textContent = totals.editedVideos ?? 0;
    if (this.pendingVideosEl) this.pendingVideosEl.textContent = totals.pendingEditVideos ?? 0;
    if (this.uploadedVideosEl) this.uploadedVideosEl.textContent = totals.totalUploads ?? 0;
  }

  renderPlatforms(platforms = {}) {
    const counts = {
      youtube: platforms.youtube || 0,
      tiktok: platforms.tiktok || 0,
      instagram: platforms.instagram || 0,
      facebook: platforms.facebook || 0
    };

    if (this.countYoutubeEl) this.countYoutubeEl.textContent = counts.youtube;
    if (this.countTiktokEl) this.countTiktokEl.textContent = counts.tiktok;
    if (this.countInstagramEl) this.countInstagramEl.textContent = counts.instagram;
    if (this.countFacebookEl) this.countFacebookEl.textContent = counts.facebook;

    this.updateChart([counts.youtube, counts.tiktok, counts.instagram, counts.facebook]);
  }

  updateChart(countsArray) {
    if (!this.platformCanvasEl || typeof Chart === 'undefined') return;

    if (platformChartInstance) {
      platformChartInstance.data.datasets[0].data = countsArray;
      platformChartInstance.update();
      return;
    }

    const ctx = this.platformCanvasEl.getContext('2d');
    platformChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['YouTube', 'TikTok', 'Instagram', 'Facebook'],
        datasets: [
          {
            data: countsArray,
            backgroundColor: [
              PLATFORM_COLORS.YOUTUBE,
              PLATFORM_COLORS.TIKTOK,
              PLATFORM_COLORS.INSTAGRAM,
              PLATFORM_COLORS.FACEBOOK
            ],
            borderColor: '#0b0e14',
            borderWidth: 3,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#162032',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            callbacks: {
              label: (item) => ` ${item.label}: ${item.raw} subidas`
            }
          }
        }
      }
    });
  }

  renderCampaignProgress(campaigns = []) {
    if (!this.campaignProgressListEl) return;
    this.campaignProgressListEl.innerHTML = '';

    if (campaigns.length === 0) {
      this.campaignProgressListEl.appendChild(
        createElement('p', { className: 'card-panel__empty' }, 'No hay campañas configuradas.')
      );
      return;
    }

    campaigns.forEach((camp) => {
      const item = createElement('div', { className: 'campaign-item' }, [
        createElement('div', { className: 'campaign-item__top' }, [
          createElement('div', { className: 'campaign-item__info' }, [
            createElement('span', {
              className: 'campaign-item__color-dot',
              style: { backgroundColor: camp.color }
            }),
            createElement('span', { className: 'campaign-item__name' }, camp.name)
          ]),
          createElement(
            'span',
            { className: 'campaign-item__ratio font-mono' },
            `${camp.uploadedVideos} publicados (${camp.totalVideos > 0 ? `${camp.uploadedVideos}/${camp.totalVideos}` : '0 clips'}) · ${camp.percentage}%`
          )
        ]),
        createElement(
          'div',
          {
            className: 'progress-track',
            role: 'progressbar',
            'aria-valuenow': camp.percentage,
            'aria-valuemin': 0,
            'aria-valuemax': 100
          },
          [
            createElement('div', {
              className: 'progress-fill',
              style: {
                width: `${Math.min(camp.percentage, 100)}%`,
                background: `linear-gradient(90deg, ${camp.color}, #818cf8)`
              }
            })
          ]
        )
      ]);

      this.campaignProgressListEl.appendChild(item);
    });
  }

  renderPendingPublish(pendingVideos = []) {
    if (!this.pendingPublishListEl) return;
    this.pendingPublishListEl.innerHTML = '';

    if (pendingVideos.length === 0) {
      this.pendingPublishListEl.appendChild(
        createElement(
          'p',
          { style: 'font-size: 0.875rem; color: var(--color-text-muted); padding: var(--spacing-4) 0;' },
          'No hay clips editados pendientes de publicación. ¡Todo al día!'
        )
      );
      return;
    }

    pendingVideos.forEach((vid) => {
      const item = createElement(
        'div',
        {
          className: 'pending-publish-item',
          tabindex: '0',
          role: 'button',
          'aria-label': `Abrir ${vid.title}`,
          onClick: () => {
            if (typeof this.onOpenVideo === 'function') {
              this.onOpenVideo(vid.id);
            }
          }
        },
        [
          createElement('img', {
            src: vid.thumbnailUrl,
            alt: `Miniatura de ${vid.title}`,
            className: 'pending-publish-item__thumb'
          }),
          createElement('div', { className: 'pending-publish-item__details' }, [
            createElement('span', { className: 'pending-publish-item__title' }, vid.title),
            createElement('div', { className: 'pending-publish-item__meta' }, [
              createElement('span', { className: 'badge badge--success' }, 'Editado'),
              createElement('span', {}, '·'),
              createElement('span', {}, vid.campaignName),
              createElement('span', {}, '·'),
              createElement('span', { className: 'font-mono' }, vid.duration)
            ])
          ]),
          createElement(
            'button',
            {
              type: 'button',
              className: 'btn btn--secondary btn--sm',
              'aria-label': 'Publicar vídeo'
            },
            [createElement('i', { 'data-lucide': 'upload', 'aria-hidden': 'true' })]
          )
        ]
      );

      this.pendingPublishListEl.appendChild(item);
    });
  }

  renderActivities(activities = []) {
    if (!this.activityTimelineEl) return;
    this.activityTimelineEl.innerHTML = '';

    if (activities.length === 0) {
      this.activityTimelineEl.appendChild(
        createElement('p', { style: 'font-size: 0.875rem; color: var(--color-text-muted);' }, 'Sin actividad reciente.')
      );
      return;
    }

    activities.forEach((act) => {
      const dotModifier =
        act.type === 'upload_status'
          ? 'activity-entry__dot--success'
          : act.type === 'drive_sync'
          ? 'activity-entry__dot--warning'
          : '';

      const entry = createElement('div', { className: 'activity-entry' }, [
        createElement('span', {
          className: `activity-entry__dot ${dotModifier}`,
          'aria-hidden': 'true'
        }),
        createElement('p', { className: 'activity-entry__text' }, act.text),
        createElement('span', { className: 'activity-entry__time font-mono' }, formatRelativeTime(act.timestamp))
      ]);

      this.activityTimelineEl.appendChild(entry);
    });
  }
}
