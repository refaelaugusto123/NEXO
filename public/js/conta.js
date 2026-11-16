// ===========================================
// NEXO STORE - Área do cliente (Minha Conta)
// ===========================================
'use strict';

const STATUS_LABELS = {
  aguardando_pagamento: { label: 'Aguardando pagamento', pill: 'pill-yellow' },
  pago: { label: 'Pago', pill: 'pill-blue' },
  separando: { label: 'Separando pedido', pill: 'pill-purple' },
  enviado: { label: 'Enviado', pill: 'pill-blue' },
  entregue: { label: 'Entregue', pill: 'pill-green' },
  cancelado: { label: 'Cancelado', pill: 'pill-red' },
};

function switchPanel(name) {
  document.querySelectorAll('.acc-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  document.querySelectorAll('[data-panel-link]').forEach(a => a.classList.toggle('active', a.dataset.panelLink === name));
}

function bindNav() {
  document.querySelectorAll('[data-panel-link]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      switchPanel(a.dataset.panelLink);
      history.replaceState(null, '', `#${a.dataset.panelLink}`);
    });
  });
  document.getElementById('logout-link').addEventListener('click', async (e) => {
    e.preventDefault();
    await NexoAuth.logout();
    window.location.href = '/';
  });

  const hash = window.location.hash.replace('#', '');
  if (hash) switchPanel(hash);
}

function fillProfile() {
  const u = NexoAuth.user;
  document.getElementById('profile-name').value = u.name;
  document.getElementById('profile-phone').value = u.phone || '';
  document.getElementById('profile-email').value = u.email;
}

function bindProfileForm() {
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const { user } = await Api.put('/users/me', data);
      NexoAuth.user = user;
      NexoUI.toast('Dados atualizados com sucesso!', 'success');
    } catch (err) {
      NexoUI.toast(err.message, 'error');
    }
  });

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const current_password = document.getElementById('current-password').value;
    const new_password = document.getElementById('new-password').value;
    if (!current_password || !new_password) return NexoUI.toast('Preencha os dois campos de senha.', 'error');
    try {
      await Api.put('/users/me', { current_password, new_password });
      NexoUI.toast('Senha alterada com sucesso!', 'success');
      e.target.reset();
    } catch (err) {
      NexoUI.toast(err.message, 'error');
    }
  });
}

async function loadAddresses() {
  const el = document.getElementById('addresses-list');
  const { addresses } = await Api.get('/users/me/addresses');
  if (!addresses.length) {
    el.innerHTML = `<p class="input-hint">Nenhum endereço cadastrado ainda.</p>`;
    return;
  }
  el.innerHTML = addresses.map(a => `
    <div class="addr-mini">
      <div>
        <b>${NexoUI.escapeHtml(a.label)}</b> ${a.is_default ? '<span class="pill pill-blue">Padrão</span>' : ''}<br>
        <span style="color:var(--text-2);font-size:13.5px;">${NexoUI.escapeHtml(a.street)}, ${NexoUI.escapeHtml(a.number||'')} - ${NexoUI.escapeHtml(a.city)}/${NexoUI.escapeHtml(a.state)} - CEP ${NexoUI.escapeHtml(a.cep)}</span>
      </div>
      <button class="btn btn-danger btn-sm" data-del-addr="${a.id}">Remover</button>
    </div>
  `).join('');

  el.querySelectorAll('[data-del-addr]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este endereço?')) return;
      try {
        await Api.del(`/users/me/addresses/${btn.dataset.delAddr}`);
        loadAddresses();
      } catch (err) { NexoUI.toast(err.message, 'error'); }
    });
  });
}

