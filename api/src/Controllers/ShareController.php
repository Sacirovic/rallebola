<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;

class ShareController
{
    private function getOwnedList(int $listId, int $userId): array|false
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM lists WHERE id = ? AND user_id = ?');
        $stmt->execute([$listId, $userId]);
        return $stmt->fetch();
    }

    public function index(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];

        if (!$this->getOwnedList($listId, $userId)) {
            Response::notFound('List not found or access denied');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT ls.id, ls.permission, ls.created_at, u.id AS user_id, u.name, u.email
             FROM list_shares ls
             JOIN users u ON u.id = ls.shared_with_user_id
             WHERE ls.list_id = ?
             ORDER BY ls.created_at ASC'
        );
        $stmt->execute([$listId]);
        Response::json($stmt->fetchAll());
    }

    public function store(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];

        if (!$this->getOwnedList($listId, $userId)) {
            Response::notFound('List not found or access denied');
            return;
        }

        $body       = json_decode(file_get_contents('php://input'), true) ?? [];
        $email      = trim($body['email'] ?? '');
        $permission = $body['permission'] ?? 'view';

        if (empty($email)) {
            Response::error('email is required');
            return;
        }

        if (!in_array($permission, ['view', 'edit'], true)) {
            Response::error('permission must be view or edit');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $target = $stmt->fetch();

        if (!$target) {
            Response::notFound('User not found');
            return;
        }

        $targetId = (int) $target['id'];

        if ($targetId === $userId) {
            Response::error('You cannot share a list with yourself');
            return;
        }

        // Upsert share
        $stmt = $pdo->prepare(
            'INSERT INTO list_shares (list_id, shared_with_user_id, permission)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE permission = VALUES(permission)'
        );
        $stmt->execute([$listId, $targetId, $permission]);

        $shareId = (int) $pdo->lastInsertId() ?: null;

        $stmt = $pdo->prepare(
            'SELECT ls.id, ls.permission, ls.created_at, u.id AS user_id, u.name, u.email
             FROM list_shares ls
             JOIN users u ON u.id = ls.shared_with_user_id
             WHERE ls.list_id = ? AND ls.shared_with_user_id = ?'
        );
        $stmt->execute([$listId, $targetId]);
        Response::json($stmt->fetch(), 201);
    }

    public function destroy(array $vars, ?int $userId): void
    {
        $listId  = (int) $vars['id'];
        $shareId = (int) $vars['shareId'];

        if (!$this->getOwnedList($listId, $userId)) {
            Response::notFound('List not found or access denied');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT id FROM list_shares WHERE id = ? AND list_id = ?');
        $stmt->execute([$shareId, $listId]);

        if (!$stmt->fetch()) {
            Response::notFound('Share not found');
            return;
        }

        $pdo->prepare('DELETE FROM list_shares WHERE id = ?')->execute([$shareId]);
        Response::json(['message' => 'Share removed']);
    }
}
