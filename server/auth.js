// ===========================================
// NEXO STORE - Autenticação
// Hash de senha com scrypt (nativo do Node) + tokens de sessão assinados com HMAC
// ===========================================
'use strict';

const crypto = require('node:crypto');
const db = require('./db');

const SESSION_SECRET = process.env.SESSION_SECRET || 'nexo-store-dev-secret-troque-em-producao';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

// ---------- Senhas ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------- Sessões ----------
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return { token, expiresAt };
}

function getSession(token) {
  if (!token) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return row;
}

function destroySession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function getUserBySessionToken(token) {
  const session = getSession(token);
  if (!session) return null;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  return user || null;
}

// ---------- Token de redefinição de senha ----------
function generateResetToken() {
  return crypto.randomBytes(24).toString('hex');
}

// ---------- Código de fidelidade único ----------
function generateLoyaltyCode() {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NEXO-${rand}`;
}

// ---------- Assinatura leve (não usada diretamente, mas disponível) ----------
function sign(payload) {
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64url') + '.' + sig;
}

function unsign(token) {
  try {
    const [dataB64, sig] = token.split('.');
    const data = Buffer.from(dataB64, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, password_salt, reset_token, reset_token_expires, ...safe } = user;
  safe.is_admin = !!safe.is_admin;
  return safe;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  getUserBySessionToken,
  generateResetToken,
  generateLoyaltyCode,
  sign,
  unsign,
  sanitizeUser,
};
