// ===========================================
// NEXO STORE - Rotas de produtos e categorias
// ===========================================
'use strict';

const db = require('../db');
const { sendJson, sendError, getQuery } = require('../utils');

function mapProduct(p) {
  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id);
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(p.id);
  return {
    ...p,
    is_featured: !!p.is_featured,
    is_bestseller: !!p.is_bestseller,
    is_new: !!p.is_new,
    is_active: !!p.is_active,
    in_stock: p.stock > 0,
    discount_pct: p.promo_price ? Math.round((1 - p.promo_price / p.price) * 100) : 0,
    variants,
    images,
  };
}

async function listProducts(req, res) {
  const q = getQuery(req);
  const where = ['is_active = 1'];
  const params = {};

  if (q.category) {
    where.push('category_id = (SELECT id FROM categories WHERE slug = @category)');
    params.category = q.category;
  }
  if (q.search) {
    where.push('(name LIKE @search OR description LIKE @search)');
    params.search = `%${q.search}%`;
  }
  if (q.min_price) {
    where.push('COALESCE(promo_price, price) >= @min_price');
    params.min_price = Number(q.min_price);
  }
  if (q.max_price) {
    where.push('COALESCE(promo_price, price) <= @max_price');
    params.max_price = Number(q.max_price);
  }
  if (q.featured === '1') where.push('is_featured = 1');
  if (q.bestseller === '1') where.push('is_bestseller = 1');
  if (q.is_new === '1') where.push('is_new = 1');
  if (q.on_sale === '1') where.push('promo_price IS NOT NULL');
  if (q.in_stock === '1') where.push('stock > 0');

  let orderBy = 'created_at DESC';
  if (q.sort === 'price_asc') orderBy = 'COALESCE(promo_price, price) ASC';
  if (q.sort === 'price_desc') orderBy = 'COALESCE(promo_price, price) DESC';
  if (q.sort === 'rating') orderBy = 'rating_avg DESC';
  if (q.sort === 'bestseller') orderBy = 'sold_count DESC';
  if (q.sort === 'name') orderBy = 'name ASC';

  const limit = Math.min(Number(q.limit) || 100, 200);
  const offset = Number(q.offset) || 0;

  const sql = `SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`;
  const rows = db.prepare(sql).all({ ...params, limit, offset });

  const countSql = `SELECT COUNT(*) as total FROM products WHERE ${where.join(' AND ')}`;
  const { total } = db.prepare(countSql).get(params);

  sendJson(res, 200, { products: rows.map(mapProduct), total });
}

async function getProduct(req, res, slugOrId) {
  let product;
  if (/^\d+$/.test(slugOrId)) {
    product = db.prepare('SELECT * FROM products WHERE id = ?').get(slugOrId);
  } else {
    product = db.prepare('SELECT * FROM products WHERE slug = ?').get(slugOrId);
  }
  if (!product) return sendError(res, 404, 'Produto não encontrado.');
  sendJson(res, 200, { product: mapProduct(product) });
}

async function listCategories(req, res) {
  const categories = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
    FROM categories c ORDER BY sort_order ASC
  `).all();
  sendJson(res, 200, { categories });
}

module.exports = { listProducts, getProduct, listCategories, mapProduct };
