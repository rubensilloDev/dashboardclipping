/**
 * Componente Modal para Configuración de Google Drive.
 * Soporta Opción A (Google Apps Script Web App - 100% gratuita) y
 * Opción B (Google Drive API Key v3 - Google Cloud Console).
 */

'use strict';

import { apiRequest } from '../services/api.js';
import { showToast } from '../utils/dom.js';

const APPS_SCRIPT_SNIPPET = `function getVideosRecursively(folderObj, pathPrefix) {
  var videoList = [];
  pathPrefix = pathPrefix || '';
  var files = folderObj.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var mime = file.getMimeType();
    var name = file.getName();
    if (mime.indexOf('video') !== -1 || name.match(/\\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
      var fileId = file.getId();
      var cleanName = name.replace(/\\.[^/.]+$/, '');
      videoList.push({
        id: fileId,
        name: cleanName,
        mimeType: mime,
        subfolder: pathPrefix || null,
        thumbnailLink: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w600',
        duration: '00:45',
        createdTime: file.getDateCreated().toISOString()
      });
    }
  }
  var innerFolders = folderObj.getFolders();
  while (innerFolders.hasNext()) {
    var inner = innerFolders.next();
    var nextPrefix = pathPrefix ? (pathPrefix + ' / ' + inner.getName()) : inner.getName();
    var nestedVideos = getVideosRecursively(inner, nextPrefix);
    videoList = videoList.concat(nestedVideos);
  }
  return videoList;
}

function doGet(e) {
  try {
    var folderId = e && e.parameter ? e.parameter.folderId : null;
    if (!folderId) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', error: 'Parámetro folderId no proporcionado.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var folder = DriveApp.getFolderById(folderId);
    var directFiles = [];
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var mime = file.getMimeType();
      var name = file.getName();
      if (mime.indexOf('video') !== -1 || name.match(/\\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
        var fileId = file.getId();
        directFiles.push({
          id: fileId,
          name: name.replace(/\\.[^/.]+$/, ''),
          mimeType: mime,
          subfolder: null,
          thumbnailLink: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w600',
          duration: '00:45',
          createdTime: file.getDateCreated().toISOString()
        });
      }
    }
    var subfolderIter = folder.getFolders();
    var subfolderList = [];
    while (subfolderIter.hasNext()) {
      var sub = subfolderIter.next();
      var subVideos = getVideosRecursively(sub, '');
      subfolderList.push({
        id: sub.getId(),
        name: sub.getName(),
        totalFiles: subVideos.length,
        files: subVideos
      });
    }
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        folderId: folderId,
        folderName: folder.getName(),
        totalFiles: directFiles.length,
        files: directFiles,
        totalSubfolders: subfolderList.length,
        subfolders: subfolderList
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export class DriveSettingsModal {
  /**
   * @param {Object} options
   * @param {Function} options.onSaved - Callback invocado tras guardar la configuración
   */
  constructor({ onSaved } = {}) {
    this.onSaved = onSaved;

    this.modalEl = document.getElementById('driveSettingsModal');
    this.formEl = document.getElementById('driveSettingsForm');
    this.appsScriptUrlInput = document.getElementById('driveAppsScriptUrlInput');
    this.apiKeyInput = document.getElementById('driveApiKeyInput');
    this.statusTextEl = document.getElementById('driveApiStatusText');
    this.statusIndicatorEl = document.getElementById('driveStatusIndicator');
    this.copyAppsScriptBtn = document.getElementById('copyAppsScriptCodeBtn');
    this.closeBtn = document.getElementById('closeDriveSettingsBtn');
    this.cancelBtn = document.getElementById('cancelDriveSettingsBtn');
    this.submitBtn = document.getElementById('saveDriveSettingsBtn');
    this.errorAlert = document.getElementById('driveSettingsErrorAlert');

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

    if (this.copyAppsScriptBtn) {
      this.copyAppsScriptBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
          showToast('Código de Google Apps Script copiado al portapapeles.');
          const originalHtml = this.copyAppsScriptBtn.innerHTML;
          this.copyAppsScriptBtn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; color: var(--color-status-success);"></i> <span>¡Copiado!</span>';
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons({ root: this.copyAppsScriptBtn });
          }
          setTimeout(() => {
            this.copyAppsScriptBtn.innerHTML = originalHtml;
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
              window.lucide.createIcons({ root: this.copyAppsScriptBtn });
            }
          }, 2500);
        } catch {
          showToast('No se pudo copiar automáticamente. Consulta docs/google-apps-script.js');
        }
      });
    }

    if (this.formEl) {
      this.formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSave();
      });
    }
  }

  async open() {
    if (!this.modalEl) return;
    this.hideError();
    this.modalEl.classList.add('modal-backdrop--open');
    document.body.style.overflow = 'hidden';

    // Cargar estado de configuración actual
    try {
      const config = await apiRequest('/config');
      if (this.appsScriptUrlInput) {
        this.appsScriptUrlInput.value = config.appsScriptUrl || '';
      }

      if (this.apiKeyInput) {
        if (config.hasApiKey) {
          this.apiKeyInput.placeholder = config.apiKeyMasked;
        } else {
          this.apiKeyInput.placeholder = 'AIzaSy...';
        }
      }

      if (this.statusTextEl && this.statusIndicatorEl) {
        this.statusIndicatorEl.className = 'drive-status-indicator';
        if (config.hasAppsScript) {
          this.statusIndicatorEl.classList.add('drive-status-indicator--success');
          this.statusTextEl.innerHTML = '<strong>Google Apps Script conectado:</strong> Sincronización gratuita activa sin límites de cuota.';
        } else if (config.hasApiKey) {
          this.statusIndicatorEl.classList.add('drive-status-indicator--info');
          this.statusTextEl.innerHTML = `<strong>Google Drive API v3 activa:</strong> Clave configurada (${config.apiKeyMasked}).`;
        } else {
          this.statusIndicatorEl.classList.add('drive-status-indicator--warning');
          this.statusTextEl.innerHTML = '<strong>Modo simulación local:</strong> Sin credenciales de Google (mostrando clips de prueba).';
        }
      }
    } catch {
      // Ignorar fallos de red silenciosamente
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ root: this.modalEl });
    }

    if (this.appsScriptUrlInput) this.appsScriptUrlInput.focus();
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('modal-backdrop--open');
    document.body.style.overflow = '';
  }

  async handleSave() {
    const appsScriptUrl = this.appsScriptUrlInput ? this.appsScriptUrlInput.value.trim() : '';
    const key = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';

    this.hideError();
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Guardando...';

    const payload = {
      googleAppsScriptUrl: appsScriptUrl
    };

    if (key) {
      payload.googleDriveApiKey = key;
    }

    try {
      await apiRequest('/config', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showToast('Configuración de Google Drive guardada con éxito.');
      this.close();

      if (typeof this.onSaved === 'function') {
        this.onSaved();
      }
    } catch (error) {
      this.showError(error.message || 'Error al guardar la configuración.');
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Guardar Configuración';
    }
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
