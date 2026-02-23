<?php

declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $host = $_ENV['MYSQL_HOST'] ?? getenv('MYSQL_HOST') ?? 'db';
            $db   = $_ENV['MYSQL_DATABASE'] ?? getenv('MYSQL_DATABASE') ?? 'rallebola';
            $user = $_ENV['MYSQL_USER'] ?? getenv('MYSQL_USER') ?? 'rallebola';
            $pass = $_ENV['MYSQL_PASSWORD'] ?? getenv('MYSQL_PASSWORD') ?? '';

            $dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";

            self::$instance = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }

        return self::$instance;
    }
}
