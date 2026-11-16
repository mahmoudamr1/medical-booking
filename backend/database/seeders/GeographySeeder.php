<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\City;
use App\Models\Governorate;
use Illuminate\Database\Seeder;

/** Egypt governorates with major cities/areas. Idempotent (keyed by slug). */
class GeographySeeder extends Seeder
{
    /** slug => [ar, en, [citySlug => [ar, en, [areaSlug => [ar, en]]]]] */
    private const DATA = [
        'cairo' => ['القاهرة', 'Cairo', [
            'nasr-city' => ['مدينة نصر', 'Nasr City', ['abbas-el-akkad' => ['عباس العقاد', 'Abbas El Akkad'], 'makram-ebeid' => ['مكرم عبيد', 'Makram Ebeid']]],
            'heliopolis' => ['مصر الجديدة', 'Heliopolis', ['korba' => ['الكوربة', 'Korba'], 'roxy' => ['روكسي', 'Roxy']]],
            'maadi' => ['المعادي', 'Maadi', ['degla' => ['دجلة', 'Degla'], 'sarayat' => ['السرايات', 'Sarayat']]],
            'downtown' => ['وسط البلد', 'Downtown', []],
            'new-cairo' => ['القاهرة الجديدة', 'New Cairo', ['fifth-settlement' => ['التجمع الخامس', 'Fifth Settlement'], 'rehab' => ['الرحاب', 'Al Rehab']]],
            'shubra' => ['شبرا', 'Shubra', []],
        ]],
        'giza' => ['الجيزة', 'Giza', [
            'dokki' => ['الدقي', 'Dokki', []],
            'mohandessin' => ['المهندسين', 'Mohandessin', []],
            'haram' => ['الهرم', 'Haram', []],
            'sheikh-zayed' => ['الشيخ زايد', 'Sheikh Zayed', []],
            '6th-of-october' => ['السادس من أكتوبر', '6th of October', []],
        ]],
        'alexandria' => ['الإسكندرية', 'Alexandria', [
            'smouha' => ['سموحة', 'Smouha', []],
            'sidi-gaber' => ['سيدي جابر', 'Sidi Gaber', []],
            'miami' => ['ميامي', 'Miami', []],
            'agami' => ['العجمي', 'Agami', []],
        ]],
        'qalyubia' => ['القليوبية', 'Qalyubia', ['banha' => ['بنها', 'Banha', []], 'shubra-el-kheima' => ['شبرا الخيمة', 'Shubra El Kheima', []]]],
        'dakahlia' => ['الدقهلية', 'Dakahlia', ['mansoura' => ['المنصورة', 'Mansoura', []]]],
        'sharqia' => ['الشرقية', 'Sharqia', ['zagazig' => ['الزقازيق', 'Zagazig', []]]],
        'gharbia' => ['الغربية', 'Gharbia', ['tanta' => ['طنطا', 'Tanta', []], 'mahalla' => ['المحلة الكبرى', 'El Mahalla El Kubra', []]]],
        'monufia' => ['المنوفية', 'Monufia', ['shebin-el-kom' => ['شبين الكوم', 'Shebin El Kom', []]]],
        'beheira' => ['البحيرة', 'Beheira', ['damanhour' => ['دمنهور', 'Damanhour', []]]],
        'kafr-el-sheikh' => ['كفر الشيخ', 'Kafr El Sheikh', ['kafr-el-sheikh-city' => ['كفر الشيخ', 'Kafr El Sheikh', []]]],
        'damietta' => ['دمياط', 'Damietta', ['damietta-city' => ['دمياط', 'Damietta', []]]],
        'port-said' => ['بورسعيد', 'Port Said', ['port-said-city' => ['بورسعيد', 'Port Said', []]]],
        'ismailia' => ['الإسماعيلية', 'Ismailia', ['ismailia-city' => ['الإسماعيلية', 'Ismailia', []]]],
        'suez' => ['السويس', 'Suez', ['suez-city' => ['السويس', 'Suez', []]]],
        'faiyum' => ['الفيوم', 'Faiyum', ['faiyum-city' => ['الفيوم', 'Faiyum', []]]],
        'beni-suef' => ['بني سويف', 'Beni Suef', ['beni-suef-city' => ['بني سويف', 'Beni Suef', []]]],
        'minya' => ['المنيا', 'Minya', ['minya-city' => ['المنيا', 'Minya', []]]],
        'asyut' => ['أسيوط', 'Asyut', ['asyut-city' => ['أسيوط', 'Asyut', []]]],
        'sohag' => ['سوهاج', 'Sohag', ['sohag-city' => ['سوهاج', 'Sohag', []]]],
        'qena' => ['قنا', 'Qena', ['qena-city' => ['قنا', 'Qena', []]]],
        'luxor' => ['الأقصر', 'Luxor', ['luxor-city' => ['الأقصر', 'Luxor', []]]],
        'aswan' => ['أسوان', 'Aswan', ['aswan-city' => ['أسوان', 'Aswan', []]]],
        'red-sea' => ['البحر الأحمر', 'Red Sea', ['hurghada' => ['الغردقة', 'Hurghada', []]]],
        'matrouh' => ['مطروح', 'Matrouh', ['marsa-matrouh' => ['مرسى مطروح', 'Marsa Matrouh', []]]],
        'new-valley' => ['الوادي الجديد', 'New Valley', ['kharga' => ['الخارجة', 'Kharga', []]]],
        'north-sinai' => ['شمال سيناء', 'North Sinai', ['arish' => ['العريش', 'Arish', []]]],
        'south-sinai' => ['جنوب سيناء', 'South Sinai', ['sharm-el-sheikh' => ['شرم الشيخ', 'Sharm El Sheikh', []]]],
    ];

    public function run(): void
    {
        $order = 0;
        foreach (self::DATA as $gSlug => [$gAr, $gEn, $cities]) {
            $gov = Governorate::updateOrCreate(['slug' => $gSlug], ['name_ar' => $gAr, 'name_en' => $gEn, 'sort_order' => $order++]);
            foreach ($cities as $cSlug => [$cAr, $cEn, $areas]) {
                $city = City::updateOrCreate(['governorate_id' => $gov->id, 'slug' => $cSlug], ['name_ar' => $cAr, 'name_en' => $cEn]);
                foreach ($areas as $aSlug => [$aAr, $aEn]) {
                    Area::updateOrCreate(['city_id' => $city->id, 'slug' => $aSlug], ['name_ar' => $aAr, 'name_en' => $aEn]);
                }
            }
        }
    }
}
