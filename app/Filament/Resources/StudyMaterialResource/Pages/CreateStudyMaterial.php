<?php

namespace App\Filament\Resources\StudyMaterialResource\Pages;

use App\Filament\Resources\StudyMaterialResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Auth;

class CreateStudyMaterial extends CreateRecord
{
    protected static string $resource = StudyMaterialResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['user_id'] = Auth::id();
        $data['original_filename'] = basename($data['file_path']);
        return $data;
    }
}
