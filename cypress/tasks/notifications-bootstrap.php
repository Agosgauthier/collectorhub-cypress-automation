<?php
// Shared bootstrap for the CLI helper and the isolated HTTP entry point.
function e2eBootstrap(): array
{
    $root = realpath(getenv('E2E_APP_PATH') ?: '');
    $uri = getenv('E2E_MONGODB_URI');
    $token = getenv('E2E_SERVER_TOKEN');
    if (!$root || !$uri || !$token || strlen($token) < 32) {
        throw new RuntimeException('Missing explicit E2E environment.');
    }
    if (is_file($root . '/bootstrap/cache/config.php')) {
        throw new RuntimeException('Cached Laravel configuration is not allowed.');
    }
    // Do not edit or rely on the ordinary .env connection settings.
    foreach ([
        'APP_ENV' => 'testing', 'APP_DEBUG' => 'false',
        'DB_CONNECTION' => 'mongodb', 'MONGODB_DATABASE' => 'coleccionistas_e2e',
        'MONGODB_URI' => $uri, 'SESSION_DRIVER' => 'file', 'CACHE_STORE' => 'file',
        'BROADCAST_CONNECTION' => 'null', 'MAIL_MAILER' => 'log',
        'APP_CONFIG_CACHE' => $root . '/bootstrap/cache/config.php',
    ] as $key => $value) {
        putenv($key . '=' . $value);
        $_ENV[$key] = $_SERVER[$key] = $value;
    }
    if (!defined('LARAVEL_START')) define('LARAVEL_START', microtime(true));
    require $root . '/vendor/autoload.php';
    $app = require $root . '/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $connection = $app->make('db')->connection('mongodb');
    $database = $connection->getDatabase()->getDatabaseName();
    if ($app->configurationIsCached() || config('database.default') !== 'mongodb'
        || config('database.connections.mongodb.database') !== 'coleccionistas_e2e'
        || $database !== 'coleccionistas_e2e'
        || config('database.connections.mongodb.dsn') !== $uri) {
        throw new RuntimeException('Effective database configuration is not isolated.');
    }
    foreach ([new App\Models\User(), new App\Models\Notification()] as $model) {
        if ($model->getConnectionName() !== 'mongodb'
            || $model->getConnection()->getDatabase()->getDatabaseName() !== 'coleccionistas_e2e') {
            throw new RuntimeException('A model is connected to an unexpected database.');
        }
    }
    return [$app, $connection, [
        'database' => $database,
        'identity' => hash_hmac('sha256', $root . "\n" . $uri . "\n" . $database, $token),
    ]];
}

function e2eVerifyProof(array $input, array $state): void
{
    $proof = $input['proof'] ?? [];
    $payload = $proof['payload'] ?? '';
    $signature = $proof['signature'] ?? '';
    if (!is_string($payload) || !is_string($signature)
        || !hash_equals(hash_hmac('sha256', $payload, getenv('E2E_SERVER_TOKEN')), $signature)) {
        throw new RuntimeException('Missing or invalid server proof.');
    }
    $server = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
    if (($server['database'] ?? '') !== $state['database']
        || !hash_equals($state['identity'], $server['identity'] ?? '')
        || !is_int($server['time'] ?? null) || abs(time() - $server['time']) > 30) {
        throw new RuntimeException('Server and CLI do not attest the same isolated environment.');
    }
}
