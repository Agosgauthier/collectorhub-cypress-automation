# Notificaciones: suite E2E con datos reales

Todos los archivos de infraestructura pertenecen a collectorhub-cypress-automation. No se modifica grupo3 ni su .env, no se requieren nuevas dependencias y no se ejecutan migraciones o seeders.

## Arranque automatico (PowerShell)

Desde la raiz de collectorhub-cypress-automation:

```powershell
# Solo verifica servidor y MongoDB. No crea ni elimina datos.
.\scripts\notifications-e2e.ps1 -Mode Check
```

Cuando se decida ejecutar las pruebas con escrituras sobre la base aislada:

```powershell
# Ejecuta exclusivamente notifications.cy.js y limpia sus datos.
.\scripts\notifications-e2e.ps1 -Mode Run

# Runner visual limitado al mismo spec; cerrar Cypress para finalizar el script.
.\scripts\notifications-e2e.ps1 -Mode Open
```

Run y Open habilitan explicitamente E2E_ALLOW_WRITES=YES despues de que la comprobacion de solo lectura termine correctamente. No ejecutar estos dos modos mientras se requieran solamente validaciones estaticas. Check mantiene las escrituras deshabilitadas incluso si estaban habilitadas previamente en la terminal.

Parametros opcionales, sin copiar tokens entre terminales:

```powershell
.\scripts\notifications-e2e.ps1 -Mode Check -AppPath 'C:\Users\Over\Desktop\grupo3\Proyecto' -MongoUri 'mongodb://127.0.0.1:27017' -PhpBinary 'C:\xampp\php\php.exe'
```

El puerto 8010 debe estar libre. El script rechaza un puerto ocupado; no reutiliza ni detiene un servidor iniciado por otra persona o terminal. La ruta predeterminada de Laravel es ../grupo3/Proyecto respecto del repositorio, independientemente de la terminal actual.

El script genera un token privado de 256 bits mediante RandomNumberGenerator y lo transmite al servidor PHP y a Cypress por herencia de variables de entorno, sin imprimirlo ni incluirlo en argumentos. Inicia PHP en loopback 127.0.0.1:8010 con el router externo, comprueba la atestacion y, segun el modo, ejecuta solamente la suite de Notificaciones. Al terminar, detiene su propio proceso PHP y restaura las variables de entorno anteriores. Si falla la atestacion, no inicia Cypress ni prepara datos.

Se necesitan PHP con la extension MongoDB, Node 18+ con fetch, las dependencias existentes de Laravel y Cypress, y MongoDB accesible. Para las pruebas de navegador tambien deben estar disponibles Vite o los assets compilados habituales. El script no instala, compila ni inicia Vite. La base aislada no necesita usuario demo: los usuarios de cada caso se preparan automaticamente.

## Protecciones de aislamiento

- La configuracion de Laravel se establece en memoria: APP_ENV=testing, DB_CONNECTION=mongodb y MONGODB_DATABASE=coleccionistas_e2e.
- El script externo y el router comprueban la base efectiva de la conexion y de los modelos User y Notification. Se rechaza cualquier base diferente de coleccionistas_e2e.
- Se rechaza configuracion Laravel cacheada; no se borra ni modifica bootstrap/cache/config.php.
- Cada tarea de acceso a datos exige una atestacion HTTP firmada, con desafio aleatorio y vigencia de 30 segundos. La identidad incluye la ruta Laravel, la URI MongoDB y la base; el script PHP compara su conexion con la del servidor.
- El servidor habitual de artisan serve no pasa esa atestacion. El baseUrl por defecto de cypress.config.js sigue en 8000 para conservar otros specs; el launcher establece CYPRESS_BASE_URL=http://127.0.0.1:8010 para sus procesos.
- prepare y cleanup requieren adicionalmente E2E_ALLOW_WRITES=YES. No se expone ningun endpoint de escritura.
- Se recomienda una cuenta MongoDB autorizada exclusivamente para coleccionistas_e2e. La URI no se devuelve en la comprobacion ni se imprime.

La comprobacion Check debe devolver ok=true, database=coleccionistas_e2e, connection=mongodb, serverVerified=true, readOnly=true y writesEnabled=false. Usa ping de solo lectura; no inserta documentos ni crea colecciones. No valida assets del navegador.

## Escenarios y cobertura

