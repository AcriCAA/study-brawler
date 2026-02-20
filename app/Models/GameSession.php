<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameSession extends Model
{
    protected $fillable = [
        'student_id',
        'level_id',
        'outcome',
        'score',
        'stars_earned',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'stars_earned' => 'integer',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function questionAttempts(): HasMany
    {
        return $this->hasMany(QuestionAttempt::class);
    }
}
