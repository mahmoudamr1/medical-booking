<?php

namespace Database\Factories;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicBranch;
use App\Models\Governorate;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<ClinicBranch> */
class ClinicBranchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'name_ar' => 'الفرع الرئيسي',
            'name_en' => 'Main branch',
            'governorate_id' => fn () => self::governorate()->id,
            'city_id' => fn (array $attrs) => self::city($attrs['governorate_id'])->id,
            'address_ar' => 'شارع تجريبي',
            'address_en' => 'Sample street',
            'is_active' => true,
        ];
    }

    public static function governorate(string $slug = 'cairo'): Governorate
    {
        return Governorate::firstOrCreate(['slug' => $slug], ['name_ar' => 'القاهرة', 'name_en' => Str::title($slug)]);
    }

    public static function city(string $governorateId, string $slug = 'nasr-city'): City
    {
        return City::firstOrCreate(
            ['governorate_id' => $governorateId, 'slug' => $slug],
            ['name_ar' => 'مدينة نصر', 'name_en' => Str::title(str_replace('-', ' ', $slug))],
        );
    }
}
