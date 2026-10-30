// WorkNova · capa de datos local (localStorage)
// Todos los datos viven en el navegador. Usar Empresa → Respaldo para exportar/importar.

const KEY = 'worknova_db_v1';

export const DEPARTAMENTOS = ['Tecnología', 'Recursos Humanos', 'Comercial', 'Finanzas y Administración', 'Consultoría'];

const TABLAS = ['usuarios', 'empleados', 'candidatos', 'permisos', 'evaluaciones', 'objetivos',
  'capacitaciones', 'documentos', 'recibos', 'sucesion', 'conversaciones', 'mensajes', 'notificaciones', 'empresa'];

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
  return {
    usuarios: [],
    empleados,
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
  create(t, rec) { const r = { id: uid(), creado: hoy(), ...rec }; data[t].push(r); guardar(); return r; },
  update(t, id, cambios) { const r = data[t].find((x) => x.id === id); if (r) { Object.assign(r, cambios); guardar(); } return r; },
  remove(t, id) { data[t] = data[t].filter((x) => x.id !== id); guardar(); },
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

export function notificar(usuario_id, texto, enlace = '') {
  db.create('notificaciones', { usuario_id, texto, enlace, leida: false, fecha: new Date().toISOString() });
}
