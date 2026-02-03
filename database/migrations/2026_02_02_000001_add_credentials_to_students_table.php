<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Add as nullable first for SQLite compatibility
            $table->string('username')->nullable()->after('name');
            $table->string('password')->nullable()->after('username');
            $table->string('plain_password')->nullable()->after('password');
            $table->rememberToken()->after('plain_password');
        });

        // The data migration (000004) will populate these fields
        // After that runs, we add the unique index
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['username', 'password', 'plain_password', 'remember_token']);
        });
    }
};
