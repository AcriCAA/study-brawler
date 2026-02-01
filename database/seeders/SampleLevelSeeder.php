<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\StudyMaterial;
use App\Models\Level;
use App\Models\Question;
use Illuminate\Database\Seeder;

class SampleLevelSeeder extends Seeder
{
    public function run(): void
    {
        // Get or create admin user
        $user = User::first();
        if (!$user) {
            $user = User::create([
                'name' => 'Admin',
                'email' => 'admin@studybrawler.com',
                'password' => bcrypt('password'),
            ]);
        }

        // Create sample study material
        $material = StudyMaterial::create([
            'user_id' => $user->id,
            'title' => 'Classification of Living Things',
            'original_filename' => 'classification_study_guide.png',
            'file_path' => '',
            'status' => 'parsed',
            'parsed_content' => [
                'title' => 'Classification of Living Things',
                'subject' => 'Science',
                'grade_level' => '5th Grade',
            ],
        ]);

        // Create level
        $level = Level::create([
            'study_material_id' => $material->id,
            'title' => 'Animal Kingdom Classification',
            'description' => 'Learn to classify organisms using a dichotomous key!',
            'difficulty' => 2,
            'order' => 1,
            'background_theme' => 'forest',
            'is_published' => true,
        ]);

        // Create questions based on the study sheet
        $questions = [
            [
                'question_text' => 'What is a dichotomous key used for?',
                'question_type' => 'vocabulary',
                'correct_answer' => 'Classifying organisms',
                'wrong_answers' => ['Measuring temperature', 'Counting cells', 'Growing plants'],
                'enemy_sprite' => 'star',
                'hint' => 'Think about sorting and identifying!',
            ],
            [
                'question_text' => 'An organism that has a backbone is called a:',
                'question_type' => 'classification',
                'correct_answer' => 'Vertebrate',
                'wrong_answers' => ['Invertebrate', 'Mammal', 'Reptile'],
                'enemy_sprite' => 'mammal',
                'hint' => 'What does the spine give us?',
            ],
            [
                'question_text' => 'Fish breathe using:',
                'question_type' => 'identify',
                'correct_answer' => 'Gills',
                'wrong_answers' => ['Lungs', 'Skin', 'Nose'],
                'enemy_sprite' => 'fish',
                'hint' => 'They extract oxygen from water!',
            ],
            [
                'question_text' => 'Which animal group is warm-blooded and feeds milk to their young?',
                'question_type' => 'classification',
                'correct_answer' => 'Mammals',
                'wrong_answers' => ['Reptiles', 'Fish', 'Amphibians'],
                'enemy_sprite' => 'mammal',
                'hint' => 'Think about dogs, cats, and humans!',
            ],
            [
                'question_text' => 'Insects have how many legs?',
                'question_type' => 'identify',
                'correct_answer' => 'Six',
                'wrong_answers' => ['Four', 'Eight', 'Two'],
                'enemy_sprite' => 'insect',
                'hint' => 'Count a bee\'s legs!',
            ],
            [
                'question_text' => 'Arachnids (spiders) have how many legs?',
                'question_type' => 'identify',
                'correct_answer' => 'Eight',
                'wrong_answers' => ['Six', 'Four', 'Ten'],
                'enemy_sprite' => 'insect',
                'hint' => 'More than insects!',
            ],
            [
                'question_text' => 'An organism with an exoskeleton on the outside is most likely a:',
                'question_type' => 'classification',
                'correct_answer' => 'Crustacean or Insect',
                'wrong_answers' => ['Mammal', 'Fish', 'Bird'],
                'enemy_sprite' => 'insect',
                'hint' => 'Think of crabs and beetles!',
            ],
            [
                'question_text' => 'Reptiles are:',
                'question_type' => 'classification',
                'correct_answer' => 'Cold-blooded',
                'wrong_answers' => ['Warm-blooded', 'Neither', 'Both'],
                'enemy_sprite' => 'reptile',
                'hint' => 'They bask in the sun to warm up!',
            ],
            [
                'question_text' => 'Which group lays eggs AND can live on land or in water?',
                'question_type' => 'classification',
                'correct_answer' => 'Amphibians',
                'wrong_answers' => ['Fish', 'Mammals', 'Birds'],
                'enemy_sprite' => 'fish',
                'hint' => 'Frogs and salamanders!',
            ],
            [
                'question_text' => 'What does taxonomy mean?',
                'question_type' => 'vocabulary',
                'correct_answer' => 'The science of classifying organisms',
                'wrong_answers' => ['The study of taxes', 'Animal behavior', 'Plant growth'],
                'enemy_sprite' => 'star',
                'hint' => 'It helps scientists organize living things!',
            ],
            [
                'question_text' => 'Birds are unique because they have:',
                'question_type' => 'identify',
                'correct_answer' => 'Feathers',
                'wrong_answers' => ['Scales', 'Fur', 'Smooth skin'],
                'enemy_sprite' => 'bird',
                'hint' => 'No other animal has these!',
            ],
            [
                'question_text' => 'Monotremes are mammals that:',
                'question_type' => 'classification',
                'correct_answer' => 'Lay eggs',
                'wrong_answers' => ['Live in water only', 'Have scales', 'Are cold-blooded'],
                'enemy_sprite' => 'mammal',
                'hint' => 'Platypus is an example!',
            ],
            [
                'question_text' => 'An organism without a backbone is called:',
                'question_type' => 'vocabulary',
                'correct_answer' => 'Invertebrate',
                'wrong_answers' => ['Vertebrate', 'Amphibian', 'Mammal'],
                'enemy_sprite' => 'insect',
                'hint' => 'In- means "without"!',
            ],
            [
                'question_text' => 'Jellyfish belong to which group?',
                'question_type' => 'classification',
                'correct_answer' => 'Cnidarians',
                'wrong_answers' => ['Fish', 'Molluscs', 'Crustaceans'],
                'enemy_sprite' => 'fish',
                'hint' => 'They have tentacles!',
            ],
            [
                'question_text' => 'What characteristic helps classify an organism as a fish?',
                'question_type' => 'identify',
                'correct_answer' => 'Has gills and lives in water',
                'wrong_answers' => ['Has wings', 'Has fur', 'Lives on land only'],
                'enemy_sprite' => 'fish',
                'hint' => 'Think about how they breathe!',
            ],
        ];

        foreach ($questions as $q) {
            Question::create([
                'level_id' => $level->id,
                'question_text' => $q['question_text'],
                'question_type' => $q['question_type'],
                'correct_answer' => $q['correct_answer'],
                'wrong_answers' => $q['wrong_answers'],
                'points' => 10,
                'enemy_sprite' => $q['enemy_sprite'],
                'hint' => $q['hint'],
            ]);
        }
    }
}
