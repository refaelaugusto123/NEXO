// ===========================================
// NEXO STORE - Catálogo de produtos com filtros
// ===========================================
'use strict';

const state = {
  category: null, search: null, min_price: null, max_price: null,
  in_stock: false, on_sale: false, is_new: false, bestseller: false, sort: '',
};

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  state.category = params.get('category') || null;
  state.search = params.get('search') || null;
  state.on_sale = params.get('on_sale') === '1';
  state.is_new = params.get('is_new') === '1';
  state.bestseller = params.get('bestseller') === '1';
  state.featured = params.get('featured') === '1';
}

function buildQuery() {
  const q = new URLSearchParams();
  if (state.category) q.set('category', state.category);
  if (state.search) q.set('search', state.search);
  if (state.min_price) q.set('min_price', state.min_price);
  if (state.max_price) q.set('max_price', state.max_price);
  if (state.in_stock) q.set('in_stock', '1');
  if (state.on_sale) q.set('on_sale', '1');
  if (state.is_new) q.set('is_new', '1');
  if (state.bestseller) q.set('bestseller', '1');
  if (state.featured) q.set('featured', '1');
  if (state.sort) q.set('sort', state.sort);
  return q.toString();
}

async function loadCategoryFilters() {
  const el = document.getElementById('filter-categories');
  const { categories } = await Api.get('/categories');
  el.innerHTML = categories.map(c => `
    <label class="filter-option">
      <input type="radio" name="cat" value="${c.slug}" ${state.category === c.slug ? 'checked' : ''}>
      ${NexoUI.escapeHtml(c.name)} <span style="color:var(--text-muted)">(${c.product_count})</span>
    </label>
  `).join('') + `<label class="filter-option"><input type="radio" name="cat" value="" ${!state.category ? 'checked' : ''}> Todas</label>`;

  el.querySelectorAll('input[name="cat"]').forEach(r => {
    r.addEventListener('change', () => { state.category = r.value || null; loadProducts(); });
  });
}

async function loadProducts() {
  document.getElementById('result-count').textContent = 'Carregando produtos...';
  ProductsUI.skeletonGrid('catalog-grid', 8);
  try {
    const { products, total } = await Api.get(`/products?${buildQuery()}`);
    document.getElementById('result-count').textContent =
      state.search ? `${total} resultado(s) para "${state.search}"` : `${total} produto(s) encontrado(s)`;
    ProductsUI.renderProductGrid('catalog-grid', products);
  } catch (err) {
    document.getElementById('result-count').textContent = 'Erro ao carregar produtos.';
    NexoUI.toast(err.message, 'error');
  }
}

function bindFilterControls() {
  document.getElementById('apply-price-btn').addEventListener('click', () => {
    state.min_price = document.getElementById('filter-min-price').value || null;
    state.max_price = document.getElementById('filter-max-price').value || null;
    loadProducts();
  });
  document.getElementById('filter-in-stock').addEventListener('change', (e) => { state.in_stock = e.target.checked; loadProducts(); });
  document.getElementById('filter-on-sale').checked = state.on_sale;
  document.getElementById('filter-on-sale').addEventListener('change', (e) => { state.on_sale = e.target.checked; loadProducts(); });
  document.getElementById('filter-new').checked = state.is_new;
  document.getElementById('filter-new').addEventListener('change', (e) => { state.is_new = e.target.checked; loadProducts(); });
  document.getElementById('filter-bestseller').checked = state.bestseller;
  document.getElementById('filter-bestseller').addEventListener('change', (e) => { state.bestseller = e.target.checked; loadProducts(); });

  document.getElementById('sort-select').addEventListener('change', (e) => { state.sort = e.target.value; loadProducts(); });

  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    window.location.href = '/produtos.html';
  });
}

(async function init() {
  await NexoAuth.init();
  readStateFromUrl();
  bindFilterControls();
  await loadCategoryFilters();
  loadProducts();
})();
