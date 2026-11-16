<?php

namespace Tests\Concurrency;

use App\Actions\Urgent\CreateUrgentRequest;
use App\Jobs\DispatchUrgentRequestJob;
use App\Jobs\FinalizeUrgentRequestJob;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\Specialty;
use App\Models\UrgentRequest;
use App\Services\Urgent\UrgentDispatcher;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsVolunteers;

/**
 * SRS §21 Scenario 2: several volunteer doctors accept the same urgent request simultaneously.
 * Expected: exactly one success, the others 409, exactly one winning dispatch recorded.
 */
class UrgentAcceptConcurrencyTest extends ConcurrencyTestCase
{
    use BuildsVolunteers;

    private const DOCTORS = 6;

    public function test_exactly_one_volunteer_wins(): void
    {
        [$request, $doctors] = $this->requestDispatchedToEveryDoctor();

        $this->assertSingleWinner($request, $doctors);
    }

    /** Spec 002 US6: a request kept open after an unanswered round is still accepted exactly once. */
    public function test_exactly_one_volunteer_wins_while_the_request_waits(): void
    {
        [$request, $doctors] = $this->requestDispatchedToEveryDoctor();
        app(UrgentDispatcher::class)->finalize($request->id);
        $this->assertSame('waiting', UrgentRequest::find($request->id)->status->value);

        $this->assertSingleWinner($request, $doctors);
    }

    /** @return array{UrgentRequest, Collection<int, DoctorProfile>} */
    private function requestDispatchedToEveryDoctor(): array
    {
        Notification::fake();
        Bus::fake([DispatchUrgentRequestJob::class, FinalizeUrgentRequestJob::class]);
        $this->geography();
        $specialty = Specialty::factory()->create();
        $doctors = collect(range(1, self::DOCTORS))->map(fn () => $this->volunteer($specialty, $this->nasrCity));

        $request = app(CreateUrgentRequest::class)->handle(PatientProfile::factory()->create(),
            $this->urgentPayload(['specialty_id' => $specialty->id]), '127.0.0.1');
        $this->assertSame(self::DOCTORS, $request->dispatches()->count());

        return [$request, $doctors];
    }

    /** @param Collection<int, DoctorProfile> $doctors */
    private function assertSingleWinner(UrgentRequest $request, Collection $doctors): void
    {
        $results = $this->runConcurrently('testing:urgent-accept',
            $doctors->map(fn ($d) => [$request->id, $d->id])->all());

        $wins = array_filter($results, fn ($r) => $r['ok']);
        $this->assertCount(1, $wins, json_encode($results));
        foreach (array_filter($results, fn ($r) => ! $r['ok']) as $loss) {
            $this->assertSame(409, $loss['status']);
            $this->assertContains($loss['code'], ['urgent_already_accepted', 'urgent_not_available']);
        }

        $fresh = UrgentRequest::find($request->id);
        $this->assertSame('accepted', $fresh->status->value);
        $this->assertSame(1, $fresh->dispatches()->where('status', 'accepted')->count());
        $this->assertSame($fresh->accepted_doctor_profile_id, $fresh->dispatches()->where('status', 'accepted')->value('doctor_profile_id'));
        $this->assertSame(self::DOCTORS - 1, $fresh->dispatches()->where('status', 'lost')->count());
    }
}
