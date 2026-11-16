<?php

namespace App\Enums;

enum UserStatus: string
{
    use HasValues;

    case Active = 'active';
    case Suspended = 'suspended';
}
