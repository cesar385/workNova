import { db, DEPARTAMENTOS, notificar } from './db.js';
import { esc, fecha, fechaHora, plata, inicial, icon, hoyISO, toast, formulario, confirmar, verModal, refrescarIconos, leerArchivo, sesion, ir, render } from './app.js';

// ---------- piezas comunes ----------
const header = (t, s, acciones = '') => `<div class="ph"><div><h1>${esc(t)}</h1>${s ? `<p>${esc(s)}</p>` : ''}</div><div class="row">${acciones}</div></div>`;
const stat = (lbl, val, ic, color, extra = '') => `<div class="card stat"><div><div class="lbl">${esc(lbl)}</div><div class="val">${val}</div>${extra ? `<div class="trend">${extra}</div>` : ''}</div><div class="ico ${color}">${icon(ic)}</div></div>`;
const statTxt = (lbl, val, ic, color) => `<div class="card stat"><div><div class="lbl">${esc(lbl)}</div><div class="val ${color}">${val}</div></div><div class="${color}">${icon(ic)}</div></div>`;
const vacio = (txt, ic = 'inbox') => `<div class="empty">${icon(ic)}<div>${esc(txt)}</div></div>`;
const opcionesEmpleados = (todos = true) => [['', todos ? '— Seleccionar —' : '—'], ...db.list('empleados').map((e) => [e.id, e.nombre_completo])];
const nombreEmp = (id) => db.get('empleados', id)?.nombre_completo || '';
const usuarioDeEmpleado = (empId) => db.where('usuarios', (u) => u.empleado_id === empId)[0];
const admins = () => db.where('usuarios', (u) => u.rol === 'admin');
const on = (root, sel, ev, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, (e) => fn(el, e)));
const estadoPill = (e) => {
  const m = { pendiente: 'warn', aprobado: 'ok', aprobada: 'ok', rechazado: 'bad', rechazada: 'bad', activo: 'ok', inactivo: 'bad', licencia: 'warn', completada: 'ok', completado: 'ok', 'en progreso': 'info', planificado: 'info', 'en curso': 'violet', finalizado: 'ok', cancelado: 'bad' };
  return `<span class="pill ${m[e] || ''}">${esc(e || '—')}</span>`;
};

