<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class StudyMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'student_id',
        'title',
        'original_filename',
        'file_path',
        'parsed_content',
        'status',
        'parse_progress',
        'parse_message',
        'error_message',
        'approval_status',
        'approval_notes',
        'approved_at',
        'approved_by',
        'uploaded_by_student',
    ];

    protected $casts = [
        'parsed_content' => 'array',
        'approved_at' => 'datetime',
        'uploaded_by_student' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
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

    public function isApproved(): bool
    {
        return in_array($this->approval_status, ['auto_approved', 'approved']);
    }

    public function isPendingApproval(): bool
    {
        return $this->approval_status === 'pending_approval';
    }

    public function isDenied(): bool
    {
        return $this->approval_status === 'denied';
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->whereIn('approval_status', ['auto_approved', 'approved']);
    }

    public function scopePendingApproval(Builder $query): Builder
    {
        return $query->where('approval_status', 'pending_approval');
    }

    public function scopeForStudent(Builder $query, Student $student): Builder
    {
        return $query->where('student_id', $student->id);
    }
}
