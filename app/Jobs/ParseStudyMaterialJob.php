<?php

namespace App\Jobs;

use App\Models\StudyMaterial;
use App\Services\ClaudeParserService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ParseStudyMaterialJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300; // 5 minutes
    public int $tries = 1;

    public function __construct(
        public StudyMaterial $studyMaterial
    ) {}

    public function handle(): void
    {
        $material = $this->studyMaterial;

        try {
            // Update status to show we're starting
            $material->update([
                'status' => 'parsing',
                'parse_progress' => 10,
                'parse_message' => 'Reading file...',
            ]);

            $parser = new ClaudeParserService();

            // Update progress - sending to AI
            $material->update([
                'parse_progress' => 30,
                'parse_message' => 'Sending to Claude AI...',
            ]);

            $parsedContent = $parser->parseStudyMaterial($material->file_path);

            // Update progress - processing response
            $material->update([
                'parse_progress' => 70,
                'parse_message' => 'Processing AI response...',
            ]);

            // Save parsed content
            $material->update([
                'parsed_content' => $parsedContent,
                'parse_progress' => 85,
                'parse_message' => 'Creating level and questions...',
            ]);

            // Create level from parsed content
            $this->createLevelFromParsedContent($material, $parsedContent);

            // Mark as complete
            $material->update([
                'status' => 'parsed',
                'parse_progress' => 100,
                'parse_message' => 'Complete!',
                'error_message' => null,
            ]);

        } catch (\Exception $e) {
            Log::error('ParseStudyMaterialJob failed: ' . $e->getMessage());

            $material->update([
                'status' => 'failed',
                'parse_progress' => 0,
                'parse_message' => null,
                'error_message' => $e->getMessage(),
            ]);
        }
    }

    protected function createLevelFromParsedContent(StudyMaterial $material, array $content): void
    {
        $level = $material->levels()->create([
            'title' => $content['title'] ?? $material->title,
            'description' => $content['subject'] ?? 'Generated from study material',
            'difficulty' => 1,
            'order' => $material->levels()->count(),
            'background_theme' => 'forest',
            'is_published' => false,
        ]);

        foreach ($content['questions'] ?? [] as $questionData) {
            $level->questions()->create([
                'question_text' => $questionData['question_text'],
                'question_type' => $questionData['question_type'] ?? 'multiple_choice',
                'correct_answer' => $questionData['correct_answer'],
                'wrong_answers' => $questionData['wrong_answers'],
                'points' => 10,
                'enemy_sprite' => $questionData['enemy_sprite'] ?? 'creature',
                'hint' => $questionData['hint'] ?? null,
            ]);
        }
    }
}
