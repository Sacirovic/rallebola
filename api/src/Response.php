<?php

declare(strict_types=1);

namespace App;

class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function error(string $message, int $status = 400): void
    {
        self::json(['error' => $message], $status);
    }

    public static function notFound(string $message = 'Not found'): void
    {
        self::json(['error' => $message], 404);
    }

    public static function forbidden(string $message = 'Forbidden'): void
    {
        self::json(['error' => $message], 403);
    }
}
