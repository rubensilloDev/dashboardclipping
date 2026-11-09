/**
 * @fileoverview Script interactivo para el prototipo visual del Dashboard de Clipping.
 * Inicializa el gráfico de plataformas mediante Chart.js, renderiza iconos SVG de Lucide
 * y gestiona las microinteracciones del prototipo (apertura de modal, filtros y sincronización).
 */

'use strict';

/**
 * Constantes de configuración de la paleta y métricas para el gráfico
 */
const PLATFORM_COLORS = {
  YOUTUBE: '#ff0000',
  TIKTOK: '#fe2c55',
  INSTAGRAM: '#e1306c',
  FACEBOOK: '#1877f2'
};

const CHART_DATA = {
  labels: ['YouTube', 'TikTok', 'Instagram', 'Facebook'],
  counts: [42, 68, 55, 29]
};

/**
 * Inicializa el gráfico de barras/donas de distribución por plataforma usando Chart.js
 * @returns {Object|null} Instancia de Chart.js creada o null si no se encuentra el canvas
 */
function initPlatformChart() {
  const canvasElement = document.getElementById('platformChart');
  if (!canvasElement || typeof Chart === 'undefined') {
    return null;
  }

  const context = canvasElement.getContext('2d');

  return new Chart(context, {
    type: 'doughnut',
    data: {
      labels: CHART_DATA.labels,
      datasets: [
        {
          data: CHART_DATA.counts,
          backgroundColor: [
            PLATFORM_COLORS.YOUTUBE,
            PLATFORM_COLORS.TIKTOK,
            PLATFORM_COLORS.INSTAGRAM,
            PLATFORM_COLORS.FACEBOOK
          ],
          borderColor: '#0f172a',
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
        legend: {
          display: false /* Usamos leyenda personalizada HTML con BEM para accesibilidad y diseño */
        },
        tooltip: {
          backgroundColor: '#162032',
          titleColor: '#f8fafc',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function (tooltipItem) {
              return ` ${tooltipItem.label}: ${tooltipItem.raw} subidas`;
            }
          }
        }
      }
    }
  });
}

/**
 * Configura los eventos del modal interactivo del reproductor de vídeo
 * @returns {void}
 */
function setupVideoModalEvents() {
  const modalBackdrop = document.getElementById('videoPlayerModal');
  const closeButton = document.getElementById('closeModalButton');
  const cancelFooterButton = document.getElementById('modalCancelButton');
  const saveFooterButton = document.getElementById('modalSaveButton');
  const videoCards = document.querySelectorAll('[data-action="open-video-modal"]');

  if (!modalBackdrop) {
    return;
  }

  /**
   * Abre el modal y actualiza el título del vídeo de demostración
   * @param {string} videoTitle - Título del clip seleccionado
   */
  const openModal = (videoTitle) => {
    const modalTitleEl = document.getElementById('modalVideoTitle');
    if (modalTitleEl && videoTitle) {
      modalTitleEl.textContent = videoTitle;
    }
    modalBackdrop.classList.add('modal-backdrop--open');
    document.body.style.overflow = 'hidden';
  };

  /**
   * Cierra el modal y restablece el scroll de la página
   */
  const closeModal = () => {
    modalBackdrop.classList.remove('modal-backdrop--open');
    document.body.style.overflow = '';
  };

  // Delegación o listeners para abrir el modal al pulsar cualquier tarjeta de vídeo
  videoCards.forEach((card) => {
    card.addEventListener('click', () => {
      const titleAttr = card.getAttribute('data-video-title') || 'Vista Previa del Clip';
      openModal(titleAttr);
    });
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }

  if (cancelFooterButton) {
    cancelFooterButton.addEventListener('click', closeModal);
  }

  if (saveFooterButton) {
    saveFooterButton.addEventListener('click', () => {
      // Simulación de guardado satisfactorio en prototipo
      closeModal();
    });
  }

  // Cerrar al pulsar el fondo translúcido fuera del diálogo
  modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  });

  // Cerrar con tecla Escape para accesibilidad
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalBackdrop.classList.contains('modal-backdrop--open')) {
      closeModal();
    }
  });
}

/**
 * Configura el comportamiento interactivo de las pestañas de filtro de vídeos
 * @returns {void}
 */
function setupFilterTabs() {
  const filterTabs = document.querySelectorAll('.video-filter-tab');
  const videoCards = document.querySelectorAll('.video-card');

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('video-filter-tab--active'));
      tab.classList.add('video-filter-tab--active');

      const filterType = tab.getAttribute('data-filter') || 'all';

      // Simulación visual de filtrado rápido
      videoCards.forEach((card) => {
        const cardStatus = card.getAttribute('data-status');
        if (filterType === 'all' || cardStatus === filterType) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/**
 * Configura la animación y feedback del botón "Actualizar / Sincronizar"
 * @returns {void}
 */
function setupSyncButton() {
  const syncButton = document.getElementById('syncDriveButton');
  if (!syncButton) {
    return;
  }

  syncButton.addEventListener('click', () => {
    const icon = syncButton.querySelector('i[data-lucide]');
    syncButton.disabled = true;
    syncButton.style.opacity = '0.7';

    if (icon) {
      icon.style.animation = 'spin 1s linear infinite';
    }

    setTimeout(() => {
      syncButton.disabled = false;
      syncButton.style.opacity = '1';
      if (icon) {
        icon.style.animation = '';
      }
    }, 1200);
  });
}

/**
 * Configura la alternancia interactiva entre modo grilla visual y modo tabla compacta
 * @returns {void}
 */
function setupViewModeSwitcher() {
  const container = document.getElementById('videoCatalogContainer');
  const viewButtons = document.querySelectorAll('.view-mode-btn');

  if (!container || viewButtons.length === 0) {
    return;
  }

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetMode = btn.getAttribute('data-view') || 'grid';

      viewButtons.forEach((b) => b.classList.remove('view-mode-btn--active'));
      btn.classList.add('view-mode-btn--active');

      if (targetMode === 'table') {
        container.classList.remove('video-catalog--grid');
        container.classList.add('video-catalog--table');
      } else {
        container.classList.remove('video-catalog--table');
        container.classList.add('video-catalog--grid');
      }
    });
  });
}

/**
 * Inicialización principal al cargar el árbol DOM
 */
document.addEventListener('DOMContentLoaded', () => {
  // Inicialización de la librería de iconos Lucide SVG por CDN
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  // Inicializar componentes
  initPlatformChart();
  setupVideoModalEvents();
  setupFilterTabs();
  setupSyncButton();
  setupViewModeSwitcher();
});
