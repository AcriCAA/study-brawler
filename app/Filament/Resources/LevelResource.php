<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LevelResource\Pages;
use App\Models\Level;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class LevelResource extends Resource
{
    protected static ?string $model = Level::class;

    protected static ?string $navigationIcon = 'heroicon-o-puzzle-piece';

    protected static ?string $navigationGroup = 'Content';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Level Details')
                    ->schema([
                        Forms\Components\Select::make('study_material_id')
                            ->relationship('studyMaterial', 'title')
                            ->required()
                            ->searchable(),

                        Forms\Components\TextInput::make('title')
                            ->required()
                            ->maxLength(255),

                        Forms\Components\Textarea::make('description')
                            ->rows(3),

                        Forms\Components\Select::make('difficulty')
                            ->options([
                                1 => 'Easy',
                                2 => 'Medium',
                                3 => 'Hard',
                                4 => 'Expert',
                                5 => 'Master',
                            ])
                            ->default(1)
                            ->required(),

                        Forms\Components\Select::make('background_theme')
                            ->options([
                                'forest' => 'Forest',
                                'ocean' => 'Ocean',
                                'desert' => 'Desert',
                                'space' => 'Space',
                                'jungle' => 'Jungle',
                                'arctic' => 'Arctic',
                            ])
                            ->default('forest')
                            ->required(),

                        Forms\Components\TextInput::make('order')
                            ->numeric()
                            ->default(0),

                        Forms\Components\Toggle::make('is_published')
                            ->label('Published')
                            ->helperText('Only published levels appear in the game'),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('studyMaterial.title')
                    ->label('Study Material')
                    ->sortable(),

                Tables\Columns\TextColumn::make('difficulty')
                    ->badge()
                    ->color(fn (int $state): string => match ($state) {
                        1 => 'success',
                        2 => 'info',
                        3 => 'warning',
                        4 => 'danger',
                        5 => 'gray',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (int $state): string => match ($state) {
                        1 => 'Easy',
                        2 => 'Medium',
                        3 => 'Hard',
                        4 => 'Expert',
                        5 => 'Master',
                        default => 'Unknown',
                    }),

                Tables\Columns\TextColumn::make('questions_count')
                    ->label('Questions')
                    ->counts('questions'),

                Tables\Columns\IconColumn::make('is_published')
                    ->boolean()
                    ->label('Published'),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('difficulty')
                    ->options([
                        1 => 'Easy',
                        2 => 'Medium',
                        3 => 'Hard',
                        4 => 'Expert',
                        5 => 'Master',
                    ]),
                Tables\Filters\TernaryFilter::make('is_published')
                    ->label('Published'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('publish')
                    ->label('Publish')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (Level $record) => !$record->is_published)
                    ->action(fn (Level $record) => $record->update(['is_published' => true])),
                Tables\Actions\Action::make('unpublish')
                    ->label('Unpublish')
                    ->icon('heroicon-o-x-circle')
                    ->color('warning')
                    ->visible(fn (Level $record) => $record->is_published)
                    ->action(fn (Level $record) => $record->update(['is_published' => false])),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            LevelResource\RelationManagers\QuestionsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLevels::route('/'),
            'create' => Pages\CreateLevel::route('/create'),
            'edit' => Pages\EditLevel::route('/{record}/edit'),
        ];
    }
}
