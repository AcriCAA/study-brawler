<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class StudentAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $student = Student::where('username', $validated['username'])->first();

        if (!$student || !Hash::check($validated['password'], $student->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid username or password',
            ], 401);
        }

        // Revoke existing tokens and create a new one
        $student->tokens()->delete();
        $token = $student->createToken('game-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'student' => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'username' => $student->username,
                    'avatar' => $student->avatar,
                    'total_stars' => $student->total_stars,
                    'total_xp' => $student->total_xp,
                    'selected_brawler' => $student->selectedBrawler()?->sprite_key ?? 'sparky',
                ],
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $student = $request->user();

        $progress = $student->progress()
            ->with('level')
            ->get()
            ->map(function ($p) {
                return [
                    'level_id' => $p->level_id,
                    'level_title' => $p->level->title,
                    'stars_earned' => $p->stars_earned,
                    'high_score' => $p->high_score,
                    'attempts' => $p->attempts,
                    'completed_at' => $p->completed_at?->toISOString(),
                ];
            });

        $unlockedBrawlers = $student->brawlers->pluck('sprite_key');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $student->id,
                'name' => $student->name,
                'username' => $student->username,
                'avatar' => $student->avatar,
                'total_stars' => $student->total_stars,
                'total_xp' => $student->total_xp,
                'selected_brawler' => $student->selectedBrawler()?->sprite_key ?? 'sparky',
                'unlocked_brawlers' => $unlockedBrawlers,
                'progress' => $progress,
            ],
        ]);
    }
}
