<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Level extends Model
{
    use HasFactory;

    protected $fillable = [
        'study_material_id',
        'title',
        'description',
        'difficulty',
        'order',
        'background_theme',
        'is_published',
    ];

    protected $casts = [
        'difficulty' => 'integer',
        'order' => 'integer',
        'is_published' => 'boolean',
    ];

    public function studyMaterial(): BelongsTo
    {
        return $this->belongsTo(StudyMaterial::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    public function progress(): HasMany
    {
        return $this->hasMany(StudentProgress::class);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }
}
