<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_brawlers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('brawler_id')->constrained()->onDelete('cascade');
            $table->boolean('is_selected')->default(false);
            $table->timestamps();

            $table->unique(['student_id', 'brawler_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_brawlers');
    }
};
