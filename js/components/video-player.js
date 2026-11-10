/**
 * Componente Modal del Reproductor de Vídeo de Google Drive y Editor de Estados.
 * Permite previsualizar el vídeo y alternar estados de edición y subidas en tiempo real.
 */

'use strict';

import { videoService } from '../services/videos.js';
import { showToast } from '../utils/dom.js';

export class VideoPlayerModal {
  /**
   * @param {Object} options
   * @param {Function} options.onUpdated - Callback tras actualizar el estado del vídeo
   */
  constructor({ onUpdated } = {}) {
    this.onUpdated = onUpdated;
    this.currentVideo = null;

    this.modalEl = document.getElementById('videoPlayerModal');
    this.titleEl = document.getElementById('modalVideoTitle');
    this.playerContainerEl = document.getElementById('modalPlayerContainer');
    this.durationLabelEl = document.getElementById('modalDurationLabel');

    // Controles de estado
    this.editToggleInput = document.getElementById('modalEditToggle');
    this.checkYoutube = document.getElementById('checkYoutube');
    this.checkTiktok = document.getElementById('checkTiktok');
    this.checkInstagram = document.getElementById('checkInstagram');
    this.checkFacebook = document.getElementById('checkFacebook');
    this.postUrlInput = document.getElementById('postUrlInput');
    this.notesInput = document.getElementById('videoNotesInput');

    // Botones de acción
    this.closeBtn = document.getElementById('closeModalButton');
    this.cancelBtn = document.getElementById('modalCancelButton');
    this.saveBtn = document.getElementById('modalSaveButton');

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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', async () => {
        await this.handleSave();
      });
    }

    // Escuchadores de cambio para actualizar el semáforo en vivo dentro del modal
    const controls = [this.editToggleInput, this.checkYoutube, this.checkTiktok, this.checkInstagram, this.checkFacebook];
    controls.forEach((input) => {
      if (input) {
        input.addEventListener('change', () => this.updateModalPipelineBadge());
      }
    });
  }

  /**
   * Actualiza dinámicamente la insignia del semáforo en el reproductor modal
   */
  updateModalPipelineBadge() {
    const isEdited = this.editToggleInput ? this.editToggleInput.checked : false;
    const checks = [this.checkYoutube, this.checkTiktok, this.checkInstagram, this.checkFacebook];
    const publishedCount = checks.filter((c) => Boolean(c && c.checked)).length;

    const badge = document.getElementById('modalPipelineBadge');
    if (!badge) return;

    if (publishedCount > 0) {
      badge.className = 'badge font-mono badge--pipeline-published';
      badge.innerHTML = `<span class="pipeline-badge__dot" style="background-color: #10b981;" aria-hidden="true"></span> <span>Publicado (${publishedCount}/4)</span>`;
    } else if (isEdited) {
      badge.className = 'badge font-mono badge--pipeline-ready';
      badge.innerHTML = '<span class="pipeline-badge__dot" style="background-color: #f59e0b;" aria-hidden="true"></span> <span>Listo para publicar</span>';
    } else {
      badge.className = 'badge font-mono badge--pipeline-raw';
      badge.innerHTML = '<span class="pipeline-badge__dot" style="background-color: #94a3b8;" aria-hidden="true"></span> <span>En bruto</span>';
    }
  }

  isOpen() {
    return this.modalEl && this.modalEl.classList.contains('modal-backdrop--open');
  }

  /**
   * Abre el modal cargando la información del clip y configurando el reproductor
   * @param {Object} video - Objeto vídeo completo
   */
  open(video) {
    if (!video || !this.modalEl) return;
    this.currentVideo = video;

    if (this.titleEl) {
      this.titleEl.textContent = video.title;
    }

    if (this.durationLabelEl) {
      const subInfo = video.subfolder ? ` · Subcarpeta: ${video.subfolder}` : '';
      this.durationLabelEl.textContent = `Duración: ${video.duration || '00:45'}${subInfo}`;
    }

    // Configuración del reproductor de Google Drive en iframe
    if (this.playerContainerEl) {
      this.playerContainerEl.innerHTML = '';

      // Si el archivo tiene un ID válido de Drive, cargamos el reproductor oficial
      if (video.driveFileId && !video.driveFileId.startsWith('drive-sim-')) {
        const iframe = document.createElement('iframe');
        iframe.className = 'player-preview-card__iframe';
        iframe.src = `https://drive.google.com/file/d/${video.driveFileId}/preview`;
        iframe.allow = 'autoplay';
        iframe.setAttribute('allowfullscreen', 'true');
        this.playerContainerEl.appendChild(iframe);
      } else {
        // Fallback visual con imagen y botón interactivo
        const img = document.createElement('img');
        img.src = video.thumbnailUrl;
        img.alt = video.title;
        img.className = 'player-preview-card__mock-video';

        const playBadge = document.createElement('div');
        playBadge.className = 'video-card__play-badge';
        playBadge.style.opacity = '1';
        playBadge.innerHTML = '<i data-lucide="play"></i>';

        this.playerContainerEl.appendChild(img);
        this.playerContainerEl.appendChild(playBadge);
      }
    }

    // Cargar valores en los controles
    if (this.editToggleInput) {
      this.editToggleInput.checked = Boolean(video.isEdited);
    }

    const platforms = video.platforms || {};
    if (this.checkYoutube) this.checkYoutube.checked = Boolean(platforms.youtube);
    if (this.checkTiktok) this.checkTiktok.checked = Boolean(platforms.tiktok);
    if (this.checkInstagram) this.checkInstagram.checked = Boolean(platforms.instagram);
    if (this.checkFacebook) this.checkFacebook.checked = Boolean(platforms.facebook);

    if (this.notesInput) {
      this.notesInput.value = video.notes || '';
    }

    if (this.postUrlInput) {
      const urls = video.postUrls || {};
      this.postUrlInput.value = urls.tiktok || urls.youtube || urls.instagram || urls.facebook || '';
    }

    this.updateModalPipelineBadge();

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
    if (this.playerContainerEl) {
      this.playerContainerEl.innerHTML = '';
    }
    this.currentVideo = null;
  }

  async handleSave() {
    if (!this.currentVideo) return;

    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Guardando...';

    const isEdited = this.editToggleInput ? this.editToggleInput.checked : false;
    const platforms = {
      youtube: this.checkYoutube ? this.checkYoutube.checked : false,
      tiktok: this.checkTiktok ? this.checkTiktok.checked : false,
      instagram: this.checkInstagram ? this.checkInstagram.checked : false,
      facebook: this.checkFacebook ? this.checkFacebook.checked : false
    };

    const notes = this.notesInput ? this.notesInput.value.trim() : '';
    const postUrl = this.postUrlInput ? this.postUrlInput.value.trim() : '';

    const postUrls = { ...(this.currentVideo.postUrls || {}) };
    if (postUrl) {
      // Asignar la URL a las redes seleccionadas
      if (platforms.tiktok) postUrls.tiktok = postUrl;
      if (platforms.youtube) postUrls.youtube = postUrl;
      if (platforms.instagram) postUrls.instagram = postUrl;
      if (platforms.facebook) postUrls.facebook = postUrl;
    }

    try {
      const updated = await videoService.updateVideo(this.currentVideo.id, {
        isEdited,
        platforms,
        notes,
        postUrls
      });

      showToast('Cambios del clip guardados con éxito.');
      this.close();

      if (typeof this.onUpdated === 'function') {
        this.onUpdated(updated);
      }
    } catch {
      // Ignorar o mostrar error al usuario
    } finally {
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = 'Guardar Cambios';
    }
  }
}
