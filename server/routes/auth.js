// ===========================================
// NEXO STORE - Rotas de autenticação
// ===========================================
'use strict';

const db = require('../db');
const authLib = require('../auth');
const { sendJson, sendError, parseBody, setCookie, clearCookie } = require('../utils');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_NAME = 'nexo_session';

async function register(req, res) {
  const body = await parseBody(req);
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const phone = (body.phone || '').trim();
  const password = body.password || '';

  if (!name || name.length < 2) return sendError(res, 400, 'Informe seu nome completo.');
  if (!EMAIL_RE.test(email)) return sendError(res, 400, 'Informe um e-mail válido.');
  if (!password || password.length < 6) return sendError(res, 400, 'A senha deve ter pelo menos 6 caracteres.');

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return sendError(res, 409, 'Este e-mail já está cadastrado.');

  const { hash, salt } = authLib.hashPassword(password);
  const loyaltyCode = authLib.generateLoyaltyCode();

  const info = db.prepare(`INSERT INTO users (name, email, phone, password_hash, password_salt, loyalty_code)
    VALUES (?, ?, ?, ?, ?, ?)`).run(name, email, phone, hash, salt, loyaltyCode);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const session = authLib.createSession(user.id);
  setCookie(res, COOKIE_NAME, session.token, { maxAge: 60 * 60 * 24 * 7 });

  sendJson(res, 201, { user: authLib.sanitizeUser(user) });
}

async function login(req, res) {
  const body = await parseBody(req);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) return sendError(res, 400, 'Informe e-mail e senha.');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !authLib.verifyPassword(password, user.password_salt, user.password_hash)) {
    return sendError(res, 401, 'E-mail ou senha incorretos.');
  }

  const session = authLib.createSession(user.id);
  setCookie(res, COOKIE_NAME, session.token, { maxAge: 60 * 60 * 24 * 7 });
  sendJson(res, 200, { user: authLib.sanitizeUser(user) });
}

async function logout(req, res, cookies) {
  const token = cookies[COOKIE_NAME];
  authLib.destroySession(token);
  clearCookie(res, COOKIE_NAME);
  sendJson(res, 200, { ok: true });
}

async function me(req, res, cookies) {
  const token = cookies[COOKIE_NAME];
  const user = authLib.getUserBySessionToken(token);
  if (!user) return sendError(res, 401, 'Não autenticado.');
  sendJson(res, 200, { user: authLib.sanitizeUser(user) });
}

async function forgotPassword(req, res) {
  const body = await parseBody(req);
  const email = (body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Por segurança, sempre respondemos com sucesso (não revelamos se o e-mail existe)
  if (!user) return sendJson(res, 200, { ok: true, message: 'Se o e-mail existir em nossa base, você receberá instruções de redefinição.' });

  const token = authLib.generateResetToken();
  const expires = Date.now() + 1000 * 60 * 30; // 30 min
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

  // Em produção, envie este link por e-mail (SMTP/SendGrid/SES). Aqui retornamos para fins de demonstração.
  sendJson(res, 200, {
    ok: true,
    message: 'Link de redefinição gerado (ambiente de demonstração - em produção isso seria enviado por e-mail).',
    demo_reset_token: token,
  });
}

async function resetPassword(req, res) {
  const body = await parseBody(req);
  const { token, password } = body;
  if (!token || !password || password.length < 6) {
    return sendError(res, 400, 'Dados inválidos. A senha deve ter ao menos 6 caracteres.');
  }
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expires || user.reset_token_expires < Date.now()) {
    return sendError(res, 400, 'Token inválido ou expirado. Solicite uma nova redefinição.');
  }
  const { hash, salt } = authLib.hashPassword(password);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(hash, salt, user.id);
  sendJson(res, 200, { ok: true, message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
}

module.exports = { register, login, logout, me, forgotPassword, resetPassword, COOKIE_NAME };
