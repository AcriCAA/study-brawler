<?php

namespace App\Services;

use App\Models\Student;

class UsernameGeneratorService
{
    protected array $prefixes = [
        'Turbo', 'Ninja', 'Captain', 'Super', 'Mega', 'Lightning', 'Thunder',
        'Cosmic', 'Epic', 'Ultra', 'Hyper', 'Blaze', 'Storm', 'Flash', 'Power',
        'Mighty', 'Swift', 'Brave', 'Bold', 'Fierce', 'Golden', 'Silver', 'Iron',
        'Diamond', 'Rocket', 'Atomic', 'Cyber', 'Nova', 'Stellar', 'Phoenix',
    ];

    protected array $soccerPlayers = [
        'Messi', 'Ronaldo', 'Neymar', 'Mbappe', 'Haaland', 'Pele', 'Maradona',
        'Zidane', 'Beckham', 'Rooney', 'Henry', 'Kaka', 'Iniesta', 'Xavi',
        'Modric', 'Kroos', 'Benzema', 'Salah', 'Mane', 'Firmino', 'Kane',
        'Lewandowski', 'Mueller', 'Ramos', 'Marcelo', 'Buffon', 'Casillas',
        'Pirlo', 'Totti', 'DelPiero', 'Baggio', 'Platini', 'Cruyff', 'Best',
    ];

    protected array $adjectives = [
        'Happy', 'Lucky', 'Speedy', 'Mighty', 'Clever', 'Brave', 'Swift',
        'Quick', 'Cool', 'Super', 'Epic', 'Awesome', 'Magic', 'Wild', 'Bright',
    ];

    protected array $nouns = [
        'Goal', 'Star', 'Kick', 'Strike', 'Score', 'Win', 'Champion', 'Trophy',
        'Ball', 'Thunder', 'Lightning', 'Rocket', 'Comet', 'Dragon', 'Tiger',
    ];

    public function generate(): string
    {
        $maxAttempts = 50;
        $attempts = 0;

        do {
            $prefix = $this->prefixes[array_rand($this->prefixes)];
            $player = $this->soccerPlayers[array_rand($this->soccerPlayers)];
            $username = $prefix . $player;
            $attempts++;

            if ($attempts >= $maxAttempts) {
                // Add a random number to ensure uniqueness
                $username .= rand(1, 999);
            }
        } while (Student::where('username', $username)->exists() && $attempts < $maxAttempts + 10);

        return $username;
    }

    public function generatePassword(): string
    {
        $adjective = $this->adjectives[array_rand($this->adjectives)];
        $noun = $this->nouns[array_rand($this->nouns)];
        $number = rand(10, 99);

        return $adjective . $noun . $number;
    }
}
