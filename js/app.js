/**
 * Coordinador Principal de la Aplicación ClipFlow Studio.
 * Conecta los servicios API, la navegación SPA fluida entre Dashboard y Catálogo,
 * el índice de carpetas de campañas (Nivel 1 y Nivel 2), la barra de filtros tipo tabs/pills
 * y la sincronización jerárquica total con Google Drive.
 */

'use strict';

import { authService } from './services/auth.js';
import { campaignService } from './services/campaigns.js';
import { videoService } from './services/videos.js';
import { AuthModal } from './components/auth-modal.js';
import { CampaignModal } from './components/campaign-modal.js';
import { CampaignManagerModal } from './components/campaign-manager-modal.js';
import { DriveSettingsModal } from './components/drive-settings-modal.js';
import { VideoPlayerModal } from './components/video-player.js';
import { StatsComponent } from './components/stats.js';
import { createVideoCardElement } from './components/video-card.js';
import { createElement, showToast } from './utils/dom.js';

class AppController {
  constructor() {
    this.currentFilters = {
      campaignId: 'all',
      status: 'all',
      search: '',
      sort: 'newest'
    };

    this.campaigns = [];
    this.videos = [];
    this.allVideos = [];
    this.statsData = null;
    this.totalClipsCount = 0;
    this.viewMode = 'grid'; // 'grid' | 'table'
    this.currentView = 'dashboard'; // 'dashboard' | 'videos'

    // Contenedores de Vistas SPA
    this.dashboardView = document.getElementById('dashboardView');
    this.catalogView = document.getElementById('catalogView');

    // Enlaces de navegación
    this.sidebarDashboardLink = document.getElementById('sidebarDashboardLink');
    this.sidebarCatalogLink = document.getElementById('sidebarCatalogLink');
    this.bottomNavDashboardLink = document.getElementById('bottomNavDashboardLink');
    this.bottomNavCatalogLink = document.getElementById('bottomNavCatalogLink');
    this.bottomNavPendingLink = document.getElementById('bottomNavPendingLink');
    this.dashboardToCatalogBtn = document.getElementById('dashboardToCatalogBtn');

    // Nivel 1: Índice de Carpetas/Campañas en el Catálogo
    this.campaignIndexSection = document.getElementById('campaignIndexSection');
    this.campaignFoldersGrid = document.getElementById('campaignFoldersGrid');
    this.campaignsTotalCount = document.getElementById('campaignsTotalCount');

    // Nivel 2: Barra de Campaña Activa
    this.campaignDetailBanner = document.getElementById('campaignDetailBanner');
    this.backToCampaignsBtn = document.getElementById('backToCampaignsBtn');
    this.activeCampDot = document.getElementById('activeCampDot');
    this.activeCampName = document.getElementById('activeCampName');
    this.activeCampCount = document.getElementById('activeCampCount');
    this.activeCampProgress = document.getElementById('activeCampProgress');
    this.editCurrentCampBtn = document.getElementById('editCurrentCampBtn');
    this.syncCurrentCampBtn = document.getElementById('syncCurrentCampBtn');

    // Barra de Herramientas del Catálogo
    this.catalogGrid = document.getElementById('catalogGrid');
    this.videoCatalogContainer = document.getElementById('videoCatalogContainer');
    this.catalogSearchInput = document.getElementById('catalogSearchInput');
    this.catalogCampaignFilter = document.getElementById('catalogCampaignFilter');
    this.catalogSortFilter = document.getElementById('catalogSortFilter');
    this.catalogCountText = document.getElementById('catalogCountText');
    this.statusFilterPills = document.querySelectorAll('.status-pill');

    // Elementos globales del Header y Sidebar
    this.headerSearchInput = document.querySelector('.header-search__input');
    this.headerCampaignSelect = document.querySelector('.header-campaign-select');
    this.syncButton = document.getElementById('syncDriveButton');
    this.sidebarCampaignsGroup = document.getElementById('sidebarCampaignsGroup');
    this.viewModeButtons = document.querySelectorAll('.view-mode-btn');
    this.logoutBtn = document.getElementById('logoutButton');
    this.addCampaignBtn = document.getElementById('addCampaignBtn');
    this.manageCampaignsBtn = document.getElementById('manageCampaignsBtn');
    this.driveSettingsBtn = document.getElementById('driveSettingsBtn');

    // Componentes modales y widgets
    this.authModal = new AuthModal({
      onSuccess: () => this.handleAuthSuccess()
    });

    this.campaignModal = new CampaignModal({
      onSuccess: () => this.reloadAllData()
    });

    this.campaignManagerModal = new CampaignManagerModal({
      onEditCampaign: (camp) => this.campaignModal.open(camp),
      onNewCampaign: () => this.campaignModal.open(),
      onChanged: () => this.reloadAllData()
    });

    this.driveSettingsModal = new DriveSettingsModal({
      onSaved: () => this.reloadAllData()
    });

    this.videoPlayerModal = new VideoPlayerModal({
      onUpdated: () => this.reloadAllData()
    });

    this.statsComponent = new StatsComponent({
      onOpenVideo: (videoId) => this.openVideoById(videoId)
    });

    this.bindEvents();
  }

