<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('level_id')->constrained()->onDelete('cascade');
            $table->text('question_text');
            $table->enum('question_type', ['vocabulary', 'classification', 'true_false', 'identify', 'multiple_choice'])->default('multiple_choice');
            $table->string('correct_answer');
            $table->json('wrong_answers');
            $table->integer('points')->default(10);
            $table->string('enemy_sprite')->default('creature');
            $table->string('hint')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
