<?php

use Illuminate\Support\Facades\Route;

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
