<?php

namespace Database\Factories;

use App\Models\Specialty;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Specialty> */
class SpecialtyFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'name_ar' => 'تخصص '.$name,
            'name_en' => Str::title($name),
            'icon' => 'stethoscope',
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
