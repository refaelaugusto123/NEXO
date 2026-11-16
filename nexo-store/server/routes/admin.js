// ===========================================
// NEXO STORE - Rotas do painel administrativo
// Todas as rotas aqui exigem usuário autenticado com is_admin = 1
// ===========================================
'use strict';

const db = require('../db');
const authLib = require('../auth');
const loyaltyLib = require('../loyalty');
const { sendJson, sendError, parseBody, getQuery } = require('../utils');
const { mapProduct } = require('./products');

function requireAdmin(user, res) {
  if (!user || !user.is_admin) {
    sendError(res, 403, 'Acesso restrito a administradores.');
    return false;
  }
  return true;
}

// ---------------- Dashboard / Relatórios ----------------
async function dashboard(req, res, user) {
  if (!requireAdmin(user, res)) return;

  const totalSales = db.prepare(`SELECT COALESCE(SUM(total),0) as v FROM orders WHERE payment_status = 'pago'`).get().v;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const paidOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE payment_status = 'pago'`).get().c;
  const pendingOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE payment_status = 'pendente' OR payment_status = 'aguardando_pagamento'`).get().c;
  const totalCustomers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 0').get().c;
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const lowStock = db.prepare('SELECT id, name, stock FROM products WHERE stock <= 5 AND is_active = 1 ORDER BY stock ASC').all();

  const salesByDay = db.prepare(`
    SELECT date(created_at) as day, SUM(total) as total, COUNT(*) as orders
    FROM orders WHERE payment_status = 'pago' AND created_at >= datetime('now', '-14 days')
    GROUP BY day ORDER BY day ASC
  `).all();

  const topProducts = db.prepare(`
    SELECT p.id, p.name, p.sold_count, p.image_url
    FROM products p ORDER BY sold_count DESC LIMIT 5
  `).all();

  const tierCounts = db.prepare(`
    SELECT loyalty_tier, COUNT(*) as c FROM users WHERE is_admin = 0 GROUP BY loyalty_tier
  `).all();

  sendJson(res, 200, {
    total_sales: totalSales,
    total_orders: totalOrders,
    paid_orders: paidOrders,
    pending_orders: pendingOrders,
    total_customers: totalCustomers,
    total_products: totalProducts,
    low_stock: lowStock,
    sales_by_day: salesByDay,
    top_products: topProducts,
    tier_counts: tierCounts,
  });
}

// ---------------- Produtos ----------------
async function adminListProducts(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  sendJson(res, 200, { products: products.map(mapProduct) });
}

async function adminCreateProduct(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const body = await parseBody(req);
  const required = ['name', 'price', 'category_id'];
  for (const f of required) {
    if (body[f] === undefined || body[f] === '') return sendError(res, 400, `Campo obrigatório: ${f}`);
  }
  const slug = (body.slug || body.name).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const info = db.prepare(`INSERT INTO products
    (name, slug, description, short_description, price, promo_price, stock, sku, category_id, image_url, weight_kg, is_featured, is_bestseller, is_new, is_active)
    VALUES (@name, @slug, @description, @short_description, @price, @promo_price, @stock, @sku, @category_id, @image_url, @weight_kg, @is_featured, @is_bestseller, @is_new, @is_active)`)
    .run({
      name: body.name,
      slug,
      description: body.description || '',
      short_description: body.short_description || '',
      price: Number(body.price),
      promo_price: body.promo_price ? Number(body.promo_price) : null,
      stock: Number(body.stock) || 0,
      sku: body.sku || '',
      category_id: Number(body.category_id),
      image_url: body.image_url || '/img/products/placeholder.svg',
      weight_kg: Number(body.weight_kg) || 0.3,
      is_featured: body.is_featured ? 1 : 0,
      is_bestseller: body.is_bestseller ? 1 : 0,
      is_new: body.is_new ? 1 : 0,
      is_active: body.is_active === false ? 0 : 1,
    });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  sendJson(res, 201, { product: mapProduct(product) });
}

