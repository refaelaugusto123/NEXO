// ===========================================
// NEXO STORE - Rotas de pedidos / checkout
// ===========================================
'use strict';

const crypto = require('node:crypto');
const db = require('../db');
const { sendJson, sendError, parseBody } = require('../utils');
const { evaluateCoupon } = require('./coupons');
const loyalty = require('../loyalty');
const shippingLib = require('../shipping');
const paymentGateway = require('../payment-gateway');

function generateOrderNumber() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `NEXO-${ymd}-${rand}`;
}

async function createOrder(req, res, user) {
  if (!user) return sendError(res, 401, 'Faça login para finalizar a compra.');

  const body = await parseBody(req);
  const { items, address_id, coupon_code, shipping_method, payment_method, card, new_address } = body;

  if (!Array.isArray(items) || items.length === 0) return sendError(res, 400, 'O carrinho está vazio.');
  if (!['pix', 'credit_card', 'boleto'].includes(payment_method)) return sendError(res, 400, 'Método de pagamento inválido.');

  // ---------- Resolve endereço ----------
  let address;
  if (new_address) {
    const a = new_address;
    if (!a.cep || !a.street || !a.city || !a.state) return sendError(res, 400, 'Endereço incompleto.');
    const info = db.prepare(`INSERT INTO addresses (user_id, label, cep, street, number, complement, neighborhood, city, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(user.id, a.label || 'Entrega', a.cep, a.street, a.number || '', a.complement || '', a.neighborhood || '', a.city, a.state);
    address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(info.lastInsertRowid);
  } else if (address_id) {
    address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(address_id, user.id);
  }
  if (!address) return sendError(res, 400, 'Selecione ou informe um endereço de entrega válido.');

  // ---------- Valida itens e recalcula preços no servidor (nunca confiar no preço enviado pelo cliente) ----------
  let subtotal = 0;
  let totalWeight = 0;
  const resolvedItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
    if (!product) return sendError(res, 400, `Produto ${item.product_id} não encontrado.`);

    let variant = null;
    if (item.variant_id) {
      variant = db.prepare('SELECT * FROM product_variants WHERE id = ? AND product_id = ?').get(item.variant_id, product.id);
      if (!variant) return sendError(res, 400, `Variação inválida para ${product.name}.`);
    }

    const qty = Math.max(1, Math.min(99, Number(item.quantity) || 1));
    const availableStock = variant ? variant.stock : product.stock;
    if (availableStock < qty) {
      return sendError(res, 409, `Estoque insuficiente para "${product.name}"${variant ? ' (' + variant.value + ')' : ''}. Disponível: ${availableStock}.`);
    }

    const unitPrice = (product.promo_price ?? product.price) + (variant ? variant.extra_price : 0);
    subtotal += unitPrice * qty;
    totalWeight += (product.weight_kg || 0.3) * qty;

    resolvedItems.push({
      product, variant, qty, unitPrice,
      label: variant ? `${variant.type}: ${variant.value}` : null,
    });
  }
  subtotal = Math.round(subtotal * 100) / 100;

  // ---------- Desconto: maior entre cupom e fidelidade (não cumulativos) ----------
  let discount = 0;
  let appliedCouponCode = null;
  let loyaltyPct = 0;

  const tier = loyalty.getTierByPoints(user.loyalty_points);
  const loyaltyDiscount = Math.round(subtotal * (tier.discountPct / 100) * 100) / 100;

  let couponDiscount = 0;
  let couponRow = null;
  if (coupon_code) {
    const evalResult = evaluateCoupon(coupon_code, subtotal);
    if (evalResult.valid) {
      couponDiscount = evalResult.discount;
      couponRow = evalResult.coupon;
    } else {
      return sendError(res, 400, evalResult.message);
    }
  }

  if (couponDiscount >= loyaltyDiscount && couponDiscount > 0) {
    discount = couponDiscount;
    appliedCouponCode = couponRow.code;
  } else {
    discount = loyaltyDiscount;
    loyaltyPct = tier.discountPct;
  }

  // ---------- Frete ----------
  const shippingQuote = shippingLib.calculateShippingOptions({
    cep: address.cep,
    totalWeightKg: totalWeight,
    declaredValue: subtotal - discount,
  });
  if (shippingQuote.error) return sendError(res, 400, shippingQuote.error);
  const chosenShipping = shippingQuote.options.find(o => o.id === shipping_method) || shippingQuote.options[0];

  const total = Math.round((subtotal - discount + chosenShipping.price) * 100) / 100;

  // ---------- Pagamento (sandbox) ----------
  const orderNumber = generateOrderNumber();
  const paymentResult = paymentGateway.processPayment({
    method: payment_method, amount: total, orderNumber, card,
  });

  if (paymentResult.status === 'recusado') {
    return sendError(res, 402, paymentResult.extra?.mensagem || 'Pagamento recusado.', { payment: paymentResult });
  }

  // ---------- Persiste pedido ----------
  const addressSnapshot = JSON.stringify(address);
  const insOrder = db.prepare(`INSERT INTO orders
    (order_number, user_id, status, subtotal, discount, coupon_code, shipping_cost, shipping_method, shipping_days,
     total, loyalty_discount_pct, address_id, address_snapshot, payment_method, payment_status, payment_reference, tracking_status)
    VALUES (@order_number, @user_id, @status, @subtotal, @discount, @coupon_code, @shipping_cost, @shipping_method, @shipping_days,
     @total, @loyalty_discount_pct, @address_id, @address_snapshot, @payment_method, @payment_status, @payment_reference, @tracking_status)`);

  const status = paymentResult.status === 'pago' ? 'pago' : 'aguardando_pagamento';
  const info = insOrder.run({
    order_number: orderNumber,
    user_id: user.id,
    status,
    subtotal,
    discount,
    coupon_code: appliedCouponCode,
    shipping_cost: chosenShipping.price,
    shipping_method: chosenShipping.name,
    shipping_days: chosenShipping.days,
    total,
    loyalty_discount_pct: loyaltyPct,
    address_id: address.id,
    address_snapshot: addressSnapshot,
    payment_method,
    payment_status: paymentResult.status,
    payment_reference: paymentResult.reference,
    tracking_status: 'Pedido recebido',
  });

  const orderId = info.lastInsertRowid;

  const insItem = db.prepare(`INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, unit_price, quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const ri of resolvedItems) {
    insItem.run(orderId, ri.product.id, ri.variant ? ri.variant.id : null, ri.product.name, ri.label, ri.unitPrice, ri.qty);
    // Baixa de estoque
    if (ri.variant) {
      db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?').run(ri.qty, ri.variant.id);
    }
    db.prepare('UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?').run(ri.qty, ri.qty, ri.product.id);
  }

  if (appliedCouponCode) {
    db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(appliedCouponCode);
  }

  // ---------- Pontos de fidelidade (somente se pago) ----------
  let pointsEarned = 0;
  if (status === 'pago') {
    pointsEarned = loyalty.computePointsFromTotal(total);
    db.prepare('UPDATE orders SET points_earned = ? WHERE id = ?').run(pointsEarned, orderId);
    db.prepare('INSERT INTO loyalty_events (user_id, order_id, points, reason) VALUES (?, ?, ?, ?)')
      .run(user.id, orderId, pointsEarned, `Compra ${orderNumber}`);

    const newTotalPoints = user.loyalty_points + pointsEarned;
    const newTier = loyalty.getTierByPoints(newTotalPoints);
    db.prepare('UPDATE users SET loyalty_points = ?, loyalty_tier = ? WHERE id = ?').run(newTotalPoints, newTier.key, user.id);
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  sendJson(res, 201, {
    order: { ...order, items: orderItems, address: JSON.parse(order.address_snapshot) },
    payment: paymentResult,
    points_earned: pointsEarned,
  });
}

async function listMyOrders(req, res, user) {
  if (!user) return sendError(res, 401, 'Não autenticado.');
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
  const withItems = orders.map(o => ({
    ...o,
    address: o.address_snapshot ? JSON.parse(o.address_snapshot) : null,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id),
  }));
  sendJson(res, 200, { orders: withItems });
}

async function getOrder(req, res, orderId, user) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return sendError(res, 404, 'Pedido não encontrado.');
  if (!user || (order.user_id !== user.id && !user.is_admin)) return sendError(res, 403, 'Acesso negado.');
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  sendJson(res, 200, { order: { ...order, items, address: order.address_snapshot ? JSON.parse(order.address_snapshot) : null } });
}

