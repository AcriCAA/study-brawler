<?php

use App\Models\Student;
use App\Models\StudyMaterial;
use App\Services\UsernameGeneratorService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        // Generate credentials for existing students
        $usernameGenerator = new UsernameGeneratorService();

        $students = Student::whereNull('username')->orWhere('username', '')->get();
        foreach ($students as $student) {
            $username = $usernameGenerator->generate();
            $password = $usernameGenerator->generatePassword();

            $student->update([
                'username' => $username,
                'password' => Hash::make($password),
                'plain_password' => $password,
            ]);
        }

        // Assign existing study materials without a student to the first student (Player 1)
        $firstStudent = Student::first();
        if ($firstStudent) {
            StudyMaterial::whereNull('student_id')->update([
                'student_id' => $firstStudent->id,
                'approval_status' => 'auto_approved',
            ]);
        }
    }

    public function down(): void
    {
        // Credentials cannot be meaningfully reversed
        // Study materials will retain their student assignments
    }
};
