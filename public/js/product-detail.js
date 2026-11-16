// ===========================================
// NEXO STORE - Página de detalhe do produto
// ===========================================
'use strict';

let currentProduct = null;
let selectedVariants = {}; // type -> variant object
let currentQty = 1;

function getSlug() {
  return new URLSearchParams(window.location.search).get('slug');
}

function pickSelectedVariant() {
  if (!currentProduct.variants.length) return null;
  const types = [...new Set(currentProduct.variants.map(v => v.type))];
  for (const t of types) {
    if (!selectedVariants[t]) return null;
  }
  // Nesta demo, cada variante é uma linha única (tipo+valor), não combinação múltipla complexa
  return Object.values(selectedVariants)[0];
}

function renderVariants() {
  const el = document.getElementById('pd-variants');
  if (!currentProduct.variants.length) { el.innerHTML = ''; return; }

  const byType = {};
  currentProduct.variants.forEach(v => { (byType[v.type] ||= []).push(v); });

  el.innerHTML = Object.entries(byType).map(([type, options]) => `
    <div class="variant-group">
      <div class="label">${NexoUI.escapeHtml(type)}</div>
      <div class="variant-options">
        ${options.map(v => `
          <div class="variant-chip ${selectedVariants[type]?.id === v.id ? 'selected' : ''}" data-vid="${v.id}" data-type="${NexoUI.escapeHtml(type)}">
            ${NexoUI.escapeHtml(v.value)} ${v.extra_price > 0 ? `(+${NexoUI.formatBRL(v.extra_price)})` : ''}
            ${v.stock <= 0 ? ' - esgotado' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.variant-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const vid = Number(chip.dataset.vid);
      const type = chip.dataset.type;
      const variant = currentProduct.variants.find(v => v.id === vid);
      if (variant.stock <= 0) { NexoUI.toast('Esta variação está esgotada.', 'error'); return; }
      selectedVariants[type] = variant;
      renderVariants();
      updatePriceBox();
    });
  });
}

function updatePriceBox() {
  const p = currentProduct;
  const variant = pickSelectedVariant();
  const base = p.promo_price ?? p.price;
  const extra = variant ? variant.extra_price : 0;
  const now = base + extra;

  document.getElementById('pd-now-price').textContent = NexoUI.formatBRL(now);
  const oldEl = document.getElementById('pd-old-price');
  const badgeEl = document.getElementById('pd-discount-badge');
  if (p.promo_price) {
    oldEl.style.display = 'inline';
    oldEl.textContent = NexoUI.formatBRL(p.price + extra);
    badgeEl.style.display = 'inline-block';
    badgeEl.textContent = `-${p.discount_pct}%`;
  } else {
    oldEl.style.display = 'none';
    badgeEl.style.display = 'none';
  }

  const stock = variant ? variant.stock : p.stock;
  const stockEl = document.getElementById('pd-stock');
  if (stock > 10) stockEl.innerHTML = `<span style="color:var(--neon-green);">✔ Em estoque</span>`;
  else if (stock > 0) stockEl.innerHTML = `<span style="color:var(--neon-yellow);">⚠ Últimas ${stock} unidades</span>`;
  else stockEl.innerHTML = `<span style="color:var(--neon-red);">✘ Esgotado</span>`;

  const addBtn = document.getElementById('pd-add-btn');
  const buyBtn = document.getElementById('pd-buy-now-btn');
  const needsVariant = p.variants.length > 0 && !variant;
  addBtn.disabled = stock <= 0 || needsVariant;
  buyBtn.disabled = stock <= 0 || needsVariant;
  addBtn.textContent = needsVariant ? 'Selecione uma opção' : (stock <= 0 ? 'Indisponível' : '🛒 Adicionar ao carrinho');
}

function addCurrentToCart() {
  const variant = pickSelectedVariant();
  if (currentProduct.variants.length > 0 && !variant) {
    NexoUI.toast('Selecione uma variação do produto.', 'error');
    return false;
  }
  NexoCart.add(currentProduct, variant, currentQty);
  return true;
}

