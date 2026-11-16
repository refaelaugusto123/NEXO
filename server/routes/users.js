// ===========================================
// NEXO STORE - Rotas de usuário (perfil, endereços)
// ===========================================
'use strict';

const db = require('../db');
const authLib = require('../auth');
const { sendJson, sendError, parseBody } = require('../utils');

async function updateProfile(req, res, user) {
  if (!user) return sendError(res, 401, 'Não autenticado.');
  const body = await parseBody(req);
  const name = (body.name || user.name).trim();
  const phone = (body.phone !== undefined ? body.phone : user.phone) || '';

  if (!name || name.length < 2) return sendError(res, 400, 'Nome inválido.');

  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone, user.id);

  if (body.new_password) {
    if (!body.current_password) return sendError(res, 400, 'Informe a senha atual para alterá-la.');
    if (!authLib.verifyPassword(body.current_password, user.password_salt, user.password_hash)) {
      return sendError(res, 401, 'Senha atual incorreta.');
    }
    if (body.new_password.length < 6) return sendError(res, 400, 'A nova senha deve ter ao menos 6 caracteres.');
    const { hash, salt } = authLib.hashPassword(body.new_password);
    db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, user.id);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  sendJson(res, 200, { user: authLib.sanitizeUser(updated) });
}

async function listAddresses(req, res, user) {
  if (!user) return sendError(res, 401, 'Não autenticado.');
  const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(user.id);
  sendJson(res, 200, { addresses });
}

async function createAddress(req, res, user) {
  if (!user) return sendError(res, 401, 'Não autenticado.');
  const body = await parseBody(req);
  const { label, cep, street, number, complement, neighborhood, city, state, is_default } = body;
  if (!cep || !street || !city || !state) return sendError(res, 400, 'Preencha CEP, rua, cidade e estado.');

  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(user.id);
  }

  const info = db.prepare(`INSERT INTO addresses (user_id, label, cep, street, number, complement, neighborhood, city, state, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(user.id, label || 'Endereço', cep, street, number || '', complement || '', neighborhood || '', city, state, is_default ? 1 : 0);

  const address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(info.lastInsertRowid);
  sendJson(res, 201, { address });
}

async function deleteAddress(req, res, addressId, user) {
  if (!user) return sendError(res, 401, 'Não autenticado.');
  const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(addressId, user.id);
  if (!address) return sendError(res, 404, 'Endereço não encontrado.');
  db.prepare('DELETE FROM addresses WHERE id = ?').run(addressId);
  sendJson(res, 200, { ok: true });
}

module.exports = { updateProfile, listAddresses, createAddress, deleteAddress };
