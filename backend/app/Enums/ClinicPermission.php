<?php

namespace App\Enums;

/** Permissions that clinic roles may hold inside their own organization. */
enum ClinicPermission: string
{
    use HasValues;

    case ManageOrganization = 'clinic.organization.manage';
    case ManageBranches = 'clinic.branches.manage';
    case ManageStaff = 'clinic.staff.manage';
    case ManageDoctors = 'clinic.doctors.manage';
    case ViewAppointments = 'clinic.appointments.view';
    case BookAppointments = 'clinic.appointments.book';
    case ManageAppointments = 'clinic.appointments.manage';
    case ViewSchedules = 'clinic.schedules.view';
    case ViewReports = 'clinic.reports.view';
}
