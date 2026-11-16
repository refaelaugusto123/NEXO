// ===========================================
// NEXO STORE - Estado de autenticação no cliente
// ===========================================
'use strict';

const NexoAuth = {
  user: null,
  _listeners: [],

  async init() {
    try {
      const { user } = await Api.get('/auth/me');
      this.user = user;
    } catch {
      this.user = null;
    }
    this._emit();
    return this.user;
  },

  onChange(fn) { this._listeners.push(fn); },
  _emit() { this._listeners.forEach(fn => fn(this.user)); },

  async login(email, password) {
    const { user } = await Api.post('/auth/login', { email, password });
    this.user = user;
    this._emit();
    return user;
  },

  async register(payload) {
    const { user } = await Api.post('/auth/register', payload);
    this.user = user;
    this._emit();
    return user;
  },

  async logout() {
    await Api.post('/auth/logout');
    this.user = null;
    this._emit();
  },

  isLoggedIn() { return !!this.user; },
  isAdmin() { return !!(this.user && this.user.is_admin); },

  requireLogin(redirectTo) {
    if (!this.isLoggedIn()) {
      const next = encodeURIComponent(redirectTo || window.location.pathname + window.location.search);
      window.location.href = `/login.html?next=${next}`;
      return false;
    }
    return true;
  },
};

window.NexoAuth = NexoAuth;
