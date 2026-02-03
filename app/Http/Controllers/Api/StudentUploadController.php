<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudyMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentUploadController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'file' => 'required|file|mimes:jpeg,png,gif,webp,pdf|max:51200', // 50MB max
        ]);

        $student = $request->user();
        $file = $request->file('file');

        // Store the file
        $path = $file->store('study-materials', 'public');

        // Create the study material with pending approval status
        $studyMaterial = StudyMaterial::create([
            'user_id' => 1, // Default to first admin user, or create a system user
            'student_id' => $student->id,
            'title' => $validated['title'],
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'status' => 'pending',
            'approval_status' => 'pending_approval',
            'uploaded_by_student' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Study guide uploaded successfully. It will be reviewed by your teacher.',
            'data' => [
                'id' => $studyMaterial->id,
                'title' => $studyMaterial->title,
                'status' => $studyMaterial->status,
                'approval_status' => $studyMaterial->approval_status,
            ],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $student = $request->user();

        $materials = StudyMaterial::where('student_id', $student->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($material) {
                return [
                    'id' => $material->id,
                    'title' => $material->title,
                    'status' => $material->status,
                    'approval_status' => $material->approval_status,
                    'approval_notes' => $material->approval_notes,
                    'uploaded_by_student' => $material->uploaded_by_student,
                    'levels_count' => $material->levels()->count(),
                    'created_at' => $material->created_at->toISOString(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $materials,
        ]);
    }
}
