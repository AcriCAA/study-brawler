<?php

namespace Database\Seeders;

use App\Models\Brawler;
use Illuminate\Database\Seeder;

class BrawlerSeeder extends Seeder
{
    public function run(): void
    {
        $brawlers = [
            [
                'name' => 'Sparky',
                'sprite_key' => 'sparky',
                'description' => 'A quick and energetic starter brawler!',
                'unlock_stars_required' => 0,
                'color' => '#FFD700',
            ],
            [
                'name' => 'Tank',
                'sprite_key' => 'tank',
                'description' => 'Slow but powerful. Can take lots of hits!',
                'unlock_stars_required' => 10,
                'color' => '#4CAF50',
            ],
            [
                'name' => 'Blaze',
                'sprite_key' => 'blaze',
                'description' => 'Fast and fiery! Shoots rapid projectiles.',
                'unlock_stars_required' => 25,
                'color' => '#FF5722',
            ],
            [
                'name' => 'Frost',
                'sprite_key' => 'frost',
                'description' => 'Cool and collected. Slows down enemies!',
                'unlock_stars_required' => 50,
                'color' => '#2196F3',
            ],
            [
                'name' => 'Shadow',
                'sprite_key' => 'shadow',
                'description' => 'Mysterious and swift. Hard to hit!',
                'unlock_stars_required' => 100,
                'color' => '#9C27B0',
            ],
        ];

        foreach ($brawlers as $brawler) {
            Brawler::updateOrCreate(
                ['name' => $brawler['name']],
                $brawler
            );
        }
    }
}
