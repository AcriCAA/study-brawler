<?php

namespace App\Filament\Resources\StudyMaterialResource\Pages;

use App\Filament\Resources\StudyMaterialResource;
use App\Models\StudyMaterial;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListStudyMaterials extends ListRecords
{
    protected static string $resource = StudyMaterialResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    // Poll every 2 seconds while there's a parsing job
    public function getTablePollingInterval(): ?string
    {
        return StudyMaterial::where('status', 'parsing')->exists() ? '2s' : null;
    }
}
