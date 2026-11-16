// ===========================================
// NEXO STORE - Lógica do checkout
// ===========================================
'use strict';

const checkoutState = {
  addresses: [],
  selectedAddressId: null,
  newAddress: null,
  shippingOptions: [],
  selectedShippingId: null,
  couponCode: null,
  couponDiscount: 0,
  loyaltyDiscount: 0,
  loyaltyPct: 0,
  paymentMethod: 'pix',
};

function renderMiniItems() {
  const el = document.getElementById('checkout-mini-items');
  el.innerHTML = NexoCart.items.map(i => `
    <div class="mini-item">
      <img src="${i.image_url}" alt="">
      <div style="flex:1;">
        <div>${NexoUI.escapeHtml(i.name)} ${i.variant_label ? `<span style="color:var(--text-muted);">(${NexoUI.escapeHtml(i.variant_label)})</span>` : ''}</div>
        <div style="color:var(--text-muted);">Qtd: ${i.quantity}</div>
      </div>
      <div>${NexoUI.formatBRL(i.unit_price * i.quantity)}</div>
    </div>
  `).join('');
}

async function loadLoyalty() {
  if (!NexoAuth.isLoggedIn()) return;
  try {
    const loyalty = await Api.get('/loyalty/me');
    checkoutState.loyaltyPct = loyalty.tier.discount_pct;
    document.getElementById('co-loyalty-note').textContent =
      `Como Cliente ${loyalty.tier.label.replace('Cliente ', '')}, você tem ${loyalty.tier.discount_pct}% de desconto de fidelidade (não cumulativo com cupons - vale o maior).`;
  } catch {}
}

function recalcSummary() {
  const subtotal = NexoCart.subtotal();
  const loyaltyDiscount = subtotal * (checkoutState.loyaltyPct / 100);
  const discount = Math.max(checkoutState.couponDiscount, loyaltyDiscount);

  const shipping = checkoutState.shippingOptions.find(o => o.id === checkoutState.selectedShippingId);
  const shippingCost = shipping ? shipping.price : 0;

  const total = subtotal - discount + shippingCost;

  document.getElementById('co-subtotal').textContent = NexoUI.formatBRL(subtotal);
  document.getElementById('co-discount').textContent = '-' + NexoUI.formatBRL(discount);
  document.getElementById('co-shipping').textContent = shipping ? (shipping.price === 0 ? 'Grátis' : NexoUI.formatBRL(shipping.price)) : 'A calcular';
  document.getElementById('co-total').textContent = NexoUI.formatBRL(Math.max(0, total));
}

async function renderAddresses() {
  const el = document.getElementById('address-list');
  if (!NexoAuth.isLoggedIn()) {
    el.innerHTML = `<p>Faça <a href="/login.html?next=/checkout.html" style="color:var(--neon-cyan);">login</a> para continuar.</p>`;
    return;
  }
  const { addresses } = await Api.get('/users/me/addresses');
  checkoutState.addresses = addresses;

  if (!addresses.length) {
    el.innerHTML = `<p class="input-hint">Você ainda não tem endereços cadastrados. Adicione um abaixo.</p>`;
    document.getElementById('new-address-form').style.display = 'block';
    return;
  }

  el.innerHTML = addresses.map(a => `
    <div class="addr-card ${checkoutState.selectedAddressId === a.id ? 'selected' : ''}" data-addr-id="${a.id}">
      <b>${NexoUI.escapeHtml(a.label)}</b> ${a.is_default ? '<span class="pill pill-blue">Padrão</span>' : ''}<br>
      <span style="color:var(--text-2);font-size:13.5px;">${NexoUI.escapeHtml(a.street)}, ${NexoUI.escapeHtml(a.number||'')} - ${NexoUI.escapeHtml(a.neighborhood||'')}, ${NexoUI.escapeHtml(a.city)}/${NexoUI.escapeHtml(a.state)} - CEP ${NexoUI.escapeHtml(a.cep)}</span>
    </div>
  `).join('');

  if (!checkoutState.selectedAddressId && addresses.length) {
    checkoutState.selectedAddressId = (addresses.find(a => a.is_default) || addresses[0]).id;
  }

  el.querySelectorAll('[data-addr-id]').forEach(card => {
    card.addEventListener('click', () => {
      checkoutState.selectedAddressId = Number(card.dataset.addrId);
      checkoutState.newAddress = null;
      renderAddresses();
      calculateShipping();
    });
  });
  el.querySelectorAll('.addr-card').forEach(c => {
    if (Number(c.dataset.addrId) === checkoutState.selectedAddressId) c.classList.add('selected');
  });

  calculateShipping();
}

