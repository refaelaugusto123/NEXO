// ===========================================
// NEXO STORE - Componentes compartilhados (toast, formatação, helpers UI)
// ===========================================
'use strict';

function formatBRL(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function starsHtml(rating, max = 5) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, max - full));
}

function toast(message, type = 'info') {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : '💬';
  el.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, 3400);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function debounce(fn, wait = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

// ---------- Header / Footer injection ----------
function renderHeaderFooter() {
  const headerMount = document.getElementById('site-header');
  const footerMount = document.getElementById('site-footer');

  if (headerMount) {
    headerMount.innerHTML = `
      <div class="topbar">
        <div class="container">
          <div class="topbar-marquee"><span>
            <span>🚚 Frete grátis para compras acima de R$ 299</span>
            <span>⚡ Lançamentos toda semana</span>
            <span>💎 Programa de fidelidade com até 50% OFF</span>
            <span>🔒 Pagamento 100% seguro (PIX, cartão e boleto)</span>
            <span>🚚 Frete grátis para compras acima de R$ 299</span>
            <span>⚡ Lançamentos toda semana</span>
            <span>💎 Programa de fidelidade com até 50% OFF</span>
            <span>🔒 Pagamento 100% seguro (PIX, cartão e boleto)</span>
          </span></div>
          <div class="topbar-links">
            <a href="/conta.html">Minha conta</a>
            <a href="/conta.html#pedidos">Meus pedidos</a>
          </div>
        </div>
      </div>
      <header class="site-header">
        <div class="container">
          <button class="icon-btn menu-toggle" id="menu-toggle-btn" aria-label="Menu">☰</button>
          <a href="/" class="logo"><span class="dot"></span>NEXO<span class="store">STORE</span></a>
          <nav class="main-nav">
            <a href="/">Início</a>
            <a href="/produtos.html">Produtos</a>
            <a href="/produtos.html?on_sale=1">Ofertas</a>
            <a href="/produtos.html?bestseller=1">Mais vendidos</a>
            <a href="/conta.html#fidelidade">Fidelidade</a>
          </nav>
          <form class="header-search" id="header-search-form">
            <input type="search" name="q" placeholder="Buscar teclados, mouses, fones..." autocomplete="off" />
            <button type="submit" aria-label="Buscar">🔍</button>
          </form>
          <div class="header-actions">
            <a href="/conta.html" class="icon-btn" title="Minha conta">👤</a>
            <button class="icon-btn" id="open-cart-btn" title="Carrinho">
              🛒<span class="badge" id="cart-badge" style="display:none;">0</span>
            </button>
          </div>
        </div>
      </header>
      <div class="mobile-nav" id="mobile-nav">
        <button class="icon-btn" id="close-mobile-nav" style="margin-bottom:20px;">✕</button>
        <a href="/">Início</a>
        <a href="/produtos.html">Produtos</a>
        <a href="/produtos.html?on_sale=1">Ofertas</a>
        <a href="/produtos.html?bestseller=1">Mais vendidos</a>
        <a href="/conta.html">Minha conta</a>
        <a href="/conta.html#pedidos">Meus pedidos</a>
        <a href="/conta.html#fidelidade">Fidelidade</a>
      </div>
    `;

    const searchForm = qs('#header-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = new FormData(searchForm).get('q');
        window.location.href = `/produtos.html?search=${encodeURIComponent(q || '')}`;
      });
    }
    const menuBtn = qs('#menu-toggle-btn');
    const mobileNav = qs('#mobile-nav');
    if (menuBtn && mobileNav) {
      menuBtn.addEventListener('click', () => mobileNav.classList.add('open'));
      qs('#close-mobile-nav')?.addEventListener('click', () => mobileNav.classList.remove('open'));
    }

    // marca link ativo
    const path = window.location.pathname;
    qsa('.main-nav a').forEach(a => {
      if (a.getAttribute('href') === path) a.classList.add('active');
    });
  }

  if (footerMount) {
    footerMount.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <a href="/" class="logo" style="margin-bottom:14px;"><span class="dot"></span>NEXO<span class="store">STORE</span></a>
              <p style="max-width:300px;">Acessórios tecnológicos e lifestyle para quem vive conectado. Design moderno, performance de verdade.</p>
              <div class="social-icons">
                <a href="#" aria-label="Instagram">📷</a>
                <a href="#" aria-label="Twitter/X">🐦</a>
                <a href="#" aria-label="YouTube">▶️</a>
              </div>
            </div>
            <div>
              <h4>Institucional</h4>
              <a href="#">Sobre a NEXO STORE</a>
              <a href="#">Trabalhe conosco</a>
              <a href="#">Política de privacidade (LGPD)</a>
              <a href="#">Termos de uso</a>
            </div>
            <div>
              <h4>Ajuda</h4>
              <a href="#">Central de atendimento</a>
              <a href="#">Trocas e devoluções</a>
              <a href="/conta.html#pedidos">Rastrear pedido</a>
              <a href="#">Perguntas frequentes</a>
            </div>
            <div>
              <h4>Minha conta</h4>
              <a href="/conta.html">Meu perfil</a>
              <a href="/conta.html#enderecos">Endereços</a>
              <a href="/conta.html#fidelidade">Programa de fidelidade</a>
              <a href="/admin/">Painel administrativo</a>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} NEXO STORE. Todos os direitos reservados.</span>
            <div class="payment-icons">
              <span title="PIX">💠</span><span title="Cartão de crédito">💳</span><span title="Boleto">🧾</span>
            </div>
          </div>
        </div>
      </footer>
    `;
  }
}

function revealOnScroll() {
  const items = qsa('[data-reveal]');
  if (!items.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  items.forEach(el => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeaderFooter();
  revealOnScroll();
});

window.NexoUI = { formatBRL, formatDate, starsHtml, toast, escapeHtml, debounce, qs, qsa };
