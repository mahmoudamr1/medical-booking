<?php

namespace App\Enums;

enum DocumentType: string
{
    use HasValues;

    case License = 'license';
    case IdCard = 'id_card';
    case Certificate = 'certificate';
    case Other = 'other';
}
