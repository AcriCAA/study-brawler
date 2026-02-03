<?php

namespace App\Filament\Resources\StudentResource\Pages;

use App\Filament\Resources\StudentResource;
use App\Services\UsernameGeneratorService;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Hash;

class CreateStudent extends CreateRecord
{
    protected static string $resource = StudentResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $generator = new UsernameGeneratorService();

        $username = $generator->generate();
        $password = $generator->generatePassword();

        $data['username'] = $username;
        $data['password'] = Hash::make($password);
        $data['plain_password'] = $password;

        return $data;
    }
}
