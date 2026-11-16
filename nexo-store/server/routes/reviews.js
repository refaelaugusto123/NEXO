// ===========================================
// NEXO STORE - Rotas de avaliações
// ===========================================
'use strict';

const db = require('../db');
const { sendJson, sendError, parseBody, getQuery } = require('../utils');

async function listReviews(req, res, productId) {
  const q = getQuery(req);
  let orderBy = 'created_at DESC';
  if (q.sort === 'rating_high') orderBy = 'rating DESC, created_at DESC';
  if (q.sort === 'rating_low') orderBy = 'rating ASC, created_at DESC';

  const reviews = db.prepare(`SELECT * FROM reviews WHERE product_id = ? ORDER BY ${orderBy}`).all(productId);
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total,
      AVG(rating) as avg,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as r5,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as r4,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as r3,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as r2,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as r1
    FROM reviews WHERE product_id = ?
  `).get(productId);

  sendJson(res, 200, { reviews: reviews.map(r => ({ ...r, verified_purchase: !!r.verified_purchase })), summary });
}

async function createReview(req, res, productId, user) {
  if (!user) return sendError(res, 401, 'Faça login para avaliar um produto.');

  const body = await parseBody(req);
  const rating = Number(body.rating);
  const comment = (body.comment || '').trim();
  const photoUrl = body.photo_url || null;

  if (!rating || rating < 1 || rating > 5) return sendError(res, 400, 'Nota deve ser entre 1 e 5.');
  if (!comment || comment.length < 3) return sendError(res, 400, 'Escreva um comentário sobre o produto.');

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return sendError(res, 404, 'Produto não encontrado.');

  // Verifica se é uma compra verificada: usuário tem pedido pago contendo este produto
  const purchased = db.prepare(`
    SELECT COUNT(*) as c FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = ? AND oi.product_id = ? AND o.payment_status = 'pago'
  `).get(user.id, productId);
  const verified = purchased.c > 0 ? 1 : 0;

  db.prepare(`INSERT INTO reviews (product_id, user_id, user_name, rating, comment, photo_url, verified_purchase)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(productId, user.id, user.name, rating, comment, photoUrl, verified);

  const agg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(productId);
  db.prepare('UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
    Math.round(agg.avg * 10) / 10, agg.cnt, productId
  );

  sendJson(res, 201, { ok: true, verified_purchase: !!verified });
}

async function replyReview(req, res, reviewId, admin) {
  if (!admin || !admin.is_admin) return sendError(res, 403, 'Acesso restrito ao administrador.');
  const body = await parseBody(req);
  const reply = (body.reply || '').trim();
  if (!reply) return sendError(res, 400, 'Escreva uma resposta.');

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
  if (!review) return sendError(res, 404, 'Avaliação não encontrada.');

  db.prepare(`UPDATE reviews SET admin_reply = ?, admin_reply_at = datetime('now') WHERE id = ?`).run(reply, reviewId);
  sendJson(res, 200, { ok: true });
}

module.exports = { listReviews, createReview, replyReview };
