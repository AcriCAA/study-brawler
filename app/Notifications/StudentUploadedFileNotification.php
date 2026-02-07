<?php

namespace App\Notifications;

use App\Models\Student;
use App\Models\StudyMaterial;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class StudentUploadedFileNotification extends Notification
{
    use Queueable;

    public function __construct(
        public StudyMaterial $studyMaterial,
        public Student $student
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return \Filament\Notifications\Notification::make()
            ->title('New Student Upload Needs Review')
            ->icon('heroicon-o-document-arrow-up')
            ->iconColor('warning')
            ->body("**{$this->student->name}** uploaded \"{$this->studyMaterial->title}\" for review.")
            ->actions([
                \Filament\Notifications\Actions\Action::make('view')
                    ->label('Review Upload')
                    ->url(route('filament.admin.resources.study-materials.index', [
                        'tableFilters[approval_status][value]' => 'pending_approval',
                    ]))
                    ->markAsRead(),
            ])
            ->getDatabaseMessage();
    }
}
