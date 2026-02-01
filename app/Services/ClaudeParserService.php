<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ClaudeParserService
{
    protected string $apiKey;
    protected string $model = 'claude-sonnet-4-20250514';

    public function __construct()
    {
        $this->apiKey = config('services.anthropic.api_key');
    }

    public function parseStudyMaterial(string $filePath): array
    {
        // Extend PHP execution time for large files/PDFs
        set_time_limit(300);

        $fileData = $this->getFileData($filePath);
        $isPdf = $fileData['media_type'] === 'application/pdf';

        // Build the content array based on file type
        $contentBlock = $isPdf
            ? [
                'type' => 'document',
                'source' => [
                    'type' => 'base64',
                    'media_type' => 'application/pdf',
                    'data' => $fileData['data'],
                ],
            ]
            : [
                'type' => 'image',
                'source' => [
                    'type' => 'base64',
                    'media_type' => $fileData['media_type'],
                    'data' => $fileData['data'],
                ],
            ];

        $response = Http::timeout(120)->withHeaders([
            'x-api-key' => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'Content-Type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => $this->model,
            'max_tokens' => 4096,
            'messages' => [
                [
                    'role' => 'user',
                    'content' => [
                        $contentBlock,
                        [
                            'type' => 'text',
                            'text' => $this->getParsingPrompt(),
                        ],
                    ],
                ],
            ],
        ]);

        if ($response->failed()) {
            throw new \Exception('Failed to parse study material: ' . $response->body());
        }

        $content = $response->json('content.0.text');
        return $this->extractJsonFromResponse($content);
    }

    protected function getFileData(string $filePath): array
    {
        $fullPath = Storage::disk('public')->path($filePath);
        $fileContent = file_get_contents($fullPath);
        $mimeType = mime_content_type($fullPath);

        return [
            'data' => base64_encode($fileContent),
            'media_type' => $mimeType,
        ];
    }

    protected function getParsingPrompt(): string
    {
        return <<<PROMPT
You are analyzing an educational study sheet or worksheet for a 5th grade student. Extract all the educational content and generate game questions from it.

Return a JSON object with this exact structure:
{
    "title": "The main topic/title of the study material",
    "subject": "The subject area (e.g., Science, Math, History)",
    "grade_level": "The grade level if mentioned",
    "vocabulary": [
        {
            "term": "vocabulary word",
            "definition": "definition of the term"
        }
    ],
    "concepts": [
        {
            "name": "concept name",
            "description": "explanation of the concept"
        }
    ],
    "questions": [
        {
            "question_text": "A question testing knowledge from the material",
            "question_type": "vocabulary|classification|true_false|identify|multiple_choice",
            "correct_answer": "The correct answer",
            "wrong_answers": ["wrong answer 1", "wrong answer 2", "wrong answer 3"],
            "hint": "Optional hint for the student",
            "enemy_sprite": "creature type based on content (fish, bird, reptile, mammal, insect, plant, rock, star)"
        }
    ],
    "learning_objectives": ["List of learning objectives if present"]
}

Guidelines for generating questions:
1. Create at least 10-15 questions from the content
2. For vocabulary terms, create "What does [term] mean?" questions
3. For classifications (like animal types), create "Which category does [example] belong to?" questions
4. Include some true/false questions about key facts
5. Make wrong answers plausible but clearly incorrect
6. Match enemy sprites to the content (e.g., questions about fish get "fish" sprite)
7. Vary question difficulty - some easy, some challenging
8. Make questions engaging and appropriate for a 5th grader

IMPORTANT: Return ONLY the JSON object, no markdown code blocks or other text.
PROMPT;
    }

    protected function extractJsonFromResponse(string $response): array
    {
        // Remove any markdown code blocks if present
        $response = preg_replace('/```json\s*/', '', $response);
        $response = preg_replace('/```\s*/', '', $response);
        $response = trim($response);

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception('Failed to parse JSON response: ' . json_last_error_msg());
        }

        return $data;
    }

    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }
}
