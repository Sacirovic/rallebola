<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;

class ItemController
{
    private function getListAccess(int $listId, int $userId): ?string
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT l.user_id, ls.permission
             FROM lists l
             LEFT JOIN list_shares ls ON ls.list_id = l.id AND ls.shared_with_user_id = ?
             WHERE l.id = ?'
        );
        $stmt->execute([$userId, $listId]);
        $row = $stmt->fetch();

        if (!$row) {
            return null; // list doesn't exist
        }

        if ((int) $row['user_id'] === $userId) {
            return 'owner';
        }

        if ($row['permission'] !== null) {
            return $row['permission']; // 'view' or 'edit'
        }

        return null; // no access
    }

    public function index(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];
        $access = $this->getListAccess($listId, $userId);

        if ($access === null) {
            Response::notFound('List not found or access denied');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM items WHERE list_id = ? ORDER BY created_at ASC');
        $stmt->execute([$listId]);
        Response::json($stmt->fetchAll());
    }

    public function store(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];
        $access = $this->getListAccess($listId, $userId);

        if ($access === null) {
            Response::notFound('List not found or access denied');
            return;
        }

        if ($access === 'view') {
            Response::forbidden('Read-only access');
            return;
        }

        $body     = json_decode(file_get_contents('php://input'), true) ?? [];
        $name     = trim($body['name'] ?? '');
        $quantity = (int) ($body['quantity'] ?? 1);
        $notes    = $body['notes'] ?? null;

        if (empty($name)) {
            Response::error('name is required');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('INSERT INTO items (list_id, name, quantity, notes) VALUES (?, ?, ?, ?)');
        $stmt->execute([$listId, $name, max(1, $quantity), $notes]);
        $id = (int) $pdo->lastInsertId();

        $stmt = $pdo->prepare('SELECT * FROM items WHERE id = ?');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    public function update(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];
        $itemId = (int) $vars['itemId'];
        $access = $this->getListAccess($listId, $userId);

        if ($access === null) {
            Response::notFound('List not found or access denied');
            return;
        }

        if ($access === 'view') {
            Response::forbidden('Read-only access');
            return;
        }

        // Verify item belongs to list
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM items WHERE id = ? AND list_id = ?');
        $stmt->execute([$itemId, $listId]);
        if (!$stmt->fetch()) {
            Response::notFound('Item not found');
            return;
        }

        $body     = json_decode(file_get_contents('php://input'), true) ?? [];
        $name     = trim($body['name'] ?? '');
        $quantity = isset($body['quantity']) ? (int) $body['quantity'] : null;
        $notes    = array_key_exists('notes', $body) ? $body['notes'] : null;

        $fields = [];
        $params = [];

        if ($name !== '') {
            $fields[] = 'name = ?';
            $params[]  = $name;
        }
        if ($quantity !== null) {
            $fields[] = 'quantity = ?';
            $params[]  = max(1, $quantity);
        }
        if (array_key_exists('notes', $body)) {
            $fields[] = 'notes = ?';
            $params[]  = $body['notes'];
        }

        if (empty($fields)) {
            Response::error('Nothing to update');
            return;
        }

        $params[] = $itemId;
        $sql      = 'UPDATE items SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $pdo->prepare($sql)->execute($params);

        $stmt = $pdo->prepare('SELECT * FROM items WHERE id = ?');
        $stmt->execute([$itemId]);
        Response::json($stmt->fetch());
    }

    public function destroy(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];
        $itemId = (int) $vars['itemId'];
        $access = $this->getListAccess($listId, $userId);

        if ($access === null) {
            Response::notFound('List not found or access denied');
            return;
        }

        if ($access === 'view') {
            Response::forbidden('Read-only access');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT id FROM items WHERE id = ? AND list_id = ?');
        $stmt->execute([$itemId, $listId]);
        if (!$stmt->fetch()) {
            Response::notFound('Item not found');
            return;
        }

        $pdo->prepare('DELETE FROM items WHERE id = ?')->execute([$itemId]);
        Response::json(['message' => 'Item deleted']);
    }
}