Cada prueba y cada reintento recibe un contexto aleatorio nuevo de 32 caracteres hexadecimales, tres usuarios exclusivos y su propio dataset. Los emails siguen notifications-<context>-<role>@example.test y los usuarios contienen e2e_context. Las notificaciones contienen data.e2e_context y data.e2e_key.

Escenario empty: receptor principal sin notificaciones y otro usuario con una notificacion pendiente. Permite demostrar vacio e independencia entre usuarios.

Escenario mixed: receptor principal con FOLLOW pendiente, MESSAGE pendiente, MESSAGE leida y MARKETPLACE_MESSAGE pendiente. Son cuatro tarjetas, con contadores Todas (3), Mensajes (1) y Marketplace (1). Otro usuario conserva su propia FOLLOW pendiente.

Las seis pruebas comprueban:

1. Acceso autenticado, titulo y tres filtros.
2. Estado vacio en todos los filtros, sin mostrar datos del otro usuario.
3. Tarjetas leidas y pendientes, contadores y boton de lectura masiva.
4. Seleccion de cada filtro y contenido real, incluyendo mensajes leidos.
5. Lectura individual de FOLLOW, recarga y consulta de persistencia en MongoDB.
6. Lectura masiva desde Mensajes, recarga y consulta de todos los tipos; la notificacion del otro usuario sigue pendiente. Un contador cero no implica lista vacia.

Se conserva la cobertura inicial y se reutiliza LoginPage sin modificarlo. Todos los selectores y acciones de pantalla estan en NotificationsPage; las comprobaciones de UI, persistencia y limpieza estan en notifications.cy.js. No se usan esperas fijas en Cypress ni mocks de persistencia. La espera breve del launcher solo comprueba disponibilidad del puerto durante el arranque.

La preparacion usa modelos Laravel directamente sin NotificationService, para no depender de Reverb. No crea publicaciones ni conversaciones. Esta suite no prueba generacion por interacciones ni navegacion a chats/publicaciones.

## Preparacion, consulta y limpieza

Tareas disponibles:

- notifications:context: genera el identificador, lo registra en memoria y lo imprime como contexto de recuperacion, sin credenciales.
- notifications:check: atestacion del servidor y ping local de solo lectura.
- notifications:prepare({ context, scenario }): crea empty o mixed; falla si el contexto ya tiene usuarios, sin sobreescribirlos.
- notifications:inspect({ context }): consulta usuarios contados, IDs, tipos, estados y cantidad total de notificaciones etiquetadas.
- notifications:cleanup({ context }): elimina solo notificaciones etiquetadas y asociadas a usuarios propios, luego esos usuarios.

beforeEach verifica base/servidor/escrituras, obtiene contexto, prepara datos y autentica. afterEach limpia y comprueba remainingUsers=0 y remainingNotifications=0, y consulta de nuevo para comprobar userCount=0, taggedNotificationCount=0 y notifications=[]. Si falla una preparacion parcial, el contexto ya esta registrado para intentar recuperacion.

La limpieza no usa drop, truncate ni borrados completos. Si encuentra notificaciones ajenas que referencian usuarios propios, se detiene antes de eliminar esos usuarios. Repetir limpieza sobre un contexto ya limpio es seguro. after:spec reintenta los contextos registrados que no terminaron su limpieza; un fallo de respaldo falla la ejecucion y muestra los contextos pendientes. En modo visual se habilita experimentalInteractiveRunEvents para este respaldo.

No hay garantia de hooks tras un cierre forzado del proceso. Conservar los contextos mostrados como [notifications] Context for recovery hasta confirmar que todo termino limpio. Para recuperacion manual, iniciar nuevamente una instancia aislada con las mismas variables compartidas entre servidor y CLI (ver debajo); puede usarse un token privado nuevo, porque los registros se identifican por contexto y no por token. El launcher siempre apaga su servidor al salir.

### Recuperacion manual excepcional

En una terminal PowerShell desde la raiz de automatizacion:

```powershell
$env:E2E_APP_PATH = (Resolve-Path '..\grupo3\Proyecto').Path
$env:E2E_MONGODB_URI = 'mongodb://127.0.0.1:27017'
$env:E2E_SERVER_TOKEN = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:CYPRESS_BASE_URL = 'http://127.0.0.1:8010'
Remove-Item Env:E2E_ALLOW_WRITES -ErrorAction SilentlyContinue
```

