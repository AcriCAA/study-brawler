<?php

namespace App\Filament\Resources\GameSessionResource\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class QuestionAttemptsRelationManager extends RelationManager
{
    protected static string $relationship = 'questionAttempts';

    protected static ?string $title = 'Question Attempts';

    public function table(Table $table): Table
    {
        return $table
            ->paginated(false)
            ->columns([
                Tables\Columns\TextColumn::make('question.question_text')
                    ->label('Question')
                    ->limit(80)
                    ->wrap(),

                Tables\Columns\TextColumn::make('attempts')
                    ->label('Attempts')
                    ->sortable(),

                Tables\Columns\IconColumn::make('answered_correctly')
                    ->label('Correct')
                    ->boolean(),
            ]);
    }
}
