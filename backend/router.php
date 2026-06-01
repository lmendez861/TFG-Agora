<?php

declare(strict_types=1);

$publicDir = __DIR__ . '/public';
$frontController = $publicDir . '/index.php';
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$candidate = $publicDir . $requestPath;

if ($requestPath === '/legacy/monitor' || str_starts_with($requestPath, '/legacy/monitor/')) {
    header('Location: /app/', true, 302);
    return true;
}

if ($requestPath !== '/' && is_file($candidate)) {
    return false;
}

$_SERVER['SCRIPT_FILENAME'] = $frontController;
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require $frontController;
