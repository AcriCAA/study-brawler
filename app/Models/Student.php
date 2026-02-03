<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Student extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'name',
        'username',
        'password',
        'plain_password',
        'avatar',
        'total_stars',
        'total_xp',
    ];

    protected $hidden = [
        'password',
        'plain_password',
        'remember_token',
    ];

    protected $casts = [
        'total_stars' => 'integer',
        'total_xp' => 'integer',
        'password' => 'hashed',
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

    public function studyMaterials(): HasMany
    {
        return $this->hasMany(StudyMaterial::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(StudentNotification::class);
    }

    public function unreadNotifications(): HasMany
    {
        return $this->notifications()->whereNull('read_at');
    }

    public function ownedLevels(): HasManyThrough
    {
        return $this->hasManyThrough(
            Level::class,
            StudyMaterial::class,
            'student_id',
            'study_material_id',
            'id',
            'id'
        );
    }

    public function assignedLevels(): BelongsToMany
    {
        return $this->belongsToMany(Level::class, 'student_levels')
            ->withTimestamps();
    }
}
