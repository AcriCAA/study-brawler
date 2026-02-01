<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Brawler extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sprite_key',
        'description',
        'unlock_stars_required',
        'color',
    ];

    protected $casts = [
        'unlock_stars_required' => 'integer',
    ];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'student_brawlers')
            ->withPivot('is_selected')
            ->withTimestamps();
    }
}
