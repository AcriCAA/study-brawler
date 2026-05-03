<?php

use App\Models\Level;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

Route::get('/', function () {
    return redirect('/game');
});

Route::get('/play', function () {
    return redirect('/game');
});

// Serve the game through Laravel
Route::get('/game', function () {
    return response()->file(public_path('game/index.html'));
});

// Admin preview — Filament auth (web guard) required
Route::get('/admin/preview-level/{level}', function (Level $level) {
    $token = Str::random(40);
    Cache::put("preview_level_{$token}", $level->id, now()->addMinutes(10));
    return redirect("/game?preview={$token}");
})->middleware('auth');
