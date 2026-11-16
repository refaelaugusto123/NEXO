// ===========================================
// NEXO STORE - Carrinho de compras (persistido em localStorage)
// O preço final é sempre recalculado e validado no servidor no momento do checkout.
// ===========================================
'use strict';

const CART_KEY = 'nexo_cart_v1';

const NexoCart = {
  items: [],

  load() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      this.items = raw ? JSON.parse(raw) : [];
    } catch {
      this.items = [];
    }
    return this.items;
  },

  save() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.items));
    this.renderBadge();
    this.renderDrawer();
  },

  _key(productId, variantId) { return `${productId}::${variantId || 'default'}`; },

  add(product, variant, qty = 1) {
    const key = this._key(product.id, variant?.id);
    const existing = this.items.find(i => this._key(i.product_id, i.variant_id) === key);
    const unitPrice = (product.promo_price ?? product.price) + (variant ? variant.extra_price : 0);

    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + qty);
    } else {
      this.items.push({
        product_id: product.id,
        variant_id: variant ? variant.id : null,
        name: product.name,
        slug: product.slug,
        image_url: product.image_url,
        variant_label: variant ? `${variant.type}: ${variant.value}` : null,
        unit_price: unitPrice,
        weight_kg: product.weight_kg || 0.3,
        quantity: qty,
        max_stock: variant ? variant.stock : product.stock,
      });
    }
    this.save();
  },

  updateQty(productId, variantId, qty) {
    const key = this._key(productId, variantId);
    const item = this.items.find(i => this._key(i.product_id, i.variant_id) === key);
    if (!item) return;
    item.quantity = Math.max(1, Math.min(item.max_stock || 99, qty));
    this.save();
  },

  remove(productId, variantId) {
    const key = this._key(productId, variantId);
    this.items = this.items.filter(i => this._key(i.product_id, i.variant_id) !== key);
    this.save();
  },

  clear() {
    this.items = [];
    this.save();
  },

  count() { return this.items.reduce((s, i) => s + i.quantity, 0); },
  subtotal() { return this.items.reduce((s, i) => s + i.unit_price * i.quantity, 0); },
  totalWeight() { return this.items.reduce((s, i) => s + (i.weight_kg || 0.3) * i.quantity, 0); },

  renderBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = this.count();
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  ensureDrawer() {
    if (document.getElementById('cart-drawer')) return;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'cart-overlay';
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.id = 'cart-drawer';
    drawer.innerHTML = `
      <div class="drawer-head">
        <h3 style="margin:0;">Seu carrinho</h3>
        <button class="icon-btn" id="close-cart-btn">✕</button>
      </div>
      <div class="drawer-body" id="cart-drawer-body"></div>
      <div class="drawer-foot" id="cart-drawer-foot"></div>
    `;
    document.body.appendChild(drawer);

    overlay.addEventListener('click', () => this.closeDrawer());
    drawer.querySelector('#close-cart-btn').addEventListener('click', () => this.closeDrawer());

    document.getElementById('open-cart-btn')?.addEventListener('click', () => this.openDrawer());
  },

  openDrawer() {
    this.ensureDrawer();
    document.getElementById('cart-overlay').classList.add('open');
    document.getElementById('cart-drawer').classList.add('open');
  },
  closeDrawer() {
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.getElementById('cart-drawer')?.classList.remove('open');
  },

  renderDrawer() {
    const body = document.getElementById('cart-drawer-body');
    const foot = document.getElementById('cart-drawer-foot');
    if (!body || !foot) return;

    if (this.items.length === 0) {
      body.innerHTML = `<div class="empty-state"><div class="ic">🛒</div><p>Seu carrinho está vazio.</p>
        <a href="/produtos.html" class="btn btn-primary">Explorar produtos</a></div>`;
      foot.innerHTML = '';
      return;
    }

    body.innerHTML = this.items.map(i => `
      <div class="cart-item">
        <div class="thumb"><img src="${i.image_url}" alt="${NexoUI.escapeHtml(i.name)}"></div>
        <div class="meta">
          <div class="name">${NexoUI.escapeHtml(i.name)}</div>
          ${i.variant_label ? `<div class="variant">${NexoUI.escapeHtml(i.variant_label)}</div>` : ''}
          <div class="qty-control">
            <button data-act="dec" data-pid="${i.product_id}" data-vid="${i.variant_id || ''}">−</button>
            <span>${i.quantity}</span>
            <button data-act="inc" data-pid="${i.product_id}" data-vid="${i.variant_id || ''}">+</button>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="price">${NexoUI.formatBRL(i.unit_price * i.quantity)}</div>
          <button class="remove" data-act="remove" data-pid="${i.product_id}" data-vid="${i.variant_id || ''}">Remover</button>
        </div>
      </div>
    `).join('');

    body.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = Number(btn.dataset.pid);
        const vid = btn.dataset.vid ? Number(btn.dataset.vid) : null;
        const item = this.items.find(i => this._key(i.product_id, i.variant_id) === this._key(pid, vid));
        if (btn.dataset.act === 'inc') this.updateQty(pid, vid, item.quantity + 1);
        if (btn.dataset.act === 'dec') this.updateQty(pid, vid, item.quantity - 1);
        if (btn.dataset.act === 'remove') this.remove(pid, vid);
      });
    });

    foot.innerHTML = `
      <div class="summary-line"><span>Subtotal</span><span>${NexoUI.formatBRL(this.subtotal())}</span></div>
      <p class="input-hint" style="margin-bottom:14px;">Frete e descontos calculados no checkout.</p>
      <a href="/checkout.html" class="btn btn-primary btn-block">Finalizar compra</a>
      <a href="/carrinho.html" class="btn btn-ghost btn-block" style="margin-top:10px;">Ver carrinho completo</a>
    `;
  },

  init() {
    this.load();
    this.ensureDrawer();
    this.renderBadge();
    this.renderDrawer();
  },
};

document.addEventListener('DOMContentLoaded', () => NexoCart.init());
window.NexoCart = NexoCart;