  async init() {
    if (!authService.isAuthenticated()) {
      this.authModal.open();
      return;
    }

    try {
      await authService.getCurrentUser();
      await this.reloadAllData();
      this.handleNavigation();
    } catch {
      this.authModal.open();
    }
  }

  bindEvents() {
    window.addEventListener('auth:required', () => {
      this.authModal.open();
    });

    // Navegación SPA por Hash URL
    window.addEventListener('hashchange', () => {
      this.handleNavigation();
    });

    // Buscador del Header (sincronizado con el Catálogo)
    if (this.headerSearchInput) {
      let debounceTimeout = null;
      this.headerSearchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.setSearchFilter(e.target.value.trim());
        }, 220);
      });
    }

    // Buscador en la barra de herramientas del Catálogo
    if (this.catalogSearchInput) {
      let debounceTimeout = null;
      this.catalogSearchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.setSearchFilter(e.target.value.trim());
        }, 220);
      });
    }

    // Selector de Campaña del Header
    if (this.headerCampaignSelect) {
      this.headerCampaignSelect.addEventListener('change', (e) => {
        this.selectCampaign(e.target.value);
      });
    }

    // Selector de Campaña del Catálogo
    if (this.catalogCampaignFilter) {
      this.catalogCampaignFilter.addEventListener('change', (e) => {
        this.selectCampaign(e.target.value);
      });
    }

    // Barra de Filtros tipo Tabs/Pills por Estado
    this.statusFilterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.statusFilterPills.forEach((p) => {
          p.classList.remove('status-pill--active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('status-pill--active');
        pill.setAttribute('aria-selected', 'true');

        const status = pill.getAttribute('data-status') || 'all';
        this.currentFilters.status = status;
        this.loadVideos();
      });
    });

    // Botón para volver al índice de Campañas (Nivel 2 -> Nivel 1)
    if (this.backToCampaignsBtn) {
      this.backToCampaignsBtn.addEventListener('click', () => {
        this.selectCampaign('all');
      });
    }

    // Botón para editar la campaña activa desde el banner
    if (this.editCurrentCampBtn) {
      this.editCurrentCampBtn.addEventListener('click', () => {
        const camp = this.campaigns.find((c) => c.id === this.currentFilters.campaignId);
        if (camp) {
          this.campaignModal.open(camp);
        }
      });
    }

    // Botón para sincronizar solo la carpeta activa desde el banner
    if (this.syncCurrentCampBtn) {
      this.syncCurrentCampBtn.addEventListener('click', () => {
        this.handleSyncCampaign(this.currentFilters.campaignId);
      });
    }

    // Selector de Ordenación en el Catálogo
    if (this.catalogSortFilter) {
      this.catalogSortFilter.addEventListener('change', (e) => {
        this.currentFilters.sort = e.target.value;
        this.loadVideos();
      });
    }

    // Alternar modo de vista (Grilla vs Tabla Compacta)
    this.viewModeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-view') || 'grid';
        this.setViewMode(mode);
      });
    });

    // Botón de sincronización global con Drive
    if (this.syncButton) {
      this.syncButton.addEventListener('click', () => this.handleSync());
    }

    // Botón para crear nueva campaña
    if (this.addCampaignBtn) {
      this.addCampaignBtn.addEventListener('click', () => this.campaignModal.open());
    }

    // Botón para gestionar campañas
    if (this.manageCampaignsBtn) {
      this.manageCampaignsBtn.addEventListener('click', () => {
        this.campaignManagerModal.open(this.campaigns);
      });
    }

    // Configuración de Drive
    if (this.driveSettingsBtn) {
      this.driveSettingsBtn.addEventListener('click', () => {
        this.driveSettingsModal.open();
      });
    }

    // Enlace en móvil para gestionar campañas
    const mobileManageCampaignsLink = document.getElementById('mobileManageCampaignsLink');
    if (mobileManageCampaignsLink) {
      mobileManageCampaignsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.campaignManagerModal.open(this.campaigns);
      });
    }

    // Cierre de sesión
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', async () => {
        await authService.logout();
        showToast('Has cerrado sesión.');
      });
    }
  }

  /**
   * Enrutador SPA ligero basado en hash
   */
  handleNavigation() {
    const hash = window.location.hash || '#dashboard';

    if (hash === '#videos' || hash === '#catalogo') {
      this.navigateTo('videos');
    } else if (hash === '#pendientes') {
      this.currentFilters.status = 'ready_to_publish';
      this.setActivePill('ready_to_publish');
      this.navigateTo('videos', { isPending: true });
      this.loadVideos();
    } else if (hash.startsWith('#campaign-')) {
      const campId = hash.replace('#campaign-', '');
      this.selectCampaign(campId);
      this.navigateTo('videos');
    } else {
      this.navigateTo('dashboard');
    }
  }

  /**
   * Cambia la vista activa de la aplicación
   * @param {'dashboard' | 'videos'} viewName
   * @param {Object} [options={}]
   */
  navigateTo(viewName, options = {}) {
    this.currentView = viewName;

    if (this.dashboardView && this.catalogView) {
      this.dashboardView.classList.toggle('app-view--active', viewName === 'dashboard');
      this.catalogView.classList.toggle('app-view--active', viewName === 'videos');
    }

    // Actualizar estilos activos de navegación en barra lateral
    if (this.sidebarDashboardLink && this.sidebarCatalogLink) {
      this.sidebarDashboardLink.classList.toggle('sidebar-nav__link--active', viewName === 'dashboard');
      this.sidebarCatalogLink.classList.toggle('sidebar-nav__link--active', viewName === 'videos');
    }

    // Actualizar barra de navegación móvil
    if (this.bottomNavDashboardLink && this.bottomNavCatalogLink && this.bottomNavPendingLink) {
      this.bottomNavDashboardLink.classList.toggle('bottom-nav-link--active', viewName === 'dashboard' && !options.isPending);
      this.bottomNavCatalogLink.classList.toggle('bottom-nav-link--active', viewName === 'videos' && !options.isPending);
      this.bottomNavPendingLink.classList.toggle('bottom-nav-link--active', Boolean(options.isPending));
    }

    // Scroll al inicio de la página para buena UX
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }

  /**
   * Selecciona una campaña y conmuta entre Nivel 1 (Índice de Carpetas) y Nivel 2 (Dentro de la Campaña)
   * @param {string} campaignId
   */
  selectCampaign(campaignId) {
    this.currentFilters.campaignId = campaignId;

    if (this.headerCampaignSelect && this.headerCampaignSelect.value !== campaignId) {
      this.headerCampaignSelect.value = campaignId;
    }
    if (this.catalogCampaignFilter && this.catalogCampaignFilter.value !== campaignId) {
      this.catalogCampaignFilter.value = campaignId;
    }

    this.updateCampaignLevelUI();
    this.loadVideos();
  }

  /**
   * Actualiza la interfaz visual según el nivel de navegación (Nivel 1 vs Nivel 2)
   */
  updateCampaignLevelUI() {
    const isAll = this.currentFilters.campaignId === 'all';

    if (isAll) {
      // Nivel 1: Mostrar índice de carpetas y ocultar banner de campaña
      if (this.campaignIndexSection) this.campaignIndexSection.style.display = 'block';
      if (this.campaignDetailBanner) this.campaignDetailBanner.style.display = 'none';
    } else {
      // Nivel 2: Ocultar índice de carpetas y mostrar banner de campaña activa
      if (this.campaignIndexSection) this.campaignIndexSection.style.display = 'none';
      if (this.campaignDetailBanner) {
        this.campaignDetailBanner.style.display = 'flex';
        const camp = this.campaigns.find((c) => c.id === this.currentFilters.campaignId);
        if (camp) {
          if (this.activeCampDot) {
            this.activeCampDot.style.backgroundColor = camp.color;
            this.activeCampDot.style.boxShadow = `0 0 10px ${camp.color}88`;
          }
          if (this.activeCampName) this.activeCampName.textContent = camp.name;

          const campProgress = this.statsData?.campaignProgress?.find((cp) => cp.id === camp.id);
          const totalInCamp = campProgress?.totalVideos ?? 0;
          const percentage = campProgress?.percentage ?? 0;

          if (this.activeCampCount) this.activeCampCount.textContent = `${totalInCamp} clips`;
          if (this.activeCampProgress) this.activeCampProgress.textContent = `${percentage}% publicado`;
        }
      }
    }
  }

  /**
   * Renderiza el índice de carpetas/campañas (Nivel 1)
   */
  renderCampaignFolders() {
    if (!this.campaignFoldersGrid) return;
    this.campaignFoldersGrid.innerHTML = '';

    if (this.campaignsTotalCount) {
      const count = this.campaigns.length;
      this.campaignsTotalCount.textContent = `${count} ${count === 1 ? 'campaña' : 'campañas'}`;
    }

    if (this.campaigns.length === 0) {
      this.campaignFoldersGrid.appendChild(
        createElement('p', { className: 'card-panel__empty' }, 'No hay carpetas de campaña disponibles.')
      );
      return;
    }

    this.campaigns.forEach((camp) => {
      const progressInfo = this.statsData?.campaignProgress?.find((cp) => cp.id === camp.id) || {
        totalVideos: 0,
        uploadedVideos: 0,
        percentage: 0
      };

      const folderCard = createElement(
        'article',
        {
          className: 'campaign-folder-card',
          style: { '--card-accent': camp.color },
          tabindex: '0',
          role: 'button',
          'aria-label': `Abrir carpeta ${camp.name}`,
          onClick: () => {
            this.selectCampaign(camp.id);
          }
        },
        [
          // Cabecera con icono estilizado y ratio
          createElement('div', { className: 'campaign-folder-card__header' }, [
            createElement(
              'div',
              {
                className: 'campaign-folder-card__icon-box',
                style: { backgroundColor: `${camp.color}18`, borderColor: `${camp.color}40`, color: camp.color }
              },
              [createElement('i', { 'data-lucide': 'folder-kanban', 'aria-hidden': 'true' })]
            ),
            createElement(
              'span',
              {
                className: 'badge font-mono',
                style: { backgroundColor: `${camp.color}20`, color: camp.color, border: `1px solid ${camp.color}40` }
              },
              `${progressInfo.percentage}% completado`
            )
          ]),

          // Nombre de campaña y Drive
          createElement('div', { className: 'campaign-folder-card__body' }, [
            createElement('h4', { className: 'campaign-folder-card__title' }, camp.name),
            createElement(
              'span',
              { className: 'campaign-folder-card__meta font-mono' },
              `${progressInfo.totalVideos} ${progressInfo.totalVideos === 1 ? 'clip de vídeo' : 'clips de vídeo'}`
            )
          ]),

          // Barra de progreso de subidas
          createElement('div', { className: 'campaign-folder-card__progress-wrap' }, [
            createElement('div', { className: 'campaign-folder-card__progress-row' }, [
              createElement('span', {}, 'Publicados'),
              createElement('span', { className: 'font-mono' }, `${progressInfo.uploadedVideos}/${progressInfo.totalVideos}`)
            ]),
            createElement(
              'div',
              {
                className: 'progress-track',
                role: 'progressbar',
                'aria-valuenow': progressInfo.percentage,
                'aria-valuemin': 0,
                'aria-valuemax': 100
              },
              [
                createElement('div', {
                  className: 'progress-fill',
                  style: {
                    width: `${Math.min(progressInfo.percentage, 100)}%`,
                    background: `linear-gradient(90deg, ${camp.color}, #818cf8)`
                  }
                })
              ]
            )
          ]),

          // Pie con enlace directo
          createElement('div', { className: 'campaign-folder-card__footer' }, [
            createElement('span', {}, 'Explorar clips'),
            createElement('i', { 'data-lucide': 'arrow-right', 'aria-hidden': 'true', style: 'width: 15px; height: 15px;' })
          ])
        ]
      );

      this.campaignFoldersGrid.appendChild(folderCard);
    });

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons({ root: this.campaignFoldersGrid });
    }
  }

  /**
   * Sincroniza el pill activo en la barra de filtros por estado
   * @param {string} status
   */
  setActivePill(status) {
    this.statusFilterPills.forEach((p) => {
      const match = (p.getAttribute('data-status') || 'all') === status;
      p.classList.toggle('status-pill--active', match);
      p.setAttribute('aria-selected', match ? 'true' : 'false');
    });
  }

  /**
   * Aplica y sincroniza el término de búsqueda
   * @param {string} term
   */
  setSearchFilter(term) {
    this.currentFilters.search = term;

    if (this.headerSearchInput && this.headerSearchInput.value !== term) {
      this.headerSearchInput.value = term;
    }
    if (this.catalogSearchInput && this.catalogSearchInput.value !== term) {
      this.catalogSearchInput.value = term;
    }

    this.loadVideos();
  }

  /**
   * Restablece todos los filtros del catálogo a sus valores por defecto
   */
  resetFilters() {
    this.currentFilters = {
      campaignId: 'all',
      status: 'all',
      search: '',
      sort: 'newest'
    };

    if (this.headerSearchInput) this.headerSearchInput.value = '';
    if (this.catalogSearchInput) this.catalogSearchInput.value = '';
    if (this.headerCampaignSelect) this.headerCampaignSelect.value = 'all';
    if (this.catalogCampaignFilter) this.catalogCampaignFilter.value = 'all';
    if (this.catalogSortFilter) this.catalogSortFilter.value = 'newest';

    this.setActivePill('all');
    this.updateCampaignLevelUI();
    this.loadVideos();
    showToast('Filtros restablecidos.');
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.viewModeButtons.forEach((b) => {
      b.classList.toggle('view-mode-btn--active', b.getAttribute('data-view') === mode);
    });

    if (this.videoCatalogContainer) {
      if (mode === 'table') {
        this.videoCatalogContainer.classList.remove('video-catalog--grid');
        this.videoCatalogContainer.classList.add('video-catalog--table');
      } else {
        this.videoCatalogContainer.classList.remove('video-catalog--table');
        this.videoCatalogContainer.classList.add('video-catalog--grid');
      }
    }
  }

  async handleAuthSuccess() {
    showToast('Sesión iniciada con éxito.');
    await this.reloadAllData();
    this.handleNavigation();
  }

  /**
   * Recarga todos los datos reactivos del sistema (Dashboard y Catálogo)
   */
  async reloadAllData() {
    await Promise.all([
      this.loadCampaigns(),
      this.loadStats(),
      this.loadAllVideosForPills(),
      this.loadVideos()
    ]);
  }

  async loadCampaigns() {
    try {
      this.campaigns = await campaignService.fetchCampaigns();
      this.renderSidebarCampaigns();
      this.renderCampaignSelectOptions();
      this.renderCampaignFolders();
    } catch {
      // Manejo silencioso
    }
  }

  renderSidebarCampaigns() {
    if (!this.sidebarCampaignsGroup) return;
    this.sidebarCampaignsGroup.innerHTML = '';

    this.campaigns.forEach((camp) => {
      const link = createElement(
        'a',
        {
          href: `#campaign-${camp.id}`,
          className: 'sidebar-nav__link',
          onClick: (e) => {
            e.preventDefault();
            this.selectCampaign(camp.id);
            this.navigateTo('videos');
          }
        },
        [
          createElement('span', {
            className: 'campaign-item__color-dot',
            style: { backgroundColor: camp.color, boxShadow: `0 0 8px ${camp.color}66` },
            'aria-hidden': 'true'
          }),
          createElement('span', {}, camp.name)
        ]
      );

      this.sidebarCampaignsGroup.appendChild(link);
    });
  }

  renderCampaignSelectOptions() {
    const fillSelect = (selectEl) => {
      if (!selectEl) return;
      const currentVal = selectEl.value || this.currentFilters.campaignId || 'all';

      selectEl.innerHTML = '<option value="all">Todas las Campañas</option>';

      this.campaigns.forEach((camp) => {
        const opt = document.createElement('option');
        opt.value = camp.id;
        opt.textContent = camp.name;
        selectEl.appendChild(opt);
      });

      selectEl.value = currentVal;
    };

    fillSelect(this.headerCampaignSelect);
    fillSelect(this.catalogCampaignFilter);
  }

  async loadStats() {
    try {
      this.statsData = await videoService.fetchStats();
      this.totalClipsCount = this.statsData.totals?.totalVideos || 0;
      this.statsComponent.render(this.statsData);
      this.updateCounterBadge();
      this.renderCampaignFolders();
      this.updateCampaignLevelUI();
    } catch {
      // Manejo silencioso
    }
  }

  /**
   * Carga el total de vídeos contextuales para actualizar los contadores numéricos de las pills
   */
  async loadAllVideosForPills() {
    try {
      const filters = this.currentFilters.campaignId !== 'all' ? { campaignId: this.currentFilters.campaignId } : {};
      this.allVideos = await videoService.fetchVideos(filters);
      this.updatePillCounts();
    } catch {
      // Manejo silencioso
    }
  }

  /**
   * Actualiza los contadores numéricos dinámicos de cada pill en la barra de filtros
   */
  updatePillCounts() {
    const vids = this.allVideos || [];

    const total = vids.length;
    let pending = 0;
    let edited = 0;
    let ready = 0;
    let yt = 0;
    let tt = 0;
    let ig = 0;
    let fb = 0;
    let allPlatforms = 0;

    vids.forEach((v) => {
      if (v.isEdited) edited++;
      else pending++;

      const p = v.platforms || {};
      if (p.youtube) yt++;
      if (p.tiktok) tt++;
      if (p.instagram) ig++;
      if (p.facebook) fb++;

      if (v.isEdited && !p.youtube && !p.tiktok && !p.instagram && !p.facebook) {
        ready++;
      }
      if (p.youtube && p.tiktok && p.instagram && p.facebook) {
        allPlatforms++;
      }
    });

    const setPill = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };

    setPill('pillCountAll', total);
    setPill('pillCountPending', pending);
    setPill('pillCountEdited', edited);
    setPill('pillCountReady', ready);
    setPill('pillCountYoutube', yt);
    setPill('pillCountTiktok', tt);
    setPill('pillCountInstagram', ig);
    setPill('pillCountFacebook', fb);
    setPill('pillCountAllPlatforms', allPlatforms);
  }

  updateCounterBadge() {
    if (!this.catalogCountText) return;

    const visibleCount = this.videos.length;
    const totalCount = this.allVideos?.length || this.totalClipsCount || visibleCount;

    if (visibleCount === totalCount && !this.currentFilters.search && this.currentFilters.status === 'all' && this.currentFilters.campaignId === 'all') {
      this.catalogCountText.textContent = `${totalCount} clips disponibles`;
    } else {
      this.catalogCountText.textContent = `Mostrando ${visibleCount} de ${totalCount} clips`;
    }
  }

  async loadVideos() {
    const targetContainer = this.catalogGrid || document.querySelector('.video-cards-grid');
    if (!targetContainer) return;

    try {
      this.videos = await videoService.fetchVideos(this.currentFilters);
      targetContainer.innerHTML = '';

      this.updateCounterBadge();
      this.updatePillCounts();

      if (this.videos.length === 0) {
        // Estado vacío estilizado
        const emptyState = createElement('div', { className: 'empty-catalog-state' }, [
          createElement('div', { className: 'empty-catalog-state__icon' }, [
            createElement('i', { 'data-lucide': 'search-x', 'aria-hidden': 'true' })
          ]),
          createElement('h3', { className: 'empty-catalog-state__title' }, 'Ningún clip coincide con los filtros'),
          createElement(
            'p',
            { className: 'empty-catalog-state__desc' },
            'No se encontraron vídeos que cumplan con los criterios aplicados. Prueba a cambiar el estado, la campaña o limpiar la búsqueda.'
          ),
          createElement(
            'button',
            {
              type: 'button',
              className: 'btn btn--outline',
              style: 'margin-top: var(--spacing-2);',
              onClick: () => this.resetFilters()
            },
            [
              createElement('i', { 'data-lucide': 'rotate-ccw', 'aria-hidden': 'true' }),
              createElement('span', {}, 'Restablecer Filtros')
            ]
          )
        ]);

        targetContainer.appendChild(emptyState);

        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
          lucide.createIcons({ root: emptyState });
        }
        return;
      }

      this.videos.forEach((video) => {
        const campaign = this.campaigns.find((c) => c.id === video.campaignId);
        const cardEl = createVideoCardElement(video, campaign, (vid) => {
          this.videoPlayerModal.open(vid);
        });
        targetContainer.appendChild(cardEl);
      });

      if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons({ root: targetContainer });
      }
    } catch {
      // Manejo de errores
    }
  }

  openVideoById(videoId) {
    const video = (this.videos || []).find((v) => v.id === videoId) || (this.allVideos || []).find((v) => v.id === videoId);
    if (video) {
      this.videoPlayerModal.open(video);
    } else {
      videoService.fetchVideos().then((allVids) => {
        const found = allVids.find((v) => v.id === videoId);
        if (found) {
          this.videoPlayerModal.open(found);
        }
      });
    }
  }

  /**
   * Sincronización Total con Google Drive en Vivo
   */
  async handleSync() {
    if (!this.syncButton) return;

    const icon = this.syncButton.querySelector('i[data-lucide]');
    const originalText = this.syncButton.querySelector('span');
    const prevSpanText = originalText ? originalText.textContent : 'Sincronizar';

    this.syncButton.disabled = true;
    this.syncButton.style.opacity = '0.75';
    if (originalText) originalText.textContent = 'Sincronizando...';

    if (icon) {
      icon.style.animation = 'spin 0.9s linear infinite';
    }

    try {
      const result = await videoService.syncVideos(this.currentFilters.campaignId);
      await this.reloadAllData();

      const newCount = result.totalNewVideos ?? result.newVideosCount ?? 0;
      const newCamps = result.totalNewCampaigns ?? 0;

      let msg = newCount > 0
        ? `Sincronización con Drive completada: ${newCount} ${newCount === 1 ? 'clip nuevo' : 'clips nuevos'}.`
        : (result.message || 'Sincronización completada. No hay vídeos nuevos.');

      if (newCamps > 0) {
        msg += ` Se detectaron ${newCamps} ${newCamps === 1 ? 'nueva campaña' : 'nuevas campañas'}.`;
      }

      showToast(msg);
    } catch (error) {
      showToast(
        error.message || 'Error al conectar con Google Drive. Revisa tu URL de Apps Script o tu conexión.',
        'error'
      );
    } finally {
      this.syncButton.disabled = false;
      this.syncButton.style.opacity = '1';
      if (originalText) originalText.textContent = prevSpanText;
      if (icon) {
        icon.style.animation = '';
      }
    }
  }

  /**
   * Sincroniza una campaña individual desde su banner Nivel 2
   * @param {string} campaignId
   */
  async handleSyncCampaign(campaignId) {
    if (!this.syncCurrentCampBtn) return;

    const icon = this.syncCurrentCampBtn.querySelector('i[data-lucide]');
    this.syncCurrentCampBtn.disabled = true;
    if (icon) icon.style.animation = 'spin 0.9s linear infinite';

    try {
      const result = await videoService.syncVideos(campaignId);
      await this.reloadAllData();

      const newCount = result.totalNewVideos ?? result.newVideosCount ?? 0;
      showToast(
        newCount > 0
          ? `Carpeta sincronizada: ${newCount} nuevos vídeos detectados.`
          : 'Carpeta sincronizada. No hay nuevos clips.'
      );
    } catch (error) {
      showToast(error.message || 'Error al sincronizar la carpeta de Drive.', 'error');
    } finally {
      this.syncCurrentCampBtn.disabled = false;
      if (icon) icon.style.animation = '';
    }
  }
}

// Inicialización de la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  const app = new AppController();
  app.init();
});
