<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Router;

// Store sessions in the bind-mounted api directory so they survive container restarts
$sessionDir = __DIR__ . '/../storage/sessions';
if (!is_dir($sessionDir)) {
    mkdir($sessionDir, 0700, true);
}
session_save_path($sessionDir);

$thirtyDays = 60 * 60 * 24 * 30;
ini_set('session.gc_maxlifetime', (string) $thirtyDays);

// Configure session cookie before session_start
session_set_cookie_params([
    'lifetime' => $thirtyDays,
    'path'     => '/',
    'secure'   => false,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

$router = new Router();
$router->dispatch();