// ---------- campos de empleado ----------
const CAMPOS_PERSONALES = [
  { sec: 'Información Personal', color: 'y' },
  { k: 'nombre_completo', label: 'Nombre completo', req: true },
  { k: 'email', label: 'Correo electrónico', type: 'email', req: true },
  { k: 'dni', label: 'DNI' }, { k: 'cuil', label: 'CUIL' },
  { k: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
  { k: 'genero', label: 'Género', type: 'select', options: ['', 'Femenino', 'Masculino', 'No binario', 'Prefiere no decir'] },
  { k: 'estado_civil', label: 'Estado civil', type: 'select', options: ['', 'Soltero/a', 'Casado/a', 'Unión convivencial', 'Divorciado/a', 'Viudo/a'] },
  { k: 'telefono', label: 'Teléfono' }, { k: 'celular', label: 'Celular' }, { k: 'telefono_casa', label: 'Teléfono particular' },
  { k: 'direccion', label: 'Domicilio', full: true },
  { sec: 'Contacto de Emergencia', color: 't' },
  { k: 'emergencia_nombre', label: 'Nombre' }, { k: 'emergencia_relacion', label: 'Relación' },
  { k: 'emergencia_telefono', label: 'Teléfono' }, { k: 'emergencia_telefono2', label: 'Teléfono alternativo' },
];
const CAMPOS_LABORALES = [
  { sec: 'Información Laboral', color: 't' },
  { k: 'puesto', label: 'Puesto', req: true },
  { k: 'departamento', label: 'Departamento', type: 'select', options: DEPARTAMENTOS, req: true },
  { k: 'tipo_contrato', label: 'Tipo de contrato', type: 'select', options: ['Contrato a tiempo indeterminado', 'Plazo fijo', 'Eventual', 'Pasantía', 'Monotributo / Locación de servicios'] },
  { k: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
  { k: 'salario', label: 'Salario bruto mensual', type: 'number', min: 0 },
  { k: 'desempeno', label: 'Puntuación de desempeño (0-10)', type: 'number', min: 0, max: 10, step: 0.1 },
  { k: 'estado', label: 'Estado', type: 'select', options: ['activo', 'licencia', 'inactivo'] },
  { k: 'supervisor', label: 'Supervisor' }, { k: 'lugar_trabajo', label: 'Lugar de trabajo' }, { k: 'telefono_trabajo', label: 'Teléfono laboral' },
  { k: 'habilidades', label: 'Habilidades (separadas por coma)', type: 'list', full: true },
];

async function editarEmpleado(e = null, prellenado = {}) {
  const r = await formulario({ titulo: e ? 'Editar empleado' : 'Nuevo empleado', campos: [...CAMPOS_PERSONALES, ...CAMPOS_LABORALES], valores: e || { estado: 'activo', fecha_ingreso: hoyISO(), ...prellenado }, ancho: true });
  if (!r) return;
  r.email = r.email.toLowerCase();
  if (e) db.update('empleados', e.id, r);
  else {
    const n = db.create('empleados', r);
    const u = db.where('usuarios', (x) => x.email === n.email && !x.empleado_id)[0];
    if (u) db.update('usuarios', u.id, { empleado_id: n.id });
  }
  toast(e ? 'Empleado actualizado' : 'Empleado creado'); render();
}

// ---------- DASHBOARD ----------
function dashboard(c) {
  const emps = db.where('empleados', (e) => e.estado !== 'inactivo');
  const procesos = db.where('candidatos', (x) => !['contratado', 'rechazado'].includes(x.etapa)).length;
  const evPend = db.where('evaluaciones', (x) => x.estado === 'pendiente').length;
  const conPuntaje = emps.filter((e) => e.desempeno);
  const prom = conPuntaje.length ? (conPuntaje.reduce((a, e) => a + Number(e.desempeno), 0) / conPuntaje.length).toFixed(1) : '—';
  const permPend = db.where('permisos', (x) => x.estado === 'pendiente').length;
  const porDep = DEPARTAMENTOS.map((d) => [d, emps.filter((e) => e.departamento === d).length]).filter(([, n]) => n);
  const max = Math.max(1, ...porDep.map(([, n]) => n));
  const ultimos = [...emps].sort((a, b) => (b.fecha_ingreso || '').localeCompare(a.fecha_ingreso || '') || (b.creado || '').localeCompare(a.creado || '')).slice(0, 5);
  const empresa = db.list('empresa')[0] || {};
  const hoyTxt = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  c.innerHTML = header('Dashboard Ejecutivo', 'Resumen general de gestión de talento', `<span class="muted row">${icon('calendar')} ${hoyTxt}</span>`) + `
    <div class="grid g4 mb">
      ${stat('Total Empleados', emps.length, 'users', 'bg-blue', `${db.where('empleados', (e) => e.estado === 'licencia').length} con licencia`)}
      ${stat('Procesos Activos', procesos, 'briefcase', 'bg-violet', 'candidatos en selección')}
      ${stat('Evaluaciones Pendientes', evPend, 'award', 'bg-amber', `${permPend} permisos por aprobar`)}
      ${stat('Desempeño Promedio', prom === '—' ? prom : prom + '/10', 'target', 'bg-green', 'según puntuación de empleados')}
    </div>
    <div class="grid g2 mb">
      <div class="card card-pad"><h3>Distribución por Departamento</h3>
        ${porDep.length ? porDep.map(([d, n]) => `<div class="list-row"><span class="pill info" style="min-width:42px;justify-content:center;font-size:1rem">${n}</span><div class="grow">${esc(d)}</div><div class="bar" style="width:35%"><i style="width:${(n / max) * 100}%"></i></div></div>`).join('') : vacio('Sin empleados')}
      </div>
      <div class="card card-pad"><h3>Últimas Contrataciones</h3>
        ${ultimos.length ? ultimos.map((e) => `<a class="list-row" href="#/empleado/${e.id}"><span class="avatar">${inicial(e.nombre_completo)}</span><div class="grow"><b>${esc(e.nombre_completo)}</b><small>${esc(e.puesto)}</small></div><small>${fecha(e.fecha_ingreso)}</small></a>`).join('') : vacio('Sin empleados')}
      </div>
    </div>
    ${empresa.objetivos?.length ? `<div class="banner"><h3>Objetivos Estratégicos ${new Date().getFullYear()}</h3><div class="grid g2">${empresa.objetivos.map((o, i) => `<div class="item">${icon(['trending-up', 'users', 'target', 'award'][i % 4])}<div><b>${esc(o.titulo)}</b><p>${esc(o.texto)}</p></div></div>`).join('')}</div></div>` : ''}`;
}

// ---------- EMPLEADOS ----------
let filtroEmp = { q: '', dep: '' };
function empleados(c) {
  c.innerHTML = header('Gestión de Empleados', 'Administra tu equipo de trabajo', `<button class="btn primary" data-nuevo>${icon('plus')} Nuevo Empleado</button>`) + `
    <div class="card toolbar mb"><div class="search">${icon('search')}<input placeholder="Buscar por nombre o email..." data-q value="${esc(filtroEmp.q)}"></div>
      <select data-dep style="width:auto"><option value="">Todos los departamentos</option>${DEPARTAMENTOS.map((d) => `<option ${filtroEmp.dep === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
    <div class="grid g3" data-lista></div>`;
  const pintar = () => {
    const q = filtroEmp.q.toLowerCase();
    const lista = db.where('empleados', (e) => (!filtroEmp.dep || e.departamento === filtroEmp.dep) && (!q || `${e.nombre_completo} ${e.email}`.toLowerCase().includes(q)));
    const box = c.querySelector('[data-lista]');
    box.innerHTML = lista.length ? lista.map((e) => `<div class="card emp-card">
      <div class="emp-head"><span class="avatar lg">${inicial(e.nombre_completo)}</span><div style="flex:1;min-width:0"><b>${esc(e.nombre_completo)}</b><small>${esc(e.puesto)}</small></div>${estadoPill(e.estado)}</div>
      <div class="emp-info"><div>${icon('building')}<span>${esc(e.departamento)}</span></div><div>${icon('mail')}<span>${esc(e.email)}</span></div><div>${icon('phone')}<span>${esc(e.telefono || e.celular || '—')}</span></div><div>${icon('calendar')}<span>Desde ${fecha(e.fecha_ingreso)}</span></div></div>
      <div class="emp-actions"><a class="btn sm" href="#/empleado/${e.id}">${icon('eye')} Ver</a><button class="btn sm btn-icon" data-edit="${e.id}" title="Editar">${icon('pencil')}</button><button class="btn sm btn-icon danger" data-del="${e.id}" title="Eliminar">${icon('trash-2')}</button></div>
    </div>`).join('') : `<div class="card" style="grid-column:1/-1">${vacio('No hay empleados que coincidan', 'users')}</div>`;
    on(box, '[data-edit]', 'click', (b) => editarEmpleado(db.get('empleados', b.dataset.edit)));
    on(box, '[data-del]', 'click', async (b) => { const e = db.get('empleados', b.dataset.del); if (await confirmar(`¿Eliminar a ${e.nombre_completo}? Esta acción no se puede deshacer.`)) { db.remove('empleados', e.id); toast('Empleado eliminado'); render(); } });
    refrescarIconos();
  };
  c.querySelector('[data-q]').oninput = (e) => { filtroEmp.q = e.target.value; pintar(); };
  c.querySelector('[data-dep]').onchange = (e) => { filtroEmp.dep = e.target.value; pintar(); };
  c.querySelector('[data-nuevo]').onclick = () => editarEmpleado();
  pintar();
}

function fichaEmpleado(e) {
  const fila = (l, v) => `<div class="list-row"><small style="width:40%;display:inline">${esc(l)}</small><div class="grow">${v || '—'}</div></div>`;
  return `<div class="grid g2">
    <div class="card card-pad"><h3>Información Personal</h3>${fila('DNI', esc(e.dni))}${fila('CUIL', esc(e.cuil))}${fila('Nacimiento', fecha(e.fecha_nacimiento))}${fila('Género', esc(e.genero))}${fila('Estado civil', esc(e.estado_civil))}${fila('Teléfono', esc(e.telefono))}${fila('Celular', esc(e.celular))}${fila('Domicilio', esc(e.direccion))}</div>
    <div class="card card-pad"><h3>Información Laboral</h3>${fila('Departamento', esc(e.departamento))}${fila('Contrato', esc(e.tipo_contrato))}${fila('Ingreso', fecha(e.fecha_ingreso))}${fila('Salario', sesion.esAdmin ? plata(e.salario) : '•••')}${fila('Desempeño', e.desempeno ? e.desempeno + '/10' : '')}${fila('Supervisor', esc(e.supervisor))}${fila('Lugar de trabajo', esc(e.lugar_trabajo))}</div>
    <div class="card card-pad"><h3>Contacto de Emergencia</h3>${fila('Nombre', esc(e.emergencia_nombre))}${fila('Relación', esc(e.emergencia_relacion))}${fila('Teléfono', esc(e.emergencia_telefono))}${fila('Alternativo', esc(e.emergencia_telefono2))}</div>
    <div class="card card-pad"><h3>Habilidades</h3><div class="row">${(e.habilidades || []).map((h) => `<span class="pill violet">${esc(h)}</span>`).join('') || '<span class="muted">Sin habilidades cargadas</span>'}</div></div>
  </div>`;
}

function empleado(c, [id]) {
  const e = db.get('empleados', id);
  if (!e) { c.innerHTML = vacio('Empleado no encontrado'); return; }
  const evs = db.where('evaluaciones', (x) => x.empleado_id === id);
  const perms = db.where('permisos', (x) => x.empleado_id === id);
  const recs = db.where('recibos', (x) => x.empleado_id === id).sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
  c.innerHTML = `<a href="#/empleados" class="btn sm mb">${icon('arrow-left')} Volver a empleados</a>
    <div class="card card-pad mb row" style="gap:1.2rem"><span class="avatar lg">${inicial(e.nombre_completo)}</span><div class="grow" style="flex:1"><h1 style="margin:0;font-size:1.6rem">${esc(e.nombre_completo)}</h1><div class="muted">${esc(e.puesto)} · ${esc(e.departamento)} · ${esc(e.email)}</div></div>${estadoPill(e.estado)}<button class="btn" data-edit>${icon('pencil')} Editar</button></div>
    ${fichaEmpleado(e)}
    <div class="grid g3" style="margin-top:1.2rem">
      <div class="card card-pad"><h3>Evaluaciones</h3>${evs.length ? evs.map((v) => `<div class="list-row"><div class="grow"><b>${esc(v.periodo)}</b><small>${fecha(v.fecha)} · ${esc(v.evaluador)}</small></div><span class="score">${v.general ?? '—'}</span></div>`).join('') : vacio('Sin evaluaciones')}</div>
      <div class="card card-pad"><h3>Permisos</h3>${perms.length ? perms.map((p) => `<div class="list-row"><div class="grow"><b>${esc(p.tipo)}</b><small>${fecha(p.desde)} → ${fecha(p.hasta)}</small></div>${estadoPill(p.estado)}</div>`).join('') : vacio('Sin permisos')}</div>
      <div class="card card-pad"><div class="row between"><h3 style="margin:0">Recibos de sueldo</h3><button class="btn sm" data-recibo>${icon('plus')} Cargar</button></div>${recs.length ? recs.map((r) => `<div class="list-row"><div class="grow"><b>${esc(r.periodo)}</b><small>Neto ${plata(r.neto)}</small></div><button class="btn sm" data-ver-recibo="${r.id}">${icon('eye')}</button><button class="btn sm danger" data-del-recibo="${r.id}">${icon('trash-2')}</button></div>`).join('') : vacio('Sin recibos')}</div>
    </div>`;
  c.querySelector('[data-edit]').onclick = () => editarEmpleado(e);
  c.querySelector('[data-recibo]').onclick = () => cargarRecibo(e);
  on(c, '[data-ver-recibo]', 'click', (b) => verRecibo(db.get('recibos', b.dataset.verRecibo)));
  on(c, '[data-del-recibo]', 'click', async (b) => { if (await confirmar('¿Eliminar este recibo?')) { db.remove('recibos', b.dataset.delRecibo); render(); } });
}

async function cargarRecibo(e) {
  const r = await formulario({ titulo: `Recibo de sueldo · ${e.nombre_completo}`, campos: [
    { k: 'periodo', label: 'Período (ej. 2026-10)', type: 'month', req: true },
    { k: 'fecha_pago', label: 'Fecha de pago', type: 'date', def: hoyISO() },
    { k: 'bruto', label: 'Salario bruto', type: 'number', min: 0, req: true, def: e.salario },
    { k: 'deducciones', label: 'Deducciones', type: 'number', min: 0, def: 0 },
    { k: 'archivo', label: 'Recibo firmado en PDF (opcional, máx. 2 MB)', type: 'file', accept: 'application/pdf', full: true }] });
  if (!r) return;
  let archivo = null;
  try { archivo = await leerArchivo(r.archivo); } catch (err) { return toast(err.message); }
  db.create('recibos', { empleado_id: e.id, empleado: e.nombre_completo, email: e.email, periodo: r.periodo, fecha_pago: r.fecha_pago, bruto: r.bruto, deducciones: r.deducciones || 0, neto: (r.bruto || 0) - (r.deducciones || 0), archivo });
  const u = usuarioDeEmpleado(e.id); if (u) notificar(u.id, `Tenés un nuevo recibo de sueldo (${r.periodo}).`);
  toast('Recibo cargado'); render();
}

function verRecibo(r) {
  const empresa = db.list('empresa')[0] || {};
  const html = `<div id="recibo-print">
    <div class="row between"><div><b style="font-size:1.2rem">${esc(empresa.nombre || 'WorkNova')}</b><div class="muted">${esc(empresa.direccion || '')}</div></div><div style="text-align:right"><b>Recibo de haberes</b><div class="muted">Período ${esc(r.periodo)}</div></div></div>
    <hr style="border:0;border-top:1px solid var(--border);margin:1rem 0">
    <p><b>Empleado:</b> ${esc(r.empleado)}<br><b>Fecha de pago:</b> ${fecha(r.fecha_pago)}</p>
    <table><tr><th>Concepto</th><th style="text-align:right">Importe</th></tr>
      <tr><td>Salario bruto</td><td style="text-align:right">${plata(r.bruto)}</td></tr>
      <tr><td>Deducciones</td><td style="text-align:right">- ${plata(r.deducciones)}</td></tr>
      <tr><td><b>Neto a cobrar</b></td><td style="text-align:right"><b>${plata(r.neto)}</b></td></tr></table>
    <p class="muted" style="margin-top:1rem">Son pesos ${numeroALetras(r.neto)}.</p></div>
    <div class="row" style="justify-content:flex-end;margin-top:1rem">${r.archivo ? `<a class="btn" href="${r.archivo}" download="recibo-${esc(r.periodo)}.pdf">${icon('download')} PDF firmado</a>` : ''}<button class="btn primary" data-print>${icon('printer')} Imprimir</button></div>`;
  const m = verModal('Recibo de sueldo', html);
  m.querySelector('[data-print]').onclick = () => { const w = window.open('', '_blank'); w.document.write(`<html><head><title>Recibo ${esc(r.periodo)}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}.row{display:flex;justify-content:space-between}.muted{color:#666}</style></head><body>${m.querySelector('#recibo-print').innerHTML}</body></html>`); w.document.close(); w.print(); };
}

function numeroALetras(n) {
  n = Math.floor(Number(n) || 0);
  const U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  const menor1000 = (x) => {
    if (x === 0) return ''; if (x === 100) return 'cien';
    const c = Math.floor(x / 100), r = x % 100;
    const dec = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : '');
    return [C[c], dec].filter(Boolean).join(' ');
  };
  if (n === 0) return 'cero';
  const mill = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
  const p = [];
  if (mill) p.push(mill === 1 ? 'un millón' : menor1000(mill).replace(/uno$/, 'un') + ' millones');
  if (miles) p.push(miles === 1 ? 'mil' : menor1000(miles).replace(/uno$/, 'un') + ' mil');
  if (resto) p.push(menor1000(resto));
  return p.join(' ');
}

// ---------- RECLUTAMIENTO ----------
const ETAPAS = [['aplicado', 'Aplicados', '#e2e8f0'], ['preseleccionado', 'Preseleccionados', '#bfdbfe'], ['entrevista', 'Entrevista', '#e9d5ff'], ['evaluacion_final', 'Evaluación Final', '#fef08a'], ['contratado', 'Contratados', '#bbf7d0']];
let qCand = '';
async function editarCandidato(x = null, depFijo = null) {
  const r = await formulario({ titulo: x ? 'Editar candidato' : 'Nuevo candidato', valores: x || { etapa: 'aplicado', departamento: depFijo || DEPARTAMENTOS[0] }, campos: [
    { k: 'nombre', label: 'Nombre y apellido', req: true }, { k: 'email', label: 'Correo', type: 'email' },
    { k: 'telefono', label: 'Teléfono' }, { k: 'puesto', label: 'Puesto al que se postula', req: true },
    { k: 'departamento', label: 'Departamento', type: 'select', options: DEPARTAMENTOS },
    { k: 'experiencia', label: 'Años de experiencia', type: 'number', min: 0 },
    { k: 'etapa', label: 'Etapa', type: 'select', options: [...ETAPAS.map(([k, l]) => [k, l]), ['rechazado', 'Rechazado']] },
    { k: 'puntaje', label: 'Puntaje (0-10)', type: 'number', min: 0, max: 10, step: 0.1 },
    { k: 'notas', label: 'Notas', type: 'textarea', full: true }] });
  if (!r) return;
  x ? db.update('candidatos', x.id, r) : db.create('candidatos', r);
  toast('Candidato guardado'); render();
}
function moverCandidato(id, etapa) {
  const x = db.update('candidatos', id, { etapa });
  render();
  if (etapa === 'contratado' && !db.where('empleados', (e) => x.email && e.email === x.email).length) {
    setTimeout(async () => { if (await confirmar(`${x.nombre} pasó a Contratados. ¿Querés darlo de alta como empleado ahora?`)) editarEmpleado(null, { nombre_completo: x.nombre, email: x.email, telefono: x.telefono, puesto: x.puesto, departamento: x.departamento }); }, 50);
  }
}
function kanban(c, dep = null) {
  const q = qCand.toLowerCase();
  const lista = db.where('candidatos', (x) => (!dep || x.departamento === dep) && (!q || `${x.nombre} ${x.puesto}`.toLowerCase().includes(q)));
  c.innerHTML = `<div class="kanban">${ETAPAS.map(([k, l, col]) => {
    const items = lista.filter((x) => x.etapa === k);
    return `<div class="kcol" data-col="${k}"><header style="background:${col}">${l}<span>${items.length}</span></header><div class="kbody">${items.length ? items.map((x) => `<div class="kcard" draggable="true" data-id="${x.id}"><b>${esc(x.nombre)}</b><small>${esc(x.puesto)}</small><small>${x.experiencia ?? 0} años de experiencia${dep ? '' : ' · ' + esc(x.departamento || '')}</small>${x.puntaje ? `<div class="row" style="margin-top:.5rem"><div class="bar" style="flex:1"><i style="width:${x.puntaje * 10}%"></i></div><small style="margin:0">${x.puntaje}/10</small></div>` : ''}</div>`).join('') : '<div class="empty" style="padding:1rem">No hay candidatos</div>'}</div></div>`;
  }).join('')}</div>`;
  on(c, '.kcard', 'dragstart', (el, e) => e.dataTransfer.setData('text/plain', el.dataset.id));
  on(c, '.kcol', 'dragover', (el, e) => { e.preventDefault(); el.classList.add('drop'); });
  on(c, '.kcol', 'dragleave', (el) => el.classList.remove('drop'));
  on(c, '.kcol', 'drop', (el, e) => { e.preventDefault(); moverCandidato(e.dataTransfer.getData('text/plain'), el.dataset.col); });
  on(c, '.kcard', 'click', (el) => detalleCandidato(db.get('candidatos', el.dataset.id), dep));
}
function detalleCandidato(x, dep) {
  const i = ETAPAS.findIndex(([k]) => k === x.etapa);
  const m = verModal(x.nombre, `<p><b>${esc(x.puesto)}</b> · ${esc(x.departamento || '')}</p><p class="muted">${esc(x.email || '')} ${x.telefono ? '· ' + esc(x.telefono) : ''}</p>
    <p>${x.experiencia ?? 0} años de experiencia · Puntaje ${x.puntaje ?? '—'}/10 · Etapa: <b>${esc(ETAPAS[i]?.[1] || x.etapa)}</b></p>${x.notas ? `<p style="white-space:pre-wrap">${esc(x.notas)}</p>` : ''}
    <div class="row" style="margin-top:1rem">${i > 0 ? `<button class="btn" data-mv="${ETAPAS[i - 1][0]}">${icon('arrow-left')} ${ETAPAS[i - 1][1]}</button>` : ''}${i >= 0 && i < ETAPAS.length - 1 ? `<button class="btn primary" data-mv="${ETAPAS[i + 1][0]}">${ETAPAS[i + 1][1]} ${icon('arrow-right')}</button>` : ''}
    <span class="right"></span><button class="btn" data-ed>${icon('pencil')} Editar</button><button class="btn danger" data-rej>${icon('x')} Rechazar</button><button class="btn danger" data-del>${icon('trash-2')}</button></div>`, false);
  on(m, '[data-mv]', 'click', (b) => { m.remove(); moverCandidato(x.id, b.dataset.mv); });
  m.querySelector('[data-ed]').onclick = () => { m.remove(); editarCandidato(x, dep); };
  m.querySelector('[data-rej]').onclick = () => { m.remove(); db.update('candidatos', x.id, { etapa: 'rechazado' }); toast('Candidato rechazado'); render(); };
  m.querySelector('[data-del]').onclick = async () => { if (await confirmar('¿Eliminar este candidato?')) { m.remove(); db.remove('candidatos', x.id); render(); } };
}
function reclutamiento(c) {
  const rech = db.where('candidatos', (x) => x.etapa === 'rechazado').length;
  c.innerHTML = header('Reclutamiento y Selección', 'Gestiona el proceso de incorporación de talento', `<button class="btn primary" data-nuevo>${icon('plus')} Nuevo Candidato</button>`) +
    `<div class="card toolbar mb"><div class="search">${icon('search')}<input placeholder="Buscar candidatos..." data-q value="${esc(qCand)}"></div>${rech ? `<span class="pill bad">${rech} rechazados</span>` : ''}</div><div data-k></div><p class="muted" style="font-size:.85rem">Arrastrá las tarjetas entre columnas o hacé clic para ver el detalle.</p>`;
  const k = c.querySelector('[data-k]'); kanban(k);
  c.querySelector('[data-q]').oninput = (e) => { qCand = e.target.value; kanban(k); refrescarIconos(); };
  c.querySelector('[data-nuevo]').onclick = () => editarCandidato();
}

// ---------- PERMISOS ----------
const TIPOS_PERMISO = ['Vacaciones', 'Enfermedad', 'Estudio / examen', 'Trámite personal', 'Maternidad / paternidad', 'Duelo', 'Mudanza', 'Otro'];
async function solicitarPermiso(empId) {
  const r = await formulario({ titulo: 'Solicitar permiso', campos: [
    ...(empId ? [] : [{ k: 'empleado_id', label: 'Empleado', type: 'select', options: opcionesEmpleados(), req: true, full: true }]),
    { k: 'tipo', label: 'Tipo', type: 'select', options: TIPOS_PERMISO, req: true, full: true },
    { k: 'desde', label: 'Desde', type: 'date', req: true }, { k: 'hasta', label: 'Hasta', type: 'date', req: true },
    { k: 'motivo', label: 'Motivo / observaciones', type: 'textarea', full: true }] });
  if (!r) return;
  if (r.hasta < r.desde) return toast('La fecha "hasta" no puede ser anterior a "desde"');
  const id = empId || r.empleado_id; const e = db.get('empleados', id);
  const dias = Math.round((new Date(r.hasta) - new Date(r.desde)) / 864e5) + 1;
  db.create('permisos', { empleado_id: id, empleado: e?.nombre_completo, departamento: e?.departamento, tipo: r.tipo, desde: r.desde, hasta: r.hasta, dias, motivo: r.motivo, estado: 'pendiente', fecha: new Date().toISOString() });
  admins().forEach((a) => notificar(a.id, `${e?.nombre_completo} solicitó un permiso (${r.tipo}).`));
  toast('Solicitud enviada'); render();
}
function resolverPermiso(id, estado, comentario = '') {
  const p = db.update('permisos', id, { estado, resuelto_por: sesion.usuario.nombre, resuelto: new Date().toISOString(), comentario });
  const u = usuarioDeEmpleado(p.empleado_id); if (u) notificar(u.id, `Tu permiso de ${p.tipo} (${fecha(p.desde)}) fue ${estado}.`);
  toast(`Permiso ${estado}`); render();
}
function filaPermiso(p, acciones, extra = '') {
  return `<div class="list-row"><span class="avatar">${inicial(p.empleado)}</span><div class="grow"><b>${esc(p.empleado)}</b><small>${esc(p.tipo)} · ${fecha(p.desde)} → ${fecha(p.hasta)} (${p.dias || '?'} días)${p.motivo ? ' · ' + esc(p.motivo) : ''}</small></div>${extra}${acciones ? `<button class="btn sm ok" data-ok="${p.id}">${icon('check')} Aprobar</button><button class="btn sm danger" data-no="${p.id}">${icon('x')} Rechazar</button>` : estadoPill(p.estado)}</div>`;
}
function bindPermisos(c) {
  on(c, '[data-ok]', 'click', (b) => resolverPermiso(b.dataset.ok, 'aprobado'));
  on(c, '[data-no]', 'click', async (b) => { const r = await formulario({ titulo: 'Rechazar permiso', campos: [{ k: 'comentario', label: 'Motivo del rechazo (opcional)', type: 'textarea', full: true }], guardar: 'Rechazar' }); if (r) resolverPermiso(b.dataset.no, 'rechazado', r.comentario); });
}
function panelPermisos(c, dep = null) {
  const ps = db.where('permisos', (p) => !dep || p.departamento === dep).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const g = (e) => ps.filter((p) => p.estado === e);
  c.innerHTML = `<div class="grid g3 mb">${statTxt('Pendientes', g('pendiente').length, 'clock', 't-amber')}${statTxt('Aprobados', g('aprobado').length, 'circle-check', 't-green')}${statTxt('Rechazados', g('rechazado').length, 'circle-x', 't-red')}</div>
    <div class="card card-pad mb"><h3>Solicitudes Pendientes</h3>${g('pendiente').length ? g('pendiente').map((p) => filaPermiso(p, true)).join('') : vacio('No hay solicitudes pendientes')}</div>
    <div class="grid g2"><div class="card card-pad"><h3>Recientes Aprobados</h3>${g('aprobado').slice(0, 8).map((p) => filaPermiso(p)).join('') || vacio('Sin registros')}</div>
    <div class="card card-pad"><h3>Recientes Rechazados</h3>${g('rechazado').slice(0, 8).map((p) => filaPermiso(p)).join('') || vacio('Sin registros')}</div></div>`;
  bindPermisos(c);
}
function permisos(c) {
  c.innerHTML = header('Gestión de Permisos', 'Licencias y ausencias del personal', `<button class="btn primary" data-nuevo>${icon('plus')} Registrar permiso</button>`) + '<div data-p></div>';
  panelPermisos(c.querySelector('[data-p]'));
  c.querySelector('[data-nuevo]').onclick = () => solicitarPermiso(null);
}

// ---------- EVALUACIONES ----------
let qEval = '';
async function editarEvaluacion(v = null, dep = null) {
  const opts = [['', '— Seleccionar —'], ...db.where('empleados', (e) => !dep || e.departamento === dep).map((e) => [e.id, e.nombre_completo])];
  const r = await formulario({ titulo: v ? 'Editar evaluación' : 'Nueva evaluación', ancho: true, valores: v || { evaluador: sesion.usuario.nombre, fecha: hoyISO(), estado: 'pendiente' }, campos: [
    { k: 'empleado_id', label: 'Empleado', type: 'select', options: opts, req: true }, { k: 'evaluador', label: 'Evaluador', req: true },
    { k: 'fecha', label: 'Fecha', type: 'date' }, { k: 'periodo', label: 'Período (ej. Q1 2026)', req: true },
    { sec: 'Puntuaciones (0 a 10)', color: 't' },
    { k: 'tecnicas', label: 'Habilidades técnicas', type: 'number', min: 0, max: 10, step: 0.5 }, { k: 'blandas', label: 'Habilidades blandas', type: 'number', min: 0, max: 10, step: 0.5 },
    { k: 'liderazgo', label: 'Liderazgo', type: 'number', min: 0, max: 10, step: 0.5 }, { k: 'equipo', label: 'Trabajo en equipo', type: 'number', min: 0, max: 10, step: 0.5 },
    { k: 'general', label: 'Puntuación general (vacío = promedio)', type: 'number', min: 0, max: 10, step: 0.1 },
    { k: 'estado', label: 'Estado', type: 'select', options: ['pendiente', 'completada'] },
    { k: 'fortalezas', label: 'Fortalezas', type: 'textarea', full: true }, { k: 'mejoras', label: 'Áreas a mejorar', type: 'textarea', full: true },
    { k: 'plan', label: 'Plan de desarrollo', type: 'textarea', full: true }] });
  if (!r) return;
  const notas = ['tecnicas', 'blandas', 'liderazgo', 'equipo'].map((k) => r[k]).filter((x) => x !== null);
  if (r.general === null && notas.length) r.general = Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10;
  r.empleado = nombreEmp(r.empleado_id);
  v ? db.update('evaluaciones', v.id, r) : db.create('evaluaciones', r);
  if (r.estado === 'completada' && r.general !== null) db.update('empleados', r.empleado_id, { desempeno: r.general });
  const u = usuarioDeEmpleado(r.empleado_id); if (u && r.estado === 'completada') notificar(u.id, `Tu evaluación de desempeño ${r.periodo} está disponible.`);
  toast('Evaluación guardada'); render();
}
function listaEvaluaciones(c, dep = null) {
  const q = qEval.toLowerCase();
  const evs = db.where('evaluaciones', (v) => (!dep || db.get('empleados', v.empleado_id)?.departamento === dep) && (!q || (v.empleado || '').toLowerCase().includes(q))).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  c.innerHTML = evs.length ? evs.map((v) => `<div class="card card-pad mb"><div class="row between"><div class="row"><b style="font-size:1.1rem">${esc(v.empleado)}</b>${estadoPill(v.estado)}</div><div class="row"><button class="btn sm btn-icon" data-ver="${v.id}" title="Ver">${icon('eye')}</button><button class="btn sm btn-icon" data-edit="${v.id}">${icon('pencil')}</button><button class="btn sm btn-icon danger" data-del="${v.id}">${icon('trash-2')}</button></div></div>
    <div class="grid g4" style="margin-top:.8rem"><div><small class="muted">Evaluador</small><div><b>${esc(v.evaluador)}</b></div></div><div><small class="muted">Fecha</small><div><b>${fecha(v.fecha)}</b></div></div><div><small class="muted">Período</small><div><b>${esc(v.periodo)}</b></div></div><div><small class="muted">Puntuación General</small><div class="score">${v.general ?? '—'}/10</div></div></div></div>`).join('') : `<div class="card">${vacio('No hay evaluaciones', 'award')}</div>`;
  on(c, '[data-edit]', 'click', (b) => editarEvaluacion(db.get('evaluaciones', b.dataset.edit), dep));
  on(c, '[data-del]', 'click', async (b) => { if (await confirmar('¿Eliminar esta evaluación?')) { db.remove('evaluaciones', b.dataset.del); render(); } });
  on(c, '[data-ver]', 'click', (b) => { const v = db.get('evaluaciones', b.dataset.ver); verModal(`Evaluación · ${v.empleado}`, detalleEvaluacion(v)); });
  refrescarIconos();
}
const detalleEvaluacion = (v) => `<div class="grid g4 mb">${[['Técnicas', v.tecnicas], ['Blandas', v.blandas], ['Liderazgo', v.liderazgo], ['Equipo', v.equipo]].map(([l, n]) => `<div class="card card-pad"><small class="muted">${l}</small><div class="score">${n ?? '—'}</div></div>`).join('')}</div>
  <p><b>Fortalezas:</b> ${esc(v.fortalezas) || '—'}</p><p><b>Áreas a mejorar:</b> ${esc(v.mejoras) || '—'}</p><p><b>Plan de desarrollo:</b> ${esc(v.plan) || '—'}</p>`;
function evaluaciones(c) {
  c.innerHTML = header('Evaluaciones de Desempeño', 'Gestiona las evaluaciones de tu equipo', `<button class="btn primary" data-nuevo>${icon('plus')} Nueva Evaluación</button>`) +
    `<div class="card toolbar mb"><div class="search">${icon('search')}<input placeholder="Buscar por empleado..." data-q value="${esc(qEval)}"></div></div><div data-l></div>`;
  const l = c.querySelector('[data-l]'); listaEvaluaciones(l);
  c.querySelector('[data-q]').oninput = (e) => { qEval = e.target.value; listaEvaluaciones(l); };
  c.querySelector('[data-nuevo]').onclick = () => editarEvaluacion();
}

// ---------- OBJETIVOS ----------
async function editarObjetivo(o = null, dep = null, empFijo = null) {
  const r = await formulario({ titulo: o ? 'Editar objetivo' : 'Nuevo objetivo', valores: o || { estado: 'en progreso', progreso: 0, departamento: dep || '', empleado_id: empFijo || '' }, campos: [
    { k: 'titulo', label: 'Objetivo', req: true, full: true }, { k: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
    ...(empFijo ? [] : [{ k: 'empleado_id', label: 'Responsable (opcional)', type: 'select', options: opcionesEmpleados(false) },
      { k: 'departamento', label: 'Área', type: 'select', options: [['', 'Toda la empresa'], ...DEPARTAMENTOS.map((d) => [d, d])] }]),
    { k: 'fecha_limite', label: 'Fecha límite', type: 'date' }, { k: 'progreso', label: 'Progreso (%)', type: 'number', min: 0, max: 100 },
    { k: 'estado', label: 'Estado', type: 'select', options: ['en progreso', 'completado', 'cancelado'] }] });
  if (!r) return;
  if (empFijo) { r.empleado_id = empFijo; r.departamento = db.get('empleados', empFijo)?.departamento || ''; }
  if (r.progreso >= 100) r.estado = 'completado';
  r.responsable = nombreEmp(r.empleado_id);
  o ? db.update('objetivos', o.id, r) : db.create('objetivos', r);
  toast('Objetivo guardado'); render();
}
function listaObjetivos(c, filtro = () => true, puedeEditar = true, dep = null) {
  const os = db.where('objetivos', filtro);
  const prom = os.length ? Math.round(os.reduce((a, o) => a + (Number(o.progreso) || 0), 0) / os.length) : 0;
  c.innerHTML = `<div class="grid g4 mb">${stat('Total Objetivos', os.length, 'target', 'bg-indigo')}${statTxt('En Progreso', os.filter((o) => o.estado === 'en progreso').length, 'loader', 't-blue')}${statTxt('Completados', os.filter((o) => o.estado === 'completado').length, 'circle-check', 't-green')}${statTxt('Progreso Promedio', prom + '%', 'trending-up', 't-violet')}</div>
    ${os.length ? `<div class="grid g2">${os.map((o) => `<div class="card card-pad"><div class="row between"><b>${esc(o.titulo)}</b>${estadoPill(o.estado)}</div><p class="muted" style="margin:.4rem 0">${esc(o.descripcion || '')}</p>
      <small class="muted">${o.responsable ? esc(o.responsable) + ' · ' : ''}${esc(o.departamento || 'Toda la empresa')}${o.fecha_limite ? ' · vence ' + fecha(o.fecha_limite) : ''}</small>
      <div class="row" style="margin-top:.7rem"><div class="bar" style="flex:1"><i style="width:${o.progreso || 0}%"></i></div><b>${o.progreso || 0}%</b></div>
      ${puedeEditar ? `<div class="row" style="margin-top:.8rem"><button class="btn sm" data-avance="${o.id}">${icon('plus')} 10%</button><button class="btn sm" data-edit="${o.id}">${icon('pencil')} Editar</button><button class="btn sm danger" data-del="${o.id}">${icon('trash-2')}</button></div>` : ''}</div>`).join('')}</div>` : `<div class="card">${vacio('No hay objetivos definidos', 'target')}</div>`}`;
  on(c, '[data-avance]', 'click', (b) => { const o = db.get('objetivos', b.dataset.avance); const p = Math.min(100, (Number(o.progreso) || 0) + 10); db.update('objetivos', o.id, { progreso: p, estado: p >= 100 ? 'completado' : o.estado }); render(); });
  on(c, '[data-edit]', 'click', (b) => editarObjetivo(db.get('objetivos', b.dataset.edit), dep));
  on(c, '[data-del]', 'click', async (b) => { if (await confirmar('¿Eliminar este objetivo?')) { db.remove('objetivos', b.dataset.del); render(); } });
}
function objetivos(c) {
  c.innerHTML = header('Objetivos de Desempeño', 'Gestiona objetivos y progreso del equipo', `<button class="btn primary" data-nuevo>${icon('plus')} Nuevo Objetivo</button>`) + '<div data-l></div>';
  listaObjetivos(c.querySelector('[data-l]'));
  c.querySelector('[data-nuevo]').onclick = () => editarObjetivo();
}

// ---------- CAPACITACIÓN ----------
async function editarCapacitacion(x = null) {
  const r = await formulario({ titulo: x ? 'Editar programa' : 'Nuevo programa', valores: x || { estado: 'planificado', modalidad: 'Presencial' }, ancho: true, campos: [
    { k: 'titulo', label: 'Título', req: true, full: true }, { k: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
    { k: 'publico', label: 'Público objetivo' }, { k: 'instructor', label: 'Instructor' },
    { k: 'inicio', label: 'Fecha de inicio', type: 'date' }, { k: 'fin', label: 'Fecha de finalización', type: 'date' },
    { k: 'horas', label: 'Duración (horas)', type: 'number', min: 0 },
    { k: 'modalidad', label: 'Modalidad', type: 'select', options: ['Presencial', 'Virtual', 'Híbrido'] },
    { k: 'estado', label: 'Estado', type: 'select', options: ['planificado', 'en curso', 'finalizado', 'cancelado'] },
    { k: 'enlace', label: 'Enlace al aula / portal (opcional)', type: 'url' },
    { k: 'objetivos', label: 'Objetivos del programa', type: 'textarea', full: true }] });
  if (!r) return;
  x ? db.update('capacitaciones', x.id, r) : db.create('capacitaciones', { ...r, inscriptos: [] });
  toast('Programa guardado'); render();
}
function capacitacion(c) {
  const adm = sesion.esAdmin; const emp = sesion.empleado;
  const cs = db.list('capacitaciones');
  c.innerHTML = header('Capacitación y Desarrollo', 'Programas de formación para tu equipo', adm ? `<button class="btn primary" data-nuevo>${icon('plus')} Nuevo Programa</button>` : '') +
    (cs.length ? `<div class="grid g3">${cs.map((x) => {
      const ins = (x.inscriptos || []).includes(emp?.id);
      return `<div class="card card-pad" style="display:flex;flex-direction:column;gap:.5rem"><div class="row between" style="align-items:flex-start"><b style="font-size:1.1rem;flex:1">${esc(x.titulo)}</b>${estadoPill(x.estado)}</div>
        <p class="muted" style="margin:0;font-size:.9rem">${esc(x.descripcion || '')}</p>
        <div class="emp-info"><div>${icon('users')}<span>${esc(x.publico || 'General')}</span></div><div>${icon('calendar')}<span>${fecha(x.inicio)}${x.fin ? ' → ' + fecha(x.fin) : ''}</span></div><div>${icon('clock')}<span>${x.horas || 0} horas</span></div></div>
        <small><b>Modalidad:</b> ${esc(x.modalidad)}<br><b>Instructor:</b> ${esc(x.instructor || '—')}</small>
        <small class="muted">${(x.inscriptos || []).length} inscriptos</small>
        <div class="row" style="margin-top:auto">${x.enlace ? `<a class="btn sm primary" href="${esc(x.enlace)}" target="_blank" rel="noopener">${icon('external-link')} Portal de capacitación</a>` : ''}
          ${emp ? `<button class="btn sm" data-ins="${x.id}">${ins ? icon('circle-check') + ' Inscripto' : icon('user-plus') + ' Inscribirme'}</button>` : ''}
          ${adm ? `<button class="btn sm btn-icon" data-inscriptos="${x.id}" title="Inscriptos">${icon('list')}</button><button class="btn sm btn-icon" data-edit="${x.id}">${icon('pencil')}</button><button class="btn sm btn-icon danger" data-del="${x.id}">${icon('trash-2')}</button>` : ''}</div></div>`;
    }).join('')}</div>` : `<div class="card">${vacio('No hay programas de capacitación', 'graduation-cap')}</div>`);
  c.querySelector('[data-nuevo]')?.addEventListener('click', () => editarCapacitacion());
  on(c, '[data-edit]', 'click', (b) => editarCapacitacion(db.get('capacitaciones', b.dataset.edit)));
  on(c, '[data-del]', 'click', async (b) => { if (await confirmar('¿Eliminar este programa?')) { db.remove('capacitaciones', b.dataset.del); render(); } });
  on(c, '[data-ins]', 'click', (b) => { const x = db.get('capacitaciones', b.dataset.ins); const s = new Set(x.inscriptos || []); s.has(emp.id) ? s.delete(emp.id) : s.add(emp.id); db.update('capacitaciones', x.id, { inscriptos: [...s] }); render(); });
  on(c, '[data-inscriptos]', 'click', (b) => { const x = db.get('capacitaciones', b.dataset.inscriptos); verModal(`Inscriptos · ${x.titulo}`, (x.inscriptos || []).map((id) => `<div class="list-row"><span class="avatar">${inicial(nombreEmp(id))}</span><div class="grow">${esc(nombreEmp(id) || 'Empleado eliminado')}</div></div>`).join('') || vacio('Nadie inscripto todavía'), false); });
}

// ---------- DOCUMENTOS ----------
const CATS = [['contrato', 'Contratos'], ['certificado', 'Certificados'], ['politica', 'Políticas'], ['otro', 'Otros']];
let filtroDoc = { q: '', cat: '', estado: '' };
async function subirDocumento(dep = null) {
  const adm = sesion.esAdmin;
  const r = await formulario({ titulo: 'Subir documento', valores: { departamento: dep || sesion.empleado?.departamento || '' }, campos: [
    { k: 'titulo', label: 'Título', req: true, full: true },
    { k: 'categoria', label: 'Categoría', type: 'select', options: CATS },
    { k: 'departamento', label: 'Área', type: 'select', options: [['', 'General'], ...DEPARTAMENTOS.map((d) => [d, d])] },
    ...(adm ? [{ k: 'empleado_id', label: 'Empleado relacionado (opcional)', type: 'select', options: opcionesEmpleados(false), full: true }] : []),
    { k: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
    { k: 'archivo', label: 'Archivo (máx. 2 MB)', type: 'file', req: true, full: true }] });
  if (!r) return;
  let data; try { data = await leerArchivo(r.archivo); } catch (e) { return toast(e.message); }
  db.create('documentos', { titulo: r.titulo, categoria: r.categoria, departamento: r.departamento, descripcion: r.descripcion, empleado_id: adm ? r.empleado_id : sesion.empleado?.id, nombre_archivo: r.archivo.name, tamano: r.archivo.size, archivo: data, subido_por: sesion.usuario.nombre, subido_por_id: sesion.usuario.id, estado: adm ? 'aprobado' : 'pendiente' });
  if (!adm) admins().forEach((a) => notificar(a.id, `${sesion.usuario.nombre} subió el documento "${r.titulo}" para revisión.`));
  toast(adm ? 'Documento subido' : 'Documento enviado para revisión'); render();
}
function documentos(c) {
  const adm = sesion.esAdmin; const u = sesion.usuario; const emp = sesion.empleado;
  const visibles = db.where('documentos', (d) => adm || d.subido_por_id === u.id || (d.estado === 'aprobado' && (!d.empleado_id || d.empleado_id === emp?.id) && (!d.departamento || d.departamento === emp?.departamento || d.categoria === 'politica')));
  const n = (k) => visibles.filter((d) => d.categoria === k).length;
  c.innerHTML = header('Gestión Documental', 'Accede y gestiona documentos importantes', `<button class="btn primary" data-subir>${icon('upload')} Subir Documento</button>`) + `
    <div class="grid g4 mb">${stat('Total Documentos', visibles.length, 'file-text', 'bg-indigo')}${statTxt('Contratos', n('contrato'), 'file-signature', 't-blue')}${statTxt('Certificados', n('certificado'), 'badge-check', 't-green')}${statTxt('Políticas', n('politica'), 'scroll-text', 't-violet')}</div>
    <div class="card toolbar mb"><div class="search">${icon('search')}<input placeholder="Buscar documentos..." data-q value="${esc(filtroDoc.q)}"></div>
      <select data-cat style="width:auto"><option value="">Todas las categorías</option>${CATS.map(([k, l]) => `<option value="${k}" ${filtroDoc.cat === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select data-est style="width:auto"><option value="">Todos los estados</option>${['aprobado', 'pendiente', 'rechazado'].map((e) => `<option ${filtroDoc.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
    <div class="card" data-l></div>`;
  const pintar = () => {
    const q = filtroDoc.q.toLowerCase();
    const ds = visibles.filter((d) => (!filtroDoc.cat || d.categoria === filtroDoc.cat) && (!filtroDoc.estado || d.estado === filtroDoc.estado) && (!q || `${d.titulo} ${d.descripcion} ${d.nombre_archivo}`.toLowerCase().includes(q)));
    const l = c.querySelector('[data-l]');
    l.innerHTML = ds.length ? `<div class="table-wrap"><table><tr><th>Documento</th><th>Categoría</th><th>Área</th><th>Subido por</th><th>Estado</th><th></th></tr>${ds.map((d) => `<tr><td><b>${esc(d.titulo)}</b><div class="muted" style="font-size:.8rem">${esc(d.nombre_archivo)} · ${Math.ceil((d.tamano || 0) / 1024)} KB${d.empleado_id ? ' · ' + esc(nombreEmp(d.empleado_id)) : ''}</div></td><td>${esc(CATS.find(([k]) => k === d.categoria)?.[1] || '')}</td><td>${esc(d.departamento || 'General')}</td><td>${esc(d.subido_por)}<div class="muted" style="font-size:.8rem">${fecha(d.creado)}</div></td><td>${estadoPill(d.estado)}</td>
      <td><div class="row" style="flex-wrap:nowrap"><a class="btn sm btn-icon" href="${d.archivo}" download="${esc(d.nombre_archivo)}" title="Descargar">${icon('download')}</a>${adm || d.subido_por_id === u.id ? `<button class="btn sm btn-icon danger" data-del="${d.id}">${icon('trash-2')}</button>` : ''}</div></td></tr>`).join('')}</table></div>` : vacio('No hay documentos', 'file-text');
    on(l, '[data-del]', 'click', async (b) => { if (await confirmar('¿Eliminar este documento?')) { db.remove('documentos', b.dataset.del); render(); } });
    refrescarIconos();
  };
  c.querySelector('[data-q]').oninput = (e) => { filtroDoc.q = e.target.value; pintar(); };
  c.querySelector('[data-cat]').onchange = (e) => { filtroDoc.cat = e.target.value; pintar(); };
  c.querySelector('[data-est]').onchange = (e) => { filtroDoc.estado = e.target.value; pintar(); };
  c.querySelector('[data-subir]').onclick = () => subirDocumento();
  pintar();
}

// ---------- APROBACIONES ----------
function resolverDoc(id, estado) {
  const d = db.update('documentos', id, { estado, revisado_por: sesion.usuario.nombre });
  if (d.subido_por_id) notificar(d.subido_por_id, `Tu documento "${d.titulo}" fue ${estado}.`);
  toast(`Documento ${estado}`); render();
}
function aprobaciones(c) {
  const lic = db.where('permisos', (p) => p.estado === 'pendiente');
  const docs = db.where('documentos', (d) => d.estado === 'pendiente');
  const deriv = db.where('permisos', (p) => p.derivado && p.estado === 'pendiente').length;
  c.innerHTML = header('Panel de Aprobaciones', 'Revisa y aprueba solicitudes de licencias y documentos') + `
    <div class="grid g2 mb">${statTxt('Licencias Pendientes', lic.length, 'calendar', 't-amber')}${statTxt('Documentos Pendientes', docs.length, 'file-text', 't-violet')}</div>
    <div class="card card-pad mb"><h3 class="row">${icon('calendar')} Solicitudes de Licencia ${deriv ? `<span class="pill info">${deriv} derivadas por jefes</span>` : ''}</h3>${lic.length ? lic.map((p) => filaPermiso(p, true) + (p.derivado ? `<small class="muted" style="display:block;margin:-.4rem 0 .6rem 3.4rem">Derivada por ${esc(p.derivado)}${p.nota_derivacion ? ': ' + esc(p.nota_derivacion) : ''}</small>` : '')).join('') : vacio('No hay licencias pendientes')}</div>
    <div class="card card-pad"><h3 class="row">${icon('file-text')} Documentos para Revisión</h3>${docs.length ? docs.map((d) => `<div class="list-row">${icon('file')}<div class="grow"><b>${esc(d.titulo)}</b><small>${esc(d.subido_por)} · ${esc(d.nombre_archivo)} · ${fecha(d.creado)}</small></div><a class="btn sm" href="${d.archivo}" download="${esc(d.nombre_archivo)}">${icon('download')}</a><button class="btn sm ok" data-dok="${d.id}">${icon('check')} Aprobar</button><button class="btn sm danger" data-dno="${d.id}">${icon('x')} Rechazar</button></div>`).join('') : vacio('No hay documentos pendientes')}</div>`;
  bindPermisos(c);
  on(c, '[data-dok]', 'click', (b) => resolverDoc(b.dataset.dok, 'aprobado'));
  on(c, '[data-dno]', 'click', (b) => resolverDoc(b.dataset.dno, 'rechazado'));
}

// ---------- SUCESIÓN ----------
async function editarSucesion(x = null) {
  const r = await formulario({ titulo: x ? 'Editar plan de sucesión' : 'Nuevo plan de sucesión', valores: x || { riesgo: 'Medio', preparacion: '1-2 años', revision: hoyISO() }, campos: [
    { k: 'puesto', label: 'Posición clave', req: true }, { k: 'titular', label: 'Titular actual' },
    { k: 'sucesor', label: 'Candidato sucesor' }, { k: 'respaldo', label: 'Candidatos de respaldo' },
    { k: 'preparacion', label: 'Nivel de preparación', type: 'select', options: ['Listo ahora', '1-2 años', '3-5 años'] },
    { k: 'riesgo', label: 'Nivel de riesgo', type: 'select', options: ['Bajo', 'Medio', 'Alto'] },
    { k: 'revision', label: 'Última revisión', type: 'date' },
    { k: 'necesidades', label: 'Necesidades de desarrollo', type: 'textarea', full: true }] });
  if (!r) return;
  x ? db.update('sucesion', x.id, r) : db.create('sucesion', r);
  toast('Plan guardado'); render();
}
function sucesion(c) {
  const ss = db.list('sucesion');
  const cls = { Bajo: 'ok', Medio: 'warn', Alto: 'bad' };
  c.innerHTML = header('Planificación de Sucesión', 'Asegura la continuidad en posiciones clave', `<button class="btn primary" data-nuevo>${icon('plus')} Nuevo Plan</button>`) + `
    <div class="grid g3 mb">${statTxt('Posiciones Cubiertas', ss.filter((s) => s.sucesor).length, 'circle-check', 't-green')}${statTxt('Riesgo Alto', ss.filter((s) => s.riesgo === 'Alto').length, 'triangle-alert', 't-red')}${statTxt('En Desarrollo', ss.filter((s) => s.preparacion !== 'Listo ahora').length, 'trending-up', 't-blue')}</div>
    ${ss.length ? ss.map((s) => `<div class="card card-pad mb"><div class="row between"><div><b style="font-size:1.15rem">${esc(s.puesto)}</b><div class="muted">Titular: ${esc(s.titular || '—')}</div></div><div class="row"><span class="pill ${cls[s.riesgo] || ''}">Riesgo: ${esc(s.riesgo)}</span><button class="btn sm btn-icon" data-edit="${s.id}">${icon('pencil')}</button><button class="btn sm btn-icon danger" data-del="${s.id}">${icon('trash-2')}</button></div></div>
      <div class="grid g3" style="margin-top:.9rem"><div><small class="muted">Candidato Sucesor</small><div><b>${esc(s.sucesor || 'Sin definir')}</b></div></div><div><small class="muted">Nivel de Preparación</small><div><span class="pill warn">${esc(s.preparacion)}</span></div></div><div><small class="muted">Última Revisión</small><div><b>${fecha(s.revision)}</b></div></div></div>
      ${s.necesidades ? `<div class="card-pad" style="background:#f1f5ff;border-radius:10px;margin-top:.9rem;padding:.7rem 1rem"><b>Necesidades de desarrollo:</b> ${esc(s.necesidades)}</div>` : ''}${s.respaldo ? `<small class="muted">Respaldo: ${esc(s.respaldo)}</small>` : ''}</div>`).join('') : `<div class="card">${vacio('No hay planes de sucesión')}</div>`}`;
  c.querySelector('[data-nuevo]').onclick = () => editarSucesion();
  on(c, '[data-edit]', 'click', (b) => editarSucesion(db.get('sucesion', b.dataset.edit)));
  on(c, '[data-del]', 'click', async (b) => { if (await confirmar('¿Eliminar este plan?')) { db.remove('sucesion', b.dataset.del); render(); } });
}

// ---------- EMPRESA ----------
function empresa(c) {
  const e = db.list('empresa')[0]; const adm = sesion.esAdmin;
  const colores = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#0ea5e9'];
  c.innerHTML = `<div class="row" style="justify-content:flex-end">${adm ? `<button class="btn primary" data-config>${icon('pencil')} Configurar Empresa</button>` : ''}</div>
    <div style="text-align:center;margin:1rem 0 2rem"><div class="brand-logo" style="width:96px;height:96px;margin:0 auto;font-size:2.2rem;border-radius:16px">${e.logo ? `<img src="${esc(e.logo)}" alt="">` : 'W'}</div><h1 style="font-size:2.6rem;margin:.6rem 0 .2rem">${esc(e.nombre)}</h1><div class="muted">${esc(e.industria || '')}</div></div>
    <div class="grid g2 mb"><div class="card card-pad"><h3 class="row">${icon('target')} Misión</h3><p style="margin:0">${esc(e.mision || '—')}</p></div><div class="card card-pad"><h3 class="row">${icon('eye')} Visión</h3><p style="margin:0">${esc(e.vision || '—')}</p></div></div>
    <div class="card card-pad mb"><h3 style="font-size:1.5rem">Nuestros Valores</h3><div class="grid g3">${(e.valores || []).map((v, i) => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div class="stat" style="padding:0"><div class="ico" style="background:${colores[i % colores.length]}">${icon('heart')}</div></div><div><b>${esc(v.nombre)}</b><div class="muted" style="font-size:.9rem">${esc(v.texto)}</div></div></div>`).join('')}</div></div>
    <div class="card card-pad mb"><h3>Contacto</h3><div class="emp-info"><div>${icon('map-pin')}<span>${esc(e.direccion || '—')}</span></div><div>${icon('phone')}<span>${esc(e.telefono || '—')}</span></div><div>${icon('mail')}<span>${esc(e.email || '—')}</span></div><div>${icon('globe')}<span>${esc(e.web || '—')}</span></div></div><div class="row" style="margin-top:.6rem">${DEPARTAMENTOS.map((d) => `<span class="pill info">${esc(d)}</span>`).join('')}</div></div>
    ${adm ? `<div class="card card-pad"><h3 class="row">${icon('database')} Respaldo de datos</h3><p class="muted" style="margin-top:0">Todos los datos se guardan en este navegador. Descargá un respaldo con frecuencia y usalo para pasar la información a otra computadora.</p>
      <div class="row"><button class="btn primary" data-exp>${icon('download')} Descargar respaldo</button><label class="btn" style="margin:0">${icon('upload')} Restaurar respaldo<input type="file" accept="application/json" data-imp hidden></label><button class="btn danger" data-reset>${icon('rotate-ccw')} Volver a los datos de ejemplo</button></div></div>` : ''}`;
  if (!adm) return;
  c.querySelector('[data-config]').onclick = async () => {
    const r = await formulario({ titulo: 'Configurar empresa', ancho: true, valores: { ...e, valores: (e.valores || []).map((v) => `${v.nombre}: ${v.texto}`).join('\n'), objetivos: (e.objetivos || []).map((v) => `${v.titulo}: ${v.texto}`).join('\n') }, campos: [
      { k: 'nombre', label: 'Nombre de la empresa', req: true }, { k: 'industria', label: 'Industria / rubro' },
      { k: 'direccion', label: 'Dirección' }, { k: 'telefono', label: 'Teléfono' }, { k: 'email', label: 'Correo', type: 'email' }, { k: 'web', label: 'Sitio web' },
      { k: 'logo_file', label: 'Logo (imagen, máx. 500 KB)', type: 'file', accept: 'image/*', full: true },
      { k: 'mision', label: 'Misión', type: 'textarea', full: true }, { k: 'vision', label: 'Visión', type: 'textarea', full: true },
      { k: 'valores', label: 'Valores (uno por línea, formato "Nombre: descripción")', type: 'textarea', full: true },
      { k: 'objetivos', label: 'Objetivos estratégicos (uno por línea, "Título: descripción")', type: 'textarea', full: true }] });
    if (!r) return;
    const parse = (t, a, b) => t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [x, ...y] = l.split(':'); return { [a]: x.trim(), [b]: y.join(':').trim() }; });
    let logo = e.logo; try { if (r.logo_file) logo = await leerArchivo(r.logo_file, 0.5); } catch (err) { return toast(err.message); }
    db.update('empresa', e.id, { nombre: r.nombre, industria: r.industria, direccion: r.direccion, telefono: r.telefono, email: r.email, web: r.web, mision: r.mision, vision: r.vision, logo, valores: parse(r.valores, 'nombre', 'texto'), objetivos: parse(r.objetivos, 'titulo', 'texto') });
    toast('Datos de la empresa actualizados'); render();
  };
  c.querySelector('[data-exp]').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([db.exportar()], { type: 'application/json' })); a.download = `worknova-respaldo-${hoyISO()}.json`; a.click(); };
  c.querySelector('[data-imp]').onchange = async (ev) => { const f = ev.target.files[0]; if (!f) return; if (!await confirmar('Restaurar el respaldo reemplaza TODOS los datos actuales de este navegador. ¿Continuar?')) return; try { db.importar(await f.text()); toast('Respaldo restaurado'); location.hash = ''; render(); } catch (err) { toast(err.message); } };
  c.querySelector('[data-reset]').onclick = async () => { if (await confirmar('Esto borra todos los datos y usuarios de este navegador y carga los datos de ejemplo. ¿Seguro?')) { db.reiniciar(); localStorage.removeItem('worknova_sesion'); location.hash = ''; render(); } };
}

// ---------- USUARIOS ----------
let tabUsr = 'pendiente';
function usuarios(c) {
  const us = db.where('usuarios', (u) => u.estado === tabUsr);
  const pend = db.where('usuarios', (u) => u.estado === 'pendiente').length;
  c.innerHTML = header('Aprobación de Usuarios', 'Gestiona las solicitudes de acceso y asocia empleados', `<span class="pill warn" style="padding:.5rem .9rem">${icon('clock')}&nbsp;${pend} pendientes</span>`) +
    `<div class="utabs">${[['pendiente', 'Pendientes'], ['aprobado', 'Aprobados'], ['rechazado', 'Rechazados']].map(([k, l]) => `<button data-tab="${k}" class="${tabUsr === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="card card-pad">${us.length ? us.map((u) => `<div class="list-row"><span class="avatar">${inicial(u.nombre)}</span><div class="grow"><b>${esc(u.nombre)}</b> ${u.rol === 'admin' ? '<span class="pill violet">Admin</span>' : ''}<small>${esc(u.email)} · ${u.empleado_id ? 'Empleado: ' + esc(nombreEmp(u.empleado_id)) : 'Sin empleado asociado'} · desde ${fecha(u.creado)}</small></div>
      ${u.id === sesion.usuario.id ? '<span class="muted">(vos)</span>' : `${tabUsr !== 'aprobado' ? `<button class="btn sm ok" data-ok="${u.id}">${icon('check')} Aprobar</button>` : `<button class="btn sm" data-ok="${u.id}">${icon('settings')} Editar</button>`}${tabUsr !== 'rechazado' ? `<button class="btn sm danger" data-no="${u.id}">${icon('x')} ${tabUsr === 'aprobado' ? 'Bloquear' : 'Rechazar'}</button>` : ''}<button class="btn sm btn-icon danger" data-del="${u.id}" title="Eliminar">${icon('trash-2')}</button>`}</div>`).join('') : vacio('No hay usuarios en este estado', 'users')}</div>`;
  on(c, '[data-tab]', 'click', (b) => { tabUsr = b.dataset.tab; render(); });
  on(c, '[data-ok]', 'click', async (b) => {
    const u = db.get('usuarios', b.dataset.ok);
    const r = await formulario({ titulo: `Aprobar acceso · ${u.nombre}`, valores: u, campos: [
      { k: 'rol', label: 'Rol', type: 'select', options: [['empleado', 'Empleado'], ['admin', 'Administrador']], full: true },
      { k: 'empleado_id', label: 'Empleado asociado', type: 'select', options: opcionesEmpleados(false), full: true }], guardar: 'Aprobar' });
    if (!r) return;
    db.update('usuarios', u.id, { ...r, empleado_id: r.empleado_id || null, estado: 'aprobado' });
    notificar(u.id, '¡Tu acceso a WorkNova fue aprobado!'); toast('Usuario aprobado'); render();
  });
  on(c, '[data-no]', 'click', (b) => { db.update('usuarios', b.dataset.no, { estado: 'rechazado' }); toast('Usuario rechazado'); render(); });
  on(c, '[data-del]', 'click', async (b) => { if (await confirmar('¿Eliminar este usuario? Podrá volver a registrarse.')) { db.remove('usuarios', b.dataset.del); render(); } });
}

// ---------- CHAT ----------
let convActual = null; const borradores = {};
function conversacionesDe(u) {
  const emp = sesion.empleado;
  return db.where('conversaciones', (cv) => cv.tipo === 'directa' ? cv.participantes.includes(u.id) : (sesion.esAdmin || cv.departamento === emp?.departamento || cv.departamento === 'Administración'));
}
function tituloConv(cv, u) {
  if (cv.tipo === 'departamento') return '# ' + cv.departamento;
  const otro = db.get('usuarios', cv.participantes.find((p) => p !== u.id));
  return otro?.nombre || 'Usuario eliminado';
}
function chat(c) {
  const u = sesion.usuario;
  const convs = conversacionesDe(u).map((cv) => { const ms = db.where('mensajes', (m) => m.conversacion_id === cv.id); return { cv, ult: ms[ms.length - 1] }; })
    .sort((a, b) => (b.ult?.fecha || b.cv.creado).localeCompare(a.ult?.fecha || a.cv.creado));
  if (convActual && !convs.find((x) => x.cv.id === convActual)) convActual = null;
  const cv = convActual ? db.get('conversaciones', convActual) : null;
  const msgs = cv ? db.where('mensajes', (m) => m.conversacion_id === cv.id) : [];
  c.innerHTML = `<div class="card chat"><div class="chat-list"><div class="hd"><h3>Mensajes</h3><button class="btn sm primary btn-icon" data-nuevo title="Nueva conversación">${icon('plus')}</button></div>
    <div class="items">${convs.length ? convs.map(({ cv: x, ult }) => `<div class="conv ${x.id === convActual ? 'on' : ''}" data-id="${x.id}"><span class="avatar">${x.tipo === 'departamento' ? icon('hash') : inicial(tituloConv(x, u))}</span><div class="grow"><b>${esc(tituloConv(x, u))}</b><small>${ult ? esc((ult.autor_id === u.id ? 'Vos: ' : '') + ult.texto) : 'Sin mensajes'}</small></div></div>`).join('') : '<div class="empty">No hay conversaciones<br><small>Iniciá un nuevo chat</small></div>'}</div></div>
    <div class="chat-main">${cv ? `<div class="hd"><span class="avatar">${cv.tipo === 'departamento' ? icon('hash') : inicial(tituloConv(cv, u))}</span><div><b>${esc(tituloConv(cv, u))}</b><div class="muted" style="font-size:.8rem">${cv.tipo === 'departamento' ? 'Canal del área' : 'Conversación directa'}</div></div></div>
      <div class="msgs" data-msgs>${msgs.length ? msgs.map((m) => `<div class="msg ${m.autor_id === u.id ? 'me' : ''}">${m.autor_id !== u.id && cv.tipo === 'departamento' ? `<div class="who">${esc(m.autor)}</div>` : ''}${esc(m.texto).replace(/\n/g, '<br>')}<small>${fechaHora(m.fecha)}</small></div>`).join('') : '<div class="empty">Escribí el primer mensaje</div>'}</div>
      <form class="composer"><input data-txt placeholder="Escribí un mensaje..." autocomplete="off" value="${esc(borradores[cv.id] || '')}"><button class="btn primary">${icon('send')}</button></form>`
    : `<div class="empty" style="margin:auto">${icon('message-circle')}<div>Seleccioná una conversación para comenzar</div></div>`}</div></div>`;
  on(c, '.conv', 'click', (el) => { convActual = el.dataset.id; render(); });
  c.querySelector('[data-nuevo]').onclick = async () => {
    const otros = db.where('usuarios', (x) => x.id !== u.id && x.estado === 'aprobado');
    const deps = sesion.esAdmin ? [...DEPARTAMENTOS, 'Administración'] : [sesion.empleado?.departamento, 'Administración'].filter(Boolean);
    const r = await formulario({ titulo: 'Nueva conversación', campos: [{ k: 'dest', label: 'Con quién', type: 'select', req: true, full: true, options: [['', '— Elegir —'], ...otros.map((x) => ['u:' + x.id, x.nombre + (x.rol === 'admin' ? ' (Administración)' : '')]), ...deps.map((d) => ['d:' + d, 'Canal · ' + d])] }], guardar: 'Abrir chat' });
    if (!r?.dest) return;
    const [t, v] = [r.dest.slice(0, 1), r.dest.slice(2)];
    let x = t === 'u' ? db.where('conversaciones', (k) => k.tipo === 'directa' && k.participantes.includes(u.id) && k.participantes.includes(v))[0] : db.where('conversaciones', (k) => k.tipo === 'departamento' && k.departamento === v)[0];
    if (!x) x = db.create('conversaciones', t === 'u' ? { tipo: 'directa', participantes: [u.id, v] } : { tipo: 'departamento', departamento: v, participantes: [] });
    convActual = x.id; render();
  };
  if (!cv) return;
  const box = c.querySelector('[data-msgs]'); box.scrollTop = box.scrollHeight;
  const inp = c.querySelector('[data-txt]'); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
  inp.oninput = () => { borradores[cv.id] = inp.value; };
  c.querySelector('.composer').onsubmit = (e) => {
    e.preventDefault(); const t = inp.value.trim(); if (!t) return;
    db.create('mensajes', { conversacion_id: cv.id, autor_id: u.id, autor: u.nombre, texto: t, fecha: new Date().toISOString() });
    if (cv.tipo === 'directa') { const otro = cv.participantes.find((p) => p !== u.id); notificar(otro, `Nuevo mensaje de ${u.nombre}`); }
    borradores[cv.id] = ''; render();
  };
}

// ---------- MI PORTAL ----------
let tabPortal = 'personal', tabDep = 'dashboard', depElegido = null;
const FUNCIONES = {
  'Tecnología': ['Mantener y evolucionar la infraestructura tecnológica', 'Liderar proyectos de desarrollo e innovación', 'Garantizar la seguridad de la información'],
  'Recursos Humanos': ['Gestionar el ciclo de vida del colaborador', 'Impulsar la cultura y el clima organizacional', 'Coordinar capacitaciones y evaluaciones'],
  'Comercial': ['Desarrollar y fidelizar la cartera de clientes', 'Cumplir los objetivos de ventas del área', 'Detectar nuevas oportunidades de negocio'],
  'Finanzas y Administración': ['Controlar el presupuesto y los flujos de fondos', 'Gestionar liquidaciones y pagos', 'Elaborar reportes financieros'],
  'Consultoría': ['Diagnosticar necesidades de los clientes', 'Diseñar e implementar soluciones de RR.HH.', 'Dar seguimiento a los resultados'],
};
function portal(c) {
  const u = sesion.usuario; const emp = sesion.empleado;
  c.innerHTML = header('Mi Portal', `Bienvenido/a, ${u.nombre}`) +
    (sesion.esJefe ? `<div class="tabs"><button data-pt="personal" class="${tabPortal === 'personal' ? 'on' : ''}">${icon('user')} Portal Personal</button><button data-pt="depto" class="${tabPortal === 'depto' ? 'on' : ''}">${icon('building')} Portal Departamento</button></div>` : '') + '<div data-pc></div>';
  on(c, '[data-pt]', 'click', (b) => { tabPortal = b.dataset.pt; render(); });
  const pc = c.querySelector('[data-pc]');
  if (tabPortal === 'depto' && sesion.esJefe) return portalDepartamento(pc);
  if (!emp) { pc.innerHTML = `<div class="card card-pad">${vacio(sesion.esAdmin ? 'Tu usuario no está asociado a un empleado. Asocialo desde "Aprobación Usuarios" → Aprobados → Editar.' : 'Tu usuario todavía no está asociado a un empleado. Pedile a Recursos Humanos que lo vincule.', 'user-x')}</div>`; return; }
  const mios = db.where('permisos', (p) => p.empleado_id === emp.id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const objs = db.where('objetivos', (o) => o.empleado_id === emp.id);
  const recs = db.where('recibos', (r) => r.empleado_id === emp.id).sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
  const evs = db.where('evaluaciones', (v) => v.empleado_id === emp.id && v.estado === 'completada');
  const caps = db.where('capacitaciones', (x) => (x.inscriptos || []).includes(emp.id));
  pc.innerHTML = `<div class="grid g3 mb">
      <button class="tile violet" data-permiso>${icon('calendar')}<b>Solicitar Permiso</b><small>Vacaciones, enfermedad, etc.</small></button>
      <button class="tile blue" data-datos>${icon('user')}<b>Mis Datos</b><small>Actualizar información personal</small></button>
      <button class="tile green" data-objs>${icon('target')}<b>Mis Objetivos</b><small>${objs.filter((o) => o.estado === 'en progreso').length} activos</small></button></div>
    <div class="card card-pad mb"><div class="row between"><h3 class="row" style="margin:0">${icon('briefcase')} Funciones de mi Puesto</h3><span class="pill">${esc(emp.puesto)}</span></div><p class="muted">Responsabilidades asignadas a tu rol en el área de ${esc(emp.departamento)}</p>
      ${(FUNCIONES[emp.departamento] || ['Cumplir con las responsabilidades asignadas por la dirección', 'Mantener comunicación fluida con el equipo', 'Contribuir a los objetivos del área']).map((f) => `<div class="list-row">${icon('circle-check')}<div class="grow">${esc(f)}</div></div>`).join('')}</div>
    <div class="grid g2 mb"><div class="card card-pad"><h3>Mis Solicitudes de Permiso</h3>${mios.length ? mios.map((p) => `<div class="list-row"><div class="grow"><b>${esc(p.tipo)}</b><small>${fecha(p.desde)} → ${fecha(p.hasta)}${p.comentario ? ' · ' + esc(p.comentario) : ''}</small></div>${estadoPill(p.estado)}</div>`).join('') : vacio('No tenés solicitudes de permiso')}</div>
      <div class="card card-pad"><h3>Mis Recibos de Pago</h3>${recs.length ? recs.map((r) => `<div class="list-row">${icon('receipt')}<div class="grow"><b>${esc(r.periodo)}</b><small>Neto ${plata(r.neto)} · pagado ${fecha(r.fecha_pago)}</small></div><button class="btn sm" data-rec="${r.id}">${icon('eye')} Ver</button></div>`).join('') : vacio('No hay recibos disponibles')}</div></div>
    <div class="grid g2"><div class="card card-pad"><h3>Mis Evaluaciones</h3>${evs.length ? evs.map((v) => `<div class="list-row"><div class="grow"><b>${esc(v.periodo)}</b><small>${esc(v.evaluador)} · ${fecha(v.fecha)}</small></div><span class="score">${v.general ?? '—'}</span><button class="btn sm" data-ev="${v.id}">${icon('eye')}</button></div>`).join('') : vacio('Sin evaluaciones completadas')}</div>
      <div class="card card-pad"><h3>Mis Capacitaciones</h3>${caps.length ? caps.map((x) => `<div class="list-row">${icon('graduation-cap')}<div class="grow"><b>${esc(x.titulo)}</b><small>${fecha(x.inicio)} · ${esc(x.modalidad)}</small></div>${estadoPill(x.estado)}</div>`).join('') : vacio('No estás inscripto en capacitaciones')}<a class="btn sm" href="#/capacitacion">Ver programas</a></div></div>`;
  pc.querySelector('[data-permiso]').onclick = () => solicitarPermiso(emp.id);
  pc.querySelector('[data-datos]').onclick = async () => {
    const r = await formulario({ titulo: 'Mis datos personales', ancho: true, valores: emp, guardar: 'Guardar cambios', campos: [...CAMPOS_PERSONALES.filter((f) => f.k !== 'email'),
      { sec: 'Confirmación', color: 'y' }, { k: 'confirmo', label: 'Declaro que los datos ingresados son correctos y están actualizados.', type: 'checkbox', req: true, full: true }] });
    if (!r) return; delete r.confirmo;
    db.update('empleados', emp.id, { ...r, datos_actualizados: new Date().toISOString() });
    admins().forEach((a) => a.id !== u.id && notificar(a.id, `${emp.nombre_completo} actualizó sus datos personales.`));
    toast('Datos actualizados'); render();
  };
  pc.querySelector('[data-objs]').onclick = () => {
    const m = verModal('Mis Objetivos', `<div class="row" style="justify-content:flex-end;margin-bottom:1rem"><button class="btn primary sm" data-nuevo>${icon('plus')} Nuevo objetivo personal</button></div><div data-l></div>`);
    listaObjetivos(m.querySelector('[data-l]'), (o) => o.empleado_id === emp.id, true); refrescarIconos();
    m.querySelector('[data-nuevo]').onclick = () => { m.remove(); editarObjetivo(null, null, emp.id); };
  };
  on(pc, '[data-rec]', 'click', (b) => verRecibo(db.get('recibos', b.dataset.rec)));
  on(pc, '[data-ev]', 'click', (b) => { const v = db.get('evaluaciones', b.dataset.ev); verModal(`Evaluación ${v.periodo}`, detalleEvaluacion(v)); });
}

function portalDepartamento(c) {
  const emp = sesion.empleado;
  const dep = sesion.esAdmin ? (depElegido || emp?.departamento || DEPARTAMENTOS[0]) : emp?.departamento;
  if (!dep) { c.innerHTML = vacio('Tu usuario no tiene un departamento asignado.'); return; }
  const tabs = [['dashboard', 'Dashboard', 'layout-dashboard'], ['chat', 'Chat', 'message-square'], ['equipo', 'Empleados a cargo', 'users'], ['reclutamiento', 'Reclutamiento', 'briefcase'], ['permisos', 'Permisos', 'calendar'], ['evaluaciones', 'Evaluaciones', 'award'], ['objetivos', 'Objetivos del Área', 'target'], ['capacitacion', 'Capacitación', 'graduation-cap'], ['aprobaciones', 'Aprobaciones', 'square-check-big']];
  c.innerHTML = `<div class="row between mb"><h2 style="margin:0">${esc(dep)}</h2>${sesion.esAdmin ? `<select data-dep style="width:auto">${DEPARTAMENTOS.map((d) => `<option ${d === dep ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>` : ''}</div>
    <div class="tabs">${tabs.map(([k, l, i]) => `<button data-dt="${k}" class="${tabDep === k ? 'on' : ''}">${icon(i)} ${l}</button>`).join('')}</div><div data-dc></div>`;
  c.querySelector('[data-dep]')?.addEventListener('change', (e) => { depElegido = e.target.value; render(); });
  on(c, '[data-dt]', 'click', (b) => { if (b.dataset.dt === 'chat') { abrirCanal(dep); return; } tabDep = b.dataset.dt; render(); });
  const dc = c.querySelector('[data-dc]');
  const equipo = db.where('empleados', (e) => e.departamento === dep);
  const ids = new Set(equipo.map((e) => e.id));
  switch (tabDep) {
    case 'equipo':
      dc.innerHTML = equipo.length ? `<div class="grid g3">${equipo.map((e) => `<div class="card emp-card"><div class="emp-head"><span class="avatar lg">${inicial(e.nombre_completo)}</span><div style="flex:1"><b>${esc(e.nombre_completo)}</b><small>${esc(e.puesto)}</small></div>${estadoPill(e.estado)}</div><div class="emp-info"><div>${icon('mail')}<span>${esc(e.email)}</span></div><div>${icon('phone')}<span>${esc(e.telefono || '—')}</span></div><div>${icon('star')}<span>Desempeño ${e.desempeno ?? '—'}/10</span></div></div><button class="btn sm" data-ficha="${e.id}">${icon('eye')} Ver ficha</button></div>`).join('')}</div>` : vacio('No hay empleados en el área');
      on(dc, '[data-ficha]', 'click', (b) => { const e = db.get('empleados', b.dataset.ficha); verModal(e.nombre_completo, fichaEmpleado(e)); });
      break;
    case 'reclutamiento':
      dc.innerHTML = `<div class="row mb" style="justify-content:flex-end"><button class="btn primary" data-nc>${icon('plus')} Nuevo candidato</button></div><div data-k></div>`;
      kanban(dc.querySelector('[data-k]'), dep); dc.querySelector('[data-nc]').onclick = () => editarCandidato(null, dep);
      break;
    case 'permisos': panelPermisos(dc, dep); break;
    case 'evaluaciones':
      dc.innerHTML = `<div class="row mb" style="justify-content:flex-end"><button class="btn primary" data-ne>${icon('plus')} Nueva evaluación</button></div><div data-l></div>`;
      listaEvaluaciones(dc.querySelector('[data-l]'), dep); dc.querySelector('[data-ne]').onclick = () => editarEvaluacion(null, dep);
      break;
    case 'objetivos':
      dc.innerHTML = `<div class="row mb" style="justify-content:flex-end"><button class="btn primary" data-no>${icon('plus')} Nuevo objetivo del área</button></div><div data-l></div>`;
      listaObjetivos(dc.querySelector('[data-l]'), (o) => o.departamento === dep || ids.has(o.empleado_id), true, dep); dc.querySelector('[data-no]').onclick = () => editarObjetivo(null, dep);
      break;
    case 'capacitacion': {
      const caps = db.list('capacitaciones');
      dc.innerHTML = `<div class="card card-pad"><h3>Participación del equipo</h3>${caps.length ? `<div class="table-wrap"><table><tr><th>Programa</th><th>Estado</th><th>Inscriptos del área</th></tr>${caps.map((x) => { const n = (x.inscriptos || []).filter((i) => ids.has(i)); return `<tr><td><b>${esc(x.titulo)}</b><div class="muted" style="font-size:.8rem">${fecha(x.inicio)} · ${x.horas || 0} h</div></td><td>${estadoPill(x.estado)}</td><td>${n.length ? n.map((i) => esc(nombreEmp(i))).join(', ') : '<span class="muted">Nadie</span>'}</td></tr>`; }).join('')}</table></div>` : vacio('No hay programas')}</div>`;
      break; }
    case 'aprobaciones': {
      const pend = db.where('permisos', (p) => p.departamento === dep && p.estado === 'pendiente');
      dc.innerHTML = `<div class="card card-pad"><h3>Aprobaciones y derivaciones</h3><p class="muted" style="margin-top:0">Aprobá o rechazá las solicitudes de tu equipo, o derivalas a Administración / RR.HH.</p>${pend.length ? pend.map((p) => filaPermiso(p, true, `<button class="btn sm" data-der="${p.id}">${icon('forward')} ${p.derivado ? 'Derivada' : 'Derivar'}</button>`)).join('') : vacio('No hay solicitudes pendientes del área')}</div>`;
      bindPermisos(dc);
      on(dc, '[data-der]', 'click', async (b) => { const r = await formulario({ titulo: 'Derivar a Administración', campos: [{ k: 'nota', label: 'Nota para Administración / RR.HH.', type: 'textarea', full: true }], guardar: 'Derivar' }); if (!r) return; const p = db.update('permisos', b.dataset.der, { derivado: sesion.usuario.nombre, nota_derivacion: r.nota }); admins().forEach((a) => notificar(a.id, `${sesion.usuario.nombre} derivó el permiso de ${p.empleado}.`)); toast('Solicitud derivada'); render(); });
      break; }
    default: {
      const pendP = db.where('permisos', (p) => p.departamento === dep && p.estado === 'pendiente').length;
      const cands = db.where('candidatos', (x) => x.departamento === dep && !['contratado', 'rechazado'].includes(x.etapa)).length;
      const objs = db.where('objetivos', (o) => o.departamento === dep || ids.has(o.empleado_id));
      const prom = equipo.filter((e) => e.desempeno); const p = prom.length ? (prom.reduce((a, e) => a + Number(e.desempeno), 0) / prom.length).toFixed(1) : '—';
      dc.innerHTML = `<div class="grid g4 mb">${stat('Empleados del área', equipo.length, 'users', 'bg-blue')}${stat('Permisos pendientes', pendP, 'calendar', 'bg-amber')}${stat('Candidatos en proceso', cands, 'briefcase', 'bg-violet')}${stat('Desempeño promedio', p, 'target', 'bg-green')}</div>
        <div class="grid g2"><div class="card card-pad"><h3>Equipo</h3>${equipo.map((e) => `<div class="list-row"><span class="avatar">${inicial(e.nombre_completo)}</span><div class="grow"><b>${esc(e.nombre_completo)}</b><small>${esc(e.puesto)}</small></div>${estadoPill(e.estado)}</div>`).join('') || vacio('Sin empleados')}</div>
        <div class="card card-pad"><h3>Objetivos del área</h3>${objs.map((o) => `<div class="list-row"><div class="grow"><b>${esc(o.titulo)}</b><div class="bar" style="margin-top:.4rem"><i style="width:${o.progreso || 0}%"></i></div></div><b>${o.progreso || 0}%</b></div>`).join('') || vacio('Sin objetivos')}</div></div>`;
    }
  }
}
function abrirCanal(dep) {
  let x = db.where('conversaciones', (k) => k.tipo === 'departamento' && k.departamento === dep)[0];
  if (!x) x = db.create('conversaciones', { tipo: 'departamento', departamento: dep, participantes: [] });
  convActual = x.id; ir('chat');
}

export const VISTAS = { dashboard, empleados, empleado, reclutamiento, permisos, evaluaciones, objetivos, capacitacion, documentos, aprobaciones, sucesion, empresa, usuarios, chat, portal };