function bindAddressForm() {
  document.getElementById('toggle-new-addr').addEventListener('click', () => {
    const f = document.getElementById('addr-form');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('addr-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.is_default = fd.get('is_default') === 'on';
    try {
      await Api.post('/users/me/addresses', data);
      NexoUI.toast('Endereço salvo!', 'success');
      e.target.reset();
      e.target.style.display = 'none';
      loadAddresses();
    } catch (err) { NexoUI.toast(err.message, 'error'); }
  });
}

async function loadOrders() {
  const el = document.getElementById('orders-list');
  const { orders } = await Api.get('/orders');
  if (!orders.length) {
    el.innerHTML = `<div class="empty-state"><div class="ic">📦</div><p>Você ainda não fez nenhum pedido.</p><a href="/produtos.html" class="btn btn-primary">Começar a comprar</a></div>`;
    return;
  }

  el.innerHTML = orders.map(o => {
    const status = STATUS_LABELS[o.status] || { label: o.status, pill: 'pill-gray' };
    const canSimulate = ['pix', 'boleto'].includes(o.payment_method) && o.payment_status !== 'pago';
    return `
    <div class="order-card">
      <div class="head">
        <div>
          <b>${o.order_number}</b><br>
          <span style="font-size:12.5px;color:var(--text-muted);">${NexoUI.formatDate(o.created_at)}</span>
        </div>
        <span class="pill ${status.pill}">${status.label}</span>
      </div>
      ${o.items.map(it => `
        <div class="order-item-row">
          <span>${it.quantity}x ${NexoUI.escapeHtml(it.product_name)} ${it.variant_label ? `(${NexoUI.escapeHtml(it.variant_label)})` : ''}</span>
          <span>${NexoUI.formatBRL(it.unit_price * it.quantity)}</span>
        </div>
      `).join('')}
      <div class="summary-line"><span>Frete (${NexoUI.escapeHtml(o.shipping_method||'')})</span><span>${NexoUI.formatBRL(o.shipping_cost)}</span></div>
      ${o.discount > 0 ? `<div class="summary-line"><span>Desconto</span><span class="value-discount">-${NexoUI.formatBRL(o.discount)}</span></div>` : ''}
      <div class="summary-line total"><span>Total</span><span>${NexoUI.formatBRL(o.total)}</span></div>
      <div style="margin-top:10px;font-size:13px;color:var(--text-2);">
        📍 ${o.address ? `${NexoUI.escapeHtml(o.address.street)}, ${NexoUI.escapeHtml(o.address.number||'')} - ${NexoUI.escapeHtml(o.address.city)}/${NexoUI.escapeHtml(o.address.state)}` : '-'}
      </div>
      <div style="margin-top:6px;font-size:13px;">🚚 Status de entrega: <b>${NexoUI.escapeHtml(o.tracking_status||'-')}</b> ${o.tracking_code ? `(código: ${NexoUI.escapeHtml(o.tracking_code)})` : ''}</div>
      ${canSimulate ? `<button class="btn btn-outline btn-sm" style="margin-top:12px;" data-simulate-pay="${o.id}">Simular confirmação de pagamento (sandbox)</button>` : ''}
    </div>
  `;
  }).join('');

  el.querySelectorAll('[data-simulate-pay]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const result = await Api.post(`/orders/${btn.dataset.simulatePay}/simulate-payment`);
        NexoUI.toast(result.message, 'success');
        loadOrders();
      } catch (err) { NexoUI.toast(err.message, 'error'); }
    });
  });
}

async function loadLoyaltyPanel() {
  const loyalty = await Api.get('/loyalty/me');
  document.getElementById('loyalty-code').textContent = loyalty.loyalty_code;
  document.getElementById('loyalty-tier-label').textContent = loyalty.tier.label;
  document.getElementById('loyalty-points').textContent = loyalty.points;

  if (loyalty.next_tier) {
    const currentMin = loyalty.all_tiers.find(t => t.key === loyalty.tier.key).min_points;
    const nextMin = loyalty.all_tiers.find(t => t.key === loyalty.next_tier.key).min_points;
    const pct = Math.min(100, Math.round(((loyalty.points - currentMin) / (nextMin - currentMin)) * 100));
    document.getElementById('loyalty-progress-fill').style.width = pct + '%';
    document.getElementById('loyalty-next-info').textContent = `Faltam ${loyalty.next_tier.points_needed} pontos para ${loyalty.next_tier.label}`;
  } else {
    document.getElementById('loyalty-progress-fill').style.width = '100%';
    document.getElementById('loyalty-next-info').textContent = 'Você atingiu o nível máximo! 🎉';
  }

  const icons = { inicial: '🌱', bronze: '🥉', prata: '🥈', ouro: '🥇', diamante: '💎' };
  document.getElementById('tier-grid').innerHTML = loyalty.all_tiers.map(t => `
    <div class="tier-card ${t.key === loyalty.tier.key ? 'current' : ''}">
      <div class="tier-icon">${icons[t.key] || '⭐'}</div>
      <div class="tier-name">${NexoUI.escapeHtml(t.label)}</div>
      <div class="tier-disc">${t.discount_pct}%</div>
      <div class="tier-pts">${t.min_points}+ pontos</div>
    </div>
  `).join('');

  document.getElementById('loyalty-rules').textContent = loyalty.rules;
}

(async function init() {
  await NexoAuth.init();
  if (!NexoAuth.isLoggedIn()) {
    document.getElementById('account-login-required').style.display = 'block';
    return;
  }
  document.getElementById('account-root').style.display = 'block';

  bindNav();
  fillProfile();
  bindProfileForm();
  bindAddressForm();

  await Promise.all([loadAddresses(), loadOrders(), loadLoyaltyPanel()]);
})();