async function adminUpdateProduct(req, res, productId, user) {
  if (!requireAdmin(user, res)) return;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return sendError(res, 404, 'Produto não encontrado.');

  const body = await parseBody(req);
  const fields = ['name', 'description', 'short_description', 'price', 'promo_price', 'stock', 'sku',
    'category_id', 'image_url', 'weight_kg', 'is_featured', 'is_bestseller', 'is_new', 'is_active'];

  const updates = {};
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  const merged = { ...product, ...updates };
  db.prepare(`UPDATE products SET
    name=@name, description=@description, short_description=@short_description, price=@price,
    promo_price=@promo_price, stock=@stock, sku=@sku, category_id=@category_id, image_url=@image_url,
    weight_kg=@weight_kg, is_featured=@is_featured, is_bestseller=@is_bestseller, is_new=@is_new, is_active=@is_active
    WHERE id=@id`).run({
      id: productId,
      name: merged.name,
      description: merged.description,
      short_description: merged.short_description,
      price: Number(merged.price),
      promo_price: merged.promo_price === '' || merged.promo_price === null ? null : Number(merged.promo_price),
      stock: Number(merged.stock),
      sku: merged.sku,
      category_id: Number(merged.category_id),
      image_url: merged.image_url,
      weight_kg: Number(merged.weight_kg),
      is_featured: merged.is_featured ? 1 : 0,
      is_bestseller: merged.is_bestseller ? 1 : 0,
      is_new: merged.is_new ? 1 : 0,
      is_active: merged.is_active ? 1 : 0,
    });

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  sendJson(res, 200, { product: mapProduct(updated) });
}

async function adminDeleteProduct(req, res, productId, user) {
  if (!requireAdmin(user, res)) return;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return sendError(res, 404, 'Produto não encontrado.');
  // Soft delete (inativa) para preservar histórico de pedidos
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(productId);
  sendJson(res, 200, { ok: true });
}

async function adminAddVariant(req, res, productId, user) {
  if (!requireAdmin(user, res)) return;
  const body = await parseBody(req);
  if (!body.type || !body.value) return sendError(res, 400, 'Informe tipo e valor da variação.');
  const info = db.prepare('INSERT INTO product_variants (product_id, type, value, extra_price, stock) VALUES (?, ?, ?, ?, ?)')
    .run(productId, body.type, body.value, Number(body.extra_price) || 0, Number(body.stock) || 0);
  sendJson(res, 201, { variant: db.prepare('SELECT * FROM product_variants WHERE id = ?').get(info.lastInsertRowid) });
}

// ---------------- Pedidos ----------------
async function adminListOrders(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const q = getQuery(req);
  let sql = `SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o JOIN users u ON u.id = o.user_id`;
  const where = [];
  const params = {};
  if (q.status) { where.push('o.status = @status'); params.status = q.status; }
  if (q.search) { where.push('(u.name LIKE @search OR u.email LIKE @search OR o.order_number LIKE @search)'); params.search = `%${q.search}%`; }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY o.created_at DESC LIMIT 200';
  const orders = db.prepare(sql).all(params);
  sendJson(res, 200, { orders });
}

const VALID_STATUSES = ['aguardando_pagamento', 'pago', 'separando', 'enviado', 'entregue', 'cancelado'];

async function adminUpdateOrderStatus(req, res, orderId, user) {
  if (!requireAdmin(user, res)) return;
  const body = await parseBody(req);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return sendError(res, 404, 'Pedido não encontrado.');

  const updates = {};
  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) return sendError(res, 400, 'Status inválido.');
    updates.status = body.status;
  }
  if (body.tracking_code !== undefined) updates.tracking_code = body.tracking_code;
  if (body.tracking_status !== undefined) updates.tracking_status = body.tracking_status;

  const merged = { ...order, ...updates };
  db.prepare(`UPDATE orders SET status=@status, tracking_code=@tracking_code, tracking_status=@tracking_status, updated_at=datetime('now') WHERE id=@id`)
    .run({ id: orderId, status: merged.status, tracking_code: merged.tracking_code, tracking_status: merged.tracking_status });

  sendJson(res, 200, { order: db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) });
}

// ---------------- Clientes ----------------
async function adminListCustomers(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const q = getQuery(req);
  let sql = 'SELECT id, name, email, phone, loyalty_code, loyalty_points, loyalty_tier, created_at FROM users WHERE is_admin = 0';
  const params = {};
  if (q.search) { sql += ' AND (name LIKE @search OR email LIKE @search OR loyalty_code LIKE @search)'; params.search = `%${q.search}%`; }
  sql += ' ORDER BY created_at DESC LIMIT 300';
  const customers = db.prepare(sql).all(params);

  const withStats = customers.map(c => {
    const stats = db.prepare(`SELECT COUNT(*) as orders, COALESCE(SUM(total),0) as spent FROM orders WHERE user_id = ? AND payment_status = 'pago'`).get(c.id);
    return { ...c, orders_count: stats.orders, total_spent: stats.spent };
  });

  sendJson(res, 200, { customers: withStats });
}

// ---------------- Cupons ----------------
async function adminListCoupons(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  sendJson(res, 200, { coupons });
}