async function calculateShipping() {
  const cep = checkoutState.newAddress?.cep ||
    checkoutState.addresses.find(a => a.id === checkoutState.selectedAddressId)?.cep;
  if (!cep) return;

  const el = document.getElementById('shipping-options');
  el.innerHTML = '<span class="spinner"></span>';
  try {
    const result = await Api.post('/shipping/quote', {
      cep, total_weight_kg: NexoCart.totalWeight(), declared_value: NexoCart.subtotal(),
    });
    checkoutState.shippingOptions = result.options;
    checkoutState.selectedShippingId = result.options[0].id;

    el.innerHTML = result.options.map(o => `
      <div class="ship-option ${o.id === checkoutState.selectedShippingId ? 'selected' : ''}" data-ship-id="${o.id}">
        <div><b>${o.name}</b><br><span style="color:var(--text-muted);font-size:12.5px;">Até ${o.days} dias úteis</span></div>
        <div style="font-weight:700;">${o.free ? 'Grátis' : NexoUI.formatBRL(o.price)}</div>
      </div>
    `).join('');

    el.querySelectorAll('[data-ship-id]').forEach(opt => {
      opt.addEventListener('click', () => {
        checkoutState.selectedShippingId = opt.dataset.shipId;
        el.querySelectorAll('.ship-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        recalcSummary();
      });
    });

    recalcSummary();
  } catch (err) {
    el.innerHTML = `<p style="color:var(--neon-red);">${NexoUI.escapeHtml(err.message)}</p>`;
  }
}

function bindNewAddressForm() {
  document.getElementById('new-address-toggle').addEventListener('click', () => {
    const form = document.getElementById('new-address-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('new-cep').addEventListener('blur', async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const data = await Api.get(`/shipping/cep/${cep}`);
      document.getElementById('new-street').value = data.street || '';
      document.getElementById('new-neighborhood').value = data.neighborhood || '';
      document.getElementById('new-city').value = data.city || '';
      document.getElementById('new-state').value = data.state || '';
    } catch {
      // silencioso: usuário pode preencher manualmente (ex: sem internet na sandbox)
    }
  });

  document.getElementById('new-address-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const { address } = await Api.post('/users/me/addresses', data);
      NexoUI.toast('Endereço salvo!', 'success');
      checkoutState.selectedAddressId = address.id;
      e.target.reset();
      e.target.style.display = 'none';
      await renderAddresses();
    } catch (err) {
      NexoUI.toast(err.message, 'error');
    }
  });
}

function bindCoupon() {
  document.getElementById('apply-coupon-btn').addEventListener('click', async () => {
    const code = document.getElementById('coupon-input').value.trim();
    const resultEl = document.getElementById('coupon-result');
    if (!code) return;
    try {
      const result = await Api.post('/coupons/validate', { code, subtotal: NexoCart.subtotal() });
      checkoutState.couponCode = result.code;
      checkoutState.couponDiscount = result.discount;
      resultEl.innerHTML = `<span style="color:var(--neon-green);">✔ Cupom ${result.code} aplicado: -${NexoUI.formatBRL(result.discount)}</span>`;
      recalcSummary();
    } catch (err) {
      checkoutState.couponCode = null;
      checkoutState.couponDiscount = 0;
      resultEl.innerHTML = `<span style="color:var(--neon-red);">${NexoUI.escapeHtml(err.message)}</span>`;
      recalcSummary();
    }
  });
}

function bindPaymentTabs() {
  document.querySelectorAll('.pay-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('selected'));
      document.querySelectorAll('.pay-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('selected');
      document.querySelector(`.pay-panel[data-panel="${tab.dataset.pay}"]`).classList.add('active');
      checkoutState.paymentMethod = tab.dataset.pay;
    });
  });
}

async function placeOrder() {
  if (!NexoAuth.requireLogin('/checkout.html')) return;
  if (!NexoCart.items.length) { NexoUI.toast('Seu carrinho está vazio.', 'error'); return; }
  if (!checkoutState.selectedAddressId) { NexoUI.toast('Selecione um endereço de entrega.', 'error'); return; }
  if (!checkoutState.selectedShippingId) { NexoUI.toast('Selecione uma opção de frete.', 'error'); return; }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

  const payload = {
    items: NexoCart.items.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })),
    address_id: checkoutState.selectedAddressId,
    shipping_method: checkoutState.selectedShippingId,
    coupon_code: checkoutState.couponCode,
    payment_method: checkoutState.paymentMethod,
  };

  if (checkoutState.paymentMethod === 'credit_card') {
    payload.card = {
      number: document.getElementById('card-number').value,
      installments: Number(document.getElementById('card-installments').value),
    };
  }

  try {
    const result = await Api.post('/orders', payload);
    NexoCart.clear();
    window.location.href = `/conta.html?order=${result.order.id}#pedidos`;
  } catch (err) {
    NexoUI.toast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Finalizar pedido';
  }
}

(async function init() {
  await NexoAuth.init();

  if (!NexoCart.items.length) {
    document.getElementById('checkout-empty').style.display = 'block';
    document.getElementById('checkout-main').style.display = 'none';
    return;
  }
  document.getElementById('checkout-main').style.display = 'grid';

  renderMiniItems();
  recalcSummary();
  bindNewAddressForm();
  bindCoupon();
  bindPaymentTabs();
  await loadLoyalty();
  await renderAddresses();
  recalcSummary();

  document.getElementById('place-order-btn').addEventListener('click', placeOrder);
})();
