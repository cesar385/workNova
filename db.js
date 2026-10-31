// WorkNova · capa de datos local (localStorage)
// Todos los datos viven en el navegador. Usar Empresa → Respaldo para exportar/importar.

const KEY = 'worknova_db_v1';

export const DEPARTAMENTOS = ['Tecnología', 'Recursos Humanos', 'Comercial', 'Finanzas y Administración', 'Consultoría'];

const TABLAS = ['usuarios', 'empleados', 'candidatos', 'permisos', 'evaluaciones', 'objetivos',
  'capacitaciones', 'documentos', 'recibos', 'sucesion', 'conversaciones', 'mensajes', 'notificaciones', 'empresa',
  'asistencia', 'feriados', 'auditoria'];

// Tablas cuyos cambios se registran en el historial
const AUDITADAS = { usuarios: 'Usuario', empleados: 'Empleado', candidatos: 'Candidato', permisos: 'Permiso', evaluaciones: 'Evaluación',
  objetivos: 'Objetivo', capacitaciones: 'Capacitación', documentos: 'Documento', recibos: 'Recibo', sucesion: 'Plan de sucesión', empresa: 'Empresa', feriados: 'Feriado' };
const etiqueta = (r) => r.nombre_completo || r.nombre || r.titulo || r.puesto || r.empleado || r.periodo || r.fecha || r.id;

// Feriados nacionales de Argentina 2026 (verificar y editar desde Calendario)
const FERIADOS_2026 = [
  ['2026-01-01', 'Año Nuevo'], ['2026-02-16', 'Carnaval'], ['2026-02-17', 'Carnaval'], ['2026-03-23', 'Feriado puente'],
  ['2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'], ['2026-04-02', 'Día del Veterano y de los Caídos en Malvinas'],
  ['2026-04-03', 'Viernes Santo'], ['2026-05-01', 'Día del Trabajador'], ['2026-05-25', 'Revolución de Mayo'],
  ['2026-06-15', 'Paso a la Inmortalidad del Gral. Güemes'], ['2026-06-20', 'Paso a la Inmortalidad del Gral. Belgrano'],
  ['2026-07-09', 'Día de la Independencia'], ['2026-07-10', 'Feriado puente'], ['2026-08-17', 'Paso a la Inmortalidad del Gral. San Martín'],
  ['2026-10-12', 'Día del Respeto a la Diversidad Cultural'], ['2026-11-23', 'Día de la Soberanía Nacional'], ['2026-12-07', 'Feriado puente'],
  ['2026-12-08', 'Inmaculada Concepción de María'], ['2026-12-25', 'Navidad'],
];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const hoy = () => new Date().toISOString().slice(0, 10);

