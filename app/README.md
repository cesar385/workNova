# WorkNova · Suite de Talento

Sistema de gestión de RR.HH. que corre 100 % en el navegador, sin servidor ni Base44.
Se publica con GitHub Pages: la página de inicio (`/index.html`) lleva con "Iniciar sesión" a esta app (`/app/`).

## Secciones
Dashboard · Mi Portal (personal y de departamento) · Chat · Empleados (con ficha y recibos) · Reclutamiento (tablero arrastrable) ·
Permisos · Evaluaciones · Objetivos · Capacitación · Documentos · Aprobaciones · Sucesión · Empresa · Aprobación de Usuarios.

## Cómo funciona
- **Primer uso:** la primera cuenta que se crea en un navegador es la del administrador. Las siguientes quedan pendientes hasta que el administrador las aprueba en "Aprobación Usuarios".
- **Roles:** administrador (ve todo) y empleado (Mi Portal, Chat, Capacitación, Documentos, Empresa). Quien tiene un puesto de Director/Gerente/Jefe/Coordinador ve además el Portal Departamento de su área.
- **Datos:** se guardan en el `localStorage` del navegador. Cada computadora/navegador tiene su propia base. Para pasar datos de una a otra, o como copia de seguridad: Empresa → Respaldo de datos → Descargar / Restaurar.
- **Límites:** al no haber servidor, el chat y las aprobaciones sólo se comparten entre usuarios que entran en el mismo navegador, y los archivos subidos tienen un máximo de 2 MB.

## Archivos
- `index.html` — punto de entrada
- `app.js` — sesión, menú, acceso y utilidades
- `views.js` — todas las secciones
- `db.js` — datos locales y datos de ejemplo
- `styles.css` — estilos
- `vendor/lucide.min.js` — íconos
