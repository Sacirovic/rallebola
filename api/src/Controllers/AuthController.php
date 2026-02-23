<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;

class AuthController
{
    public function register(array $vars, ?int $userId): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $name     = trim($body['name'] ?? '');
        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if (empty($name) || empty($email) || empty($password)) {
            Response::error('name, email and password are required');
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email address');
            return;
        }

        if (strlen($password) < 8) {
            Response::error('Password must be at least 8 characters');
            return;
        }

        $pdo = Database::getInstance();

        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            Response::error('Email already registered', 409);
            return;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
        $stmt->execute([$name, $email, $hash]);
        $newId = (int) $pdo->lastInsertId();

        $_SESSION['user_id'] = $newId;

        $user = ['id' => $newId, 'name' => $name, 'email' => $email];
        Response::json(['user' => $user], 201);
    }

    public function login(array $vars, ?int $userId): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if (empty($email) || empty($password)) {
            Response::error('email and password are required');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Invalid credentials', 401);
            return;
        }

        $_SESSION['user_id'] = (int) $user['id'];

        Response::json([
            'user' => [
                'id'    => (int) $user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
            ],
        ]);
    }

    public function logout(array $vars, ?int $userId): void
    {
        session_destroy();
        Response::json(['message' => 'Logged out']);
    }

    public function me(array $vars, ?int $userId): void
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('User not found', 404);
            return;
        }

        Response::json(['user' => $user]);
    }
}
