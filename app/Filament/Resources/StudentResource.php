<?php

namespace App\Filament\Resources;

use App\Filament\Resources\StudentResource\Pages;
use App\Models\Student;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class StudentResource extends Resource
{
    protected static ?string $model = Student::class;

    protected static ?string $navigationIcon = 'heroicon-o-academic-cap';

    protected static ?string $navigationGroup = 'Players';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Student Profile')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->required()
                            ->maxLength(255),

                        Forms\Components\Select::make('avatar')
                            ->options([
                                'default' => 'Default',
                                'ninja' => 'Ninja',
                                'wizard' => 'Wizard',
                                'knight' => 'Knight',
                                'archer' => 'Archer',
                            ])
                            ->default('default'),

                        Forms\Components\TextInput::make('total_stars')
                            ->numeric()
                            ->default(0)
                            ->disabled(),

                        Forms\Components\TextInput::make('total_xp')
                            ->numeric()
                            ->default(0)
                            ->disabled(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('avatar')
                    ->badge(),

                Tables\Columns\TextColumn::make('total_stars')
                    ->sortable()
                    ->label('Stars'),

                Tables\Columns\TextColumn::make('total_xp')
                    ->sortable()
                    ->label('XP'),

                Tables\Columns\TextColumn::make('progress_count')
                    ->label('Levels Played')
                    ->counts('progress'),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('resetProgress')
                    ->label('Reset Progress')
                    ->icon('heroicon-o-arrow-path')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->action(function (Student $record) {
                        $record->progress()->delete();
                        $record->update([
                            'total_stars' => 0,
                            'total_xp' => 0,
                        ]);
                    }),
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
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListStudents::route('/'),
            'create' => Pages\CreateStudent::route('/create'),
            'edit' => Pages\EditStudent::route('/{record}/edit'),
        ];
    }
}
