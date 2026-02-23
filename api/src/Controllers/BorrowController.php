<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;

class BorrowController
{
    public function store(array $vars, ?int $userId): void
    {
        $itemId = (int) $vars['itemId'];
        $pdo    = Database::getInstance();

        // Verify item exists and get list info
        $stmt = $pdo->prepare(
            'SELECT i.id, i.list_id, l.user_id AS owner_id,
                    ls.shared_with_user_id
             FROM items i
             JOIN lists l ON l.id = i.list_id
             LEFT JOIN list_shares ls ON ls.list_id = l.id AND ls.shared_with_user_id = ?
             WHERE i.id = ?'
        );
        $stmt->execute([$userId, $itemId]);
        $item = $stmt->fetch();

        if (!$item) {
            Response::notFound('Item not found');
            return;
        }

        // Must have access (either shared with them, or ... actually only non-owners can request)
        if ((int) $item['owner_id'] === $userId) {
            Response::error('You cannot borrow from your own list');
            return;
        }

        // Must have at least view access
        if ($item['shared_with_user_id'] === null) {
            Response::forbidden('No access to this item');
            return;
        }

        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $message = $body['message'] ?? null;

        $stmt = $pdo->prepare(
            'INSERT INTO borrow_requests (item_id, requester_id, message)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE message = VALUES(message), status = "pending", updated_at = NOW()'
        );
        $stmt->execute([$itemId, $userId, $message]);
        $id = (int) $pdo->lastInsertId();

        if ($id === 0) {
            // Was an update — fetch existing
            $stmt = $pdo->prepare('SELECT * FROM borrow_requests WHERE item_id = ? AND requester_id = ?');
            $stmt->execute([$itemId, $userId]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM borrow_requests WHERE id = ?');
            $stmt->execute([$id]);
        }

        Response::json($stmt->fetch(), 201);
    }

    public function incoming(array $vars, ?int $userId): void
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT br.*, i.name AS item_name, l.id AS list_id, l.name AS list_name,
                    u.id AS requester_user_id, u.name AS requester_name, u.email AS requester_email
             FROM borrow_requests br
             JOIN items i ON i.id = br.item_id
             JOIN lists l ON l.id = i.list_id
             JOIN users u ON u.id = br.requester_id
             WHERE l.user_id = ?
             ORDER BY br.updated_at DESC'
        );
        $stmt->execute([$userId]);
        Response::json($stmt->fetchAll());
    }

    public function outgoing(array $vars, ?int $userId): void
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT br.*, i.name AS item_name, l.id AS list_id, l.name AS list_name,
                    u.id AS owner_user_id, u.name AS owner_name
             FROM borrow_requests br
             JOIN items i ON i.id = br.item_id
             JOIN lists l ON l.id = i.list_id
             JOIN users u ON u.id = l.user_id
             WHERE br.requester_id = ?
             ORDER BY br.updated_at DESC'
        );
        $stmt->execute([$userId]);
        Response::json($stmt->fetchAll());
    }

    public function update(array $vars, ?int $userId): void
    {
        $requestId = (int) $vars['id'];
        $pdo       = Database::getInstance();

        $stmt = $pdo->prepare(
            'SELECT br.*, l.user_id AS owner_id
             FROM borrow_requests br
             JOIN items i ON i.id = br.item_id
             JOIN lists l ON l.id = i.list_id
             WHERE br.id = ?'
        );
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();

        if (!$request) {
            Response::notFound('Borrow request not found');
            return;
        }

        $body      = json_decode(file_get_contents('php://input'), true) ?? [];
        $newStatus = $body['status'] ?? '';

        $isOwner     = (int) $request['owner_id'] === $userId;
        $isRequester = (int) $request['requester_id'] === $userId;

        if (!$isOwner && !$isRequester) {
            Response::forbidden();
            return;
        }

        $allowed = [];
        if ($isOwner) {
            $allowed = ['approved', 'rejected'];
        }
        if ($isRequester && $request['status'] === 'approved') {
            $allowed[] = 'returned';
        }

        if (!in_array($newStatus, $allowed, true)) {
            Response::error("Invalid status transition to '{$newStatus}'");
            return;
        }

        $pdo->prepare('UPDATE borrow_requests SET status = ? WHERE id = ?')
            ->execute([$newStatus, $requestId]);

        $stmt = $pdo->prepare('SELECT * FROM borrow_requests WHERE id = ?');
        $stmt->execute([$requestId]);
        Response::json($stmt->fetch());
    }
}
