<?php

declare(strict_types=1);

namespace App;

use SessionHandlerInterface;

class DbSessionHandler implements SessionHandlerInterface
{
    private \PDO $pdo;

    public function open(string $path, string $name): bool
    {
        $this->pdo = Database::getInstance();
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        $stmt = $this->pdo->prepare(
            'SELECT data FROM sessions WHERE id = ? AND expires_at > NOW()'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? $row['data'] : '';
    }

    public function write(string $id, string $data): bool
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO sessions (id, data, expires_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
             ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)'
        );
        return $stmt->execute([$id, $data]);
    }

    public function destroy(string $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM sessions WHERE id = ?');
        return $stmt->execute([$id]);
    }

    public function gc(int $max_lifetime): int|false
    {
        $stmt = $this->pdo->prepare('DELETE FROM sessions WHERE expires_at <= NOW()');
        $stmt->execute();
        return $stmt->rowCount();
    }
}
