<?php

namespace App\Enums;

/** Platform-level roles. Clinic-scoped roles live in ClinicRole. */
enum RoleName: string
{
    use HasValues;

    case Patient = 'patient';
    case Doctor = 'doctor';
    case Admin = 'admin';
}
