<?php

namespace App\Filament\Resources;

use App\Filament\Resources\StudyMaterialResource\Pages;
use App\Jobs\ParseStudyMaterialJob;
use App\Models\Student;
use App\Models\StudentNotification;
use App\Models\StudyMaterial;
use App\Services\ClaudeParserService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Auth;
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

                        Forms\Components\Select::make('student_id')
                            ->label('Student')
                            ->options(Student::all()->pluck('name', 'id'))
                            ->required()
                            ->searchable()
                            ->preload(),

                        Forms\Components\FileUpload::make('file_path')
                            ->label('Upload Study Sheet (Image or PDF)')
                            ->disk('public')
                            ->directory('study-materials')
                            ->required()
                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
                            ->maxSize(51200) // 50MB max
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

                Forms\Components\Section::make('Approval Status')
                    ->schema([
                        Forms\Components\Select::make('approval_status')
                            ->options([
                                'auto_approved' => 'Auto Approved',
                                'pending_approval' => 'Pending Approval',
                                'approved' => 'Approved',
                                'denied' => 'Denied',
                            ])
                            ->default('auto_approved')
                            ->disabled()
                            ->dehydrated(),

                        Forms\Components\Textarea::make('approval_notes')
                            ->label('Approval Notes')
                            ->disabled()
                            ->visible(fn ($record) => $record && $record->approval_notes),

                        Forms\Components\Toggle::make('uploaded_by_student')
                            ->label('Uploaded by Student')
                            ->disabled()
                            ->dehydrated(false),
                    ])
                    ->visible(fn ($record) => $record !== null),

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
                                return new HtmlString($html);
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

                Tables\Columns\TextColumn::make('student.name')
                    ->label('Student')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\IconColumn::make('uploaded_by_student')
                    ->label('Student Upload')
                    ->boolean()
                    ->trueIcon('heroicon-o-user')
                    ->falseIcon('heroicon-o-academic-cap')
                    ->trueColor('info')
                    ->falseColor('gray'),

                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending' => 'warning',
                        'parsing' => 'info',
                        'parsed' => 'success',
                        'failed' => 'danger',
                        default => 'gray',
                    }),

                Tables\Columns\TextColumn::make('approval_status')
                    ->label('Approval')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'auto_approved' => 'success',
                        'approved' => 'success',
                        'pending_approval' => 'warning',
                        'denied' => 'danger',
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

                Tables\Filters\SelectFilter::make('approval_status')
                    ->options([
                        'auto_approved' => 'Auto Approved',
                        'pending_approval' => 'Pending Approval',
                        'approved' => 'Approved',
                        'denied' => 'Denied',
                    ]),

                Tables\Filters\SelectFilter::make('student_id')
                    ->label('Student')
                    ->options(Student::all()->pluck('name', 'id'))
                    ->searchable(),

                Tables\Filters\TernaryFilter::make('uploaded_by_student')
                    ->label('Upload Source')
                    ->trueLabel('Student Uploads')
                    ->falseLabel('Teacher Uploads'),
            ])
            ->actions([
                Tables\Actions\Action::make('approve')
                    ->label('Approve')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (StudyMaterial $record) => $record->approval_status === 'pending_approval')
                    ->requiresConfirmation()
                    ->modalHeading('Approve Study Material')
                    ->modalDescription('This will approve the study material and start AI parsing to create a level.')
                    ->action(function (StudyMaterial $record) {
                        $record->update([
                            'approval_status' => 'approved',
                            'approved_at' => now(),
                            'approved_by' => Auth::id(),
                        ]);

                        // Create approval notification for student
                        if ($record->student_id) {
                            StudentNotification::create([
                                'student_id' => $record->student_id,
                                'type' => 'upload_approved',
                                'title' => 'Study Guide Approved!',
                                'message' => "Your study guide \"{$record->title}\" has been approved and is being processed.",
                                'data' => ['study_material_id' => $record->id],
                            ]);
                        }

                        // Start parsing
                        $parser = new ClaudeParserService();
                        if ($parser->isConfigured()) {
                            $record->update([
                                'status' => 'parsing',
                                'parse_progress' => 0,
                                'parse_message' => 'Starting...',
                                'error_message' => null,
                            ]);
                            ParseStudyMaterialJob::dispatch($record);
                        }

                        Notification::make()
                            ->title('Study Material Approved')
                            ->body('The material has been approved and parsing has started.')
                            ->success()
                            ->send();
                    }),

                Tables\Actions\Action::make('deny')
                    ->label('Deny')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn (StudyMaterial $record) => $record->approval_status === 'pending_approval')
                    ->form([
                        Forms\Components\Textarea::make('denial_reason')
                            ->label('Reason for Denial')
                            ->required()
                            ->placeholder('Please explain why this study material is being denied...'),
                    ])
                    ->action(function (StudyMaterial $record, array $data) {
                        $record->update([
                            'approval_status' => 'denied',
                            'approval_notes' => $data['denial_reason'],
                            'approved_at' => now(),
                            'approved_by' => Auth::id(),
                        ]);

                        // Create denial notification for student
                        if ($record->student_id) {
                            StudentNotification::create([
                                'student_id' => $record->student_id,
                                'type' => 'upload_denied',
                                'title' => 'Study Guide Not Approved',
                                'message' => "Your study guide \"{$record->title}\" was not approved. Reason: {$data['denial_reason']}",
                                'data' => [
                                    'study_material_id' => $record->id,
                                    'reason' => $data['denial_reason'],
                                ],
                            ]);
                        }

                        Notification::make()
                            ->title('Study Material Denied')
                            ->body('The student has been notified.')
                            ->warning()
                            ->send();
                    }),

                Tables\Actions\Action::make('parse')
                    ->label('Parse with AI')
                    ->icon('heroicon-o-sparkles')
                    ->color('primary')
                    ->visible(fn (StudyMaterial $record) => in_array($record->status, ['pending', 'failed']) && $record->isApproved())
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
