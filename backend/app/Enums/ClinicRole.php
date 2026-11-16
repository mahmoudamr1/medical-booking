<?php

namespace App\Enums;

/** Role a user holds inside one clinic (tenant). */
enum ClinicRole: string
{
    use HasValues;

    case Owner = 'owner';
    case Manager = 'manager';
    case Receptionist = 'receptionist';

    /** @return list<string> roles that staff management may assign (the owner role is never assignable) */
    public static function assignableValues(): array
    {
        return [self::Manager->value, self::Receptionist->value];
    }

    /** @return list<ClinicPermission> */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner => ClinicPermission::cases(),
            self::Manager => [
                ClinicPermission::ManageBranches,
                ClinicPermission::ManageDoctors,
                ClinicPermission::ViewAppointments,
                ClinicPermission::BookAppointments,
                ClinicPermission::ManageAppointments,
                ClinicPermission::ViewSchedules,
                ClinicPermission::ViewReports,
            ],
            self::Receptionist => [
                ClinicPermission::ViewAppointments,
                ClinicPermission::BookAppointments,
                ClinicPermission::ManageAppointments,
                ClinicPermission::ViewSchedules,
            ],
        };
    }

    public function can(ClinicPermission $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }
}
