<?php

namespace App\Enums;

enum AffiliationStatus: string
{
    use HasValues;

    case Active = 'active';
    case Ended = 'ended';
}
