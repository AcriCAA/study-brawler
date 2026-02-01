<?php

namespace App\Filament\Resources;

use App\Filament\Resources\StudyMaterialResource\Pages;
use App\Jobs\ParseStudyMaterialJob;
use App\Models\StudyMaterial;
use App\Services\ClaudeParserService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Notifications\Notification;
use Illuminate\Support\HtmlString;

class StudyMaterialResource extends Resource
{
    protected static ?string $model = StudyMaterial::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-text';

    protected static ?string $navigationGroup = 'Content';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Study Material')
                    ->schema([
                        Forms\Components\TextInput::make('title')
                            ->required()
                            ->maxLength(255),

                        Forms\Components\FileUpload::make('file_path')
                            ->label('Upload Study Sheet (Image or PDF)')
                            ->disk('public')
                            ->directory('study-materials')
                            ->required()
                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
                            ->maxSize(10240) // 10MB max
                            ->columnSpanFull(),

                        Forms\Components\Select::make('status')
                            ->options([
                                'pending' => 'Pending',
                                'parsing' => 'Parsing',
                                'parsed' => 'Parsed',
                                'failed' => 'Failed',
                            ])
                            ->default('pending')
                            ->disabled()
                            ->dehydrated(),
                    ]),

                Forms\Components\Section::make('Parsed Content')
                    ->schema([
                        Forms\Components\Placeholder::make('parsed_preview')
                            ->label('AI Extracted Content')
                            ->content(function ($record) {
                                if (!$record || !$record->parsed_content) {
                                    return 'No content parsed yet. Upload an image and click "Parse with AI".';
                                }
                                $content = $record->parsed_content;
                                $html = '<div class="space-y-2">';
                                $html .= '<p><strong>Title:</strong> ' . ($content['title'] ?? 'N/A') . '</p>';
                                $html .= '<p><strong>Subject:</strong> ' . ($content['subject'] ?? 'N/A') . '</p>';
                                $html .= '<p><strong>Questions Generated:</strong> ' . count($content['questions'] ?? []) . '</p>';
                                $html .= '<p><strong>Vocabulary Terms:</strong> ' . count($content['vocabulary'] ?? []) . '</p>';
                                $html .= '</div>';
                                return new \Illuminate\Support\HtmlString($html);
                            }),

                        Forms\Components\Textarea::make('error_message')
                            ->label('Error Message')
                            ->disabled()
                            ->visible(fn ($record) => $record && $record->status === 'failed'),
                    ])
                    ->visible(fn ($record) => $record !== null),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('file_type')
                    ->label('Type')
                    ->getStateUsing(fn ($record) => str_ends_with($record->file_path, '.pdf') ? 'PDF' : 'Image')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'PDF' ? 'danger' : 'success'),

                Tables\Columns\TextColumn::make('title')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending' => 'warning',
                        'parsing' => 'info',
                        'parsed' => 'success',
                        'failed' => 'danger',
                        default => 'gray',
                    }),

                Tables\Columns\TextColumn::make('parse_progress')
                    ->label('Progress')
                    ->formatStateUsing(function ($state, $record) {
                        if ($record->status !== 'parsing') {
                            return '';
                        }
                        $percent = $state ?? 0;
                        $message = $record->parse_message ?? 'Processing...';
                        return new HtmlString("
                            <div class='w-32'>
                                <div class='text-xs text-gray-500 mb-1'>{$message}</div>
                                <div class='w-full bg-gray-200 rounded-full h-2'>
                                    <div class='bg-primary-600 h-2 rounded-full transition-all duration-500' style='width: {$percent}%'></div>
                                </div>
                                <div class='text-xs text-gray-400 mt-1'>{$percent}%</div>
                            </div>
                        ");
                    }),

                Tables\Columns\TextColumn::make('levels_count')
                    ->label('Levels')
                    ->counts('levels'),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'parsing' => 'Parsing',
                        'parsed' => 'Parsed',
                        'failed' => 'Failed',
                    ]),
            ])
            ->actions([
                Tables\Actions\Action::make('parse')
                    ->label('Parse with AI')
                    ->icon('heroicon-o-sparkles')
                    ->color('primary')
                    ->visible(fn (StudyMaterial $record) => in_array($record->status, ['pending', 'failed']))
                    ->action(function (StudyMaterial $record) {
                        $parser = new ClaudeParserService();

                        if (!$parser->isConfigured()) {
                            Notification::make()
                                ->title('API Key Not Configured')
                                ->body('Please add your ANTHROPIC_API_KEY to the .env file.')
                                ->danger()
                                ->send();
                            return;
                        }

                        // Reset progress and dispatch job
                        $record->update([
                            'status' => 'parsing',
                            'parse_progress' => 0,
                            'parse_message' => 'Starting...',
                            'error_message' => null,
                        ]);

                        // Dispatch to queue
                        ParseStudyMaterialJob::dispatch($record);

                        Notification::make()
                            ->title('Parsing Started')
                            ->body('The study material is being processed. The page will refresh automatically.')
                            ->info()
                            ->send();
                    }),

                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
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
            'index' => Pages\ListStudyMaterials::route('/'),
            'create' => Pages\CreateStudyMaterial::route('/create'),
            'edit' => Pages\EditStudyMaterial::route('/{record}/edit'),
        ];
    }
}
