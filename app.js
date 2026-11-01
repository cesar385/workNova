import { db, hashClave, alCambiar, notificar } from './db.js';
import { VISTAS } from './views.js';

// ---------- utilidades compartidas ----------
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fecha = (f) => { if (!f) return '—'; const d = new Date(f.length === 10 ? f + 'T12:00:00' : f); return isNaN(d) ? f : d.toLocaleDateString('es-AR'); };
export const fechaHora = (f) => new Date(f).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
export const plata = (n) => (n || n === 0) ? '$ ' + Number(n).toLocaleString('es-AR') : '—';
export const inicial = (n) => esc((n || '?').trim()[0]?.toUpperCase() || '?');
export const icon = (n) => `<i data-lucide="${n}"></i>`;
export const hoyISO = () => new Date().toISOString().slice(0, 10);

export function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

// Formulario genérico en ventana modal. campos: [{k, label, type, options, full, req, sec, placeholder}]
export function formulario({ titulo, campos, valores = {}, guardar = 'Guardar', ancho = false }) {
  return new Promise((resolve) => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    const campo = (c) => {
      if (c.sec) return `<div class="form-sec ${c.color || 'y'}">${esc(c.sec)}</div>`;
      const v = valores[c.k] ?? c.def ?? '';
      const req = c.req ? 'required' : '';
      let input;
      if (c.type === 'select') input = `<select name="${c.k}" ${req}>${(c.options || []).map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
      else if (c.type === 'textarea') input = `<textarea name="${c.k}" ${req} placeholder="${esc(c.placeholder || '')}">${esc(v)}</textarea>`;
      else if (c.type === 'checkbox') return `<div class="field ${c.full ? 'full' : ''}"><label class="check"><input type="checkbox" name="${c.k}" ${v ? 'checked' : ''} ${req}> ${esc(c.label)}</label></div>`;
      else if (c.type === 'file') input = `<input type="file" name="${c.k}" ${req} accept="${c.accept || ''}">`;
      else input = `<input type="${c.type || 'text'}" name="${c.k}" value="${esc(Array.isArray(v) ? v.join(', ') : v)}" ${req} ${c.step ? `step="${c.step}"` : ''} ${c.min !== undefined ? `min="${c.min}"` : ''} ${c.max !== undefined ? `max="${c.max}"` : ''} placeholder="${esc(c.placeholder || '')}">`;
      return `<div class="field ${c.full ? 'full' : ''}"><label>${esc(c.label)}${c.req ? ' *' : ''}</label>${input}</div>`;
    };
    bg.innerHTML = `<form class="modal ${ancho ? 'wide' : ''}"><header><h2>${esc(titulo)}</h2><button type="button" class="icon-btn" data-x>${icon('x')}</button></header>
      <div class="mbody"><div class="form-grid">${campos.map(campo).join('')}</div></div>
      <footer><button type="button" class="btn" data-x>Cancelar</button><button class="btn primary">${esc(guardar)}</button></footer></form>`;
    document.body.appendChild(bg); refrescarIconos();
    const cerrar = (r) => { bg.remove(); resolve(r); };
    bg.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => cerrar(null));
    bg.onclick = (e) => { if (e.target === bg) cerrar(null); };
    bg.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const out = {};
      for (const c of campos) {
        if (!c.k) continue;
        const el = e.target.elements[c.k];
        if (c.type === 'checkbox') out[c.k] = el.checked;
        else if (c.type === 'number') out[c.k] = el.value === '' ? null : Number(el.value);
        else if (c.type === 'list') out[c.k] = el.value.split(',').map((s) => s.trim()).filter(Boolean);
        else if (c.type === 'file') out[c.k] = el.files[0] || null;
        else out[c.k] = el.value.trim();
      }
      cerrar(out);
    };
    bg.querySelector('input,select,textarea')?.focus();
  });
}

export function confirmar(texto) { return Promise.resolve(window.confirm(texto)); }

export function verModal(titulo, html, ancho = true) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${ancho ? 'wide' : ''}"><header><h2>${esc(titulo)}</h2><button class="icon-btn" data-x>${icon('x')}</button></header><div class="mbody">${html}</div></div>`;
  document.body.appendChild(bg); refrescarIconos();
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
  return bg;
}

export function refrescarIconos() { window.lucide?.createIcons(); }

export function leerArchivo(file, maxMB = 2) {
  return new Promise((res, rej) => {
    if (!file) return res(null);
    if (file.size > maxMB * 1024 * 1024) return rej(new Error(`El archivo supera ${maxMB} MB. Los datos se guardan en el navegador, que tiene poco espacio.`));
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });
}

// ---------- sesión ----------
const SKEY = 'worknova_sesion';
export const sesion = {
  get usuario() { const id = localStorage.getItem(SKEY); return id ? db.get('usuarios', id) : null; },
  get empleado() { const u = this.usuario; return u?.empleado_id ? db.get('empleados', u.empleado_id) : null; },
  get esAdmin() { return this.usuario?.rol === 'admin'; },
  get esGestor() { return ['admin', 'rrhh'].includes(this.usuario?.rol); },
  get esJefe() { const e = this.empleado; return this.esGestor || this.usuario?.rol === 'jefe' || (!!e && /director|gerente|jef|ceo|coordinador|responsable/i.test(e.puesto || '')); },
  puede(vista) { const m = MENU.find((x) => x[0] === vista); const nivel = m ? m[3] : (vista === 'empleado' ? 'gestor' : 'todos'); return nivel === 'todos' || (nivel === 'jefe' && this.esJefe) || (nivel === 'gestor' && this.esGestor) || (nivel === 'admin' && this.esAdmin); },
  entrar(id) { localStorage.setItem(SKEY, id); },
  salir() { localStorage.removeItem(SKEY); },
};

// ---------- navegación ----------
// [ruta, etiqueta, ícono, nivel de acceso, sección]  nivel: todos | gestor (admin y RR.HH.) | admin
const MENU = [
  ['dashboard', 'Dashboard', 'layout-dashboard', 'gestor', 'General'],
  ['portal', 'Mi Portal', 'user', 'todos', 'General'],
  ['area', 'Mi Área', 'building', 'jefe', 'General'],
  ['chat', 'Chat', 'message-square', 'todos', 'General'],
  ['calendario', 'Calendario', 'calendar-days', 'todos', 'General'],
  ['asistencia', 'Asistencia', 'clock', 'todos', 'General'],
  ['organigrama', 'Organigrama', 'network', 'todos', 'General'],
  ['empleados', 'Empleados', 'users', 'gestor', 'Gestión de talento'],
  ['reclutamiento', 'Reclutamiento', 'briefcase', 'gestor', 'Gestión de talento'],
  ['permisos', 'Permisos', 'calendar', 'gestor', 'Gestión de talento'],
  ['evaluaciones', 'Evaluaciones', 'award', 'gestor', 'Gestión de talento'],
  ['objetivos', 'Objetivos', 'target', 'gestor', 'Gestión de talento'],
  ['capacitacion', 'Capacitación', 'graduation-cap', 'todos', 'Gestión de talento'],
  ['documentos', 'Documentos', 'file-text', 'todos', 'Gestión de talento'],
  ['aprobaciones', 'Aprobaciones', 'square-check-big', 'gestor', 'Gestión de talento'],
  ['sucesion', 'Sucesión', 'trending-up', 'gestor', 'Gestión de talento'],
  ['reportes', 'Reportes', 'chart-column', 'gestor', 'Administración'],
  ['empresa', 'Empresa', 'building-2', 'todos', 'Administración'],
  ['usuarios', 'Usuarios y roles', 'user-check', 'admin', 'Administración'],
  ['auditoria', 'Historial de cambios', 'history', 'admin', 'Administración'],
];
export const ROLES = [['admin', 'Administrador'], ['rrhh', 'Recursos Humanos'], ['jefe', 'Jefe de área'], ['empleado', 'Empleado']];
export const nombreRol = (r) => ROLES.find((x) => x[0] === r)?.[1] || 'Empleado';
db.setActor(() => sesion.usuario);

// ---------- tema (claro/oscuro) ----------
const TKEY = 'worknova_tema';
function leerTema() { try { return localStorage.getItem(TKEY) || ''; } catch { return ''; } }
export function aplicarTema(t = leerTema()) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
function alternarTema() {
  const oscuro = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const t = oscuro ? 'light' : 'dark'; try { localStorage.setItem(TKEY, t); } catch {} aplicarTema(t);
}
aplicarTema();

export const ir = (ruta) => { location.hash = '#/' + ruta; };

function ruta() {
  const [vista, ...params] = (location.hash.replace(/^#\/?/, '') || '').split('/');
  return { vista: vista || (sesion.esGestor ? 'dashboard' : 'portal'), params };
}

// ---------- render ----------
const app = document.getElementById('app');
let menuAbierto = null;

export function render() {
  const u = sesion.usuario;
  if (!u) return pantallaAuth();
  if (u.estado !== 'aprobado') return pantallaPendiente(u);
  if (u.debe_cambiar) return pantallaCambioClave(u);
  if (!u.acepto_declaracion) return pantallaDeclaracion(u);

  let { vista, params } = ruta();
  if (!sesion.puede(vista)) vista = 'portal';
  const V = VISTAS[vista] || VISTAS.portal;
  const empresa = db.list('empresa')[0] || {};
  const noLeidas = db.where('notificaciones', (n) => n.usuario_id === u.id && !n.leida).length;
  const pendUsuarios = sesion.esAdmin ? db.where('usuarios', (x) => x.estado === 'pendiente').length : 0;
  const pendAprob = sesion.esGestor ? db.where('permisos', (x) => x.estado === 'pendiente').length + db.where('documentos', (x) => x.estado === 'pendiente').length : 0;

  app.innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><div class="brand-logo">${empresa.logo ? `<img src="${esc(empresa.logo)}" alt="">` : 'W'}</div><div><b>${esc(empresa.nombre || 'WorkNova')}</b><small>HR Platform</small></div></div>
      <nav class="nav">${MENU.filter((m) => sesion.puede(m[0])).map(([k, l, i, , sec], idx, arr) =>
        `${idx === 0 || arr[idx - 1][4] !== sec ? `<div class="nav-sec">${sec}</div>` : ''}<a href="#/${k}" class="${vista === k || (vista === 'empleado' && k === 'empleados') ? 'on' : ''}">${icon(i)}<span>${l}</span>${k === 'usuarios' && pendUsuarios ? `<span class="badge-n">${pendUsuarios}</span>` : ''}${k === 'aprobaciones' && pendAprob ? `<span class="badge-n">${pendAprob}</span>` : ''}</a>`).join('')}</nav>
      <div class="side-foot">© ${new Date().getFullYear()} ${esc(empresa.nombre || 'WorkNova')}<br>HR Platform</div>
    </aside>
    <div class="scrim" data-scrim></div>
    <div class="main">
      <div class="topbar">
        <button class="icon-btn burger" data-burger>${icon('menu')}</button>
        <button class="search-btn" data-buscar>${icon('search')}<span>Buscar…</span><kbd>Ctrl K</kbd></button>
        <button class="icon-btn" data-tema title="Modo claro / oscuro">${icon('sun-moon')}</button>
        <button class="icon-btn" data-notif>${icon('bell')}${noLeidas ? '<span class="dot"></span>' : ''}</button>
        <button class="user-chip" data-user><span class="avatar">${inicial(u.nombre)}</span><span class="who"><b>${esc(u.nombre)}</b><small>${nombreRol(u.rol)}</small></span>${icon('chevron-down')}</button>
      </div>
      <main class="content" id="vista"></main>
    </div></div>`;

  const cont = document.getElementById('vista');
  try { V(cont, params); } catch (e) { console.error(e); cont.innerHTML = `<div class="card card-pad">Ocurrió un error al mostrar esta sección: ${esc(e.message)}</div>`; }

  const shell = app.querySelector('.shell');
  app.querySelector('[data-burger]').onclick = () => shell.classList.toggle('open');
  app.querySelector('[data-scrim]').onclick = () => shell.classList.remove('open');
  app.querySelector('[data-user]').onclick = (e) => { e.stopPropagation(); abrirMenu('user'); };
  app.querySelector('[data-notif]').onclick = (e) => { e.stopPropagation(); abrirMenu('notif'); };
  app.querySelector('[data-tema]').onclick = alternarTema;
  app.querySelector('[data-buscar]').onclick = buscador;
  refrescarIconos();
}

function abrirMenu(tipo) {
  document.querySelector('.menu')?.remove();
  if (menuAbierto === tipo) { menuAbierto = null; return; }
  menuAbierto = tipo;
  const u = sesion.usuario;
  const m = document.createElement('div'); m.className = 'menu';
  if (tipo === 'user') {
    m.innerHTML = `<div style="padding:.5rem .7rem"><b>${esc(u.nombre)}</b><div class="muted" style="font-size:.8rem">${esc(u.email)}</div></div>
      <a href="#/portal">${icon('user')} Mi Portal</a>
      <button data-pass>${icon('key-round')} Cambiar contraseña</button>
      <a href="index.html">${icon('house')} Página de inicio</a>
      <button data-salir class="t-red">${icon('log-out')} Cerrar sesión</button>`;
  } else {
    const ns = db.where('notificaciones', (n) => n.usuario_id === u.id).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30);
    m.innerHTML = `<div class="row between" style="padding:.4rem .7rem"><b>Notificaciones</b>${ns.length ? '<button class="btn sm" data-leer style="width:auto">Marcar leídas</button>' : ''}</div>
      <div class="notif-list">${ns.length ? ns.map((n) => `<div class="n ${n.leida ? '' : 'unread'}">${esc(n.texto)}<div class="muted" style="font-size:.72rem">${fechaHora(n.fecha)}</div></div>`).join('') : '<div class="empty" style="padding:1.2rem">Sin notificaciones</div>'}</div>`;
  }
  document.querySelector('.main').appendChild(m); refrescarIconos();
  m.onclick = (e) => e.stopPropagation();
  m.querySelector('[data-salir]')?.addEventListener('click', () => { sesion.salir(); menuAbierto = null; location.hash = ''; render(); });
  m.querySelector('[data-leer]')?.addEventListener('click', () => { db.where('notificaciones', (n) => n.usuario_id === u.id).forEach((n) => db.update('notificaciones', n.id, { leida: true })); menuAbierto = null; render(); });
  m.querySelector('[data-pass]')?.addEventListener('click', async () => {
    menuAbierto = null; m.remove();
    const r = await formulario({ titulo: 'Cambiar contraseña', campos: [
      { k: 'actual', label: 'Contraseña actual', type: 'password', req: true, full: true },
      { k: 'nueva', label: 'Nueva contraseña (mínimo 6)', type: 'password', req: true, full: true }] });
    if (!r) return;
    if (await hashClave(r.actual) !== u.clave) return toast('La contraseña actual no es correcta');
    if (r.nueva.length < 6) return toast('La nueva contraseña es muy corta');
    db.update('usuarios', u.id, { clave: await hashClave(r.nueva) }); toast('Contraseña actualizada');
  });
}
document.addEventListener('click', () => { if (menuAbierto) { document.querySelector('.menu')?.remove(); menuAbierto = null; } });

// ---------- pantallas de acceso ----------
function pantallaAuth(modo = 'login', error = '') {
  const hayAdmin = db.where('usuarios', (u) => u.rol === 'admin').length > 0;
  if (!hayAdmin) modo = 'registro';
  const registro = modo === 'registro';
  app.innerHTML = `<div class="auth"><form class="box">
    <div class="shield">${icon(registro ? 'user-plus' : 'log-in')}</div>
    <h1 style="text-align:center">${registro ? (hayAdmin ? 'Solicitar acceso' : 'Crear cuenta de administrador') : 'Iniciar sesión'}</h1>
    <p class="sub" style="text-align:center">WorkNova · Suite de Talento</p>
    ${!hayAdmin ? '<div class="note">Primera vez en este navegador: la cuenta que crees ahora será la del administrador.</div>' : ''}
    ${error ? `<div class="err">${esc(error)}</div>` : ''}
    ${registro ? '<div class="field"><label>Nombre completo</label><input name="nombre" required></div>' : ''}
    <div class="field"><label>Correo electrónico</label><input name="email" type="email" required autocomplete="username"></div>
    <div class="field"><label>Contraseña</label><input name="clave" type="password" required minlength="${registro ? 6 : 1}" autocomplete="${registro ? 'new-password' : 'current-password'}"></div>
    <button class="btn primary" style="width:100%">${registro ? 'Crear cuenta' : 'Ingresar'}</button>
    ${hayAdmin ? `<div class="switch">${registro ? '¿Ya tenés cuenta? <a data-m="login">Iniciá sesión</a>' : '¿No tenés cuenta? <a data-m="registro">Solicitá acceso</a>'}</div>` : ''}
    <div class="switch"><a href="index.html">← Volver a la página de inicio</a></div>
  </form></div>`;
  refrescarIconos();
  app.querySelector('[data-m]')?.addEventListener('click', (e) => pantallaAuth(e.target.dataset.m));
  app.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const email = f.email.trim().toLowerCase();
    const clave = await hashClave(f.clave);
    if (!registro) {
      const u = db.where('usuarios', (x) => x.email === email)[0];
      if (!u || u.clave !== clave) return pantallaAuth('login', 'Correo o contraseña incorrectos.');
      sesion.entrar(u.id); return render();
    }
    if (db.where('usuarios', (x) => x.email === email).length) return pantallaAuth('registro', 'Ya existe una cuenta con ese correo.');
    const emp = db.where('empleados', (x) => (x.email || '').toLowerCase() === email)[0];
    const u = db.create('usuarios', {
      nombre: f.nombre.trim(), email, clave, rol: hayAdmin ? 'empleado' : 'admin',
      estado: hayAdmin ? 'pendiente' : 'aprobado', empleado_id: emp?.id || null, acepto_declaracion: false,
    });
    if (hayAdmin) db.where('usuarios', (x) => x.rol === 'admin').forEach((a) => notificar(a.id, `${u.nombre} solicitó acceso al sistema.`));
    sesion.entrar(u.id); render();
  };
}

function pantallaPendiente(u) {
  const rech = u.estado === 'rechazado';
  app.innerHTML = `<div class="auth"><div class="box" style="text-align:center">
    <div class="shield">${icon(rech ? 'circle-x' : 'clock')}</div>
    <h1>${rech ? 'Solicitud rechazada' : 'Solicitud enviada'}</h1>
    <p class="sub">${rech ? 'Un administrador rechazó tu acceso. Comunicate con Recursos Humanos.' : 'Un administrador tiene que aprobar tu cuenta antes de que puedas ingresar. Volvé a intentar más tarde.'}</p>
    <button class="btn" data-salir>Cerrar sesión</button></div></div>`;
  refrescarIconos();
  app.querySelector('[data-salir]').onclick = () => { sesion.salir(); render(); };
}

function pantallaDeclaracion(u) {
  const empresa = db.list('empresa')[0] || {};
  app.innerHTML = `<div class="auth"><form class="box wide">
    <div class="shield">${icon('shield-check')}</div>
    <h1 style="text-align:center">Declaración Jurada de Uso y Privacidad</h1>
    <p class="sub" style="text-align:center">${esc(empresa.nombre || 'WorkNova')} HR Platform · Términos y Condiciones</p>
    <div class="decl">
      <h4>${icon('file-text')} 1. Uso del Sistema</h4><p>Declaro que utilizaré la plataforma exclusivamente para fines laborales vinculados a mi relación con la empresa, que no compartiré mis credenciales de acceso con terceros y que no utilizaré el sistema para propósitos no autorizados.</p>
      <h4>${icon('lock')} 2. Confidencialidad de la Información</h4><p>Comprendo que la información a la que tendré acceso (datos personales de empleados, evaluaciones, salarios, documentos y comunicaciones internas) es confidencial. Me comprometo a no divulgarla, copiarla ni utilizarla fuera del ámbito laboral autorizado.</p>
      <h4>${icon('eye')} 3. Tratamiento de Datos Personales</h4><p>Autorizo el tratamiento de mis datos personales cargados en el sistema con fines de gestión de recursos humanos, en cumplimiento de la Ley N° 25.326 de Protección de Datos Personales. Puedo ejercer mis derechos de acceso, rectificación y supresión ante el área de Recursos Humanos.</p>
      <h4>${icon('triangle-alert')} 4. Responsabilidad</h4><p>Asumo la responsabilidad por las acciones realizadas con mi usuario y me comprometo a informar de inmediato cualquier uso indebido o acceso no autorizado que detecte.</p>
    </div>
    <label class="check"><input type="checkbox" required> He leído y acepto la presente declaración jurada de uso y privacidad del sistema, comprometiéndome a cumplir con todos los términos aquí expuestos.</label>
    <div class="row" style="margin-top:1.2rem;justify-content:flex-end"><button type="button" class="btn" data-salir>Cancelar</button><button class="btn primary">Aceptar y continuar</button></div>
  </form></div>`;
  refrescarIconos();
  app.querySelector('[data-salir]').onclick = () => { sesion.salir(); render(); };
  app.querySelector('form').onsubmit = (e) => { e.preventDefault(); db.update('usuarios', u.id, { acepto_declaracion: true, fecha_declaracion: new Date().toISOString() }); render(); };
}

function pantallaCambioClave(u) {
  app.innerHTML = `<div class="auth"><form class="box">
    <div class="shield">${icon('key-round')}</div>
    <h1 style="text-align:center">Elegí una contraseña nueva</h1>
    <p class="sub" style="text-align:center">Un administrador restableció tu contraseña. Antes de seguir, elegí una propia.</p>
    <div class="field"><label>Nueva contraseña (mínimo 6)</label><input name="a" type="password" required minlength="6" autocomplete="new-password"></div>
    <div class="field"><label>Repetir contraseña</label><input name="b" type="password" required minlength="6" autocomplete="new-password"></div>
    <button class="btn primary" style="width:100%">Guardar y continuar</button></form></div>`;
  refrescarIconos();
  app.querySelector('form').onsubmit = async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (f.a !== f.b) return toast('Las contraseñas no coinciden');
    db.update('usuarios', u.id, { clave: await hashClave(f.a), debe_cambiar: false }); toast('Contraseña actualizada'); render();
  };
}

// ---------- búsqueda global ----------
function buscador() {
  if (document.querySelector('.modal-bg.busq')) return;
  const bg = document.createElement('div'); bg.className = 'modal-bg busq';
  bg.innerHTML = `<div class="modal busq-box"><div class="busq-in">${icon('search')}<input placeholder="Buscar empleados, candidatos, documentos, secciones…" data-in><kbd>Esc</kbd></div><div class="busq-res" data-res></div></div>`;
  document.body.appendChild(bg); refrescarIconos();
  const inp = bg.querySelector('[data-in]'); const res = bg.querySelector('[data-res]'); let sel = 0, items = [];
  const cerrar = () => bg.remove();
  const pintar = () => {
    const q = inp.value.trim().toLowerCase(); const g = sesion.esGestor;
    const m = (t) => !q || String(t || '').toLowerCase().includes(q);
    items = [
      ...MENU.filter((x) => sesion.puede(x[0]) && m(x[1])).map((x) => ({ g: 'Secciones', i: x[2], t: x[1], s: x[4], r: x[0] })),
      ...(q ? db.where('empleados', (e) => m(`${e.nombre_completo} ${e.email} ${e.puesto} ${e.departamento} ${e.dni || ''}`)).map((e) => ({ g: 'Empleados', i: 'user', t: e.nombre_completo, s: `${e.puesto} · ${e.departamento}`, r: g ? 'empleado/' + e.id : 'organigrama' })) : []),
      ...(q && g ? db.where('candidatos', (x) => m(`${x.nombre} ${x.puesto}`)).map((x) => ({ g: 'Candidatos', i: 'briefcase', t: x.nombre, s: x.puesto, r: 'reclutamiento' })) : []),
      ...(q ? db.where('documentos', (d) => (g || d.estado === 'aprobado') && m(`${d.titulo} ${d.nombre_archivo}`)).map((d) => ({ g: 'Documentos', i: 'file-text', t: d.titulo, s: d.nombre_archivo, r: 'documentos' })) : []),
      ...(q ? db.where('capacitaciones', (x) => m(x.titulo)).map((x) => ({ g: 'Capacitación', i: 'graduation-cap', t: x.titulo, s: x.modalidad, r: 'capacitacion' })) : []),
    ].slice(0, 40);
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let ult = '';
    res.innerHTML = items.length ? items.map((x, n) => { const h = x.g !== ult ? `<div class="busq-g">${x.g}</div>` : ''; ult = x.g; return `${h}<div class="busq-it ${n === sel ? 'on' : ''}" data-n="${n}">${icon(x.i)}<div><b>${esc(x.t)}</b><small>${esc(x.s || '')}</small></div></div>`; }).join('') : '<div class="empty">Sin resultados</div>';
    res.querySelectorAll('[data-n]').forEach((el) => el.onclick = () => { cerrar(); ir(items[el.dataset.n].r); });
    refrescarIconos();
  };
  inp.oninput = () => { sel = 0; pintar(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); pintar(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); pintar(); e.preventDefault(); }
    else if (e.key === 'Enter' && items[sel]) { cerrar(); ir(items[sel].r); }
    else if (e.key === 'Escape') cerrar();
  };
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
  pintar(); inp.focus();
}
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && sesion.usuario?.estado === 'aprobado') { e.preventDefault(); buscador(); }
  if (e.key === 'Escape') document.querySelector('.modal-bg:not(.busq)')?.querySelector('[data-x]')?.click();
});

// ---------- cierre de sesión por inactividad (30 min) ----------
let ultimaActividad = Date.now();
['click', 'keydown', 'mousemove', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { ultimaActividad = Date.now(); }, { passive: true }));
setInterval(() => {
  if (sesion.usuario && Date.now() - ultimaActividad > 30 * 60 * 1000) { sesion.salir(); document.querySelectorAll('.modal-bg').forEach((m) => m.remove()); render(); toast('Sesión cerrada por inactividad'); }
}, 60 * 1000);

window.addEventListener('hashchange', () => { app.querySelector('.shell')?.classList.remove('open'); render(); window.scrollTo(0, 0); });
alCambiar(() => { if (document.querySelector('.modal-bg')) return; render(); });
render();
