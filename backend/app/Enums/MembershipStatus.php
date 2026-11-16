<?php

namespace App\Enums;

enum MembershipStatus: string
{
    use HasValues;

    case Invited = 'invited';
    case Active = 'active';
    case Suspended = 'suspended';
}
