<?php

namespace App\Enums;

/** Who performed an appointment / urgent-request transition. Recorded in status histories. */
enum ActorRole: string
{
    use HasValues;

    case Patient = 'patient';
    case Doctor = 'doctor';
    case Clinic = 'clinic';
    case Admin = 'admin';
    case System = 'system';
}
