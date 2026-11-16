// ===========================================
// NEXO STORE - Servidor principal
// Node.js puro (http + node:sqlite), sem dependências externas
// ===========================================
'use strict';

// Carrega variáveis de ambiente do .env (parser simples, sem dependência externa)
(function loadEnv() {
  const fs = require('node:fs');
  const path = require('node:path');
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
})();

const http = require('node:http');
const path = require('node:path');
const { serveStatic, parseCookies, sendError, sendJson } = require('./utils');
const authLib = require('./auth');
const { run: seed } = require('./seed-data');

// Garante que o banco já tenha dados de demonstração na primeira execução
seed();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const reviewRoutes = require('./routes/reviews');
const couponRoutes = require('./routes/coupons');
const shippingRoutes = require('./routes/shipping');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const loyaltyRoutes = require('./routes/loyalty');
const adminRoutes = require('./routes/admin');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

function getCurrentUser(req, cookies) {
  const token = cookies[authRoutes.COOKIE_NAME];
  return authLib.getUserBySessionToken(token);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const method = req.method;
    const cookies = parseCookies(req);

    // -------- API --------
    if (pathname.startsWith('/api/')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const user = getCurrentUser(req, cookies);
      let m;

      // ---- Auth ----
      if (pathname === '/api/auth/register' && method === 'POST') return await authRoutes.register(req, res);
      if (pathname === '/api/auth/login' && method === 'POST') return await authRoutes.login(req, res);
      if (pathname === '/api/auth/logout' && method === 'POST') return await authRoutes.logout(req, res, cookies);
      if (pathname === '/api/auth/me' && method === 'GET') return await authRoutes.me(req, res, cookies);
      if (pathname === '/api/auth/forgot-password' && method === 'POST') return await authRoutes.forgotPassword(req, res);
      if (pathname === '/api/auth/reset-password' && method === 'POST') return await authRoutes.resetPassword(req, res);

      // ---- Categorias ----
      if (pathname === '/api/categories' && method === 'GET') return await productRoutes.listCategories(req, res);

      // ---- Produtos ----
      if (pathname === '/api/products' && method === 'GET') return await productRoutes.listProducts(req, res);
      if ((m = pathname.match(/^\/api\/products\/([^/]+)$/)) && method === 'GET') return await productRoutes.getProduct(req, res, m[1]);

      // ---- Avaliações ----
      if ((m = pathname.match(/^\/api\/products\/(\d+)\/reviews$/)) && method === 'GET') return await reviewRoutes.listReviews(req, res, m[1]);
      if ((m = pathname.match(/^\/api\/products\/(\d+)\/reviews$/)) && method === 'POST') return await reviewRoutes.createReview(req, res, m[1], user);
      if ((m = pathname.match(/^\/api\/reviews\/(\d+)\/reply$/)) && method === 'POST') return await reviewRoutes.replyReview(req, res, m[1], user);

      // ---- Cupons ----
      if (pathname === '/api/coupons/validate' && method === 'POST') return await couponRoutes.validateCoupon(req, res);

      // ---- Frete / CEP ----
      if ((m = pathname.match(/^\/api\/shipping\/cep\/(\d+)$/)) && method === 'GET') return await shippingRoutes.getCep(req, res, m[1]);
      if (pathname === '/api/shipping/quote' && method === 'POST') return await shippingRoutes.quoteShipping(req, res);

      // ---- Pedidos ----
      if (pathname === '/api/orders' && method === 'POST') return await orderRoutes.createOrder(req, res, user);
      if (pathname === '/api/orders' && method === 'GET') return await orderRoutes.listMyOrders(req, res, user);
      if ((m = pathname.match(/^\/api\/orders\/(\d+)$/)) && method === 'GET') return await orderRoutes.getOrder(req, res, m[1], user);
      if ((m = pathname.match(/^\/api\/orders\/(\d+)\/simulate-payment$/)) && method === 'POST') return await orderRoutes.simulateConfirmPayment(req, res, m[1], user);

      // ---- Usuário ----
      if (pathname === '/api/users/me' && method === 'PUT') return await userRoutes.updateProfile(req, res, user);
      if (pathname === '/api/users/me/addresses' && method === 'GET') return await userRoutes.listAddresses(req, res, user);
      if (pathname === '/api/users/me/addresses' && method === 'POST') return await userRoutes.createAddress(req, res, user);
      if ((m = pathname.match(/^\/api\/users\/me\/addresses\/(\d+)$/)) && method === 'DELETE') return await userRoutes.deleteAddress(req, res, m[1], user);

      // ---- Fidelidade ----
      if (pathname === '/api/loyalty/me' && method === 'GET') return await loyaltyRoutes.getMyLoyalty(req, res, user);

      // ---- Admin ----
      if (pathname === '/api/admin/dashboard' && method === 'GET') return await adminRoutes.dashboard(req, res, user);
      if (pathname === '/api/admin/products' && method === 'GET') return await adminRoutes.adminListProducts(req, res, user);
      if (pathname === '/api/admin/products' && method === 'POST') return await adminRoutes.adminCreateProduct(req, res, user);
      if ((m = pathname.match(/^\/api\/admin\/products\/(\d+)$/)) && method === 'PUT') return await adminRoutes.adminUpdateProduct(req, res, m[1], user);
      if ((m = pathname.match(/^\/api\/admin\/products\/(\d+)$/)) && method === 'DELETE') return await adminRoutes.adminDeleteProduct(req, res, m[1], user);
      if ((m = pathname.match(/^\/api\/admin\/products\/(\d+)\/variants$/)) && method === 'POST') return await adminRoutes.adminAddVariant(req, res, m[1], user);
      if (pathname === '/api/admin/categories' && method === 'POST') return await adminRoutes.adminCreateCategory(req, res, user);
      if (pathname === '/api/admin/orders' && method === 'GET') return await adminRoutes.adminListOrders(req, res, user);
      if ((m = pathname.match(/^\/api\/admin\/orders\/(\d+)$/)) && method === 'PUT') return await adminRoutes.adminUpdateOrderStatus(req, res, m[1], user);
      if (pathname === '/api/admin/customers' && method === 'GET') return await adminRoutes.adminListCustomers(req, res, user);
      if (pathname === '/api/admin/coupons' && method === 'GET') return await adminRoutes.adminListCoupons(req, res, user);
      if (pathname === '/api/admin/coupons' && method === 'POST') return await adminRoutes.adminCreateCoupon(req, res, user);
      if ((m = pathname.match(/^\/api\/admin\/coupons\/(\d+)$/)) && method === 'PUT') return await adminRoutes.adminUpdateCoupon(req, res, m[1], user);
      if ((m = pathname.match(/^\/api\/admin\/coupons\/(\d+)$/)) && method === 'DELETE') return await adminRoutes.adminDeleteCoupon(req, res, m[1], user);
      if (pathname === '/api/admin/loyalty' && method === 'GET') return await adminRoutes.adminLoyaltyOverview(req, res, user);
      if ((m = pathname.match(/^\/api\/admin\/loyalty\/(\d+)\/adjust$/)) && method === 'POST') return await adminRoutes.adminAdjustLoyaltyPoints(req, res, m[1], user);

      return sendError(res, 404, 'Endpoint não encontrado.');
    }

    // -------- Arquivos estáticos (frontend) --------
    const served = serveStatic(req, res, PUBLIC_DIR);
    if (served) return;

    // Fallback: 404 simples
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - Página não encontrada</h1><p><a href="/">Voltar para a loja</a></p>');
  } catch (err) {
    console.error('Erro no servidor:', err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Erro interno do servidor.' });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('========================================================');
  console.log('  NEXO STORE rodando!');
  console.log(`  Loja:  http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin`);
  console.log('========================================================');
  console.log('');
});
