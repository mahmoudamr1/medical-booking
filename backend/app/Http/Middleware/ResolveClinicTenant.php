<?php

namespace App\Http\Middleware;

use App\Enums\ClinicPermission;
use App\Enums\ClinicStatus;
use App\Enums\MembershipStatus;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tenant boundary for /clinics/{clinic}/... management routes.
 *
 * - The {clinic} route parameter is resolved ONLY through the caller's active membership.
 *   Non-members (including members of other clinics) get 404: existence is not disclosed.
 * - Optional permission argument: ->middleware('tenant:clinic.branches.manage') → 403 if the
 *   member's clinic role lacks it.
 * - The resolved Clinic and ClinicMembership are bound in the container for controllers/actions.
 */
class ResolveClinicTenant
{
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        // Implicit binding may already have resolved the model; the membership check below is
        // what grants access either way.
        $param = $request->route('clinic');
        $clinicId = $param instanceof Clinic ? $param->id : (string) $param;
        $user = $request->user();

        $membership = ClinicMembership::query()
            ->where('clinic_id', $clinicId)
            ->where('user_id', $user->id)
            ->where('status', MembershipStatus::Active->value)
            ->with('clinic')
            ->first();

        if (! $membership || $membership->clinic->status !== ClinicStatus::Active) {
            throw (new ModelNotFoundException)->setModel(Clinic::class, [$clinicId]);
        }

        if ($permission !== null && ! $membership->role->can(ClinicPermission::from($permission))) {
            throw new AuthorizationException;
        }

        $request->route()->setParameter('clinic', $membership->clinic);
        app()->instance(Clinic::class, $membership->clinic);
        app()->instance(ClinicMembership::class, $membership);

        return $next($request);
    }
}
