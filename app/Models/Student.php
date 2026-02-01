<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'avatar',
        'total_stars',
        'total_xp',
    ];

    protected $casts = [
        'total_stars' => 'integer',
        'total_xp' => 'integer',
    ];

    public function progress(): HasMany
    {
        return $this->hasMany(StudentProgress::class);
    }

    public function brawlers(): BelongsToMany
    {
        return $this->belongsToMany(Brawler::class, 'student_brawlers')
            ->withPivot('is_selected')
            ->withTimestamps();
    }

    public function selectedBrawler(): ?Brawler
    {
        return $this->brawlers()->wherePivot('is_selected', true)->first();
    }
}
