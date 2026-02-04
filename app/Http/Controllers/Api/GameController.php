<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Level;
use App\Models\Student;
use App\Models\StudentProgress;
use App\Models\Brawler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function levels(Request $request): JsonResponse
    {
        $student = $request->user();

        // Get levels assigned to this student via pivot table
        $levels = $student->assignedLevels()
            ->with('studyMaterial')
            ->published()
            ->withCount('questions')
            ->orderBy('order')
            ->get()
            ->map(function ($level) {
                return [
                    'id' => $level->id,
                    'title' => $level->title,
                    'description' => $level->description,
                    'difficulty' => $level->difficulty,
                    'background_theme' => $level->background_theme,
                    'map_key' => $level->map_key,
                    'bgm_key' => $level->bgm_key,
                    'questions_count' => $level->questions_count,
                    'study_material' => $level->studyMaterial?->title,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $levels,
        ]);
    }

    public function level(Level $level, Request $request): JsonResponse
    {
        $student = $request->user();

        // Verify level is assigned to the authenticated student
        if (!$level->is_published || !$student->assignedLevels()->where('level_id', $level->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Level not found or not available',
            ], 404);
        }

        $questions = $level->questions->map(function ($question) {
            $answers = $question->getAllAnswers();
            return [
                'id' => $question->id,
                'question_text' => $question->question_text,
                'question_type' => $question->question_type,
                'answers' => $answers,
                'correct_answer' => $question->correct_answer,
                'points' => $question->points,
                'enemy_sprite' => $question->enemy_sprite,
                'hint' => $question->hint,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $level->id,
                'title' => $level->title,
                'description' => $level->description,
                'difficulty' => $level->difficulty,
                'background_theme' => $level->background_theme,
                'map_key' => $level->map_key,
                'bgm_key' => $level->bgm_key,
                'questions' => $questions,
            ],
        ]);
    }

    public function saveProgress(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level_id' => 'required|exists:levels,id',
            'score' => 'required|integer|min:0',
            'stars' => 'required|integer|min:0|max:3',
            'completed' => 'required|boolean',
        ]);

        $student = $request->user();
        $level = Level::findOrFail($validated['level_id']);

        // Verify level is assigned to the authenticated student
        if (!$student->assignedLevels()->where('level_id', $level->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Level not found or not available',
            ], 404);
        }

        $progress = StudentProgress::updateOrCreate(
            [
                'student_id' => $student->id,
                'level_id' => $validated['level_id'],
            ],
            [
                'high_score' => max(
                    $validated['score'],
                    StudentProgress::where('student_id', $student->id)
                        ->where('level_id', $validated['level_id'])
                        ->value('high_score') ?? 0
                ),
                'stars_earned' => max(
                    $validated['stars'],
                    StudentProgress::where('student_id', $student->id)
                        ->where('level_id', $validated['level_id'])
                        ->value('stars_earned') ?? 0
                ),
                'completed_at' => $validated['completed'] ? now() : null,
            ]
        );

        $progress->increment('attempts');

        // Update student totals
        $totalStars = $student->progress()->sum('stars_earned');
        $totalXp = $student->progress()->sum('high_score');

        $student->update([
            'total_stars' => $totalStars,
            'total_xp' => $totalXp,
        ]);

        // Check for newly unlocked brawlers
        $newlyUnlocked = $this->checkBrawlerUnlocks($student);

        return response()->json([
            'success' => true,
            'data' => [
                'progress' => [
                    'stars_earned' => $progress->stars_earned,
                    'high_score' => $progress->high_score,
                    'attempts' => $progress->attempts,
                ],
                'student' => [
                    'total_stars' => $student->fresh()->total_stars,
                    'total_xp' => $student->fresh()->total_xp,
                ],
                'newly_unlocked_brawlers' => $newlyUnlocked,
            ],
        ]);
    }

    public function brawlers(): JsonResponse
    {
        $brawlers = Brawler::orderBy('unlock_stars_required')
            ->get()
            ->map(function ($brawler) {
                return [
                    'id' => $brawler->id,
                    'name' => $brawler->name,
                    'sprite_key' => $brawler->sprite_key,
                    'description' => $brawler->description,
                    'unlock_stars_required' => $brawler->unlock_stars_required,
                    'color' => $brawler->color,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $brawlers,
        ]);
    }

    public function selectBrawler(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'brawler_id' => 'required|exists:brawlers,id',
        ]);

        $student = $request->user();
        $brawler = Brawler::findOrFail($validated['brawler_id']);

        // Check if student has enough stars
        if ($student->total_stars < $brawler->unlock_stars_required) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough stars to use this brawler',
            ], 403);
        }

        // Deselect all brawlers
        $student->brawlers()->updateExistingPivot(
            $student->brawlers->pluck('id')->toArray(),
            ['is_selected' => false]
        );

        // Select the new brawler
        if (!$student->brawlers()->where('brawler_id', $brawler->id)->exists()) {
            $student->brawlers()->attach($brawler->id, ['is_selected' => true]);
        } else {
            $student->brawlers()->updateExistingPivot($brawler->id, ['is_selected' => true]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'selected_brawler' => $brawler->sprite_key,
            ],
        ]);
    }

    protected function checkBrawlerUnlocks(Student $student): array
    {
        $newlyUnlocked = [];
        $unlockedBrawlerIds = $student->brawlers->pluck('id')->toArray();

        $availableBrawlers = Brawler::where('unlock_stars_required', '<=', $student->total_stars)
            ->whereNotIn('id', $unlockedBrawlerIds)
            ->get();

        foreach ($availableBrawlers as $brawler) {
            $student->brawlers()->attach($brawler->id, ['is_selected' => false]);
            $newlyUnlocked[] = [
                'name' => $brawler->name,
                'sprite_key' => $brawler->sprite_key,
            ];
        }

        return $newlyUnlocked;
    }
}
