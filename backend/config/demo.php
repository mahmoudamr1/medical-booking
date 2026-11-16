<?php

/*
| Development-only demo accounts (php artisan demo:seed). NEVER used in production:
| the seeder/command refuse to run there and login rejects these emails when APP_ENV=production.
| Passwords were generated once and are fixed so documentation and tests stay accurate;
| override any of them with DEMO_PASSWORD_<KEY> in .env.
*/
return [
    'accounts' => [
        'admin' => ['email' => 'admin@example.test', 'name' => 'مدير المنصة (تجريبي)', 'password' => env('DEMO_PASSWORD_ADMIN', 'Demo-GGH0Z6zRKs!'), 'dashboard' => '/dashboard/admin'],
        'patient' => ['email' => 'patient@example.test', 'name' => 'أحمد التجريبي', 'password' => env('DEMO_PASSWORD_PATIENT', 'Demo-AxXlsaoJM4!'), 'dashboard' => '/dashboard/patient'],
        'doctor' => ['email' => 'dr.karim@example.test', 'name' => 'د. كريم منصور', 'password' => env('DEMO_PASSWORD_DOCTOR', 'Demo-PUoLRPjAHp!'), 'dashboard' => '/dashboard/doctor'],
        'volunteer' => ['email' => 'dr.volunteer@example.test', 'name' => 'د. ليلى حمدي', 'password' => env('DEMO_PASSWORD_VOLUNTEER', 'Demo-hlUMkMhiOf!'), 'dashboard' => '/dashboard/doctor/urgent'],
        'pending' => ['email' => 'dr.pending@example.test', 'name' => 'د. طارق جمال', 'password' => env('DEMO_PASSWORD_PENDING', 'Demo-7ANWis8nIA!'), 'dashboard' => '/dashboard/doctor/verification'],
        'owner' => ['email' => 'clinic.owner@example.test', 'name' => 'مالك عيادة الشفاء', 'password' => env('DEMO_PASSWORD_OWNER', 'Demo-hYkWzO43sg!'), 'dashboard' => '/dashboard/clinic'],
        'reception' => ['email' => 'reception@example.test', 'name' => 'موظفة الاستقبال', 'password' => env('DEMO_PASSWORD_RECEPTION', 'Demo-Ws6Yu7zXIW!'), 'dashboard' => '/dashboard/clinic'],
    ],

    // Shared password for the supporting accounts (extra patients/doctors, second clinic owner).
    'support_password' => env('DEMO_PASSWORD_SUPPORT', 'Demo-RiHnPunOQz!'),
];
