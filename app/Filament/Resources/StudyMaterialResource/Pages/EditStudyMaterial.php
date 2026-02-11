<?php

namespace App\Filament\Resources\StudyMaterialResource\Pages;

use App\Filament\Resources\StudyMaterialResource;
use App\Jobs\ParseStudyMaterialJob;
use App\Services\ClaudeParserService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditStudyMaterial extends EditRecord
{
    protected static string $resource = StudyMaterialResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('parseWithAi')
                ->label('Parse with AI')
                ->icon('heroicon-o-sparkles')
                ->color('primary')
                ->visible(fn () => $this->record
                    && in_array($this->record->status, ['pending', 'failed'])
                    && $this->record->isApproved()
                    && $this->record->file_path
                    && $this->record->levels()->doesntExist()
                )
                ->requiresConfirmation()
                ->modalHeading('Parse with AI')
                ->modalDescription('This will send the uploaded study material to AI for parsing and question generation.')
                ->action(function () {
                    $parser = new ClaudeParserService();

                    if (!$parser->isConfigured()) {
                        Notification::make()
                            ->title('API Key Not Configured')
                            ->body('Please add your ANTHROPIC_API_KEY to the .env file.')
                            ->danger()
                            ->send();
                        return;
                    }

                    $this->record->update([
                        'status' => 'parsing',
                        'parse_progress' => 0,
                        'parse_message' => 'Starting...',
                        'error_message' => null,
                    ]);

                    ParseStudyMaterialJob::dispatch($this->record);

                    Notification::make()
                        ->title('Parsing Started')
                        ->body('The study material is being processed. Refresh the page to check progress.')
                        ->info()
                        ->send();
                }),

            Actions\DeleteAction::make(),
        ];
    }
}
