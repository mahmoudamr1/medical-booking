<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/** Idempotent: safe to run repeatedly. Required in every environment (incl. tests). */
class RolePermissionSeeder extends Seeder
{
    /** role => [label_ar, label_en, permissions[]] */
    public const MATRIX = [
        RoleName::Patient->value => ['مريض', 'Patient', [
            'appointments.book', 'appointments.view-own', 'reviews.create', 'urgent.request',
        ]],
        RoleName::Doctor->value => ['طبيب', 'Doctor', [
            'doctor.profile.manage', 'doctor.schedule.manage', 'doctor.appointments.manage',
            'doctor.verification.submit', 'volunteer.participate',
        ]],
        RoleName::Admin->value => ['مدير المنصة', 'Platform administrator', [
            'admin.access', 'users.manage', 'doctors.verify', 'specialties.manage', 'clinics.manage',
            'appointments.oversee', 'reviews.moderate', 'urgent.oversee', 'audit.view',
            'settings.manage', 'reports.view',
        ]],
    ];

    public function run(): void
    {
        foreach (self::MATRIX as $name => [$labelAr, $labelEn, $permissions]) {
            $role = Role::updateOrCreate(['name' => $name], ['label_ar' => $labelAr, 'label_en' => $labelEn]);
            $ids = collect($permissions)
                ->map(fn (string $p) => Permission::firstOrCreate(['name' => $p])->id)
                ->all();
            $role->permissions()->sync($ids);
        }
    }
}
