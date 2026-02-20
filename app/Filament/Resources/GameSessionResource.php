<?php

namespace App\Filament\Resources;

use App\Filament\Resources\GameSessionResource\Pages;
use App\Filament\Resources\GameSessionResource\RelationManagers;
use App\Models\GameSession;
use App\Models\Level;
use App\Models\Student;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class GameSessionResource extends Resource
{
    protected static ?string $model = GameSession::class;

    protected static ?string $navigationIcon = 'heroicon-o-chart-bar';

    protected static ?string $navigationGroup = 'Analytics';

    protected static ?string $navigationLabel = 'Game Sessions';

    public static function canCreate(): bool
    {
        return false;
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Session Details')
                    ->columns(2)
                    ->schema([
                        Infolists\Components\TextEntry::make('student.name')
                            ->label('Student'),

                        Infolists\Components\TextEntry::make('level.title')
                            ->label('Level'),

                        Infolists\Components\TextEntry::make('outcome')
                            ->badge()
                            ->color(fn (string $state) => match ($state) {
                                'completed' => 'success',
                                'died' => 'danger',
                            }),

                        Infolists\Components\TextEntry::make('score')
                            ->numeric(),

                        Infolists\Components\TextEntry::make('stars_earned')
                            ->label('Stars'),

                        Infolists\Components\TextEntry::make('duration')
                            ->label('Duration')
                            ->getStateUsing(function (GameSession $record): string {
                                $seconds = $record->started_at->diffInSeconds($record->ended_at);
                                return sprintf('%d:%02d', intdiv($seconds, 60), $seconds % 60);
                            }),

                        Infolists\Components\TextEntry::make('started_at')
                            ->label('Started')
                            ->dateTime(),

                        Infolists\Components\TextEntry::make('ended_at')
                            ->label('Ended')
                            ->dateTime(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('student.name')
                    ->label('Student')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('level.title')
                    ->label('Level')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\BadgeColumn::make('outcome')
                    ->colors([
                        'success' => 'completed',
                        'danger' => 'died',
                    ]),

                Tables\Columns\TextColumn::make('score')
                    ->numeric()
                    ->sortable(),

                Tables\Columns\TextColumn::make('stars_earned')
                    ->label('Stars')
                    ->sortable(),

                Tables\Columns\TextColumn::make('duration')
                    ->label('Duration')
                    ->getStateUsing(function (GameSession $record): string {
                        $seconds = $record->started_at->diffInSeconds($record->ended_at);
                        return sprintf('%d:%02d', intdiv($seconds, 60), $seconds % 60);
                    }),

                Tables\Columns\TextColumn::make('question_attempts_count')
                    ->label('Questions Faced')
                    ->counts('questionAttempts')
                    ->sortable(),

                Tables\Columns\TextColumn::make('avg_attempts')
                    ->label('Avg Attempts')
                    ->getStateUsing(function (GameSession $record): string {
                        $avg = $record->questionAttempts()->avg('attempts');
                        return $avg !== null ? number_format((float) $avg, 1) : '—';
                    }),

                Tables\Columns\TextColumn::make('started_at')
                    ->label('Played At')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('outcome')
                    ->options([
                        'completed' => 'Completed',
                        'died' => 'Died',
                    ]),

                Tables\Filters\SelectFilter::make('student_id')
                    ->label('Student')
                    ->options(Student::orderBy('name')->pluck('name', 'id')),

                Tables\Filters\SelectFilter::make('level_id')
                    ->label('Level')
                    ->options(Level::orderBy('title')->pluck('title', 'id')),

                Tables\Filters\Filter::make('started_at')
                    ->form([
                        \Filament\Forms\Components\DatePicker::make('from')->label('From'),
                        \Filament\Forms\Components\DatePicker::make('until')->label('Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['from'], fn($q, $d) => $q->whereDate('started_at', '>=', $d))
                            ->when($data['until'], fn($q, $d) => $q->whereDate('started_at', '<=', $d));
                    }),
            ])
            ->defaultSort('started_at', 'desc')
            ->actions([
                Tables\Actions\ViewAction::make(),
            ]);
    }

    public static function getRelationManagers(): array
    {
        return [
            RelationManagers\QuestionAttemptsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListGameSessions::route('/'),
            'view' => Pages\ViewGameSession::route('/{record}'),
        ];
    }
}
