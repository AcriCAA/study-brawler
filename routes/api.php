<?php

use App\Http\Controllers\Api\GameController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Game API Routes (no auth required for the game)
Route::prefix('game')->group(function () {
    // Levels
    Route::get('/levels', [GameController::class, 'levels']);
    Route::get('/levels/{level}', [GameController::class, 'level']);

    // Students
    Route::get('/students', [GameController::class, 'students']);
    Route::get('/students/{student}', [GameController::class, 'student']);

    // Progress
    Route::post('/progress', [GameController::class, 'saveProgress']);

    // Brawlers
    Route::get('/brawlers', [GameController::class, 'brawlers']);
    Route::post('/brawlers/select', [GameController::class, 'selectBrawler']);
});
