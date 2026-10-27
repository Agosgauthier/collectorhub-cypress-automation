
# collectorhub-cypress-automation

Tests automatizados (Cypress + Page Object Model) de CollectorHub.

## Cómo ejecutar los tests

### Prerrequisitos

- Node.js 18 o superior
- PHP 8.2+, Composer, pnpm y MongoDB (para levantar la app)
- Repo de la app: https://github.com/SoftwareTercero2026/grupo3 (usar la rama `develop`, que tiene los `data-testid` que usan los tests)

### 1. Levantar la app (en otra carpeta)

Seguir el README del repo `grupo3`. Resumen, desde la carpeta `Proyecto`:

1. `composer install` y `pnpm install`
2. `cp .env.example .env` y `php artisan key:generate`
3. En el `.env`, dejar `CACHE_STORE=file` (con `database` falla el login con contraseña incorrecta) y `MAIL_MAILER=log`. Después correr `php artisan config:clear`
4. Con MongoDB corriendo: `php artisan db:seed`
   (crea el usuario demo@collectorhub.com / password)
5. `php artisan storage:link`
6. Terminal 1: `php artisan serve` (queda en http://127.0.0.1:8000)
7. Terminal 2: `pnpm run dev`

### 2. Instalar dependencias de los tests

npm install

### 3. Ejecutar las pruebas

npm test

Modo visual (opcional): npx cypress open

### Pruebas de Notificaciones (PowerShell)

Desde la raíz del repositorio, ejecutar:

```powershell
.\scripts\notifications-e2e.ps1 -Mode Run
```

Estas pruebas utilizan una base MongoDB aislada llamada `coleccionistas_e2e`. Requieren PHP, Node.js, MongoDB y las dependencias del proyecto disponibles, y preparan y limpian sus propios datos de prueba.

Consultar [docs/notifications-testing.md](docs/notifications-testing.md) para conocer los requisitos y procedimientos detallados.

## Autores

| POM                | Autor    |
| ------------------ | -------- |
| LoginPage          | Agostina |
| FeedPage           | Agostina |
| CreatePostPage     | Agostina |
| RegisterPage       | Olaf     |
| ProfilePage        | Olaf     |
| EditProfilePage    | Olaf     |
| ForgotPasswordPage | Olaf     |
| MarketplacePage    | Fabrizio |
| NotificationsPage  | Over Caivano |
