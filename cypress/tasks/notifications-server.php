<?php
// Start only with php -S 127.0.0.1:8010 -t <app>/public <this-file>.
require __DIR__ . '/notifications-bootstrap.php';
try {
    $token = getenv('E2E_SERVER_TOKEN') ?: '';
    $requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if ($requestPath === '/__notifications_e2e/check'
        && (strlen($token) < 32 || !hash_equals($token, $_SERVER['HTTP_X_E2E_TOKEN'] ?? ''))) {
        http_response_code(403);
        exit;
    }
    [$app, $connection, $state] = e2eBootstrap();
    if ($requestPath === '/__notifications_e2e/check') {
        $challenge = $_GET['challenge'] ?? '';
        if (!is_string($challenge) || !preg_match('/^[a-f0-9]{48}$/D', $challenge)) {
            throw new RuntimeException('Invalid challenge.');
        }
        // Ping is read-only; it neither creates collections nor inserts documents.
        $connection->getDatabase()->command(['ping' => 1])->toArray();
        $payload = json_encode($state + ['challenge' => $challenge, 'time' => time()], JSON_THROW_ON_ERROR);
        header('Content-Type: application/json');
        header('Cache-Control: no-store');
        echo json_encode(['payload' => $payload,
            'signature' => hash_hmac('sha256', $payload, $token)], JSON_THROW_ON_ERROR);
        exit;
    }
    $public = realpath($app->publicPath());
    $file = realpath($public . '/' . rawurldecode($requestPath ?: '/'));
    if ($file && str_starts_with($file, $public . DIRECTORY_SEPARATOR)
        && is_file($file) && strtolower(pathinfo($file, PATHINFO_EXTENSION)) !== 'php') {
        return false;
    }
    // The same bootstrapped, verified application handles actual Cypress requests.
    $app->handleRequest(Illuminate\Http\Request::capture());
} catch (Throwable $error) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo '{"ok":false,"error":"Isolated server safety check failed."}';
}
