<?php

use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\StudentAuthController;
use App\Http\Controllers\Api\StudentUploadController;
use App\Http\Controllers\Api\StudentNotificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Public game routes
Route::prefix('game')->group(function () {
    // Authentication
    Route::post('/login', [StudentAuthController::class, 'login']);

    // Admin preview (token validated via cache, no student auth)
    Route::get('/preview/{token}', [GameController::class, 'previewLevel']);
});

// Protected game routes (require student authentication)
Route::middleware('auth:sanctum')->prefix('game')->group(function () {
    // Authentication
    Route::post('/logout', [StudentAuthController::class, 'logout']);
    Route::get('/me', [StudentAuthController::class, 'me']);

    // Levels (filtered by authenticated student)
    Route::get('/levels', [GameController::class, 'levels']);
    Route::get('/levels/{level}', [GameController::class, 'level']);

    // Progress
    Route::post('/progress', [GameController::class, 'saveProgress']);
    Route::post('/sessions', [GameController::class, 'saveSession']);

    // Brawlers
    Route::get('/brawlers', [GameController::class, 'brawlers']);
    Route::post('/brawlers/select', [GameController::class, 'selectBrawler']);

    // Student uploads
    Route::post('/study-materials', [StudentUploadController::class, 'upload']);
    Route::get('/study-materials', [StudentUploadController::class, 'index']);

    // Notifications
    Route::get('/notifications', [StudentNotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [StudentNotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [StudentNotificationController::class, 'markAllAsRead']);
});