async function loadReviews() {
  const { reviews, summary } = await Api.get(`/products/${currentProduct.id}/reviews`);
  document.getElementById('rs-avg').textContent = (summary.avg || 0).toFixed(1);
  document.getElementById('rs-stars').textContent = NexoUI.starsHtml(summary.avg || 0);
  document.getElementById('rs-count').textContent = summary.total;

  const total = summary.total || 1;
  document.getElementById('rs-bars').innerHTML = [5, 4, 3, 2, 1].map(star => {
    const count = summary[`r${star}`] || 0;
    const pct = Math.round((count / total) * 100);
    return `<div class="rating-bar-row"><span>${star}★</span><div class="progress-bar"><div class="fill" style="width:${pct}%;"></div></div><span>${count}</span></div>`;
  }).join('');

  const listEl = document.getElementById('reviews-list');
  if (!reviews.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="ic">💬</div><p>Ainda não há avaliações para este produto. Seja o primeiro a avaliar!</p></div>`;
    return;
  }
  listEl.innerHTML = reviews.map(r => `
    <div class="review-item">
      <div class="head">
        <div class="avatar">${r.user_name.charAt(0).toUpperCase()}</div>
        <div>
          <span class="name">${NexoUI.escapeHtml(r.user_name)}</span>
          ${r.verified_purchase ? '<span class="verified">✔ Compra verificada</span>' : ''}
        </div>
        <span class="date">${NexoUI.formatDate(r.created_at)}</span>
      </div>
      <div class="stars">${NexoUI.starsHtml(r.rating)}</div>
      <p>${NexoUI.escapeHtml(r.comment)}</p>
      ${r.photo_url ? `<img src="${r.photo_url}" style="max-width:140px;border-radius:8px;margin-top:8px;">` : ''}
      ${r.admin_reply ? `<div class="admin-reply"><b>Resposta da NEXO STORE:</b><br>${NexoUI.escapeHtml(r.admin_reply)}</div>` : ''}
    </div>
  `).join('');
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add('active');
    });
  });
  document.getElementById('pd-reviews-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.tab-btn[data-tab="reviews"]').click();
    document.getElementById('pd-tabs-root').scrollIntoView({ behavior: 'smooth' });
  });
}

function bindReviewForm() {
  const stars = document.querySelectorAll('#review-star-select span');
  stars.forEach(s => {
    s.addEventListener('click', () => {
      const v = Number(s.dataset.v);
      document.getElementById('review-rating').value = v;
      stars.forEach(st => st.classList.toggle('active', Number(st.dataset.v) <= v));
    });
  });

  if (!NexoAuth.isLoggedIn()) {
    document.getElementById('review-login-prompt').style.display = 'block';
    document.getElementById('review-form').style.display = 'none';
  }

  document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rating = Number(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value.trim();
    if (!rating) return NexoUI.toast('Selecione uma nota de 1 a 5 estrelas.', 'error');
    if (comment.length < 3) return NexoUI.toast('Escreva um comentário.', 'error');
    try {
      const result = await Api.post(`/products/${currentProduct.id}/reviews`, { rating, comment });
      NexoUI.toast(result.verified_purchase ? 'Avaliação enviada! (compra verificada)' : 'Avaliação enviada!', 'success');
      document.getElementById('review-comment').value = '';
      document.getElementById('review-rating').value = 0;
      stars.forEach(st => st.classList.remove('active'));
      loadReviews();
    } catch (err) {
      NexoUI.toast(err.message, 'error');
    }
  });
}

function bindShipping() {
  document.getElementById('pd-cep-btn').addEventListener('click', async () => {
    const cep = document.getElementById('pd-cep-input').value.replace(/\D/g, '');
    const resultEl = document.getElementById('pd-shipping-result');
    if (cep.length !== 8) { resultEl.innerHTML = '<span style="color:var(--neon-red);">Informe um CEP válido.</span>'; return; }
    resultEl.innerHTML = '<span class="spinner"></span>';
    try {
      const result = await Api.post('/shipping/quote', { cep, total_weight_kg: currentProduct.weight_kg, declared_value: currentProduct.promo_price ?? currentProduct.price });
      resultEl.innerHTML = result.options.map(o =>
        `<div>${o.name}: <b>${o.free ? 'Grátis' : NexoUI.formatBRL(o.price)}</b> — até ${o.days} dias úteis</div>`
      ).join('');
    } catch (err) {
      resultEl.innerHTML = `<span style="color:var(--neon-red);">${NexoUI.escapeHtml(err.message)}</span>`;
    }
  });
}

async function loadRelated() {
  try {
    const { products } = await Api.get(`/products?category=${currentProduct.category_slug || ''}&limit=4`);
    const filtered = products.filter(p => p.id !== currentProduct.id).slice(0, 4);
    ProductsUI.renderProductGrid('related-grid', filtered.length ? filtered : products.filter(p => p.id !== currentProduct.id).slice(0, 4));
  } catch {
    document.getElementById('related-grid').innerHTML = '';
  }
}

async function init() {
  await NexoAuth.init();
  const slug = getSlug();
  if (!slug) { window.location.href = '/produtos.html'; return; }

  try {
    const { product } = await Api.get(`/products/${encodeURIComponent(slug)}`);
    currentProduct = product;

    document.title = `${product.name} — NEXO STORE`;
    document.getElementById('breadcrumb-name').textContent = product.name;
    document.getElementById('pd-image').src = product.image_url;
    document.getElementById('pd-image').alt = product.name;
    document.getElementById('pd-name').textContent = product.name;
    document.getElementById('pd-short-desc').textContent = product.short_description;
    document.getElementById('pd-full-desc').textContent = product.description;
    document.getElementById('pd-stars').textContent = NexoUI.starsHtml(product.rating_avg);
    document.getElementById('pd-rating-text').textContent = `${product.rating_avg?.toFixed(1) || '—'} (${product.rating_count} avaliações)`;

    const { categories } = await Api.get('/categories');
    const cat = categories.find(c => c.id === product.category_id);
    if (cat) {
      document.getElementById('pd-category').textContent = cat.name;
      currentProduct.category_slug = cat.slug;
    }

    renderVariants();
    updatePriceBox();

    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('pd-content').style.display = 'grid';
    document.getElementById('pd-tabs-root').style.display = 'block';

    document.getElementById('qty-inc').addEventListener('click', () => { currentQty++; document.getElementById('qty-value').textContent = currentQty; });
    document.getElementById('qty-dec').addEventListener('click', () => { if (currentQty > 1) currentQty--; document.getElementById('qty-value').textContent = currentQty; });

    document.getElementById('pd-add-btn').addEventListener('click', () => {
      if (addCurrentToCart()) { NexoUI.toast('Produto adicionado ao carrinho!', 'success'); NexoCart.openDrawer(); }
    });
    document.getElementById('pd-buy-now-btn').addEventListener('click', () => {
      if (addCurrentToCart()) window.location.href = '/checkout.html';
    });

    bindTabs();
    bindReviewForm();
    bindShipping();
    loadReviews();
    loadRelated();
  } catch (err) {
    document.getElementById('loading-state').innerHTML = `<div class="empty-state"><div class="ic">😕</div><p>${NexoUI.escapeHtml(err.message)}</p><a href="/produtos.html" class="btn btn-primary">Voltar aos produtos</a></div>`;
  }
}

init();
