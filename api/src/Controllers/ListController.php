<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;

class ListController
{
    public function index(array $vars, ?int $userId): void
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT l.*,
                    EXISTS(SELECT 1 FROM list_shares ls WHERE ls.list_id = l.id) AS is_shared
             FROM lists l
             WHERE l.user_id = ? AND l.roadtrip_id IS NULL
             ORDER BY l.updated_at DESC'
        );
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['is_shared'] = (bool) $row['is_shared'];
        }
        Response::json($rows);
    }

    public function store(array $vars, ?int $userId): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($body['name'] ?? '');

        if (empty($name)) {
            Response::error('name is required');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('INSERT INTO lists (user_id, name) VALUES (?, ?)');
        $stmt->execute([$userId, $name]);
        $id = (int) $pdo->lastInsertId();

        $stmt = $pdo->prepare('SELECT * FROM lists WHERE id = ?');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    public function show(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];
        $list   = $this->getAccessibleList($listId, $userId);

        if (!$list) {
            Response::notFound('List not found');
            return;
        }

        Response::json($list);
    }

    public function update(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];
        $list   = $this->getOwnedList($listId, $userId);

        if (!$list) {
            Response::notFound('List not found or access denied');
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($body['name'] ?? '');

        if (empty($name)) {
            Response::error('name is required');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('UPDATE lists SET name = ? WHERE id = ?');
        $stmt->execute([$name, $listId]);

        $stmt = $pdo->prepare('SELECT * FROM lists WHERE id = ?');
        $stmt->execute([$listId]);
        Response::json($stmt->fetch());
    }

    public function destroy(array $vars, ?int $userId): void
    {
        $listId = (int) $vars['id'];
        $list   = $this->getOwnedList($listId, $userId);

        if (!$list) {
            Response::notFound('List not found or access denied');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('DELETE FROM lists WHERE id = ?');
        $stmt->execute([$listId]);

        Response::json(['message' => 'List deleted']);
    }

    public function sharedWithMe(array $vars, ?int $userId): void
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT l.*, ls.permission, u.name AS owner_name
             FROM lists l
             JOIN list_shares ls ON ls.list_id = l.id
             JOIN users u ON u.id = l.user_id
             WHERE ls.shared_with_user_id = ?
             ORDER BY l.updated_at DESC'
        );
        $stmt->execute([$userId]);
        Response::json($stmt->fetchAll());
    }

    // Helpers

    public function getAccessibleList(int $listId, int $userId): array|false
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT l.*, ls.permission
             FROM lists l
             LEFT JOIN list_shares ls ON ls.list_id = l.id AND ls.shared_with_user_id = ?
             WHERE l.id = ? AND (l.user_id = ? OR ls.shared_with_user_id = ?)'
        );
        $stmt->execute([$userId, $listId, $userId, $userId]);
        $row = $stmt->fetch();
        if ($row) return $row;

        // Try roadtrip membership
        $stmt = $pdo->prepare(
            'SELECT l.* FROM lists l
             WHERE l.id = ? AND l.roadtrip_id IS NOT NULL
             AND (
               EXISTS(SELECT 1 FROM roadtrip_members rm WHERE rm.roadtrip_id = l.roadtrip_id AND rm.user_id = ?)
               OR EXISTS(SELECT 1 FROM roadtrips r WHERE r.id = l.roadtrip_id AND r.owner_id = ?)
             )'
        );
        $stmt->execute([$listId, $userId, $userId]);
        $row = $stmt->fetch();
        if ($row) { $row['permission'] = 'edit'; return $row; }
        return false;
    }

    public function getOwnedList(int $listId, int $userId): array|false
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM lists WHERE id = ? AND user_id = ?');
        $stmt->execute([$listId, $userId]);
        return $stmt->fetch();
    }
}
