<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LevelResource\Pages;
use App\Models\Level;
use App\Models\Student;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Notifications\Notification;

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

                        Forms\Components\Select::make('map_key')
                            ->label('Map')
                            ->options([
                                'forest' => 'Forest',
                                'dungeon' => 'Dungeon',
                                'village' => 'Village',
                                'epiclevel' => 'Epic Level',
                            ])
                            ->default('forest')
                            ->required()
                            ->helperText('Select the Tiled map to use for this level'),

                        Forms\Components\Select::make('bgm_key')
                            ->label('Background Music')
                            ->options(function () {
                                $files = glob(public_path('game/assets/audio/bgm_*.ogg'));
                                $options = [];
                                foreach ($files as $file) {
                                    $key = pathinfo($file, PATHINFO_FILENAME);
                                    $label = str_replace(['bgm_', '_'], ['', ' '], $key);
                                    $options[$key] = ucwords($label);
                                }
                                return $options;
                            })
                            ->default('bgm_battle')
                            ->required()
                            ->helperText('Select the background music track for this level'),

                        Forms\Components\TextInput::make('order')
                            ->numeric()
                            ->default(0),

                        Forms\Components\Toggle::make('is_published')
                            ->label('Published')
                            ->helperText('Only published levels appear in the game'),
                    ])->columns(2),

                Forms\Components\Section::make('Assigned Students')
                    ->schema([
                        Forms\Components\Select::make('students')
                            ->label('Students who can access this level')
                            ->multiple()
                            ->relationship('students', 'name')
                            ->preload()
                            ->searchable(),
                    ])
                    ->visible(fn ($record) => $record !== null),
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
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

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

                Tables\Columns\TextColumn::make('students_count')
                    ->label('Students')
                    ->counts('students')
                    ->badge()
                    ->color('info'),

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
                Tables\Actions\Action::make('playLevel')
                    ->label('Play')
                    ->icon('heroicon-o-play')
                    ->color('success')
                    ->url(fn (Level $record) => url("/admin/preview-level/{$record->id}"))
                    ->openUrlInNewTab(),

                Tables\Actions\Action::make('assignStudents')
                    ->label('Assign')
                    ->icon('heroicon-o-user-plus')
                    ->color('info')
                    ->iconButton()
                    ->tooltip('Assign students')
                    ->form([
                        Forms\Components\Select::make('student_ids')
                            ->label('Select Students')
                            ->multiple()
                            ->options(Student::all()->pluck('name', 'id'))
                            ->preload()
                            ->searchable()
                            ->default(fn (Level $record) => $record->students->pluck('id')->toArray()),
                    ])
                    ->action(function (Level $record, array $data) {
                        $record->students()->sync($data['student_ids'] ?? []);

                        Notification::make()
                            ->title('Students Updated')
                            ->body('Level assigned to ' . count($data['student_ids'] ?? []) . ' student(s).')
                            ->success()
                            ->send();
                    }),

                Tables\Actions\Action::make('assignToAll')
                    ->label('Assign All')
                    ->icon('heroicon-o-users')
                    ->color('success')
                    ->iconButton()
                    ->tooltip('Assign to all students')
                    ->requiresConfirmation()
                    ->modalHeading('Assign to All Students')
                    ->modalDescription('This will assign this level to all students.')
                    ->action(function (Level $record) {
                        $studentIds = Student::pluck('id')->toArray();
                        $record->students()->sync($studentIds);

                        Notification::make()
                            ->title('Assigned to All')
                            ->body('Level assigned to ' . count($studentIds) . ' student(s).')
                            ->success()
                            ->send();
                    }),

                Tables\Actions\EditAction::make()
                    ->iconButton(),

                Tables\Actions\Action::make('publish')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->iconButton()
                    ->tooltip('Publish')
                    ->visible(fn (Level $record) => !$record->is_published)
                    ->action(fn (Level $record) => $record->update(['is_published' => true])),

                Tables\Actions\Action::make('unpublish')
                    ->icon('heroicon-o-x-circle')
                    ->color('warning')
                    ->iconButton()
                    ->tooltip('Unpublish')
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
