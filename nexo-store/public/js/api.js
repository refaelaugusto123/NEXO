// ===========================================
// NEXO STORE - Cliente de API (fetch wrapper)
// ===========================================
'use strict';

const API_BASE = '/api';

async function apiRequest(path, { method = 'GET', body } = {}) {
  const opts = {
    method,
    headers: {},
    credentials: 'same-origin',
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API_BASE + path, opts);
  } catch (err) {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se o NEXO STORE está em execução.', 0);
  }
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new ApiError(data.error || 'Ocorreu um erro inesperado.', res.status, data);
  }
  return data;
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const Api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body }),
  del: (path) => apiRequest(path, { method: 'DELETE' }),
};

window.Api = Api;
window.ApiError = ApiError;
