<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_attempts', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('game_session_id')->constrained('game_sessions')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->unsignedTinyInteger('attempts');
            $table->boolean('answered_correctly');
            $table->timestamps();

            $table->unique(['game_session_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_attempts');
    }
};
