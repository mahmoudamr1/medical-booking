<?php

namespace App\Enums;

enum VerificationStatus: string
{
    use HasValues;

    case Draft = 'draft';
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Suspended = 'suspended';
}
