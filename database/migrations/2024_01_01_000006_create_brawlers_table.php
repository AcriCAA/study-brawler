<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brawlers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sprite_key')->default('default');
            $table->text('description')->nullable();
            $table->integer('unlock_stars_required')->default(0);
            $table->string('color')->default('#4CAF50');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brawlers');
    }
};
