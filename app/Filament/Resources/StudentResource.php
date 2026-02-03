<?php

namespace App\Filament\Resources;

use App\Filament\Resources\StudentResource\Pages;
use App\Models\Student;
use App\Services\UsernameGeneratorService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\HtmlString;

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

                Forms\Components\Section::make('Login Credentials')
                    ->schema([
                        Forms\Components\Placeholder::make('credentials_info')
                            ->label('')
                            ->content(fn ($record) => $record
                                ? new HtmlString('<p class="text-sm text-gray-500">Share these credentials with the student so they can log in to the game.</p>')
                                : new HtmlString('<p class="text-sm text-gray-500">Credentials will be auto-generated when the student is created.</p>')
                            ),

                        Forms\Components\TextInput::make('username')
                            ->label('Username')
                            ->disabled()
                            ->dehydrated(false)
                            ->visible(fn ($record) => $record !== null)
                            ->suffixAction(
                                Forms\Components\Actions\Action::make('copyUsername')
                                    ->icon('heroicon-o-clipboard')
                                    ->action(function ($state) {
                                        // Copy handled by JavaScript
                                    })
                                    ->extraAttributes([
                                        'x-on:click' => 'navigator.clipboard.writeText($wire.data.username); $tooltip("Copied!")',
                                    ])
                            ),

                        Forms\Components\Placeholder::make('password_display')
                            ->label('Password')
                            ->visible(fn ($record) => $record !== null)
                            ->content(function ($record) {
                                if (!$record) return '';
                                $password = $record->plain_password ?? '(hidden)';
                                return new HtmlString("
                                    <div class='flex items-center gap-2'>
                                        <code class='bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded'>{$password}</code>
                                        <button type='button' onclick='navigator.clipboard.writeText(\"{$password}\")' class='text-primary-500 hover:text-primary-700'>
                                            <svg class='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                                <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'></path>
                                            </svg>
                                        </button>
                                    </div>
                                ");
                            }),
                    ])
                    ->visible(fn ($record) => $record !== null),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('username')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->copyMessage('Username copied'),

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
                Tables\Actions\Action::make('viewCredentials')
                    ->label('Credentials')
                    ->icon('heroicon-o-key')
                    ->color('info')
                    ->modalHeading('Student Login Credentials')
                    ->modalDescription('Share these credentials with the student.')
                    ->modalContent(function (Student $record) {
                        return view('filament.resources.student-resource.credentials-modal', [
                            'student' => $record,
                        ]);
                    })
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Close'),

                Tables\Actions\Action::make('regenerateCredentials')
                    ->label('Regenerate')
                    ->icon('heroicon-o-arrow-path')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Regenerate Credentials')
                    ->modalDescription('This will generate a new username and password. The student will need to use the new credentials to log in.')
                    ->action(function (Student $record) {
                        $generator = new UsernameGeneratorService();
                        $newPassword = $generator->generatePassword();

                        $record->update([
                            'password' => Hash::make($newPassword),
                            'plain_password' => $newPassword,
                        ]);

                        // Revoke all existing tokens
                        $record->tokens()->delete();

                        Notification::make()
                            ->title('Credentials Regenerated')
                            ->body("New password: {$newPassword}")
                            ->success()
                            ->send();
                    }),

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