function semilla() {
  const emp = (nombre, email, puesto, dep, tel, salario, desempeno, habilidades, extra = {}) => ({
    id: uid(), nombre_completo: nombre, email, puesto, departamento: dep, telefono: tel,
    fecha_ingreso: '2023-07-01', salario, desempeno, estado: 'activo', habilidades,
    tipo_contrato: 'Contrato a tiempo indeterminado', creado: '2025-11-23', ...extra,
  });
  const empleados = [
    emp('Alejandro Cocuche', 'a.cocuche@worknova.com', 'CEO Director', 'Recursos Humanos', '+54 351 123-4567', 180000, 9, ['Liderazgo Estratégico', 'Visión de Negocio', 'Gestión de Equipos']),
    emp('Verónica Savid', 'v.savid@worknova.com', 'Directora de RR.HH.', 'Recursos Humanos', '+54 351 123-4568', 150000, 8.5, ['Gestión de Talento', 'Desarrollo Organizacional', 'Comunicación']),
    emp('Julio César Danderfert', 'j.danderfert@worknova.com', 'Director de Tecnología', 'Tecnología', '+54 351 123-4569', 1900000, 9, ['Arquitectura de Software', 'Liderazgo Técnico', 'Innovación']),
    emp('Micaela Sosa', 'm.sosa@worknova.com', 'Gerente Comercial', 'Comercial', '+54 351 123-4570', 140000, 9, ['Ventas Consultivas', 'Negociación', 'Desarrollo de Clientes']),
    emp('Carina Uñate', 'c.unate@worknova.com', 'Gerente de Finanzas y Administración', 'Finanzas y Administración', '+54 351 123-4571', 145000, 8.5, ['Gestión Financiera', 'Análisis de Datos', 'Planificación Estratégica']),
  ];
  empleados.slice(1).forEach((e) => { e.jefe_id = empleados[0].id; });
  return {
    usuarios: [],
    empleados,
    asistencia: [],
    auditoria: [],
    feriados: FERIADOS_2026.map(([fecha, nombre]) => ({ id: uid(), fecha, nombre })),
    candidatos: [
      { id: uid(), nombre: 'Sofía Morales', email: 'sofia.morales@mail.com', telefono: '', puesto: 'Desarrollador Full Stack', departamento: 'Tecnología', experiencia: 4, etapa: 'preseleccionado', puntaje: 0, notas: '' },
      { id: uid(), nombre: 'María Belén Rojas', email: 'mb.rojas@mail.com', telefono: '', puesto: 'Coordinador/a de Atención al Cliente', departamento: 'Comercial', experiencia: 3, etapa: 'preseleccionado', puntaje: 0, notas: '' },
      { id: uid(), nombre: 'Paula Cabrera', email: 'p.cabrera@mail.com', telefono: '', puesto: 'Coordinador/a de Atención al Cliente', departamento: 'Comercial', experiencia: 5, etapa: 'contratado', puntaje: 8.5, notas: '' },
    ],
    permisos: [],
    evaluaciones: [
      { id: uid(), empleado_id: empleados[3].id, empleado: 'Micaela Sosa', evaluador: 'Alejandro Cocuche', fecha: '2025-04-01', periodo: 'Q1 2025', tecnicas: 9, blandas: 9, liderazgo: 9, equipo: 9, general: 9, fortalezas: '', mejoras: '', plan: '', estado: 'pendiente' },
      { id: uid(), empleado_id: empleados[1].id, empleado: 'Verónica Savid', evaluador: 'Alejandro Cocuche', fecha: '2024-12-09', periodo: 'Semestre 2 - 2024', tecnicas: 8.5, blandas: 9, liderazgo: 8.5, equipo: 8, general: 8.5, fortalezas: '', mejoras: '', plan: '', estado: 'completada' },
      { id: uid(), empleado_id: empleados[2].id, empleado: 'Julio César Danderfert', evaluador: 'Alejandro Cocuche', fecha: '2024-12-09', periodo: 'Semestre 2 - 2024', tecnicas: 9.5, blandas: 8.5, liderazgo: 9, equipo: 9, general: 9, fortalezas: '', mejoras: '', plan: '', estado: 'completada' },
    ],
    objetivos: [],
    capacitaciones: [
      { id: uid(), titulo: 'Liderazgo Operativo y Gestión de Equipos', descripcion: 'Desarrollo de competencias en liderazgo, gestión de equipos y toma de decisiones.', publico: 'Liderazgo', inicio: '2025-02-28', fin: '', horas: 48, modalidad: 'Presencial', instructor: 'Lic. Roberto Paz - Consultor Organizacional', estado: 'planificado', inscriptos: [] },
      { id: uid(), titulo: 'Técnicas de Venta Consultiva Avanzada', descripcion: 'Programa intensivo de ventas consultivas, negociación y uso de CRM.', publico: 'Ventas', inicio: '2025-02-14', fin: '', horas: 32, modalidad: 'Virtual', instructor: 'Laura Méndez - Coach de Ventas', estado: 'planificado', inscriptos: [] },
      { id: uid(), titulo: 'Actualización en Nuevas Tecnologías Agrotecnológicas', descripcion: 'Programa de actualización técnica en las últimas tecnologías del agro.', publico: 'Técnicos', inicio: '2025-01-31', fin: '', horas: 40, modalidad: 'Híbrido', instructor: 'Dr. Fernando López - Especialista en Agtech', estado: 'planificado', inscriptos: [] },
    ],
    documentos: [],
    recibos: [],
    sucesion: [
      { id: uid(), puesto: 'Directora de RR.HH.', titular: 'Verónica Savid', sucesor: '', preparacion: '3-5 años', necesidades: 'Plan de desarrollo para sucesión regional', riesgo: 'Medio', respaldo: '', revision: '2024-11-30' },
      { id: uid(), puesto: 'Director de Tecnología', titular: 'Julio César Danderfert', sucesor: '', preparacion: '1-2 años', necesidades: 'Formar un segundo líder técnico', riesgo: 'Alto', respaldo: '', revision: '2024-11-30' },
      { id: uid(), puesto: 'Gerente Comercial', titular: 'Micaela Sosa', sucesor: 'Paula Cabrera', preparacion: 'Listo ahora', necesidades: 'Mentoría en negociación corporativa', riesgo: 'Alto', respaldo: '', revision: '2024-11-30' },
    ],
    conversaciones: [],
    mensajes: [],
    notificaciones: [],
    empresa: [{
      id: 'empresa', nombre: 'WorkNova', logo: '', industria: 'Consultoría en RR.HH. y HR Tech',
      direccion: '', telefono: '', email: '', web: '',
      mision: 'Impulsar el talento de las organizaciones de Argentina y Latinoamérica con tecnología y consultoría humana.',
      vision: 'Ser la plataforma de gestión de talento de referencia en la región.',
      valores: [
        { nombre: 'Innovación', texto: 'Compromiso con la mejora continua' },
        { nombre: 'Colaboración', texto: 'Trabajo en equipo efectivo' },
        { nombre: 'Transparencia', texto: 'Comunicación clara y honesta' },
        { nombre: 'Excelencia', texto: 'Calidad en todo lo que hacemos' },
      ],
      objetivos: [
        { titulo: 'Expansión Regional', texto: 'Lograr rentabilidad sostenible en Argentina y Latinoamérica' },
        { titulo: 'Crecimiento de Equipo', texto: '12 nuevas incorporaciones planificadas para 2025' },
        { titulo: 'Innovación Continua', texto: 'Desarrollar plataforma digital integral de gestión de talento' },
        { titulo: 'Cultura Organizacional', texto: 'Fomentar ambientes laborales más productivos y humanos' },
      ],
    }],
  };
}

