<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudyMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'original_filename',
        'file_path',
        'parsed_content',
        'status',
        'parse_progress',
        'parse_message',
        'error_message',
    ];

    protected $casts = [
        'parsed_content' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function levels(): HasMany
    {
        return $this->hasMany(Level::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isParsed(): bool
    {
        return $this->status === 'parsed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }
}