// Simula confirmação de pagamento assíncrono (PIX/boleto) - endpoint de demonstração
async function simulateConfirmPayment(req, res, orderId, user) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return sendError(res, 404, 'Pedido não encontrado.');
  if (!user || (order.user_id !== user.id && !user.is_admin)) return sendError(res, 403, 'Acesso negado.');
  if (order.payment_status === 'pago') return sendJson(res, 200, { ok: true, message: 'Pagamento já confirmado.' });

  db.prepare(`UPDATE orders SET payment_status = 'pago', status = 'pago', updated_at = datetime('now') WHERE id = ?`).run(orderId);

  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id);
  const pointsEarned = loyalty.computePointsFromTotal(order.total);
  db.prepare('UPDATE orders SET points_earned = ? WHERE id = ?').run(pointsEarned, orderId);
  db.prepare('INSERT INTO loyalty_events (user_id, order_id, points, reason) VALUES (?, ?, ?, ?)')
    .run(owner.id, orderId, pointsEarned, `Compra ${order.order_number}`);
  const newTotalPoints = owner.loyalty_points + pointsEarned;
  const newTier = loyalty.getTierByPoints(newTotalPoints);
  db.prepare('UPDATE users SET loyalty_points = ?, loyalty_tier = ? WHERE id = ?').run(newTotalPoints, newTier.key, owner.id);

  sendJson(res, 200, { ok: true, message: 'Pagamento confirmado (simulação sandbox).', points_earned: pointsEarned });
}

module.exports = { createOrder, listMyOrders, getOrder, simulateConfirmPayment };