let data;
function cargar() {
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch { data = null; }
  if (!data) { data = semilla(); guardar(); }
  for (const t of TABLAS) if (!Array.isArray(data[t])) data[t] = [];
  if (!data.feriados.length && !data._feriados_ok) { data.feriados = FERIADOS_2026.map(([fecha, nombre]) => ({ id: uid(), fecha, nombre })); data._feriados_ok = true; guardar(); }
}
let actor = () => null;
function auditar(t, accion, r, cambios) {
  if (!AUDITADAS[t]) return;
  const a = actor();
  const campos = cambios ? Object.keys(cambios).filter((k) => !['archivo', 'clave', 'logo'].includes(k)) : [];
  data.auditoria.push({ id: uid(), fecha: new Date().toISOString(), usuario: a?.nombre || 'Sistema', usuario_id: a?.id || null, tabla: AUDITADAS[t], accion, registro: String(etiqueta(r)).slice(0, 80), campos });
  if (data.auditoria.length > 3000) data.auditoria.splice(0, data.auditoria.length - 3000);
}
function guardar() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (e) { alert('No se pudo guardar: el almacenamiento del navegador está lleno. Eliminá documentos grandes o exportá un respaldo.'); throw e; }
}
cargar();

// Sincroniza entre pestañas del mismo navegador (útil para el chat)
const oyentes = new Set();
window.addEventListener('storage', (e) => { if (e.key === KEY) { cargar(); oyentes.forEach((f) => f()); } });
export const alCambiar = (f) => { oyentes.add(f); return () => oyentes.delete(f); };

export const db = {
  list: (t) => [...data[t]],
  get: (t, id) => data[t].find((r) => r.id === id),
  where: (t, fn) => data[t].filter(fn),
  create(t, rec) { const r = { id: uid(), creado: hoy(), ...rec }; data[t].push(r); auditar(t, 'creó', r, rec); guardar(); return r; },
  update(t, id, cambios) { const r = data[t].find((x) => x.id === id); if (r) { Object.assign(r, cambios); auditar(t, 'modificó', r, cambios); guardar(); } return r; },
  remove(t, id) { const r = data[t].find((x) => x.id === id); data[t] = data[t].filter((x) => x.id !== id); if (r) auditar(t, 'eliminó', r); guardar(); },
  setActor(fn) { actor = fn; },
  tamano: () => new Blob([localStorage.getItem(KEY) || '']).size,
  exportar: () => JSON.stringify(data, null, 2),
  importar(json) {
    const nuevo = JSON.parse(json);
    if (!nuevo || !Array.isArray(nuevo.empleados)) throw new Error('El archivo no es un respaldo de WorkNova.');
    data = nuevo; for (const t of TABLAS) if (!Array.isArray(data[t])) data[t] = [];
    guardar();
  },
  reiniciar() { data = semilla(); guardar(); },
};

export async function hashClave(clave) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('worknova:' + clave));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Liquidación simplificada (aportes del trabajador, régimen general)
export const APORTES = [['jubilacion', 'Jubilación (SIPA)', 11], ['ley19032', 'Ley 19.032 (PAMI)', 3], ['obra_social', 'Obra social', 3]];
export function liquidar(bruto, sindicato = 0, otros = 0) {
  bruto = Number(bruto) || 0;
  const items = APORTES.map(([k, l, pct]) => ({ k, l, pct, monto: Math.round(bruto * pct) / 100 }));
  if (sindicato) items.push({ k: 'sindicato', l: 'Cuota sindical', pct: sindicato, monto: Math.round(bruto * sindicato) / 100 });
  if (otros) items.push({ k: 'otros', l: 'Otros descuentos', pct: null, monto: Number(otros) });
  const deducciones = Math.round(items.reduce((a, i) => a + i.monto, 0) * 100) / 100;
  return { items, deducciones, neto: Math.round((bruto - deducciones) * 100) / 100 };
}

export function notificar(usuario_id, texto, enlace = '') {
  db.create('notificaciones', { usuario_id, texto, enlace, leida: false, fecha: new Date().toISOString() });
}
