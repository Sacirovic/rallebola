<?php

declare(strict_types=1);

namespace App;

use FastRoute\Dispatcher;
use FastRoute\RouteCollector;
use App\Middleware;
use App\Controllers\AuthController;
use App\Controllers\ListController;
use App\Controllers\ItemController;
use App\Controllers\ShareController;
use App\Controllers\BorrowController;
use App\Controllers\RoadtripController;

use function FastRoute\simpleDispatcher;

class Router
{
    public function dispatch(): void
    {
        $dispatcher = simpleDispatcher(function (RouteCollector $r) {
            // Auth (public)
            $r->addRoute('POST', '/auth/register', [AuthController::class, 'register']);
            $r->addRoute('POST', '/auth/login',    [AuthController::class, 'login']);
            $r->addRoute('POST', '/auth/logout',   [AuthController::class, 'logout']);
            $r->addRoute('GET',  '/auth/me',       [AuthController::class, 'me']);

            // Lists (protected)
            $r->addRoute('GET',    '/lists',      [ListController::class, 'index']);
            $r->addRoute('POST',   '/lists',      [ListController::class, 'store']);
            $r->addRoute('GET',    '/lists/{id}', [ListController::class, 'show']);
            $r->addRoute('PUT',    '/lists/{id}', [ListController::class, 'update']);
            $r->addRoute('DELETE', '/lists/{id}', [ListController::class, 'destroy']);

            // Items (protected)
            $r->addRoute('GET',    '/lists/{id}/items',          [ItemController::class, 'index']);
            $r->addRoute('POST',   '/lists/{id}/items',          [ItemController::class, 'store']);
            $r->addRoute('PUT',    '/lists/{id}/items/{itemId}', [ItemController::class, 'update']);
            $r->addRoute('DELETE', '/lists/{id}/items/{itemId}', [ItemController::class, 'destroy']);

            // Shares (protected)
            $r->addRoute('GET',    '/lists/{id}/shares',             [ShareController::class, 'index']);
            $r->addRoute('POST',   '/lists/{id}/shares',             [ShareController::class, 'store']);
            $r->addRoute('DELETE', '/lists/{id}/shares/{shareId}',   [ShareController::class, 'destroy']);

            // Shared-with-me (protected)
            $r->addRoute('GET', '/shared-with-me', [ListController::class, 'sharedWithMe']);

            // Roadtrips (protected)
            $r->addRoute('GET',    '/roadtrips',                           [RoadtripController::class, 'index']);
            $r->addRoute('POST',   '/roadtrips',                           [RoadtripController::class, 'store']);
            $r->addRoute('GET',    '/roadtrips/{id}',                      [RoadtripController::class, 'show']);
            $r->addRoute('PUT',    '/roadtrips/{id}',                      [RoadtripController::class, 'update']);
            $r->addRoute('DELETE', '/roadtrips/{id}',                      [RoadtripController::class, 'destroy']);
            $r->addRoute('POST',   '/roadtrips/{id}/members',              [RoadtripController::class, 'addMember']);
            $r->addRoute('DELETE', '/roadtrips/{id}/members/{userId}',     [RoadtripController::class, 'removeMember']);
            $r->addRoute('POST',   '/roadtrips/{id}/todos',                [RoadtripController::class, 'storeTodo']);
            $r->addRoute('PUT',    '/roadtrips/{id}/todos/reorder',        [RoadtripController::class, 'reorderTodos']);
            $r->addRoute('PUT',    '/roadtrips/{id}/todos/{todoId}',       [RoadtripController::class, 'updateTodo']);
            $r->addRoute('DELETE', '/roadtrips/{id}/todos/{todoId}',       [RoadtripController::class, 'destroyTodo']);

            // Borrow requests (protected)
            $r->addRoute('POST',  '/items/{itemId}/borrow-requests', [BorrowController::class, 'store']);
            $r->addRoute('GET',   '/borrow-requests/incoming',       [BorrowController::class, 'incoming']);
            $r->addRoute('GET',   '/borrow-requests/outgoing',       [BorrowController::class, 'outgoing']);
            $r->addRoute('PATCH', '/borrow-requests/{id}',           [BorrowController::class, 'update']);
        });

        $method = $_SERVER['REQUEST_METHOD'];
        $uri    = $_SERVER['REQUEST_URI'];

        // Strip query string and decode
        if (false !== $pos = strpos($uri, '?')) {
            $uri = substr($uri, 0, $pos);
        }
        $uri = rawurldecode($uri);

        $routeInfo = $dispatcher->dispatch($method, $uri);

        switch ($routeInfo[0]) {
            case Dispatcher::NOT_FOUND:
                Response::notFound('Route not found');
                break;

            case Dispatcher::METHOD_NOT_ALLOWED:
                Response::error('Method not allowed', 405);
                break;

            case Dispatcher::FOUND:
                [$class, $action] = $routeInfo[1];
                $vars = $routeInfo[2];

                // Public routes — no auth required
                $publicRoutes = [
                    AuthController::class . '::register',
                    AuthController::class . '::login',
                    AuthController::class . '::logout',
                ];

                $userId = null;
                if (!in_array("{$class}::{$action}", $publicRoutes, true)) {
                    $userId = Middleware::requireAuth();
                }

                $controller = new $class();
                $controller->$action($vars, $userId);
                break;
        }
    }
}
