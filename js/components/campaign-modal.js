/**
 * Componente Modal para Crear y Editar Campañas (Carpetas de Drive).
 * Soporta modo creación y modo edición con prellenado de campos.
 */

'use strict';

import { campaignService } from '../services/campaigns.js';
import { showToast } from '../utils/dom.js';

export class CampaignModal {
  /**
   * @param {Object} options
   * @param {Function} options.onSuccess - Callback invocado tras guardar o editar una campaña
   */
  constructor({ onSuccess }) {
    this.onSuccess = onSuccess;
    this.isEditing = false;
    this.editingCampaignId = null;

    this.modalEl = document.getElementById('campaignModal');
    this.titleEl = document.getElementById('campaignModalTitle');
    this.formEl = document.getElementById('campaignForm');
    this.nameInput = document.getElementById('campaignNameInput');
    this.folderInput = document.getElementById('campaignFolderInput');
    this.colorInputs = document.querySelectorAll('input[name="campaignColor"]');
    this.closeBtn = document.getElementById('closeCampaignModalBtn');
    this.cancelBtn = document.getElementById('cancelCampaignModalBtn');
    this.submitBtn = document.getElementById('saveCampaignBtn');
    this.errorAlert = document.getElementById('campaignErrorAlert');

    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.close());

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }

    if (this.formEl) {
      this.formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSave();
      });
    }
  }

  async handleSave() {
    const name = this.nameInput.value.trim();
    const folderInput = this.folderInput.value.trim();

    let selectedColor = '#a855f7';
    this.colorInputs.forEach((radio) => {
      if (radio.checked) selectedColor = radio.value;
    });

    if (!name) {
      this.showError('Ingresa un nombre para la campaña.');
      return;
    }

    if (!folderInput) {
      this.showError('Ingresa el enlace o ID de la carpeta de Drive.');
      return;
    }

    this.hideError();
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Guardando...';

    try {
      if (this.isEditing && this.editingCampaignId) {
        await campaignService.updateCampaign(this.editingCampaignId, {
          name,
          color: selectedColor,
          folderInput
        });
        showToast(`Campaña "${name}" actualizada con éxito.`);
      } else {
        await campaignService.createCampaign({
          name,
          color: selectedColor,
          folderInput
        });
        showToast(`Campaña "${name}" creada y sincronizada.`);
      }

      this.close();
      if (typeof this.onSuccess === 'function') {
        this.onSuccess();
      }
    } catch (error) {
      this.showError(error.message || 'Error al guardar la campaña.');
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = this.isEditing ? 'Guardar Cambios' : 'Crear Campaña';
    }
  }

  /**
   * Abre el modal en modo creación o edición
   * @param {Object} [campaignToEdit] - Si se pasa, abre en modo edición
   */
  open(campaignToEdit = null) {
    if (!this.modalEl) return;
    this.formEl.reset();
    this.hideError();

    if (campaignToEdit) {
      this.isEditing = true;
      this.editingCampaignId = campaignToEdit.id;
      if (this.titleEl) this.titleEl.textContent = 'Editar Campaña';
      if (this.nameInput) this.nameInput.value = campaignToEdit.name || '';
      if (this.folderInput) this.folderInput.value = campaignToEdit.driveFolderId || '';
      if (this.submitBtn) this.submitBtn.textContent = 'Guardar Cambios';

      this.colorInputs.forEach((radio) => {
        radio.checked = radio.value === campaignToEdit.color;
      });
    } else {
      this.isEditing = false;
      this.editingCampaignId = null;
      if (this.titleEl) this.titleEl.textContent = 'Nueva Campaña de Clipping';
      if (this.submitBtn) this.submitBtn.textContent = 'Crear Campaña';
    }

    this.modalEl.classList.add('modal-backdrop--open');
    document.body.style.overflow = 'hidden';
    if (this.nameInput) this.nameInput.focus();
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('modal-backdrop--open');
    document.body.style.overflow = '';
    this.isEditing = false;
    this.editingCampaignId = null;
  }

  showError(message) {
    if (!this.errorAlert) return;
    this.errorAlert.textContent = message;
    this.errorAlert.style.display = 'flex';
  }

  hideError() {
    if (!this.errorAlert) return;
    this.errorAlert.textContent = '';
    this.errorAlert.style.display = 'none';
  }
}
