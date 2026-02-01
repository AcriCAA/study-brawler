<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'level_id',
        'question_text',
        'question_type',
        'correct_answer',
        'wrong_answers',
        'points',
        'enemy_sprite',
        'hint',
    ];

    protected $casts = [
        'wrong_answers' => 'array',
        'points' => 'integer',
    ];

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function getAllAnswers(): array
    {
        $answers = array_merge([$this->correct_answer], $this->wrong_answers);
        shuffle($answers);
        return $answers;
    }
}
