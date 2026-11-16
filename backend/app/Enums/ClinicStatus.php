<?php

namespace App\Enums;

enum ClinicStatus: string
{
    use HasValues;

    case Active = 'active';
    case Suspended = 'suspended';
}
