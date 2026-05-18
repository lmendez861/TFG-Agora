<?php

declare(strict_types=1);

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$requestPath = is_string($requestPath) && $requestPath !== '' ? urldecode($requestPath) : '/';
$target = __DIR__ . DIRECTORY_SEPARATOR . ltrim($requestPath, '/');

if ($requestPath !== '/' && is_file($target)) {
    return false;
}

require __DIR__ . '/index.php';
