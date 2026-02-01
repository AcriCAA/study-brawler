<?php

namespace App\Filament\Resources\LevelResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class QuestionsRelationManager extends RelationManager
{
    protected static string $relationship = 'questions';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Textarea::make('question_text')
                    ->required()
                    ->rows(2)
                    ->columnSpanFull(),

                Forms\Components\Select::make('question_type')
                    ->options([
                        'vocabulary' => 'Vocabulary',
                        'classification' => 'Classification',
                        'true_false' => 'True/False',
                        'identify' => 'Identify',
                        'multiple_choice' => 'Multiple Choice',
                    ])
                    ->default('multiple_choice')
                    ->required(),

                Forms\Components\TextInput::make('correct_answer')
                    ->required()
                    ->maxLength(255),

                Forms\Components\TagsInput::make('wrong_answers')
                    ->required()
                    ->placeholder('Add wrong answers'),

                Forms\Components\TextInput::make('points')
                    ->numeric()
                    ->default(10)
                    ->required(),

                Forms\Components\Select::make('enemy_sprite')
                    ->options([
                        'creature' => 'Generic Creature',
                        'fish' => 'Fish',
                        'bird' => 'Bird',
                        'reptile' => 'Reptile',
                        'mammal' => 'Mammal',
                        'insect' => 'Insect',
                        'plant' => 'Plant',
                        'rock' => 'Rock',
                        'star' => 'Star',
                    ])
                    ->default('creature'),

                Forms\Components\TextInput::make('hint')
                    ->maxLength(255),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('question_text')
            ->columns([
                Tables\Columns\TextColumn::make('question_text')
                    ->limit(50)
                    ->searchable(),

                Tables\Columns\TextColumn::make('question_type')
                    ->badge(),

                Tables\Columns\TextColumn::make('correct_answer')
                    ->limit(20),

                Tables\Columns\TextColumn::make('points'),

                Tables\Columns\TextColumn::make('enemy_sprite')
                    ->badge()
                    ->color('info'),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }
}
