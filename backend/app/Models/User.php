<?php

namespace App\Models;

use App\Enums\ClinicPermission;
use App\Enums\ClinicRole;
use App\Enums\ClinicStatus;
use App\Enums\MembershipStatus;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUlids, Notifiable;

    protected $attributes = ['status' => 'active', 'locale' => 'ar'];

    protected $fillable = ['name', 'email', 'phone', 'password', 'locale'];

    protected $hidden = ['password', 'remember_token'];

    /** @var Collection<int, string>|null per-instance permission cache */
    private ?Collection $permissionCache = null;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'status' => UserStatus::class,
        ];
    }

    /** @return BelongsToMany<Role, $this> */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    /** @return HasOne<PatientProfile, $this> */
    public function patientProfile(): HasOne
    {
        return $this->hasOne(PatientProfile::class);
    }

    /** @return HasOne<DoctorProfile, $this> */
    public function doctorProfile(): HasOne
    {
        return $this->hasOne(DoctorProfile::class);
    }

    /** @return HasMany<ClinicMembership, $this> */
    public function clinicMemberships(): HasMany
    {
        return $this->hasMany(ClinicMembership::class);
    }

    public function hasRole(RoleName|string $role): bool
    {
        $name = $role instanceof RoleName ? $role->value : $role;

        return $this->roles->contains('name', $name);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(RoleName::Admin);
    }

    public function assignRole(RoleName $role): void
    {
        $roleModel = Role::where('name', $role->value)->firstOrFail();
        $this->roles()->syncWithoutDetaching([$roleModel->id]);
        $this->unsetRelation('roles');
        $this->permissionCache = null;
    }

    /** @return Collection<int, string> */
    public function permissionNames(): Collection
    {
        return $this->permissionCache ??= $this->roles()
            ->join('role_permissions', 'roles.id', '=', 'role_permissions.role_id')
            ->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
            ->pluck('permissions.name')
            ->unique()
            ->values();
    }

    public function hasPermission(string $permission): bool
    {
        return $this->permissionNames()->contains($permission);
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    /** Active membership role in an active clinic, or null: a suspended clinic grants its staff nothing. */
    public function clinicRole(string $clinicId): ?ClinicRole
    {
        $membership = $this->loadMissing('clinicMemberships.clinic')->clinicMemberships
            ->first(fn (ClinicMembership $m) => $m->clinic_id === $clinicId
                && $m->status === MembershipStatus::Active
                && $m->clinic->status === ClinicStatus::Active);

        return $membership?->role;
    }

    public function hasClinicPermission(string $clinicId, ClinicPermission $permission): bool
    {
        return (bool) $this->clinicRole($clinicId)?->can($permission);
    }
}
