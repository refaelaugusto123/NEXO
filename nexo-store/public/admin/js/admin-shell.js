// ===========================================
// NEXO STORE - Shell do painel administrativo
// Renderiza sidebar, valida sessão de admin e expõe helpers comuns
// ===========================================
'use strict';

const AdminShell = {
  user: null,

  async requireAdmin() {
    try {
      const { user } = await Api.get('/auth/me');
      if (!user.is_admin) {
        this.showLoginGate('Esta conta não tem permissão de administrador.');
        return null;
      }
      this.user = user;
      return user;
    } catch {
      this.showLoginGate();
      return null;
    }
  },

  showLoginGate(message) {
    document.getElementById('admin-app')?.style.setProperty('display', 'none');
    let gate = document.getElementById('admin-login-gate');
    if (!gate) {
      gate = document.createElement('div');
      gate.id = 'admin-login-gate';
      gate.className = 'admin-login-shell';
      document.body.appendChild(gate);
    }
    gate.innerHTML = `
      <div class="auth-shell card">
        <h1>Painel Administrativo</h1>
        <p class="sub">NEXO STORE — acesso restrito.</p>
        ${message ? `<p class="input-error" style="margin-bottom:14px;">${message}</p>` : ''}
        <form id="admin-login-form">
          <div class="form-group"><label>E-mail</label><input class="input" name="email" type="email" required></div>
          <div class="form-group"><label>Senha</label><input class="input" name="password" type="password" required></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Entrar</button>
        </form>
        <p class="input-hint" style="margin-top:16px;">Demonstração: admin@nexostore.com.br / Admin@123</p>
      </div>
    `;
    gate.querySelector('#admin-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        const { user } = await Api.post('/auth/login', data);
        if (!user.is_admin) {
          NexoUI.toast('Esta conta não é administradora.', 'error');
          await Api.post('/auth/logout');
          return;
        }
        window.location.reload();
      } catch (err) {
        NexoUI.toast(err.message, 'error');
      }
    });
  },

  renderSidebar(active) {
    const el = document.getElementById('admin-sidebar');
    if (!el) return;
    const items = [
      { href: '/admin/', key: 'dashboard', icon: '📊', label: 'Dashboard' },
      { href: '/admin/produtos.html', key: 'produtos', icon: '📦', label: 'Produtos' },
      { href: '/admin/pedidos.html', key: 'pedidos', icon: '🧾', label: 'Pedidos' },
      { href: '/admin/clientes.html', key: 'clientes', icon: '👥', label: 'Clientes' },
      { href: '/admin/cupons.html', key: 'cupons', icon: '🏷️', label: 'Cupons' },
      { href: '/admin/fidelidade.html', key: 'fidelidade', icon: '💎', label: 'Fidelidade' },
    ];
    el.innerHTML = `
      <a href="/" class="logo"><span class="dot"></span>NEXO<span class="store">STORE</span></a>
      <nav>
        ${items.map(i => `<a href="${i.href}" class="${i.key === active ? 'active' : ''}">${i.icon} ${i.label}</a>`).join('')}
        <a href="#" id="admin-logout-link" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px;">🚪 Sair / Ver loja</a>
      </nav>
    `;
    el.querySelector('#admin-logout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      await Api.post('/auth/logout');
      window.location.href = '/';
    });
  },
};

window.AdminShell = AdminShell;
