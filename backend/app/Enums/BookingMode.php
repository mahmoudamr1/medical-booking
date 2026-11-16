<?php

namespace App\Enums;

enum BookingMode: string
{
    use HasValues;

    case Instant = 'instant';
    case Manual = 'manual';
}
