# collectorhub-cypress-automation

Tests automatizados (Cypress + Page Object Model) de CollectorHub.

## Cómo ejecutar los tests

### Prerrequisitos
- Node.js 18 o superior
- PHP 8.2+, Composer, pnpm y MongoDB (para levantar la app)
- Repo de la app: https://github.com/SoftwareTercero2026/grupo3

### 1. Levantar la app (en otra carpeta)
Seguir el README del repo `grupo3`. Resumen, desde la carpeta `Proyecto`:
1. `composer install` y `pnpm install`
2. `cp .env.example .env` y `php artisan key:generate`
3. Con MongoDB corriendo: `php artisan db:seed`
   (crea el usuario demo@collectorhub.com / password)
4. `php artisan storage:link`
5. Terminal 1: `php artisan serve` (queda en http://127.0.0.1:8000)
6. Terminal 2: `pnpm run dev`

### 2. Instalar dependencias de los tests
npm install

### 3. Ejecutar las pruebas
npm test

Modo visual (opcional): npx cypress open

## Autores
| POM            | Autor          |
|----------------|----------------|
| LoginPage      | Agostina       |
| FeedPage       | Agostina       |
| CreatePostPage | Agostina       |
| (-------)      | (-------)      |