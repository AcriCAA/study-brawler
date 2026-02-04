<?php

namespace App\Filament\Resources;

use App\Filament\Resources\BrawlerResource\Pages;
use App\Models\Brawler;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class BrawlerResource extends Resource
{
    protected static ?string $model = Brawler::class;

    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $navigationIcon = 'heroicon-o-bolt';

    protected static ?string $navigationGroup = 'Players';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Brawler Details')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->required()
                            ->maxLength(255),

                        Forms\Components\TextInput::make('sprite_key')
                            ->required()
                            ->maxLength(255)
                            ->helperText('Used to load the sprite in the game'),

                        Forms\Components\Textarea::make('description')
                            ->rows(2),

                        Forms\Components\TextInput::make('unlock_stars_required')
                            ->numeric()
                            ->default(0)
                            ->helperText('Stars needed to unlock this brawler'),

                        Forms\Components\ColorPicker::make('color')
                            ->default('#4CAF50'),
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

                Tables\Columns\TextColumn::make('sprite_key')
                    ->badge(),

                Tables\Columns\ColorColumn::make('color'),

                Tables\Columns\TextColumn::make('unlock_stars_required')
                    ->sortable()
                    ->label('Stars Required'),

                Tables\Columns\TextColumn::make('students_count')
                    ->label('Players')
                    ->counts('students'),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
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
            'index' => Pages\ListBrawlers::route('/'),
            'create' => Pages\CreateBrawler::route('/create'),
            'edit' => Pages\EditBrawler::route('/{record}/edit'),
        ];
    }
}
