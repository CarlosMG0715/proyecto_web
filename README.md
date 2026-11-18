# Kordia · hábitos en equipo

Versión de estudio: conserva el arte de Kordia y reduce las funciones a acceso, perfil y grupos.

## Arrancar

1. PostgreSQL debe estar encendido. Configura `backend/.env` usando `.env.example`.
2. En `backend`: `npm ci`, `npm run db:deploy`, `npm run db:generate`, `npm run dev`.
3. En otra terminal, dentro de `frontend`: `npm ci`, `npm run dev`.
4. Abre la dirección que muestra Vite (normalmente http://localhost:5173).

No necesitas Docker. El frontend usa `/api`; Vite lo redirige al backend en el puerto 3000.

## Qué hace

- Registro con apodo, correo y contraseña hasheada; login, logout, cambio de apodo/contraseña y borrado de cuenta.
- Perfil con los personajes y temas originales. Mis grupos debajo.
- Grupos con nombre, color y código generado en el servidor. Entrada directa con código.
- Hábitos compartidos: nombre, descripción e insignia; el primer hábito es obligatorio al crear el grupo. Un check por persona/hábito/día, con mensaje opcional sobre el personaje.
- Chat sincronizado con Socket.IO y avisos de creación de hábitos.
- Racha grupal y gráfico de compromiso personal en el perfil: últimos siete días y constancia de treinta días.
- Si falta un hábito al cerrar el día, cae el personaje responsable y el equipo pierde la racha. El administrador puede revivir o expulsar a integrantes caídos. Si cae todo el grupo, el administrador puede reiniciar la aventura. No hay vidas.

## Dónde está cada cosa

| Necesito cambiar… | Archivo o carpeta |
|---|---|
| Las pantallas | frontend/src/views |
| Una pieza visual | frontend/src/components |
| Dibujos y estilos | frontend/src/assets |
| Llamadas HTTP y Axios | frontend/src/services |
| Estado compartido (Pinia) | frontend/src/stores |
| Rutas y navigation guard | frontend/src/router/rutas.ts |
| Proxy y compilación | frontend/vite.config.ts |
| URLs de la API | backend/src/routes |
| Campos permitidos y límites | backend/src/validators |
| Tokens y permisos de acceso | backend/src/middleware/verificarSesion.js |
| Entrada y respuesta HTTP | backend/src/controllers |
| Reglas de negocio | backend/src/services |
| Consultas de grupos y transacciones | backend/src/repositories/repositorioGrupos.js |
| Tablas y relaciones | backend/prisma/schema.prisma |
| Cambios históricos de tablas | backend/prisma/migrations |
| Cierre automático diario | backend/src/jobs/cierreDiario.js |
| Penalizaciones y deserción | backend/src/services/servicioCierreDiario.js |
| Comunicación en tiempo real | backend/src/tiempoReal.js |

## Flujo para el parcial: agregar o cambiar un campo

Ejemplo: el nombre de un hábito debe tener entre 12 y 18 caracteres.

1. `frontend/src/components/group/HabitosGrupo.vue`: `minlength="12" maxlength="18"` en el input. El usuario ve el límite.
2. `frontend/src/services/servicioGrupos.ts`: envía `{ name, description, insignia }` a la API.
3. `backend/src/routes/rutasGrupo.js`: encuentra POST/PATCH de hábitos y su validador.
4. `backend/src/validators/validadoresGrupo.js`: cambia el campo del hábito a `z.string().trim().min(12).max(18)`. El backend siempre valida, aunque alguien evite el formulario.
5. `backend/src/controllers/controladorGrupo.js`: recibe la petición validada y llama al servicio.
6. `backend/src/services/servicioGrupos.js`: comprueba que seas administrador y aplica la regla.
7. `backend/src/repositories/repositorioGrupos.js`: abre la transacción y obtiene el grupo; Prisma guarda el cambio.
8. El frontend vuelve a consultar el grupo y Pinia actualiza la pantalla.

Si es un campo NUEVO, agrégalo también en `frontend/src/types/grupo.ts`, el formulario, el payload, Zod, el servicio y `schema.prisma`. Luego, desde backend, ejecuta `npm run db:migrate -- --name nombre_del_cambio`.

Para BORRAR un campo, recorre el mismo camino y elimina sus referencias antes de crear la migración.

## Reglas que conviene entender

- El access token vive en Pinia, en memoria. El refresh vive en una cookie HttpOnly y rota al renovar.
- Un usuario solo consulta/modifica grupos a los que pertenece. Solo administradores editan grupo y hábitos.
- El cierre consulta la zona horaria del grupo. Se revisa cada minuto y recupera fechas pendientes al arrancar.
- La combinación grupo/fecha hace que un cierre no se aplique dos veces. Las penalizaciones se guardan en esa misma transacción.
- Socket.IO avisa que cambió un grupo. Los datos se vuelven a pedir a la API, que comprueba los permisos actuales.
- Las migraciones antiguas se conservan porque la base ya las aplicó. La última elimina las tablas de funciones retiradas.

## Comprobar

Backend: `npm test`. Frontend: `npm test` y `npm run build`.

## Lectura rápida de nombres

Las acciones de grupos están en español en el cliente y en el controlador: `crearGrupo`, `guardarHabito`, `marcarHabito`, `enviarMensaje` y `eliminarGrupo`.

Los nombres de bibliotecas y campos existentes se conservan para no cambiar las tablas sin necesidad:

| Nombre | Qué significa |
|---|---|
| `req.body` | Campos que envía el formulario |
| `req.params` | Identificadores que vienen en la URL |
| `req.user.idUsuario` | Usuario autenticado; no se toma del formulario |
| `res.json(...)` | Datos que el backend devuelve al frontend |
| `idGrupo` / `idHabito` | Identificador del grupo / del hábito |
| `name` / `description` | Nombre / descripción |
| `completed` | Si se marcó o desmarcó el hábito |
| `membresias` | Integrantes de un grupo |
| `caidoEn` | Cuándo cayó el personaje; `null` significa que está vivo |
| `ref` / `computed` | Dato que cambia / dato calculado en Vue |
| `watch` | Reacciona cuando cambia un dato |
| `async` / `await` | Espera una petición o consulta sin bloquear toda la aplicación |

Prueba de integración opcional en PowerShell, desde backend:

```powershell
$env:KORDIA_INTEGRATION = '1'
npm test
Remove-Item Env:KORDIA_INTEGRATION
```

Esta prueba usa cuentas temporales y elimina sus datos al finalizar. Comprueba registro, permisos, chat, cierres diarios, penalizaciones, revocación de sesiones y borrado de cuenta.

## Leer el esquema de Prisma

- `model Usuario` describe un usuario. `@@map("users")` indica que su tabla en PostgreSQL se llama `users`.
- `hashContrasena String @map("passwordHash")` define un texto que Prisma expone en espanol y que PostgreSQL guarda en la columna existente.
- `?` significa que el valor puede faltar y `[]` representa una lista.
- `@relation` conecta modelos. `fields` indica el campo local y `references` indica el campo al que apunta.
- `@id` marca la clave primaria, `@unique` exige valores unicos y `@@index` crea un indice.
- `where` filtra, `data` indica que guardar, `select` elige campos e `include` trae relaciones. Son opciones de Prisma.

### Historial de migraciones de Prisma

Las carpetas de migraciones y sus archivos SQL conservan los nombres originales.
Prisma usa el nombre de la carpeta y el contenido del SQL para comparar el historial
con la tabla de migraciones de PostgreSQL. Los cambios de nombres del código se
expresan con @map en el esquema y no requieren una migración de datos.

Ejemplos de nombres que aparecen en el historial:
- simplify_kordia: simplificación de Kordia.
- group_expulsions: expulsiones de grupos.
- daily_check_report: informe de cumplimiento diario.
- group_target_days y habit_target_days: días de meta de grupos y hábitos.
- add_sessions: creación de sesiones.
## Recorrido para entender la version simplificada

Empieza por una accion concreta y sigue sus llamadas. Las carpetas mantienen las responsabilidades del proyecto original; los archivos de esta version usan nombres en español.

### Ejemplo: registrar los habitos del dia

1. `frontend/src/views/app/VistaGrupo.vue` muestra el grupo y coloca `HabitosGrupo.vue` y `ChatGrupo.vue`.
2. `frontend/src/components/group/HabitosGrupo.vue` recoge los habitos seleccionados y el mensaje.
3. `frontend/src/services/servicioGrupos.ts` envia la peticion con Axios, configurado en `clienteHttp.ts`.
4. `backend/src/routes/rutasGrupo.js` conecta POST `/groups/:idGrupo/check` con el validador y el controlador.
5. `backend/src/middleware/verificarSesion.js` identifica al usuario; `validators/validadoresGrupo.js` revisa los campos enviados.
6. `backend/src/controllers/controladorGrupo.js` recibe los datos y llama a `registrarCheckGrupal`.
7. `backend/src/services/servicioGrupos.js` comprueba permisos y habitos, y guarda los registros dentro de la transaccion del repositorio.
8. `backend/prisma/schema.prisma` define los modelos; `conexionBaseDatos.js` proporciona el cliente Prisma.
9. El controlador avisa por Socket.IO. `usarGrupoEnTiempoReal.ts` vuelve a cargar el grupo y `stores/grupos.ts` actualiza lo visible.

### Donde cambiar el diseño

- `views`: pantallas y distribucion general
- `components/group`: tarjetas, formularios, habitos y chat
- `components/profile`: configuracion de cuenta y compromiso personal
- `assets/styles/components`: estilos de cada pantalla o componente; algunos componentes tambien tienen estilos locales
- `constants/bannersGrupos.ts`: colores y banners de los grupos
- `constants/fondosTemas.ts` y `stores/personajes.ts`: fondos y personalizacion del usuario

El fondo de los personajes depende del tema personal. Los encabezados, tarjetas y chat dependen del tema del grupo.

### Reglas para mantener el orden

- Una ruta conecta una URL con su controlador y validador
- Un controlador recibe la peticion y devuelve la respuesta
- Un servicio aplica permisos y reglas; puede consultar Prisma directamente o usar el repositorio para operaciones compartidas
- El repositorio centraliza la carga y las transacciones de grupos
- Un componente recoge datos y muestra resultados; las peticiones HTTP se escriben en services
- Las migraciones aplicadas se conservan: no se borran ni renombran para limpiar el proyecto

Solicitudes de ingreso todavia no esta implementado en esta version: el codigo de invitacion permite entrar directamente.
