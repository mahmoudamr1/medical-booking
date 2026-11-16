<?php

namespace App\Actions\Booking;

use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Pending (manual-confirmation) holds block their period until hold_expires_at; after that they
 * must be EXPIRED (not just ignored) before the period can be booked again, because the DB
 * exclusion constraint still sees them as blocking. Idempotent.
 */
final class ExpireStaleHolds
{
    public function forDoctor(string $doctorProfileId): int
    {
        return $this->expire(Appointment::where('doctor_profile_id', $doctorProfileId));
    }

    public function all(): int
    {
        return $this->expire(Appointment::query());
    }

    /** @param Builder<Appointment> $scope */
    private function expire($scope): int
    {
        return DB::transaction(function () use ($scope) {
            $ids = $scope->where('status', AppointmentStatus::PendingConfirmation->value)
                ->where('hold_expires_at', '<=', now())
                ->lockForUpdate()
                ->pluck('id');

            if ($ids->isEmpty()) {
                return 0;
            }

            Appointment::whereIn('id', $ids)->update(['status' => AppointmentStatus::Expired->value, 'updated_at' => now()]);
            DB::table('appointment_status_histories')->insert($ids->map(fn ($id) => [
                'appointment_id' => $id,
                'from_status' => AppointmentStatus::PendingConfirmation->value,
                'to_status' => AppointmentStatus::Expired->value,
                'actor_role' => ActorRole::System->value,
                'reason' => 'hold_expired',
                'created_at' => now(),
            ])->all());

            return $ids->count();
        });
    }
}
