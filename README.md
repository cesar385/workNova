# WorkNova · Suite de Talento

Sistema de gestión de RR.HH. que corre 100 % en el navegador, sin servidor ni Base44.
Se publica con GitHub Pages: la página de inicio (`/index.html`) lleva con "Iniciar sesión" a esta app (`/app/`).

## Secciones
**General:** Dashboard (gráficos, alertas, ausentes del día, cumpleaños y feriados) · Mi Portal (personal y de departamento) · Chat · Calendario · Asistencia (fichadas) · Organigrama
**Gestión de talento:** Empleados (ficha, recibos, exportar a Excel, liquidar el mes) · Reclutamiento (tablero arrastrable) · Permisos · Evaluaciones · Objetivos · Capacitación · Documentos · Aprobaciones · Sucesión
**Administración:** Reportes (indicadores y exportaciones) · Empresa (datos y respaldo) · Usuarios y roles · Historial de cambios

## Novedades v2
- Roles: Administrador, Recursos Humanos, Jefe de área y Empleado.
- Restablecer contraseñas con clave temporal y cierre de sesión tras 30 min sin actividad.
- Historial de cambios: quién creó, modificó o eliminó cada registro.
- Modo oscuro y buscador global (Ctrl + K).
- Asistencia con reloj de fichada, carga manual y exportación mensual.
- Calendario con feriados nacionales 2026 (editables), ausencias, cumpleaños y capacitaciones.
- Recibos con aportes automáticos (Jubilación 11 %, Ley 19.032 3 %, Obra social 3 %, cuota sindical opcional). Es una liquidación simplificada: no reemplaza a un sistema de sueldos ni el asesoramiento contable.
- Exportación a Excel (CSV) de empleados, permisos, evaluaciones, recibos, candidatos, capacitaciones, asistencia e historial.

## Cómo funciona
- **Primer uso:** la primera cuenta que se crea en un navegador es la del administrador. Las siguientes quedan pendientes hasta que el administrador las aprueba en "Aprobación Usuarios".
- **Roles:** Administrador (todo), Recursos Humanos (toda la gestión salvo usuarios e historial), Jefe de área (además del portal personal, el Portal Departamento y la asistencia de su área) y Empleado. Quien tiene un puesto de Director/Gerente/Jefe/Coordinador también ve el Portal Departamento.
- **Datos:** se guardan en el `localStorage` del navegador. Cada computadora/navegador tiene su propia base. Para pasar datos de una a otra, o como copia de seguridad: Empresa → Respaldo de datos → Descargar / Restaurar.
- **Límites:** al no haber servidor, el chat y las aprobaciones sólo se comparten entre usuarios que entran en el mismo navegador, y los archivos subidos tienen un máximo de 2 MB.

## Archivos
- `index.html` — punto de entrada
- `app.js` — sesión, menú, acceso y utilidades
- `views.js` — todas las secciones
- `db.js` — datos locales y datos de ejemplo
- `styles.css` — estilos
- `vendor/lucide.min.js` — íconos
