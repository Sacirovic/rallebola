<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;

class RoadtripController
{
    // GET /roadtrips
    public function index(array $vars, ?int $userId): void
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT r.*, u.name AS owner_name,
                    (SELECT COUNT(*) FROM roadtrip_members rm WHERE rm.roadtrip_id = r.id) AS member_count,
                    (SELECT COUNT(*) FROM roadtrip_todos rt WHERE rt.roadtrip_id = r.id) AS todo_count
             FROM roadtrips r
             JOIN users u ON u.id = r.owner_id
             WHERE r.owner_id = ? OR EXISTS (
               SELECT 1 FROM roadtrip_members rm WHERE rm.roadtrip_id = r.id AND rm.user_id = ?
             )
             ORDER BY r.updated_at DESC'
        );
        $stmt->execute([$userId, $userId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['member_count'] = (int) $row['member_count'];
            $row['todo_count']   = (int) $row['todo_count'];
        }
        Response::json($rows);
    }

    // POST /roadtrips
    public function store(array $vars, ?int $userId): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($body['name'] ?? '');
        $date = !empty($body['date']) ? $body['date'] : null;

        if (empty($name)) {
            Response::error('name is required');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('INSERT INTO roadtrips (owner_id, name, date) VALUES (?, ?, ?)');
        $stmt->execute([$userId, $name, $date]);
        $id = (int) $pdo->lastInsertId();

        $stmt = $pdo->prepare(
            'SELECT r.*, u.name AS owner_name FROM roadtrips r
             JOIN users u ON u.id = r.owner_id WHERE r.id = ?'
        );
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    // GET /roadtrips/:id
    public function show(array $vars, ?int $userId): void
    {
        $roadtripId = (int) $vars['id'];
        $roadtrip   = $this->getAccessibleRoadtrip($roadtripId, $userId);

        if (!$roadtrip) {
            Response::notFound('Roadtrip not found');
            return;
        }

        $pdo = Database::getInstance();

        $stmt = $pdo->prepare(
            'SELECT u.id, u.name, u.email FROM roadtrip_members rm
             JOIN users u ON u.id = rm.user_id
             WHERE rm.roadtrip_id = ?'
        );
        $stmt->execute([$roadtripId]);
        $roadtrip['members'] = $stmt->fetchAll();

        $stmt = $pdo->prepare(
            'SELECT * FROM roadtrip_todos WHERE roadtrip_id = ? ORDER BY created_at ASC'
        );
        $stmt->execute([$roadtripId]);
        $todos = $stmt->fetchAll();
        foreach ($todos as &$t) {
            $t['done'] = (bool) $t['done'];
        }
        $roadtrip['todos'] = $todos;

        Response::json($roadtrip);
    }

    // PUT /roadtrips/:id
    public function update(array $vars, ?int $userId): void
    {
        $roadtripId = (int) $vars['id'];
        $roadtrip   = $this->getOwnedRoadtrip($roadtripId, $userId);

        if (!$roadtrip) {
            Response::notFound('Roadtrip not found or access denied');
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($body['name'] ?? '');
        $date = array_key_exists('date', $body) ? ($body['date'] ?: null) : $roadtrip['date'];

        if (empty($name)) {
            Response::error('name is required');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('UPDATE roadtrips SET name = ?, date = ? WHERE id = ?');
        $stmt->execute([$name, $date, $roadtripId]);

        $stmt = $pdo->prepare(
            'SELECT r.*, u.name AS owner_name FROM roadtrips r
             JOIN users u ON u.id = r.owner_id WHERE r.id = ?'
        );
        $stmt->execute([$roadtripId]);
        Response::json($stmt->fetch());
    }

    // DELETE /roadtrips/:id
    public function destroy(array $vars, ?int $userId): void
    {
        $roadtripId = (int) $vars['id'];
        $roadtrip   = $this->getOwnedRoadtrip($roadtripId, $userId);

        if (!$roadtrip) {
            Response::notFound('Roadtrip not found or access denied');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('DELETE FROM roadtrips WHERE id = ?');
        $stmt->execute([$roadtripId]);
        Response::json(['message' => 'Roadtrip deleted']);
    }

    // POST /roadtrips/:id/members
    public function addMember(array $vars, ?int $userId): void
    {
        $roadtripId = (int) $vars['id'];
        $roadtrip   = $this->getOwnedRoadtrip($roadtripId, $userId);

        if (!$roadtrip) {
            Response::notFound('Roadtrip not found or access denied');
            return;
        }

        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim($body['email'] ?? '');

        if (empty($email)) {
            Response::error('email is required');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $target = $stmt->fetch();

        if (!$target) {
            Response::error('User not found', 404);
            return;
        }

        if ($target['id'] === $userId) {
            Response::error('You are already the owner');
            return;
        }

        try {
            $stmt = $pdo->prepare('INSERT INTO roadtrip_members (roadtrip_id, user_id) VALUES (?, ?)');
            $stmt->execute([$roadtripId, $target['id']]);
        } catch (\PDOException $e) {
            Response::error('User is already a member');
            return;
        }

        $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
        $stmt->execute([$target['id']]);
        Response::json($stmt->fetch(), 201);
    }

    // DELETE /roadtrips/:id/members/:userId
    public function removeMember(array $vars, ?int $userId): void
    {
        $roadtripId   = (int) $vars['id'];
        $targetUserId = (int) $vars['userId'];
        $roadtrip     = $this->getOwnedRoadtrip($roadtripId, $userId);

        if (!$roadtrip) {
            Response::notFound('Roadtrip not found or access denied');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('DELETE FROM roadtrip_members WHERE roadtrip_id = ? AND user_id = ?');
        $stmt->execute([$roadtripId, $targetUserId]);
        Response::json(['message' => 'Member removed']);
    }

    // POST /roadtrips/:id/todos
    public function storeTodo(array $vars, ?int $userId): void
    {
        $roadtripId = (int) $vars['id'];

        if (!$this->getAccessibleRoadtrip($roadtripId, $userId)) {
            Response::notFound('Roadtrip not found');
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $text = trim($body['text'] ?? '');

        if (empty($text)) {
            Response::error('text is required');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('INSERT INTO roadtrip_todos (roadtrip_id, text) VALUES (?, ?)');
        $stmt->execute([$roadtripId, $text]);
        $id = (int) $pdo->lastInsertId();

        $stmt = $pdo->prepare('SELECT * FROM roadtrip_todos WHERE id = ?');
        $stmt->execute([$id]);
        $todo         = $stmt->fetch();
        $todo['done'] = (bool) $todo['done'];
        Response::json($todo, 201);
    }

    // PUT /roadtrips/:id/todos/:todoId
    public function updateTodo(array $vars, ?int $userId): void
    {
        $roadtripId = (int) $vars['id'];
        $todoId     = (int) $vars['todoId'];

        if (!$this->getAccessibleRoadtrip($roadtripId, $userId)) {
            Response::notFound('Roadtrip not found');
            return;
        }

        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $pdo     = Database::getInstance();
        $updates = [];
        $params  = [];

        if (isset($body['text'])) {
            $text = trim($body['text']);
            if (empty($text)) {
                Response::error('text cannot be empty');
                return;
            }
            $updates[] = 'text = ?';
            $params[]  = $text;
        }

        if (isset($body['done'])) {
            $updates[] = 'done = ?';
            $params[]  = (int)(bool) $body['done'];
        }

        if (empty($updates)) {
            Response::error('Nothing to update');
            return;
        }

        $params[] = $todoId;
        $params[] = $roadtripId;
        $stmt = $pdo->prepare(
            'UPDATE roadtrip_todos SET ' . implode(', ', $updates) . ' WHERE id = ? AND roadtrip_id = ?'
        );
        $stmt->execute($params);

        $stmt = $pdo->prepare('SELECT * FROM roadtrip_todos WHERE id = ?');
        $stmt->execute([$todoId]);
        $todo         = $stmt->fetch();
        $todo['done'] = (bool) $todo['done'];
        Response::json($todo);
    }

    // DELETE /roadtrips/:id/todos/:todoId
    public function destroyTodo(array $vars, ?int $userId): void
    {
        $roadtripId = (int) $vars['id'];
        $todoId     = (int) $vars['todoId'];

        if (!$this->getAccessibleRoadtrip($roadtripId, $userId)) {
            Response::notFound('Roadtrip not found');
            return;
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('DELETE FROM roadtrip_todos WHERE id = ? AND roadtrip_id = ?');
        $stmt->execute([$todoId, $roadtripId]);
        Response::json(['message' => 'Todo deleted']);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function getAccessibleRoadtrip(int $roadtripId, int $userId): array|false
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT r.*, u.name AS owner_name FROM roadtrips r
             JOIN users u ON u.id = r.owner_id
             WHERE r.id = ? AND (
               r.owner_id = ? OR EXISTS (
                 SELECT 1 FROM roadtrip_members rm WHERE rm.roadtrip_id = r.id AND rm.user_id = ?
               )
             )'
        );
        $stmt->execute([$roadtripId, $userId, $userId]);
        return $stmt->fetch();
    }

    private function getOwnedRoadtrip(int $roadtripId, int $userId): array|false
    {
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM roadtrips WHERE id = ? AND owner_id = ?');
        $stmt->execute([$roadtripId, $userId]);
        return $stmt->fetch();
    }
}
