<?php

namespace Database\Seeders;

use App\Models\Specialty;
use Illuminate\Database\Seeder;

/** Initial specialty directory (managed by admins afterwards). Idempotent by slug. */
class SpecialtySeeder extends Seeder
{
    private const DATA = [
        ['cardiology', 'أمراض القلب', 'Cardiology', 'heart', 'تشخيص وعلاج أمراض القلب والأوعية الدموية', 'Heart and blood vessel conditions'],
        ['dermatology', 'الجلدية', 'Dermatology', 'sparkles', 'أمراض الجلد والشعر والأظافر', 'Skin, hair and nail conditions'],
        ['pediatrics', 'طب الأطفال', 'Pediatrics', 'baby', 'رعاية صحة الأطفال وحديثي الولادة', 'Health care for infants and children'],
        ['orthopedics', 'العظام', 'Orthopedics', 'bone', 'العظام والمفاصل والإصابات', 'Bones, joints and injuries'],
        ['ophthalmology', 'طب العيون', 'Ophthalmology', 'eye', 'أمراض العيون والإبصار', 'Eye and vision care'],
        ['ent', 'الأنف والأذن والحنجرة', 'ENT', 'ear', 'أمراض الأنف والأذن والحنجرة', 'Ear, nose and throat'],
        ['neurology', 'المخ والأعصاب', 'Neurology', 'brain', 'أمراض الجهاز العصبي', 'Nervous system disorders'],
        ['psychiatry', 'الطب النفسي', 'Psychiatry', 'brain-circuit', 'الصحة النفسية', 'Mental health'],
        ['general-surgery', 'الجراحة العامة', 'General Surgery', 'scissors', 'العمليات الجراحية العامة', 'General surgical care'],
        ['gynecology', 'النساء والتوليد', 'Gynecology', 'heart-pulse', 'صحة المرأة والحمل والولادة', "Women's health, pregnancy and birth"],
        ['internal-medicine', 'الباطنة', 'Internal Medicine', 'stethoscope', 'الأمراض الباطنية لدى البالغين', 'Adult internal conditions'],
        ['dentistry', 'الأسنان', 'Dentistry', 'smile', 'صحة الفم والأسنان', 'Oral and dental care'],
        ['urology', 'المسالك البولية', 'Urology', 'droplets', 'أمراض المسالك البولية', 'Urinary tract conditions'],
        ['general-practice', 'الممارسة العامة', 'General Practice', 'activity', 'الرعاية الأولية والاستشارات العامة', 'Primary care and general consultations'],
    ];

    public function run(): void
    {
        foreach (self::DATA as $i => [$slug, $ar, $en, $icon, $descAr, $descEn]) {
            Specialty::updateOrCreate(['slug' => $slug], [
                'name_ar' => $ar, 'name_en' => $en, 'icon' => $icon,
                'description_ar' => $descAr, 'description_en' => $descEn,
                'is_active' => true, 'sort_order' => $i,
                'is_general_practice' => $slug === 'general-practice',
            ]);
        }
    }
}
