<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

/** Unrelated users get 403 (AppointmentPolicy@view) before the payload is validated or any state is revealed. */
trait AuthorizesAppointmentAccess
{
    public function authorize(): Response
    {
        return Gate::inspect('view', $this->route('appointment'));
    }
}
