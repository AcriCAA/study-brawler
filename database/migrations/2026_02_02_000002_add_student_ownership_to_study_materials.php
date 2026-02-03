<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('study_materials', function (Blueprint $table) {
            $table->foreignId('student_id')->nullable()->after('user_id')->constrained()->onDelete('cascade');
            $table->enum('approval_status', ['auto_approved', 'pending_approval', 'approved', 'denied'])->default('auto_approved')->after('status');
            $table->text('approval_notes')->nullable()->after('approval_status');
            $table->timestamp('approved_at')->nullable()->after('approval_notes');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->onDelete('set null');
            $table->boolean('uploaded_by_student')->default(false)->after('approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('study_materials', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['student_id', 'approval_status', 'approval_notes', 'approved_at', 'approved_by', 'uploaded_by_student']);
        });
    }
};
