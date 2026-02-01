<?php

namespace App\Filament\Resources\BrawlerResource\Pages;

use App\Filament\Resources\BrawlerResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditBrawler extends EditRecord
{
    protected static string $resource = BrawlerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
