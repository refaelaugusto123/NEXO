// ===========================================
// NEXO STORE - Rotas de cupons
// ===========================================
'use strict';

const db = require('../db');
const { sendJson, sendError, parseBody } = require('../utils');

function evaluateCoupon(code, subtotal) {
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE').get(code);
  if (!coupon) return { valid: false, message: 'Cupom não encontrado.' };
  if (!coupon.is_active) return { valid: false, message: 'Este cupom não está mais ativo.' };

  const now = new Date();
  if (coupon.valid_from && now < new Date(coupon.valid_from)) return { valid: false, message: 'Este cupom ainda não é válido.' };
  if (coupon.valid_until && now > new Date(coupon.valid_until + 'T23:59:59')) return { valid: false, message: 'Este cupom expirou.' };
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) return { valid: false, message: 'Este cupom atingiu o limite de uso.' };
  if (subtotal < coupon.min_order) return { valid: false, message: `Pedido mínimo de R$ ${coupon.min_order.toFixed(2)} para usar este cupom.` };

  const discount = coupon.discount_type === 'percent'
    ? subtotal * (coupon.value / 100)
    : Math.min(coupon.value, subtotal);

  return { valid: true, coupon, discount: Math.round(discount * 100) / 100 };
}

async function validateCoupon(req, res) {
  const body = await parseBody(req);
  const code = (body.code || '').trim();
  const subtotal = Number(body.subtotal) || 0;
  if (!code) return sendError(res, 400, 'Informe o código do cupom.');

  const result = evaluateCoupon(code, subtotal);
  if (!result.valid) return sendError(res, 400, result.message);

  sendJson(res, 200, {
    valid: true,
    code: result.coupon.code,
    discount: result.discount,
    description: result.coupon.description,
  });
}

module.exports = { validateCoupon, evaluateCoupon };
