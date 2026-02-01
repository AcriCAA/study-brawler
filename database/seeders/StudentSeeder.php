<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\Brawler;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        $student = Student::updateOrCreate(
            ['name' => 'Player 1'],
            [
                'avatar' => 'default',
                'total_stars' => 0,
                'total_xp' => 0,
            ]
        );

        // Give the student the starter brawler
        $starterBrawler = Brawler::where('unlock_stars_required', 0)->first();
        if ($starterBrawler) {
            $student->brawlers()->syncWithoutDetaching([
                $starterBrawler->id => ['is_selected' => true]
            ]);
        }
    }
}
