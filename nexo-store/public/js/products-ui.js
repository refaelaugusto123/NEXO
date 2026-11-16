// ===========================================
// NEXO STORE - Renderização de cards de produto (reutilizável)
// ===========================================
'use strict';

function productCardHtml(p) {
  const hasPromo = !!p.promo_price;
  const priceNow = hasPromo ? p.promo_price : p.price;
  const outOfStock = p.stock <= 0;

  const badges = [];
  if (hasPromo) badges.push(`<span class="badge-tag sale">-${p.discount_pct}%</span>`);
  if (p.is_new) badges.push(`<span class="badge-tag new">Novo</span>`);
  if (p.is_bestseller) badges.push(`<span class="badge-tag best">Mais vendido</span>`);
  if (outOfStock) badges.push(`<span class="badge-tag out">Esgotado</span>`);

  return `
  <div class="product-card" data-reveal>
    <a href="/produto.html?slug=${encodeURIComponent(p.slug)}" class="thumb-link">
      <div class="thumb">
        <div class="badges">${badges.join('')}</div>
        <button class="fav-btn" data-fav="${p.id}" title="Favoritar" onclick="event.preventDefault()">♡</button>
        <img src="${p.image_url}" alt="${NexoUI.escapeHtml(p.name)}" loading="lazy">
      </div>
    </a>
    <div class="info">
      <a href="/produto.html?slug=${encodeURIComponent(p.slug)}">
        <div class="name">${NexoUI.escapeHtml(p.name)}</div>
      </a>
      <div class="rating">
        <span class="stars">${NexoUI.starsHtml(p.rating_avg)}</span>
        <span>${p.rating_avg ? p.rating_avg.toFixed(1) : '—'} (${p.rating_count})</span>
      </div>
      <div class="price-row">
        ${hasPromo ? `<span class="price-old">${NexoUI.formatBRL(p.price)}</span>` : ''}
        <span class="price-now ${hasPromo ? 'sale' : ''}">${NexoUI.formatBRL(priceNow)}</span>
      </div>
    </div>
    <button class="add-btn" data-add-to-cart="${p.id}" ${outOfStock ? 'disabled' : ''}>
      ${outOfStock ? 'Indisponível' : '🛒 Adicionar ao carrinho'}
    </button>
  </div>`;
}

function renderProductGrid(containerId, products) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!products.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic">📦</div><p>Nenhum produto encontrado.</p></div>`;
    return;
  }
  el.innerHTML = products.map(productCardHtml).join('');
  bindAddToCartButtons(el);
  if (window.revealOnScroll) revealOnScroll();
}

function bindAddToCartButtons(scope = document) {
  scope.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.addToCart;
      try {
        const { product } = await Api.get(`/products/${id}`);
        if (product.variants && product.variants.length > 0) {
          // produto com variações: direciona para a página de detalhes para escolher
          window.location.href = `/produto.html?slug=${encodeURIComponent(product.slug)}`;
          return;
        }
        NexoCart.add(product, null, 1);
        NexoUI.toast(`${product.name} adicionado ao carrinho!`, 'success');
        NexoCart.openDrawer();
      } catch (err) {
        NexoUI.toast(err.message || 'Erro ao adicionar ao carrinho.', 'error');
      }
    });
  });
}

function skeletonGrid(containerId, count = 4) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({ length: count }).map(() => `
    <div class="product-card">
      <div class="skeleton" style="aspect-ratio:1/1;"></div>
      <div class="info">
        <div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:20px;width:40%;"></div>
      </div>
    </div>
  `).join('');
}

window.ProductsUI = { productCardHtml, renderProductGrid, bindAddToCartButtons, skeletonGrid };
