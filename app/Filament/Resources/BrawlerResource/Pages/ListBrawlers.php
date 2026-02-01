<?php

namespace App\Filament\Resources\BrawlerResource\Pages;

use App\Filament\Resources\BrawlerResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListBrawlers extends ListRecords
{
    protected static string $resource = BrawlerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
