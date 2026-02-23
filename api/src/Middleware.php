<?php

declare(strict_types=1);

namespace App;

class Middleware
{
    public static function requireAuth(): int
    {
        if (empty($_SESSION['user_id'])) {
            Response::json(['error' => 'Unauthorized'], 401);
            exit;
        }

        return (int) $_SESSION['user_id'];
    }
}
