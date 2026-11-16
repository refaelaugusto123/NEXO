// ===========================================
// NEXO STORE - Lógica da página inicial
// ===========================================
'use strict';

async function loadCategories() {
  const el = document.getElementById('category-grid');
  try {
    const { categories } = await Api.get('/categories');
    el.innerHTML = categories.map(c => `
      <a href="/produtos.html?category=${c.slug}" class="category-chip" data-reveal>
        <div class="icon">${c.icon || '📦'}</div>
        <div class="name">${NexoUI.escapeHtml(c.name)}</div>
        <div class="count">${c.product_count} produtos</div>
      </a>
    `).join('');
    revealOnScroll();
  } catch (err) {
    el.innerHTML = `<p>Não foi possível carregar as categorias.</p>`;
  }
}

async function loadSection(containerId, query) {
  ProductsUI.skeletonGrid(containerId, 4);
  try {
    const { products } = await Api.get(`/products?${query}`);
    ProductsUI.renderProductGrid(containerId, products);
  } catch (err) {
    document.getElementById(containerId).innerHTML = `<p>Não foi possível carregar os produtos. ${NexoUI.escapeHtml(err.message)}</p>`;
  }
}

async function loadTestimonials() {
  const el = document.getElementById('testimonials-grid');
  try {
    const { products } = await Api.get('/products?limit=6');
    const withReviews = [];
    for (const p of products) {
      const { reviews } = await Api.get(`/products/${p.id}/reviews`);
      if (reviews.length) withReviews.push({ product: p, review: reviews[0] });
      if (withReviews.length >= 3) break;
    }
    if (!withReviews.length) { el.innerHTML = ''; return; }
    el.innerHTML = withReviews.map(({ product, review }) => `
      <div class="card" style="padding:22px;" data-reveal>
        <div class="review-item" style="border:none;padding:0;">
          <div class="head">
            <div class="avatar">${review.user_name.charAt(0)}</div>
            <div>
              <div class="name">${NexoUI.escapeHtml(review.user_name)}</div>
              ${review.verified_purchase ? '<span class="verified">✔ Compra verificada</span>' : ''}
            </div>
          </div>
          <div class="stars">${NexoUI.starsHtml(review.rating)}</div>
          <p style="color:var(--text-1);">"${NexoUI.escapeHtml(review.comment)}"</p>
          <a href="/produto.html?slug=${product.slug}" style="font-size:13px;color:var(--neon-cyan);">sobre: ${NexoUI.escapeHtml(product.name)} →</a>
        </div>
      </div>
    `).join('');
    revealOnScroll();
  } catch {
    el.innerHTML = '';
  }
}

(async function init() {
  await NexoAuth.init();
  loadCategories();
  loadSection('featured-grid', 'featured=1&limit=4');
  loadSection('bestseller-grid', 'bestseller=1&limit=4');
  loadSection('sale-grid', 'on_sale=1&limit=4');
  loadSection('new-grid', 'is_new=1&limit=4');
  loadTestimonials();
})();
