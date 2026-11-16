// ===========================================
// NEXO STORE - Seed de dados de demonstração
// Execute com: npm run seed
// ===========================================
'use strict';

const db = require('./db');
const { hashPassword, generateLoyaltyCode } = require('./auth');

function run() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM products').get();
  if (existing.c > 0) {
    console.log('Banco já contém produtos. Seed ignorado (apague data/nexostore.db para recriar).');
    ensureAdmin();
    return;
  }

  console.log('Populando banco de dados com dados de demonstração...');

  // ---------------- Categorias ----------------
  const categories = [
    { name: 'Teclados', slug: 'teclados', icon: '⌨️' },
    { name: 'Mouses', slug: 'mouses', icon: '🖱️' },
    { name: 'Mousepads', slug: 'mousepads', icon: '🟪' },
    { name: 'Suportes', slug: 'suportes', icon: '🗜️' },
    { name: 'Áudio', slug: 'audio', icon: '🎧' },
    { name: 'Lifestyle', slug: 'lifestyle', icon: '✨' },
  ];
  const insCat = db.prepare('INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)');
  const catIds = {};
  categories.forEach((c, i) => {
    const info = insCat.run(c.name, c.slug, c.icon, i);
    catIds[c.slug] = info.lastInsertRowid;
  });

  // ---------------- Produtos ----------------
  const insProd = db.prepare(`INSERT INTO products
    (name, slug, description, short_description, price, promo_price, stock, sku, category_id, image_url, weight_kg, is_featured, is_bestseller, is_new, rating_avg, rating_count, sold_count)
    VALUES (@name, @slug, @description, @short_description, @price, @promo_price, @stock, @sku, @category_id, @image_url, @weight_kg, @is_featured, @is_bestseller, @is_new, @rating_avg, @rating_count, @sold_count)`);

  const insVariant = db.prepare('INSERT INTO product_variants (product_id, type, value, extra_price, stock) VALUES (?, ?, ?, ?, ?)');

  const products = [
    {
      name: 'Teclado Mecânico NEXO Vortex RGB',
      slug: 'teclado-mecanico-nexo-vortex-rgb',
      description: 'Teclado mecânico gamer com switches hot-swap, iluminação RGB por tecla totalmente customizável, estrutura em alumínio escovado e layout ABNT2. Ideal para gaming e produtividade, com software NEXO Hub para criar perfis de iluminação e macros.',
      short_description: 'Switches hot-swap, RGB por tecla e estrutura em alumínio.',
      price: 549.9, promo_price: 459.9, stock: 42, sku: 'NX-KB-001',
      category_id: catIds['teclados'], image_url: '/img/products/teclado-vortex.svg',
      weight_kg: 1.1, is_featured: 1, is_bestseller: 1, is_new: 0, rating_avg: 4.8, rating_count: 134, sold_count: 980,
      variants: [
        { type: 'Switch', value: 'Red (Linear)', extra_price: 0, stock: 20 },
        { type: 'Switch', value: 'Brown (Tátil)', extra_price: 0, stock: 15 },
        { type: 'Switch', value: 'Blue (Clicky)', extra_price: 20, stock: 7 },
      ],
    },
    {
      name: 'Teclado Slim NEXO Air 75%',
      slug: 'teclado-slim-nexo-air-75',
      description: 'Teclado compacto 75% com perfil baixo, ótimo para notebooks e mesas pequenas. Conexão via Bluetooth 5.0 e cabo USB-C, bateria de até 200h de uso.',
      short_description: 'Compacto 75%, Bluetooth 5.0, bateria de longa duração.',
      price: 329.9, promo_price: null, stock: 58, sku: 'NX-KB-002',
      category_id: catIds['teclados'], image_url: '/img/products/teclado-air.svg',
      weight_kg: 0.6, is_featured: 0, is_bestseller: 0, is_new: 1, rating_avg: 4.6, rating_count: 47, sold_count: 210,
      variants: [
        { type: 'Cor', value: 'Preto Grafite', extra_price: 0, stock: 30 },
        { type: 'Cor', value: 'Branco Gelo', extra_price: 0, stock: 28 },
      ],
    },
    {
      name: 'Mouse Gamer NEXO Pulse',
      slug: 'mouse-gamer-nexo-pulse',
      description: 'Mouse gamer ultraleve (58g) com sensor óptico de 26.000 DPI, switches ópticos com 80 milhões de cliques e iluminação neon personalizável.',
      short_description: 'Ultraleve 58g, sensor de 26.000 DPI, switches ópticos.',
      price: 279.9, promo_price: 219.9, stock: 76, sku: 'NX-MS-001',
      category_id: catIds['mouses'], image_url: '/img/products/mouse-pulse.svg',
      weight_kg: 0.15, is_featured: 1, is_bestseller: 1, is_new: 0, rating_avg: 4.9, rating_count: 256, sold_count: 1540,
      variants: [
        { type: 'Cor', value: 'Preto Neon Azul', extra_price: 0, stock: 40 },
        { type: 'Cor', value: 'Branco Neon Roxo', extra_price: 0, stock: 36 },
      ],
    },
    {
      name: 'Mouse Ergonômico NEXO Flow',
      slug: 'mouse-ergonomico-nexo-flow',
      description: 'Mouse vertical ergonômico que reduz a tensão no pulso, com 6 botões programáveis e conexão sem fio 2.4GHz + Bluetooth.',
      short_description: 'Design vertical ergonômico, 6 botões programáveis.',
      price: 189.9, promo_price: null, stock: 33, sku: 'NX-MS-002',
      category_id: catIds['mouses'], image_url: '/img/products/mouse-flow.svg',
      weight_kg: 0.14, is_featured: 0, is_bestseller: 0, is_new: 1, rating_avg: 4.5, rating_count: 29, sold_count: 88,
      variants: [],
    },
    {
      name: 'Mousepad NEXO Horizon XXL',
      slug: 'mousepad-nexo-horizon-xxl',
      description: 'Mousepad extra grande (900x400mm) com base em borracha antiderrapante, costura reforçada nas bordas e superfície de controle suave.',
      short_description: 'Extra grande 900x400mm, base antiderrapante.',
      price: 99.9, promo_price: 79.9, stock: 120, sku: 'NX-MP-001',
      category_id: catIds['mousepads'], image_url: '/img/products/mousepad-horizon.svg',
      weight_kg: 0.35, is_featured: 1, is_bestseller: 1, is_new: 0, rating_avg: 4.7, rating_count: 302, sold_count: 2100,
      variants: [
        { type: 'Estampa', value: 'Grid Neon Azul', extra_price: 0, stock: 60 },
        { type: 'Estampa', value: 'Grid Neon Roxo', extra_price: 0, stock: 60 },
      ],
    },
    {
      name: 'Mousepad NEXO Glow RGB',
      slug: 'mousepad-nexo-glow-rgb',
      description: 'Mousepad com iluminação RGB nas bordas, sincronizável com outros periféricos NEXO via software NEXO Hub. Superfície de tecido premium.',
      short_description: 'Iluminação RGB nas bordas, superfície premium.',
      price: 149.9, promo_price: null, stock: 44, sku: 'NX-MP-002',
      category_id: catIds['mousepads'], image_url: '/img/products/mousepad-glow.svg',
      weight_kg: 0.4, is_featured: 0, is_bestseller: 0, is_new: 1, rating_avg: 4.6, rating_count: 18, sold_count: 61,
      variants: [],
    },
    {
      name: 'Suporte para Headset NEXO Pillar',
      slug: 'suporte-headset-nexo-pillar',
      description: 'Suporte de mesa em alumínio para headset, com base de borracha antiderrapante e cabo organizador embutido. Design minimalista com acabamento neon.',
      short_description: 'Alumínio premium, base antiderrapante, organizador de cabo.',
      price: 119.9, promo_price: 99.9, stock: 67, sku: 'NX-ST-001',
      category_id: catIds['suportes'], image_url: '/img/products/suporte-pillar.svg',
      weight_kg: 0.5, is_featured: 0, is_bestseller: 1, is_new: 0, rating_avg: 4.7, rating_count: 91, sold_count: 430,
      variants: [],
    },
    {
      name: 'Suporte para Notebook NEXO Elevate',
      slug: 'suporte-notebook-nexo-elevate',
      description: 'Suporte ergonômico ajustável em 6 níveis de altura, com ventilação otimizada para reduzir o aquecimento do notebook. Compatível com telas de 11" a 17".',
      short_description: 'Ajustável em 6 níveis, melhora ventilação do notebook.',
      price: 169.9, promo_price: null, stock: 52, sku: 'NX-ST-002',
      category_id: catIds['suportes'], image_url: '/img/products/suporte-elevate.svg',
      weight_kg: 0.9, is_featured: 1, is_bestseller: 0, is_new: 1, rating_avg: 4.8, rating_count: 22, sold_count: 75,
      variants: [],
    },
    {
      name: 'Headset NEXO Sonic Pro',
      slug: 'headset-nexo-sonic-pro',
      description: 'Headset gamer com som surround 7.1, microfone com cancelamento de ruído retrátil e almofadas em espuma de memória. Iluminação RGB nos fones.',
      short_description: 'Som surround 7.1, microfone com cancelamento de ruído.',
      price: 399.9, promo_price: 329.9, stock: 38, sku: 'NX-AU-001',
      category_id: catIds['audio'], image_url: '/img/products/headset-sonic.svg',
      weight_kg: 0.45, is_featured: 1, is_bestseller: 1, is_new: 0, rating_avg: 4.8, rating_count: 178, sold_count: 690,
      variants: [],
    },
    {
      name: 'Caixa de Som Bluetooth NEXO Orbit',
      slug: 'caixa-som-nexo-orbit',
      description: 'Caixa de som portátil à prova d\'água (IPX6) com 12h de bateria, iluminação neon reativa ao som e graves potentes.',
      short_description: 'Portátil, à prova d\'água, iluminação reativa ao som.',
      price: 229.9, promo_price: null, stock: 60, sku: 'NX-AU-002',
      category_id: catIds['audio'], image_url: '/img/products/caixa-orbit.svg',
      weight_kg: 0.6, is_featured: 0, is_bestseller: 0, is_new: 1, rating_avg: 4.6, rating_count: 41, sold_count: 150,
      variants: [],
    },
    {
      name: 'Garrafa Térmica NEXO Flux',
      slug: 'garrafa-termica-nexo-flux',
      description: 'Garrafa térmica inteligente que mantém líquidos gelados por 24h ou quentes por 12h, com visor de temperatura LED integrado.',
      short_description: 'Visor LED de temperatura, mantém gelado por 24h.',
      price: 139.9, promo_price: 109.9, stock: 85, sku: 'NX-LS-001',
      category_id: catIds['lifestyle'], image_url: '/img/products/garrafa-flux.svg',
      weight_kg: 0.5, is_featured: 0, is_bestseller: 1, is_new: 0, rating_avg: 4.7, rating_count: 203, sold_count: 1020,
      variants: [
        { type: 'Cor', value: 'Preto Fosco', extra_price: 0, stock: 40 },
        { type: 'Cor', value: 'Azul Elétrico', extra_price: 0, stock: 45 },
      ],
    },
    {
      name: 'Mochila NEXO Commuter Tech',
      slug: 'mochila-nexo-commuter-tech',
      description: 'Mochila resistente à água com compartimento acolchoado para notebook de até 16", porta USB externa para carregamento e design urbano com detalhes neon.',
      short_description: 'Resistente à água, compartimento para notebook 16", porta USB.',
      price: 299.9, promo_price: 249.9, stock: 47, sku: 'NX-LS-002',
      category_id: catIds['lifestyle'], image_url: '/img/products/mochila-commuter.svg',
      weight_kg: 0.8, is_featured: 1, is_bestseller: 0, is_new: 1, rating_avg: 4.9, rating_count: 64, sold_count: 310,
      variants: [],
    },
  ];

  const productIds = {};
  for (const p of products) {
    const { variants, ...prodData } = p;
    const info = insProd.run(prodData);
    productIds[p.slug] = info.lastInsertRowid;
    for (const v of variants || []) {
      insVariant.run(info.lastInsertRowid, v.type, v.value, v.extra_price, v.stock);
    }
  }

  // ---------------- Avaliações de demonstração ----------------
  const insReview = db.prepare(`INSERT INTO reviews (product_id, user_name, rating, comment, verified_purchase, created_at)
    VALUES (?, ?, ?, ?, 1, datetime('now', ?))`);

  const demoReviews = [
    ['teclado-mecanico-nexo-vortex-rgb', 'Carlos M.', 5, 'Excelente custo-benefício, o RGB é lindo e o som do switch é ótimo.', '-20 days'],
    ['teclado-mecanico-nexo-vortex-rgb', 'Fernanda S.', 5, 'Troquei os switches facilmente graças ao hot-swap. Recomendo muito!', '-12 days'],
    ['teclado-mecanico-nexo-vortex-rgb', 'Lucas P.', 4, 'Muito bom, só acho que poderia vir com mais keycaps extras.', '-5 days'],
    ['mouse-gamer-nexo-pulse', 'Ana R.', 5, 'Leveza impressionante, sinto muito mais controle nos jogos competitivos.', '-18 days'],
    ['mouse-gamer-nexo-pulse', 'Pedro H.', 5, 'Melhor mouse que já usei, a iluminação combina com meu setup.', '-9 days'],
    ['mousepad-nexo-horizon-xxl', 'Juliana K.', 5, 'Enorme, cobre todo o meu teclado e mouse. Qualidade de costura ótima.', '-30 days'],
    ['mousepad-nexo-horizon-xxl', 'Rafael T.', 4, 'Muito bom, mas achei um pouco grosso para o meu gosto.', '-14 days'],
    ['headset-nexo-sonic-pro', 'Marina D.', 5, 'O microfone realmente corta o ruído do teclado mecânico, muito satisfeita.', '-7 days'],
    ['suporte-headset-nexo-pillar', 'Bruno A.', 5, 'Deixou minha mesa muito mais organizada, acabamento premium.', '-3 days'],
    ['garrafa-termica-nexo-flux', 'Camila V.', 5, 'O visor de temperatura é um diferencial incrível, super recomendo.', '-25 days'],
  ];
  for (const [slug, name, rating, comment, when] of demoReviews) {
    insReview.run(productIds[slug], name, rating, comment, when);
  }

  // Recalcula rating_avg/rating_count reais a partir das reviews inseridas, somado ao "histórico" simulado inicial
  for (const slug of Object.keys(productIds)) {
    const pid = productIds[slug];
    const agg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(pid);
    if (agg.cnt > 0) {
      // Mistura com o rating "histórico" de demonstração já definido no insert, mantendo plausibilidade
      db.prepare('UPDATE products SET rating_count = rating_count + ? WHERE id = ?').run(agg.cnt, pid);
    }
  }

  // ---------------- Cupons ----------------
  const insCoupon = db.prepare(`INSERT INTO coupons (code, description, discount_type, value, min_order, usage_limit, valid_from, valid_until, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`);
  insCoupon.run('BEMVINDO10', 'Cupom de boas-vindas - 10% off', 'percent', 10, 50, null, null, null);
  insCoupon.run('NEXO20', '20% de desconto em compras acima de R$200', 'percent', 20, 200, 500, null, null);
  insCoupon.run('FRETE15', 'R$15 de desconto', 'fixed', 15, 80, null, null, null);
  insCoupon.run('BLACKNEXO', 'Oferta especial - 30% off', 'percent', 30, 150, 100, '2026-11-01', '2026-11-30');

  ensureAdmin();

  console.log('Seed concluído com sucesso!');
  console.log(`- ${products.length} produtos cadastrados`);
  console.log(`- ${categories.length} categorias cadastradas`);
  console.log(`- ${demoReviews.length} avaliações cadastradas`);
  console.log('- 4 cupons cadastrados (BEMVINDO10, NEXO20, FRETE15, BLACKNEXO)');
}

function ensureAdmin() {
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@nexostore.com.br');
  if (admin) {
    console.log('Usuário admin já existe (admin@nexostore.com.br).');
    return;
  }
  const { hash, salt } = hashPassword('Admin@123');
  db.prepare(`INSERT INTO users (name, email, phone, password_hash, password_salt, is_admin, loyalty_code, loyalty_points, loyalty_tier)
    VALUES (?, ?, ?, ?, ?, 1, ?, 0, 'inicial')`)
    .run('Administrador NEXO', 'admin@nexostore.com.br', '(11) 99999-0000', hash, salt, generateLoyaltyCode());
  console.log('');
  console.log('========================================================');
  console.log(' Usuário administrador criado:');
  console.log('   E-mail: admin@nexostore.com.br');
  console.log('   Senha:  Admin@123');
  console.log(' Troque esta senha após o primeiro acesso em produção!');
  console.log('========================================================');
}

if (require.main === module) {
  run();
}

module.exports = { run };
