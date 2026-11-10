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

    // Nivel 1: Índice de Carpetas/Campañas en el Catálogo y Pestañas
    this.campaignTab = 'active';
    this.campaignIndexSection = document.getElementById('campaignIndexSection');
    this.campaignFoldersGrid = document.getElementById('campaignFoldersGrid');
    this.campaignsTotalCount = document.getElementById('campaignsTotalCount');
    this.tabActiveCampaigns = document.getElementById('tabActiveCampaigns');
    this.tabCompletedCampaigns = document.getElementById('tabCompletedCampaigns');
    this.activeCampaignsCountBadge = document.getElementById('activeCampaignsCountBadge');
    this.completedCampaignsCountBadge = document.getElementById('completedCampaignsCountBadge');

    // Nivel 2: Barra de Campaña Activa
    this.campaignDetailBanner = document.getElementById('campaignDetailBanner');
    this.backToCampaignsBtn = document.getElementById('backToCampaignsBtn');
    this.activeCampDot = document.getElementById('activeCampDot');
    this.activeCampName = document.getElementById('activeCampName');
    this.activeCampStatusBadge = document.getElementById('activeCampStatusBadge');
    this.activeCampCount = document.getElementById('activeCampCount');
    this.activeCampProgress = document.getElementById('activeCampProgress');
    this.editCurrentCampBtn = document.getElementById('editCurrentCampBtn');
    this.syncCurrentCampBtn = document.getElementById('syncCurrentCampBtn');
    this.toggleCompleteCurrentCampBtn = document.getElementById('toggleCompleteCurrentCampBtn');
    this.toggleCompleteIcon = document.getElementById('toggleCompleteIcon');
    this.toggleCompleteText = document.getElementById('toggleCompleteText');

    // Breadcrumbs y Explorador de Subcarpetas de Campaña (Nivel 2)
    this.currentSubfolder = null;
    this.catalogBreadcrumbs = document.getElementById('catalogBreadcrumbs');
    this.campaignSubfoldersSection = document.getElementById('campaignSubfoldersSection');
    this.campaignSubfoldersGrid = document.getElementById('campaignSubfoldersGrid');
    this.subfoldersTotalCount = document.getElementById('subfoldersTotalCount');

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

    // Pestañas de Campañas (Activas vs Finalizadas)
    if (this.tabActiveCampaigns) {
      this.tabActiveCampaigns.addEventListener('click', () => {
        this.setCampaignTab('active');
      });
    }

    if (this.tabCompletedCampaigns) {
      this.tabCompletedCampaigns.addEventListener('click', () => {
        this.setCampaignTab('completed');
      });
    }

    // Botón para finalizar o reactivar la campaña activa desde el banner
    if (this.toggleCompleteCurrentCampBtn) {
      this.toggleCompleteCurrentCampBtn.addEventListener('click', async () => {
        const camp = this.campaigns.find((c) => c.id === this.currentFilters.campaignId);
        if (!camp) return;
        const newStatus = !camp.isCompleted;
        try {
          await campaignService.updateCampaign(camp.id, { isCompleted: newStatus });
          camp.isCompleted = newStatus;
          camp.completedAt = newStatus ? new Date().toISOString() : null;
          showToast(
            newStatus
              ? `Campaña "${camp.name}" marcada como finalizada.`
              : `Campaña "${camp.name}" reactivada con éxito.`,
            'success'
          );
          await this.reloadAllData();
        } catch (err) {
          showToast(err.message || 'Error al cambiar estado de la campaña.', 'error');
        }
      });
    }

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

    const mobileDriveSettingsBtn = document.getElementById('mobileDriveSettingsBtn');
    if (mobileDriveSettingsBtn) {
      mobileDriveSettingsBtn.addEventListener('click', () => {
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
    this.currentSubfolder = null;

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
   * Selecciona una subcarpeta dentro de la campaña activa
   * @param {string|null} subfolderName
   */
  selectSubfolder(subfolderName) {
    this.currentSubfolder = subfolderName;
    this.updateCampaignLevelUI();
    this.loadVideos();
  }

  setCampaignTab(tab) {
    this.campaignTab = tab;
    if (this.tabActiveCampaigns) {
      const isActive = tab === 'active';
      this.tabActiveCampaigns.classList.toggle('campaign-tab-btn--active', isActive);
      this.tabActiveCampaigns.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    if (this.tabCompletedCampaigns) {
      const isCompleted = tab === 'completed';
      this.tabCompletedCampaigns.classList.toggle('campaign-tab-btn--active', isCompleted);
      this.tabCompletedCampaigns.setAttribute('aria-selected', isCompleted ? 'true' : 'false');
    }
    this.renderCampaignFolders();
  }

  /**
   * Actualiza la interfaz visual según el nivel de navegación (Nivel 1 vs Nivel 2)
   */
  updateCampaignLevelUI() {
    const isAll = this.currentFilters.campaignId === 'all';

    if (isAll) {
      // Nivel 1: Mostrar índice de carpetas y ocultar banner, breadcrumbs y subcarpetas
      if (this.campaignIndexSection) this.campaignIndexSection.style.display = 'block';
      if (this.campaignDetailBanner) this.campaignDetailBanner.style.display = 'none';
      if (this.catalogBreadcrumbs) this.catalogBreadcrumbs.style.display = 'none';
      if (this.campaignSubfoldersSection) this.campaignSubfoldersSection.style.display = 'none';
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

          // Estado Finalizada vs Activa
          const isCompleted = Boolean(camp.isCompleted);
          if (this.activeCampStatusBadge) {
            this.activeCampStatusBadge.style.display = isCompleted ? 'inline-flex' : 'none';
          }
          if (this.toggleCompleteText) {
            this.toggleCompleteText.textContent = isCompleted ? 'Reactivar Campaña' : 'Finalizar Campaña';
          }
          if (this.toggleCompleteIcon) {
            this.toggleCompleteIcon.setAttribute('data-lucide', isCompleted ? 'rotate-ccw' : 'check-circle');
          }
          if (this.toggleCompleteCurrentCampBtn) {
            this.toggleCompleteCurrentCampBtn.title = isCompleted ? 'Reactivar esta campaña' : 'Marcar campaña como finalizada';
          }

          if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons({ root: this.campaignDetailBanner });
          }
        }
      }

      this.renderBreadcrumbs();
      this.renderSubfolders();
    }
  }

  /**
   * Renderiza la barra de breadcrumbs para volver a campañas o a la raíz de la campaña
   */
  renderBreadcrumbs() {
    if (!this.catalogBreadcrumbs) return;

    if (this.currentFilters.campaignId === 'all') {
      this.catalogBreadcrumbs.style.display = 'none';
      this.catalogBreadcrumbs.innerHTML = '';
      return;
    }

    const camp = this.campaigns.find((c) => c.id === this.currentFilters.campaignId);
    if (!camp) {
      this.catalogBreadcrumbs.style.display = 'none';
      return;
    }

    this.catalogBreadcrumbs.style.display = 'flex';
    this.catalogBreadcrumbs.innerHTML = '';

    const allBtn = createElement(
      'button',
      {
        type: 'button',
        className: 'breadcrumb-btn',
        title: 'Volver a todas las campañas',
        onClick: () => {
          this.selectCampaign('all');
        }
      },
      [
        createElement('i', { 'data-lucide': 'folders', style: 'width: 14px; height: 14px;' }),
        createElement('span', {}, 'Campañas')
      ]
    );

    const sep1 = createElement('span', { className: 'breadcrumb-separator' }, '/');

    const campBtn = createElement(
      'button',
      {
        type: 'button',
        className: `breadcrumb-btn ${!this.currentSubfolder ? 'breadcrumb-btn--active' : ''}`,
        title: `Ver raíz de "${camp.name}"`,
        onClick: () => {
          this.selectSubfolder(null);
        }
      },
      [
        createElement('span', {
          className: 'campaign-item__color-dot',
          style: { backgroundColor: camp.color, width: '10px', height: '10px' }
        }),
        createElement('span', {}, camp.name)
      ]
    );

    this.catalogBreadcrumbs.appendChild(allBtn);
    this.catalogBreadcrumbs.appendChild(sep1);
    this.catalogBreadcrumbs.appendChild(campBtn);

    if (this.currentSubfolder) {
      const sep2 = createElement('span', { className: 'breadcrumb-separator' }, '/');
      const subfolderBadge = createElement(
        'span',
        { className: 'breadcrumb-current font-mono' },
        [
          createElement('i', { 'data-lucide': 'folder', style: 'width: 14px; height: 14px; color: var(--color-brand-primary-light);' }),
          createElement('span', {}, this.currentSubfolder)
        ]
      );
      this.catalogBreadcrumbs.appendChild(sep2);
      this.catalogBreadcrumbs.appendChild(subfolderBadge);
    }

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons({ root: this.catalogBreadcrumbs });
    }
  }

  /**
   * Renderiza el explorador interno de subcarpetas si la campaña activa las contiene
   */
  renderSubfolders() {
    if (!this.campaignSubfoldersSection || !this.campaignSubfoldersGrid) return;

    if (this.currentFilters.campaignId === 'all') {
      this.campaignSubfoldersSection.style.display = 'none';
      return;
    }

    const camp = this.campaigns.find((c) => c.id === this.currentFilters.campaignId);
    const campVids = (this.allVideos || []).filter((v) => v.campaignId === this.currentFilters.campaignId);
    const subfolderNames = [...new Set(campVids.map((v) => v.subfolder).filter(Boolean))];

    if (subfolderNames.length === 0 || this.currentSubfolder) {
      this.campaignSubfoldersSection.style.display = 'none';
      return;
    }

    this.campaignSubfoldersSection.style.display = 'block';
    this.campaignSubfoldersGrid.innerHTML = '';

    if (this.subfoldersTotalCount) {
      const count = subfolderNames.length;
      this.subfoldersTotalCount.textContent = `${count} ${count === 1 ? 'subcarpeta' : 'subcarpetas'}`;
    }

    subfolderNames.forEach((sfName) => {
      const sfVids = campVids.filter((v) => v.subfolder === sfName);
      const sfTotal = sfVids.length;
      const sfUploaded = sfVids.filter((v) => {
        const p = v.platforms || {};
        return Boolean(p.youtube || p.tiktok || p.instagram || p.facebook);
      }).length;

      const card = createElement(
        'div',
        {
          className: 'subfolder-card',
          style: { '--card-accent': camp ? camp.color : '#6366f1' },
          role: 'button',
          tabindex: '0',
          'aria-label': `Abrir subcarpeta ${sfName}`,
          onClick: () => {
            this.selectSubfolder(sfName);
          }
        },
        [
          createElement('div', { className: 'subfolder-card__left' }, [
            createElement(
              'div',
              {
                className: 'subfolder-card__icon-box',
                style: {
                  backgroundColor: `${camp?.color || '#6366f1'}18`,
                  borderColor: `${camp?.color || '#6366f1'}40`,
                  color: camp?.color || '#818cf8'
                }
              },
              [createElement('i', { 'data-lucide': 'folder', 'aria-hidden': 'true' })]
            ),
            createElement('div', { className: 'subfolder-card__info' }, [
              createElement('h4', { className: 'subfolder-card__name' }, sfName),
              createElement(
                'span',
                { className: 'subfolder-card__count font-mono' },
                `${sfTotal} clips · ${sfUploaded}/${sfTotal} subidos`
              )
            ])
          ]),
          createElement('i', {
            'data-lucide': 'chevron-right',
            className: 'subfolder-card__arrow',
            'aria-hidden': 'true',
            style: 'width: 18px; height: 18px;'
          })
        ]
      );

      this.campaignSubfoldersGrid.appendChild(card);
    });

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons({ root: this.campaignSubfoldersGrid });
    }
  }

  /**
   * Renderiza el índice de carpetas/campañas (Nivel 1)
   */
  renderCampaignFolders() {
    if (!this.campaignFoldersGrid) return;
    this.campaignFoldersGrid.innerHTML = '';

    const activeCampaigns = this.campaigns.filter((c) => !c.isCompleted);
    const completedCampaigns = this.campaigns.filter((c) => c.isCompleted);

    if (this.activeCampaignsCountBadge) {
      this.activeCampaignsCountBadge.textContent = activeCampaigns.length;
    }
    if (this.completedCampaignsCountBadge) {
      this.completedCampaignsCountBadge.textContent = completedCampaigns.length;
    }

    if (this.campaignsTotalCount) {
      const count = this.campaigns.length;
      this.campaignsTotalCount.textContent = `${count} ${count === 1 ? 'campaña' : 'campañas'}`;
    }

    const currentList = this.campaignTab === 'completed' ? completedCampaigns : activeCampaigns;

    if (currentList.length === 0) {
      const isCompletedTab = this.campaignTab === 'completed';
      const emptyCard = createElement(
        'div',
        {
          className: 'empty-catalog-state',
          style: 'padding: var(--spacing-8) var(--spacing-4); margin: var(--spacing-2) 0; grid-column: 1 / -1;'
        },
        [
          createElement(
            'div',
            { className: 'empty-catalog-state__icon' },
            [createElement('i', { 'data-lucide': isCompletedTab ? 'check-circle-2' : 'folder-plus', 'aria-hidden': 'true' })]
          ),
          createElement(
            'h4',
            { className: 'empty-catalog-state__title' },
            isCompletedTab ? 'No hay campañas finalizadas' : 'No hay campañas activas'
          ),
          createElement(
            'p',
            { className: 'empty-catalog-state__desc' },
            isCompletedTab
              ? 'Cuando concluyas el ciclo de una campaña, márcala como finalizada para archivarla aquí.'
              : 'Todas tus campañas están finalizadas o aún no has creado ninguna.'
          )
        ]
      );
      this.campaignFoldersGrid.appendChild(emptyCard);

      if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons({ root: this.campaignFoldersGrid });
      }
      return;
    }

    currentList.forEach((camp) => {
      const isCompleted = Boolean(camp.isCompleted);
      const progressInfo = this.statsData?.campaignProgress?.find((cp) => cp.id === camp.id) || {
        totalVideos: 0,
        uploadedVideos: 0,
        percentage: 0
      };

      const folderCard = createElement(
        'article',
        {
          className: `campaign-folder-card ${isCompleted ? 'campaign-folder-card--completed' : ''}`,
          style: { '--card-accent': camp.color },
          tabindex: '0',
          role: 'button',
          'aria-label': `Abrir carpeta ${camp.name}`,
          onClick: () => {
            this.selectCampaign(camp.id);
          }
        },
        [
          // Cabecera con icono estilizado y ratio o badge de finalizada
          createElement('div', { className: 'campaign-folder-card__header' }, [
            createElement(
              'div',
              {
                className: 'campaign-folder-card__icon-box',
                style: { backgroundColor: `${camp.color}18`, borderColor: `${camp.color}40`, color: camp.color }
              },
              [createElement('i', { 'data-lucide': isCompleted ? 'archive' : 'folder-kanban', 'aria-hidden': 'true' })]
            ),
            isCompleted
              ? createElement(
                'span',
                { className: 'badge badge--warning font-mono', style: 'gap: 4px;' },
                [
                  createElement('i', { 'data-lucide': 'check-circle-2', style: 'width: 12px; height: 12px;' }),
                  createElement('span', {}, 'Finalizada')
                ]
              )
              : createElement(
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
              isCompleted && camp.completedAt
                ? `Cerrada el ${new Date(camp.completedAt).toLocaleDateString()} · ${progressInfo.totalVideos} clips`
                : `${progressInfo.totalVideos} ${progressInfo.totalVideos === 1 ? 'clip de vídeo' : 'clips de vídeo'}`
            )
          ]),

          // Barra de progreso de subidas
          createElement('div', { className: 'campaign-folder-card__progress-wrap' }, [
            createElement('div', { className: 'campaign-folder-card__progress-row' }, [
              createElement('span', {}, isCompleted ? 'Resultado final' : 'Publicados'),
              createElement('span', { className: 'font-mono' }, `${progressInfo.uploadedVideos}/${progressInfo.totalVideos} (${progressInfo.percentage}%)`)
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
                    background: isCompleted ? 'linear-gradient(90deg, #f59e0b, #10b981)' : `linear-gradient(90deg, ${camp.color}, #818cf8)`
                  }
                })
              ]
            )
          ]),

          // Pie con enlace directo y botón de acción rápida
          createElement('div', { className: 'campaign-folder-card__footer' }, [
            createElement('div', { style: 'display: flex; align-items: center; gap: 6px;' }, [
              createElement('span', {}, isCompleted ? 'Ver archivo de clips' : 'Explorar clips'),
              createElement('i', { 'data-lucide': 'arrow-right', 'aria-hidden': 'true', style: 'width: 15px; height: 15px;' })
            ]),
            createElement(
              'button',
              {
                type: 'button',
                className: 'btn btn--outline btn--sm',
                style: isCompleted
                  ? 'padding: 2px 8px; font-size: 0.75rem; color: var(--color-status-success); border-color: rgba(16, 185, 129, 0.35);'
                  : 'padding: 2px 8px; font-size: 0.75rem; color: var(--color-text-muted); border-color: var(--color-border-subtle);',
                title: isCompleted ? 'Reactivar campaña' : 'Marcar como finalizada',
                onClick: async (e) => {
                  e.stopPropagation();
                  const newStatus = !isCompleted;
                  try {
                    await campaignService.updateCampaign(camp.id, { isCompleted: newStatus });
                    camp.isCompleted = newStatus;
                    camp.completedAt = newStatus ? new Date().toISOString() : null;
                    showToast(
                      newStatus
                        ? `Campaña "${camp.name}" marcada como finalizada.`
                        : `Campaña "${camp.name}" reactivada con éxito.`,
                      'success'
                    );
                    await this.reloadAllData();
                  } catch (err) {
                    showToast(err.message || 'Error al cambiar estado.', 'error');
                  }
                }
              },
              [
                createElement('i', { 'data-lucide': isCompleted ? 'rotate-ccw' : 'check-circle', style: 'width: 13px; height: 13px;' }),
                createElement('span', {}, isCompleted ? 'Reactivar' : 'Finalizar')
              ]
            )
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
  this.currentSubfolder = null;

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
    const isCompleted = Boolean(camp.isCompleted);
    const link = createElement(
      'a',
      {
        href: `#campaign-${camp.id}`,
        className: 'sidebar-nav__link',
        style: isCompleted ? 'opacity: 0.72;' : '',
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
        createElement('span', { style: 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' }, camp.name),
        isCompleted
          ? createElement('span', { className: 'badge badge--warning font-mono', style: 'font-size: 9px; padding: 1px 5px;' }, 'Fin')
          : null
      ].filter(Boolean)
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
      opt.textContent = camp.isCompleted ? `${camp.name} (Finalizada)` : camp.name;
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
  let vids = this.allVideos || [];
  if (this.currentSubfolder) {
    vids = vids.filter((v) => v.subfolder === this.currentSubfolder);
  }

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
      const filters = { ...this.currentFilters };
      if (this.currentSubfolder) {
        filters.subfolder = this.currentSubfolder;
      }

      this.videos = await videoService.fetchVideos(filters);
      targetContainer.innerHTML = '';

      this.updateCounterBadge();
      this.updatePillCounts();

      // Si estamos dentro de una campaña y la campaña tiene subcarpetas pero NO hemos seleccionado ninguna subcarpeta:
      // Filtramos en la lista inferior solo los clips de la raíz para no mezclarlos con las subcarpetas
      const campVids = (this.allVideos || []).filter((v) => v.campaignId === this.currentFilters.campaignId);
      const campHasSubfolders = campVids.some((v) => Boolean(v.subfolder));

      let displayVideos = this.videos;
      if (this.currentFilters.campaignId !== 'all' && !this.currentSubfolder && campHasSubfolders && !this.currentFilters.search) {
        displayVideos = this.videos.filter((v) => !v.subfolder);
      }

      if (displayVideos.length === 0) {
        if (this.currentFilters.campaignId !== 'all' && !this.currentSubfolder && campHasSubfolders && !this.currentFilters.search) {
          const infoNotice = createElement(
            'div',
            {
              className: 'empty-catalog-state',
              style: 'padding: var(--spacing-6); margin: var(--spacing-2) 0; grid-column: 1 / -1;'
            },
            [
              createElement('div', { className: 'empty-catalog-state__icon' }, [
                createElement('i', { 'data-lucide': 'folder-open', 'aria-hidden': 'true' })
              ]),
              createElement('h3', { className: 'empty-catalog-state__title' }, 'Todos los clips están organizados en subcarpetas'),
              createElement('p', { className: 'empty-catalog-state__desc' }, 'Selecciona cualquiera de las subcarpetas superiores para explorar y reproducir sus clips.')
            ]
          );
          targetContainer.appendChild(infoNotice);
          if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons({ root: infoNotice });
          }
          return;
        }

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

      // Si hay vídeos de raíz junto a subcarpetas, añadimos un encabezado aclaratorio
      if (this.currentFilters.campaignId !== 'all' && !this.currentSubfolder && campHasSubfolders && !this.currentFilters.search) {
        const rootHeading = createElement('h4', { className: 'subfolder-root-heading', style: 'grid-column: 1 / -1;' }, [
          createElement('i', { 'data-lucide': 'film', 'aria-hidden': 'true', style: 'width: 16px; height: 16px; color: var(--color-brand-primary-light);' }),
          createElement('span', {}, `Clips en la raíz de la campaña (${displayVideos.length})`)
        ]);
        targetContainer.appendChild(rootHeading);
      }

      displayVideos.forEach((video) => {
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

// Inicialización robusta de la aplicación (incluso si el módulo se ejecuta tras DOMContentLoaded)
function bootstrapApp() {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  const app = new AppController();
  window.clipFlowApp = app;
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}

// Reintentar renderizado de iconos cuando todos los recursos CDN hayan cargado
window.addEventListener('load', () => {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
});
