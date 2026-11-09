/**
 * Componente Modal para Gestionar Campañas (CRUD Completo).
 * Permite listar todas las campañas, editarlas, eliminarlas con confirmación
 * y añadir nuevas campañas de Google Drive.
 */

'use strict';

import { campaignService } from '../services/campaigns.js';
import { createElement, showToast } from '../utils/dom.js';

export class CampaignManagerModal {
  /**
   * @param {Object} options
   * @param {Function} options.onEditCampaign - Callback para abrir el modal de edición de una campaña
   * @param {Function} options.onNewCampaign - Callback para abrir el modal de creación de campaña
   * @param {Function} options.onChanged - Callback invocado tras eliminar o cambiar campañas
   */
  constructor({ onEditCampaign, onNewCampaign, onChanged } = {}) {
    this.onEditCampaign = onEditCampaign;
    this.onNewCampaign = onNewCampaign;
    this.onChanged = onChanged;
    this.campaigns = [];

    this.modalEl = document.getElementById('campaignManagerModal');
    this.listContainer = document.getElementById('campaignManagerList');
    this.closeBtn = document.getElementById('closeCampaignManagerBtn');
    this.newCampaignBtn = document.getElementById('managerNewCampaignBtn');

    // Confirmación modal de eliminación
    this.deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
    this.deleteConfirmTitle = document.getElementById('deleteConfirmTitle');
    this.deleteConfirmBtn = document.getElementById('confirmDeleteBtn');
    this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    this.campaignToDelete = null;

    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }

    if (this.newCampaignBtn) {
      this.newCampaignBtn.addEventListener('click', () => {
        this.close();
        if (typeof this.onNewCampaign === 'function') {
          this.onNewCampaign();
        }
      });
    }

    // Modal de confirmación de eliminación
    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteConfirm());
    }

    if (this.deleteConfirmModalEl) {
      this.deleteConfirmModalEl.addEventListener('click', (e) => {
        if (e.target === this.deleteConfirmModalEl) this.closeDeleteConfirm();
      });
    }

    if (this.deleteConfirmBtn) {
      this.deleteConfirmBtn.addEventListener('click', async () => {
        await this.handleDeleteConfirmed();
      });
    }
  }

  /**
   * Abre el modal del gestor de campañas y carga los datos actuales
   * @param {Array<Object>} campaigns - Lista de campañas
   */
  open(campaigns = []) {
    if (!this.modalEl) return;
    this.campaigns = campaigns;
    this.render();
    this.modalEl.classList.add('modal-backdrop--open');
    document.body.style.overflow = 'hidden';

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('modal-backdrop--open');
    document.body.style.overflow = '';
  }

  render() {
    if (!this.listContainer) return;
    this.listContainer.innerHTML = '';

    if (this.campaigns.length === 0) {
      this.listContainer.appendChild(
        createElement(
          'p',
          { style: 'color: var(--color-text-secondary); text-align: center; padding: var(--spacing-6);' },
          'No tienes campañas registradas actualmente.'
        )
      );
      return;
    }

    this.campaigns.forEach((camp) => {
      const item = createElement('div', { className: 'campaign-manage-item' }, [
        createElement('div', { className: 'campaign-manage-item__info' }, [
          createElement('span', {
            className: 'campaign-item__color-dot',
            style: {
              backgroundColor: camp.color,
              width: '14px',
              height: '14px',
              boxShadow: `0 0 10px ${camp.color}66`
            }
          }),
          createElement('div', { className: 'campaign-manage-item__text' }, [
            createElement('span', { className: 'campaign-manage-item__title' }, camp.name),
            createElement('span', { className: 'campaign-manage-item__id' }, `Drive: ${camp.driveFolderId}`)
          ])
        ]),

        createElement('div', { className: 'campaign-manage-item__actions' }, [
          createElement(
            'button',
            {
              type: 'button',
              className: 'btn btn--secondary btn--sm',
              title: 'Editar nombre o carpeta',
              'aria-label': `Editar campaña ${camp.name}`,
              onClick: () => {
                this.close();
                if (typeof this.onEditCampaign === 'function') {
                  this.onEditCampaign(camp);
                }
              }
            },
            [
              createElement('i', { 'data-lucide': 'edit-2', 'aria-hidden': 'true' }),
              createElement('span', {}, 'Editar')
            ]
          ),

          createElement(
            'button',
            {
              type: 'button',
              className: 'btn btn--outline btn--sm',
              style: 'color: var(--color-status-danger); border-color: rgba(239, 68, 68, 0.3);',
              title: 'Eliminar campaña',
              'aria-label': `Eliminar campaña ${camp.name}`,
              onClick: () => {
                this.promptDeleteConfirm(camp);
              }
            },
            [
              createElement('i', { 'data-lucide': 'trash-2', 'aria-hidden': 'true' })
            ]
          )
        ])
      ]);

      this.listContainer.appendChild(item);
    });
  }

  promptDeleteConfirm(camp) {
    this.campaignToDelete = camp;
    if (this.deleteConfirmTitle) {
      this.deleteConfirmTitle.textContent = `¿Eliminar "${camp.name}"?`;
    }
    if (this.deleteConfirmModalEl) {
      this.deleteConfirmModalEl.classList.add('modal-backdrop--open');
    }
  }

  closeDeleteConfirm() {
    this.campaignToDelete = null;
    if (this.deleteConfirmModalEl) {
      this.deleteConfirmModalEl.classList.remove('modal-backdrop--open');
    }
  }

  async handleDeleteConfirmed() {
    if (!this.campaignToDelete) return;

    const campName = this.campaignToDelete.name;
    const campId = this.campaignToDelete.id;

    if (this.deleteConfirmBtn) {
      this.deleteConfirmBtn.disabled = true;
      this.deleteConfirmBtn.textContent = 'Eliminando...';
    }

    try {
      await campaignService.deleteCampaign(campId);
      showToast(`Campaña "${campName}" eliminada correctamente.`);
      this.closeDeleteConfirm();
      this.close();

      if (typeof this.onChanged === 'function') {
        this.onChanged();
      }
    } catch (error) {
      showToast(error.message || 'Error al eliminar campaña', 'error');
    } finally {
      if (this.deleteConfirmBtn) {
        this.deleteConfirmBtn.disabled = false;
        this.deleteConfirmBtn.textContent = 'Sí, Eliminar';
      }
    }
  }
}

