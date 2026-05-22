/* ════════════════════════════════════════════════════════════
   WORKIFY — Core JS Utilities
   Maneja: API calls, Auth state, Toast, Panel drawer, Modals
   ════════════════════════════════════════════════════════════ */

const API_URL = window.location.origin;

// ── Estado global de autenticación ───────────────────────────
const Auth = {
  token: localStorage.getItem('wk_token'),
  user: JSON.parse(localStorage.getItem('wk_user') || 'null'),

  isLoggedIn() { return !!this.token && !!this.user; },
  isAdmin()    { return this.user?.rol === 'admin'; },

  save(token, user) {
    this.token = token;
    this.user  = user;
    localStorage.setItem('wk_token', token);
    localStorage.setItem('wk_user', JSON.stringify(user));
  },

  clear() {
    this.token = null;
    this.user  = null;
    localStorage.removeItem('wk_token');
    localStorage.removeItem('wk_user');
  }
};

// ── API helper ────────────────────────────────────────────────
const api = {
  async request(method, path, body = null, isFormData = false) {
    const headers = {};
    if (Auth.token) headers['Authorization'] = `Bearer ${Auth.token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    try {
      const res = await fetch(`${API_URL}${path}`, opts);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la solicitud');
      }
      return data;
    } catch (err) {
      throw err;
    }
  },

  get:    (path)        => api.request('GET',    path),
  post:   (path, body)  => api.request('POST',   path, body),
  put:    (path, body)  => api.request('PUT',    path, body),
  patch:  (path, body)  => api.request('PATCH',  path, body),
  delete: (path)        => api.request('DELETE', path),
  upload: (path, form)  => api.request('POST',   path, form, true)
};

// ── Toast Notifications ────────────────────────────────────────
const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', title = null, duration = 4000) {
    this.init();

    const icons = {
      success: 'fa-circle-check',
      error:   'fa-circle-xmark',
      info:    'fa-circle-info',
      warning: 'fa-triangle-exclamation'
    };

    const titles = {
      success: '¡Éxito!',
      error:   'Error',
      info:    'Información',
      warning: 'Advertencia'
    };

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="fa-solid ${icons[type]} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title || titles[type]}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    this.container.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('show'));
    });

    setTimeout(() => {
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(() => el.remove(), 400);
    }, duration);
  },

  success: (msg, title)  => Toast.show(msg, 'success', title),
  error:   (msg, title)  => Toast.show(msg, 'error',   title),
  info:    (msg, title)  => Toast.show(msg, 'info',     title),
  warning: (msg, title)  => Toast.show(msg, 'warning',  title)
};

// ── Panel Drawer (slide desde la derecha) ─────────────────────
const Panel = {
  overlay: null,
  drawer:  null,
  _onClose: null,

  init() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'panel-overlay';
    this.overlay.addEventListener('click', () => this.close());

    this.drawer = document.createElement('div');
    this.drawer.className = 'panel-drawer';

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.drawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  open({ title, subtitle = '', body = '', footer = '', onClose } = {}) {
    this.init();
    this._onClose = onClose;

    this.drawer.innerHTML = `
      <div class="panel-header">
        <div>
          <h2>${title}</h2>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
        <button class="panel-close" onclick="Panel.close()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="panel-body">${body}</div>
      ${footer ? `<div class="panel-footer">${footer}</div>` : ''}
    `;

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      this.overlay.classList.add('open');
      this.drawer.classList.add('open');
    });
  },

  setBody(html) {
    const body = this.drawer.querySelector('.panel-body');
    if (body) body.innerHTML = html;
  },

  close() {
    if (!this.drawer) return;
    this.overlay.classList.remove('open');
    this.drawer.classList.remove('open');
    document.body.style.overflow = '';
    if (this._onClose) this._onClose();
  }
};

// ── Modal Clásico ─────────────────────────────────────────────
const Modal = {
  _el: null,

  open(html, maxWidth = '480px') {
    if (this._el) this._el.remove();

    const el = document.createElement('div');
    el.className = 'modal-backdrop';
    el.innerHTML = `<div class="modal" style="max-width:${maxWidth}">${html}</div>`;

    // Cerrar al hacer clic fuera
    el.addEventListener('click', (e) => {
      if (e.target === el) this.close();
    });

    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    this._el = el;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('open'));
    });

    return el;
  },

  close() {
    if (!this._el) return;
    this._el.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      this._el?.remove();
      this._el = null;
    }, 300);
  }
};

// ── Confirm dialog ────────────────────────────────────────────


// ── Confirm dialog (Corregido) ────────────────────────────────
function confirmDialog(message, onConfirm, title = '¿Estás seguro?') {
  // 1. Abrimos el modal y guardamos el elemento que retorna
  const modalEl = Modal.open(`
    <div class="modal-header">
      <div class="modal-icon danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h3 style="font-size:1.1rem;margin-bottom:.4rem">${title}</h3>
      <p style="font-size:.88rem;color:var(--gray-500)">${message}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="modal-btn-cancel">Cancelar</button>
      <button class="btn btn-danger" id="modal-btn-confirm">Confirmar</button>
    </div>
  `);

  // 2. Asignamos los eventos correctamente para no perder el scope de las variables
  document.getElementById('modal-btn-cancel').addEventListener('click', () => {
    Modal.close();
  });

  document.getElementById('modal-btn-confirm').addEventListener('click', () => {
    onConfirm(); // Ejecuta la función original conservando 'id' y 'estado'
    Modal.close();
  });
}

// ── Helpers UI ────────────────────────────────────────────────
function renderEstrellas(promedio, total = null) {
  const filled = Math.floor(promedio);
  const half   = promedio % 1 >= 0.5;
  let html = '<span class="stars-display">';
  for (let i = 1; i <= 5; i++) {
    if (i <= filled) html += '<i class="fa-solid fa-star star filled"></i>';
    else if (i === filled + 1 && half) html += '<i class="fa-solid fa-star-half-stroke star half"></i>';
    else html += '<i class="fa-regular fa-star star"></i>';
  }
  html += `<span style="font-size:.82rem;color:var(--gray-500);margin-left:.3rem">${parseFloat(promedio).toFixed(1)}`;
  if (total !== null) html += ` <span style="color:var(--gray-400)">(${total})</span>`;
  html += '</span></span>';
  return html;
}

function renderBadge(text, clase) {
  return `<span class="badge ${clase}">${text}</span>`;
}

function estadoBadge(estado) {
  const map = {
    recibido:               ['Recibido',    'badge-blue  status-recibido'],
    en_revision:            ['En revisión', 'badge-orange status-en_revision'],
    contratado:             ['Contratado',  'badge-green  status-contratado'],
    rechazado:              ['Rechazado',   'badge-red    status-rechazado'],
    esperando_confirmacion: ['Esperando pago', 'badge-orange status-esperando_confirmacion'],
    pago_verificado:        ['Pago verificado','badge-green  status-pago_verificado'],
    denegado:               ['Denegado',    'badge-red    status-denegado'],
    completado:             ['Completado',  'badge-gray   status-completado'],
  };
  const [label, cls] = map[estado] || [estado, 'badge-gray'];
  return renderBadge(label, cls);
}

function tiempoRelativo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime();
  const min  = Math.floor(diff / 60000);
  const hrs  = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);
  if (min < 2)  return 'Ahora mismo';
  if (min < 60) return `Hace ${min} min`;
  if (hrs < 24) return `Hace ${hrs} h`;
  if (dias < 7) return `Hace ${dias} días`;
  return new Date(fecha).toLocaleDateString('es-PE', { day:'numeric', month:'short', year:'numeric' });
}

function formatFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function diasRestantes(fechaFin) {
  const dias = Math.ceil((new Date(fechaFin) - Date.now()) / 86400000);
  return dias;
}

function urlWhatsApp(numero, mensaje) {
  const num = numero.replace(/\D/g, '');
  const tel = num.startsWith('51') ? num : `51${num}`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

// ── Navbar dinámica ───────────────────────────────────────────
function initNavbar() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  updateNavAuth();
  loadNotifCount();
}

function updateNavAuth() {
  const btnAuth     = document.getElementById('nav-auth-btn');
  const btnPerfil   = document.getElementById('nav-perfil-btn');
  const btnPublicar = document.getElementById('nav-publicar-btn');
  const btnAdmin    = document.getElementById('nav-admin-btn');
  const btnNot      = document.getElementById('nav-notif-btn');

  if (Auth.isLoggedIn()) {
    if (btnAuth)     btnAuth.style.display     = 'none';
    if (btnPerfil)   btnPerfil.style.display   = 'flex';
    if (btnPublicar) btnPublicar.style.display = 'flex';
    if (btnNot)      btnNot.style.display      = 'flex';
    if (btnAdmin)    btnAdmin.style.display    = Auth.isAdmin() ? 'flex' : 'none';
  } else {
    if (btnAuth)     btnAuth.style.display     = 'flex';
    if (btnPerfil)   btnPerfil.style.display   = 'none';
    if (btnPublicar) btnPublicar.style.display = 'none';
    if (btnNot)      btnNot.style.display      = 'none';
    if (btnAdmin)    btnAdmin.style.display    = 'none';
  }
}

async function loadNotifCount() {
  if (!Auth.isLoggedIn()) return;
  try {
    const data = await api.get('/api/notificaciones');
    const badge = document.getElementById('notif-count');
    if (badge && data.no_leidas > 0) {
      badge.textContent = data.no_leidas > 9 ? '9+' : data.no_leidas;
      badge.style.display = 'flex';
    } else if (badge) {
      badge.style.display = 'none';
    }
  } catch {}
}

// ── Auth Modals (Login / Register) ───────────────────────────
function openAuthModal(tab = 'login') {
  Modal.open(`
    <div class="modal-header">
      <div class="modal-icon blue"><i class="fa-solid fa-briefcase"></i></div>
      <div class="modal-tabs">
        <div class="modal-tab ${tab === 'login' ? 'active' : ''}" onclick="switchAuthTab('login')">Iniciar Sesión</div>
        <div class="modal-tab ${tab === 'register' ? 'active' : ''}" onclick="switchAuthTab('register')">Registrarse</div>
      </div>
    </div>
    <div class="modal-body" id="auth-modal-body">
      ${tab === 'login' ? renderLoginForm() : renderRegisterForm()}
    </div>
  `);
}

function switchAuthTab(tab) {
  document.querySelectorAll('.modal-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  document.getElementById('auth-modal-body').innerHTML =
    tab === 'login' ? renderLoginForm() : renderRegisterForm();
}

function renderLoginForm() {
  return `
    <form onsubmit="handleLogin(event)">
      <div class="form-group">
        <label class="form-label">Correo electrónico</label>
        <input type="email" class="form-control" id="login-email" placeholder="tu@email.com" required autocomplete="email">
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input type="password" class="form-control" id="login-password" placeholder="••••••••" required>
      </div>
      <button type="submit" class="btn btn-primary w-100" id="login-submit">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> Ingresar
      </button>
    </form>
    <p style="text-align:center;font-size:.83rem;color:var(--gray-500);margin-top:1rem">
      ¿No tienes cuenta? <a onclick="switchAuthTab('register')" style="color:var(--blue);cursor:pointer;font-weight:600">Regístrate gratis</a>
    </p>
  `;
}

function renderRegisterForm() {
  return `
    <form onsubmit="handleRegister(event)">
      <div class="form-group">
        <label class="form-label">Nombre completo</label>
        <input type="text" class="form-control" id="reg-nombre" placeholder="Tu nombre" required>
      </div>
      <div class="form-group">
        <label class="form-label">Correo electrónico</label>
        <input type="email" class="form-control" id="reg-email" placeholder="tu@email.com" required autocomplete="email">
      </div>
      <div class="form-group">
        <label class="form-label">WhatsApp</label>
        <div class="d-flex align-center gap-1">
          <span style="font-size:.85rem;color:var(--gray-500);white-space:nowrap;padding:.65rem .75rem;background:var(--gray-50);border:1.5px solid var(--gray-200);border-right:none;border-radius:var(--radius-md) 0 0 var(--radius-md)">+51</span>
          <input type="tel" class="form-control" id="reg-whatsapp" placeholder="9XXXXXXXX"
            style="border-radius:0 var(--radius-md) var(--radius-md) 0"
            maxlength="9" pattern="9[0-9]{8}" title="9 dígitos, comenzando con 9" required>
        </div>
        <div class="form-hint">9 dígitos, comienza con 9 (ej: 987654321)</div>
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input type="password" class="form-control" id="reg-password" placeholder="Mínimo 6 caracteres" minlength="6" required>
      </div>
      <button type="submit" class="btn btn-primary w-100" id="reg-submit">
        <i class="fa-solid fa-user-plus"></i> Crear cuenta
      </button>
    </form>
    <p style="text-align:center;font-size:.83rem;color:var(--gray-500);margin-top:1rem">
      ¿Ya tienes cuenta? <a onclick="switchAuthTab('login')" style="color:var(--blue);cursor:pointer;font-weight:600">Inicia sesión</a>
    </p>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-submit');
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Ingresando...';

  try {
    const data = await api.post('/auth/login', { email, password });
    Auth.save(data.token, data.user);
    Modal.close();
    Toast.success(`Bienvenido, ${data.user.nombre.split(' ')[0]}!`);
    updateNavAuth();
    loadNotifCount();

    // Redirigir si es admin
    if (data.user.rol === 'admin') {
      setTimeout(() => window.location.href = '/pages/admin.html', 800);
    } else {
      setTimeout(() => window.location.reload(), 500);
    }
  } catch (err) {
    Toast.error(err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Ingresar';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-submit');
  const nombre   = document.getElementById('reg-nombre').value.trim();
  const email    = document.getElementById('reg-email').value;
  const whatsapp = document.getElementById('reg-whatsapp').value;
  const password = document.getElementById('reg-password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creando cuenta...';

  try {
    const data = await api.post('/auth/register', { nombre, email, whatsapp, password });
    Auth.save(data.token, data.user);
    Modal.close();
    Toast.success('¡Cuenta creada! Bienvenido a Workify.');
    updateNavAuth();
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    Toast.error(err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear cuenta';
  }
}

function logout() {
  Auth.clear();
  Toast.info('Sesión cerrada');
  setTimeout(() => window.location.href = '/', 600);
}

// ── Panel de Notificaciones ────────────────────────────────────
async function openNotificaciones() {
  Panel.open({
    title: 'Notificaciones',
    subtitle: 'Tus últimas actualizaciones',
    body: '<div class="loading-overlay"><span class="spinner dark"></span>Cargando...</div>'
  });

  try {
    const data = await api.get('/api/notificaciones');
    const notifs = data.notificaciones;

    if (notifs.length === 0) {
      Panel.setBody(`
        <div class="empty-state">
          <i class="fa-regular fa-bell"></i>
          <h3>Sin notificaciones</h3>
          <p>Aquí verás actualizaciones sobre tus postulaciones y publicaciones.</p>
        </div>
      `);
      return;
    }

    const html = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:1rem">
        <button class="btn btn-sm btn-ghost" onclick="marcarTodasLeidas()">
          <i class="fa-solid fa-check-double"></i> Marcar todas como leídas
        </button>
      </div>
      <div id="notif-list">
        ${notifs.map(n => `
          <div class="notif-item" id="notif-${n.id}" style="
            display:flex;gap:.75rem;padding:.9rem;border-radius:var(--radius-md);
            background:${n.leido ? 'transparent' : 'rgba(33,150,243,.04)'};
            border:1px solid ${n.leido ? 'transparent' : 'rgba(33,150,243,.1)'};
            margin-bottom:.5rem;cursor:pointer;transition:var(--transition);
          " onclick="leerNotif(${n.id})">
            <div style="
              width:36px;height:36px;border-radius:50%;flex-shrink:0;
              background:${n.leido ? 'var(--gray-100)' : 'rgba(33,150,243,.12)'};
              display:flex;align-items:center;justify-content:center;
              color:${n.leido ? 'var(--gray-400)' : 'var(--blue)'};font-size:.9rem;
            ">
              <i class="fa-solid ${n.tipo === 'postulacion' ? 'fa-file-alt' : n.tipo === 'estado' ? 'fa-arrows-rotate' : 'fa-megaphone'}"></i>
            </div>
            <div style="flex:1;min-width:0">
              <p style="font-size:.87rem;color:var(--gray-700);line-height:1.5;margin-bottom:.2rem">${n.mensaje}</p>
              <p style="font-size:.75rem;color:var(--gray-400)">${tiempoRelativo(n.fecha)}</p>
            </div>
            ${!n.leido ? '<div style="width:8px;height:8px;background:var(--blue);border-radius:50%;flex-shrink:0;margin-top:4px"></div>' : ''}
          </div>
        `).join('')}
      </div>
    `;

    Panel.setBody(html);

    // Marcar leídas al abrir
    await api.patch('/api/notificaciones/leer-todas', {});
    loadNotifCount();
  } catch (err) {
    Toast.error('Error al cargar notificaciones');
  }
}

async function leerNotif(id) {
  try { await api.patch(`/api/notificaciones/${id}/leer`, {}); } catch {}
  const el = document.getElementById(`notif-${id}`);
  if (el) {
    el.style.background = 'transparent';
    el.style.border = '1px solid transparent';
    const dot = el.querySelector('div:last-child');
    if (dot && dot.style.background.includes('blue')) dot.remove();
  }
}

async function marcarTodasLeidas() {
  try {
    await api.patch('/api/notificaciones/leer-todas', {});
    Toast.success('Todas las notificaciones marcadas como leídas');
    loadNotifCount();
    document.querySelectorAll('.notif-item').forEach(el => {
      el.style.background = 'transparent';
      el.style.border = '1px solid transparent';
    });
  } catch {}
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();

  // Marcar nav link activo
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link[href]').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
});