Desde esa misma terminal iniciar el servidor con Start-Process (hereda el token, no requiere otra terminal):

```powershell
$publicPath = Join-Path $env:E2E_APP_PATH 'public'
$routerPath = (Resolve-Path 'cypress/tasks/notifications-server.php').Path
$serverArgs = @('-S', '127.0.0.1:8010', '-t', ('"' + $publicPath + '"'), ('"' + $routerPath + '"'))
$recoveryServer = Start-Process php -ArgumentList $serverArgs -WindowStyle Hidden -PassThru
```

Una vez disponible el servidor, sustituir CONTEXTO por el identificador exacto que quedo pendiente:

```powershell
node cypress/tasks/notificationsData.js check
node cypress/tasks/notificationsData.js inspect CONTEXTO

# Solo al autorizar eliminar esos registros propios:
$env:E2E_ALLOW_WRITES = 'YES'
node cypress/tasks/notificationsData.js cleanup CONTEXTO
Remove-Item Env:E2E_ALLOW_WRITES -ErrorAction SilentlyContinue
node cypress/tasks/notificationsData.js inspect CONTEXTO

# Al terminar, detener exclusivamente el proceso propio:
if (!$recoveryServer.HasExited) { Stop-Process -Id $recoveryServer.Id }
Remove-Item Env:E2E_SERVER_TOKEN -ErrorAction SilentlyContinue
```

No continuar si check falla. La consulta final debe devolver cero usuarios y notificaciones etiquetadas. El contexto no es una credencial y puede conservarse para diagnostico; no compartir tokens, URI con credenciales ni contrasenas.

## Validaciones estaticas

No inician el servidor ni conectan a MongoDB:

```powershell
node --check cypress/pages/NotificationsPage.js
node --check cypress/e2e/notifications.cy.js
node --check cypress/tasks/notificationsData.js
node --check cypress.config.js
php -l cypress/tasks/notifications-bootstrap.php
php -l cypress/tasks/notifications-server.php
php -l cypress/tasks/notifications-data.php
$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path 'scripts/notifications-e2e.ps1').Path, [ref]$tokens, [ref]$parseErrors) | Out-Null
$parseErrors
```

Al ejecutar Laravel normalmente pueden escribirse logs, sesiones y caches de runtime en storage de la aplicacion; no se cambia su codigo ni su .env. Para aislar tambien esos artefactos, usar una copia de ejecucion separada y pasarla mediante -AppPath.

## Inspeccion de los seis contextos pendientes (solo lectura)

Desde la raiz de automatizacion, ejecutar un unico comando:

```powershell
.\scripts\notifications-e2e.ps1 -Mode InspectPending
```

Reutiliza el arranque seguro del launcher: puerto 8010 libre, token privado nuevo, misma conexion para servidor y CLI y atestacion previa. Deshabilita E2E_ALLOW_WRITES incluso si estaba habilitado en la terminal. Solo ejecuta check e inspect; no inicia Cypress ni ejecuta prepare o cleanup. Al finalizar detiene exclusivamente su servidor y restaura el entorno.

Muestra una fila por cada uno de los seis contextos informados, sin usuarios completos, contrasenas, previews ni URI:

- Users: usuarios encontrados por email exacto esperado o marcador de contexto.
- OwnedUsers: usuarios que cumplen simultaneamente email exacto y contexto.
- Notifications: registros etiquetados o vinculados con esos usuarios; incluye candidatos ajenos para advertir conflictos.
- Tagged: notificaciones cuyo marcador superior o JSON decodificado coincide con el contexto.
- Eligible: notificaciones que ademas cumplen pertenencia, clave y tipo esperados.
- Conflicts: inconsistencias que bloquean cualquier limpieza futura.

Notifications no significa automaticamente registros autorizados para eliminar. Una limpieza futura exige que todos los candidatos sean elegibles y que no haya conflictos. Si un registro cambia entre la inspeccion y su eliminacion futura, la comparacion del documento impide eliminarlo bajo supuestos anteriores. Pueden existir eliminaciones parciales si aparece un cambio concurrente; no se promete una transaccion atomica de varias colecciones.

## Correccion del formato de data y compatibilidad

