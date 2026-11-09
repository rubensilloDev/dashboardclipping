/**
 * Componente Modal de Autenticación.
 * Gestiona el inicio de sesión con usuario y contraseña, y la persistencia del token.
 */

'use strict';

import { authService } from '../services/auth.js';

export class AuthModal {
  /**
   * @param {Object} options
   * @param {Function} options.onSuccess - Callback invocado tras inicio de sesión exitoso
   */
  constructor({ onSuccess }) {
    this.onSuccess = onSuccess;
    this.modalEl = document.getElementById('authModal');
    this.formEl = document.getElementById('authForm');
    this.usernameInput = document.getElementById('authUsername');
    this.passwordInput = document.getElementById('authPassword');
    this.rememberMeInput = document.getElementById('authRememberMe');
    this.errorAlert = document.getElementById('authErrorAlert');
    this.submitBtn = document.getElementById('authSubmitBtn');

    this.bindEvents();
  }

  bindEvents() {
    if (!this.formEl) return;

    this.formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });
  }

  async handleLogin() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;
    const rememberMe = this.rememberMeInput ? this.rememberMeInput.checked : false;

    this.hideError();
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Verificando...';

    try {
      await authService.login(username, password, rememberMe);
      this.close();
      if (typeof this.onSuccess === 'function') {
        this.onSuccess();
      }
    } catch (error) {
      this.showError(error.message || 'Error al iniciar sesión.');
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Iniciar Sesión';
    }
  }

  open() {
    if (!this.modalEl) return;
    this.modalEl.classList.add('modal-backdrop--open');
    document.body.style.overflow = 'hidden';
    this.hideError();
    if (this.usernameInput) {
      this.usernameInput.focus();
    }
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('modal-backdrop--open');
    document.body.style.overflow = '';
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