async function adminCreateCoupon(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const body = await parseBody(req);
  const { code, description, discount_type, value, min_order, usage_limit, valid_from, valid_until } = body;
  if (!code || !value) return sendError(res, 400, 'Informe código e valor do cupom.');
  if (!['percent', 'fixed'].includes(discount_type)) return sendError(res, 400, 'Tipo de desconto inválido.');

  try {
    const info = db.prepare(`INSERT INTO coupons (code, description, discount_type, value, min_order, usage_limit, valid_from, valid_until, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .run(code.toUpperCase(), description || '', discount_type, Number(value), Number(min_order) || 0,
           usage_limit ? Number(usage_limit) : null, valid_from || null, valid_until || null);
    sendJson(res, 201, { coupon: db.prepare('SELECT * FROM coupons WHERE id = ?').get(info.lastInsertRowid) });
  } catch (err) {
    sendError(res, 409, 'Já existe um cupom com este código.');
  }
}

async function adminUpdateCoupon(req, res, couponId, user) {
  if (!requireAdmin(user, res)) return;
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(couponId);
  if (!coupon) return sendError(res, 404, 'Cupom não encontrado.');
  const body = await parseBody(req);
  const merged = { ...coupon, ...body };
  db.prepare(`UPDATE coupons SET description=@description, discount_type=@discount_type, value=@value, min_order=@min_order,
    usage_limit=@usage_limit, valid_from=@valid_from, valid_until=@valid_until, is_active=@is_active WHERE id=@id`)
    .run({
      id: couponId,
      description: merged.description,
      discount_type: merged.discount_type,
      value: Number(merged.value),
      min_order: Number(merged.min_order),
      usage_limit: merged.usage_limit === '' || merged.usage_limit === null ? null : Number(merged.usage_limit),
      valid_from: merged.valid_from || null,
      valid_until: merged.valid_until || null,
      is_active: merged.is_active ? 1 : 0,
    });
  sendJson(res, 200, { coupon: db.prepare('SELECT * FROM coupons WHERE id = ?').get(couponId) });
}

async function adminDeleteCoupon(req, res, couponId, user) {
  if (!requireAdmin(user, res)) return;
  db.prepare('UPDATE coupons SET is_active = 0 WHERE id = ?').run(couponId);
  sendJson(res, 200, { ok: true });
}

// ---------------- Fidelidade (admin) ----------------
async function adminLoyaltyOverview(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const tiers = loyaltyLib.TIERS.map(t => {
    const count = db.prepare('SELECT COUNT(*) as c FROM users WHERE loyalty_tier = ? AND is_admin = 0').get(t.key).c;
    return { key: t.key, label: t.label, min_points: t.minPoints, discount_pct: t.discountPct, customers: count };
  });
  const topCustomers = db.prepare(`SELECT name, email, loyalty_code, loyalty_points, loyalty_tier FROM users WHERE is_admin = 0 ORDER BY loyalty_points DESC LIMIT 10`).all();
  sendJson(res, 200, { tiers, top_customers: topCustomers, rules: loyaltyLib.LOYALTY_RULES_TEXT });
}

async function adminAdjustLoyaltyPoints(req, res, targetUserId, user) {
  if (!requireAdmin(user, res)) return;
  const body = await parseBody(req);
  const points = Number(body.points);
  const reason = body.reason || 'Ajuste manual pelo administrador';
  if (!points) return sendError(res, 400, 'Informe a quantidade de pontos (positiva ou negativa).');

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
  if (!target) return sendError(res, 404, 'Cliente não encontrado.');

  const newPoints = Math.max(0, target.loyalty_points + points);
  const newTier = loyaltyLib.getTierByPoints(newPoints);
  db.prepare('UPDATE users SET loyalty_points = ?, loyalty_tier = ? WHERE id = ?').run(newPoints, newTier.key, targetUserId);
  db.prepare('INSERT INTO loyalty_events (user_id, points, reason) VALUES (?, ?, ?)').run(targetUserId, points, reason);

  sendJson(res, 200, { ok: true, new_points: newPoints, new_tier: newTier.key });
}

// ---------------- Categorias (admin) ----------------
async function adminCreateCategory(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const body = await parseBody(req);
  if (!body.name) return sendError(res, 400, 'Informe o nome da categoria.');
  const slug = (body.slug || body.name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  try {
    const info = db.prepare('INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)')
      .run(body.name, slug, body.icon || '📦', Number(body.sort_order) || 0);
    sendJson(res, 201, { category: db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid) });
  } catch {
    sendError(res, 409, 'Já existe uma categoria com este slug.');
  }
}

module.exports = {
  dashboard,
  adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminAddVariant,
  adminListOrders, adminUpdateOrderStatus,
  adminListCustomers,
  adminListCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon,
  adminLoyaltyOverview, adminAdjustLoyaltyPoints,
  adminCreateCategory,
};