El modelo Notification convierte data en JSON serializado al guardar, aunque al acceder mediante Eloquent lo devuelve como array. Consultar unicamente data.e2e_context no encuentra esos strings. El inventario ahora lee BSON original, decodifica JSON y valida los marcadores en memoria; tambien admite subdocumentos y marcadores superiores. No modifica datos anteriores.

Las notificaciones nuevas conservan data para la interfaz y agregan e2e_context y e2e_key superiores como campos nativos. prepare comprueba inmediatamente su inventario: tres usuarios y una notificacion para empty, o cinco para mixed (cuatro principales mas una del otro usuario). inspect conserva el contrato usado por los specs: userCount, taggedNotificationCount y notifications.

La futura limpieza exige email exacto y contexto en cada usuario, contexto valido en cada notificacion (sin discrepancias entre marcadores), clave/tipo esperado y coincidencia exacta de emisor y receptor con los roles creados para ese contexto. Un registro relacionado sin pertenencia demostrada bloquea todo el preflight antes de borrar. Se eliminan documentos individualmente por ID y comparacion de campos de la instantanea; los usuarios solo por ID, email y contexto y tras comprobar que no quedan referencias. No se borran colecciones ni se reescriben los registros anteriores.

Los errores del helper usan codigos seguros (por ejemplo UNSAFE_RECORDS, RECORD_CHANGED o UNOWNED_REFERENCES) en lugar de exponer excepciones con posibles credenciales. Las validaciones realizadas para esta correccion son exclusivamente estaticas; no se ha ejecutado este modo de inspeccion ni operaciones de escritura.

## Limpieza confirmada de los seis contextos pendientes

Desde la raiz de automatizacion:

```powershell
.\scripts\notifications-e2e.ps1 -Mode CleanupPending
```

No se ejecuto este modo durante su implementacion. Para ejecutarlo, el puerto 8010 debe estar libre y MongoDB disponible en la conexion de pruebas configurada.

Inicia su propio servidor aislado con token privado nuevo, mantiene escrituras deshabilitadas y verifica el servidor y coleccionistas_e2e. Inspecciona TODOS los contextos antes de eliminar nada. Exige esta distribucion exacta de usuarios/notificaciones, en el orden del informe:

| Contexto | Usuarios propios | Notificaciones etiquetadas y elegibles |
| --- | ---: | ---: |
| 923e6af60641bc88153ab866bd765362 | 3 | 1 |
| d08dcbdd75a76c424752e0c2b18aa378 | 3 | 1 |
| 15c663fec51cdbc54830ddbe25ad2c02 | 3 | 1 |
| 68207c620c780761b8529f3013b9cc70 | 3 | 5 |
| 21ecc0f50018caf390f60d28ab820264 | 3 | 5 |
| a513d8da9a62fde68b8a7b124032d882 | 3 | 5 |

Cualquier conflicto, pertenencia ambigua, respuesta incompleta o conteo distinto detiene el proceso antes de solicitar confirmacion. Tambien comprueba los totales de 18 usuarios y 18 notificaciones.

La confirmacion exige escribir exactamente, respetando mayusculas:

```text
ELIMINAR 18 USUARIOS Y 18 NOTIFICACIONES EN coleccionistas_e2e
```

Cualquier otro texto cancela sin ejecutar cleanup. No hay opcion para omitir la confirmacion. Despues de confirmarla, reinspecciona los seis contextos con escrituras aun deshabilitadas y verifica que los IDs de notificaciones no cambiaron. Solo entonces habilita escrituras para llamar al CLI cleanup existente con cada contexto exacto. Cada llamada vuelve a verificar servidor/base y pertenencia mediante el helper PHP.

Antes de cada cleanup vuelve a comprobar los conteos de ese contexto. Tras limpiar los seis, deshabilita escrituras, reinspecciona todos y exige cero usuarios, cero notificaciones y cero conflictos. Comprueba tambien los totales efectivamente eliminados. No ejecuta Cypress, migraciones ni seeders y detiene exclusivamente el proceso PHP que inicio.

Si hay cambios concurrentes o errores durante una eliminacion, se detiene sin procesar mas contextos; puede haber limpieza parcial porque no se utiliza una transaccion multicontexto. En ese caso ejecutar InspectPending para conocer el estado. CleanupPending rechazara una nueva ejecucion si los conteos ya no coinciden con el inventario original; no se deben ajustar ni ignorar esos controles automaticamente.
