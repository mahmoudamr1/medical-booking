<?php

namespace Database\Seeders\Support;

/**
 * Synthetic catalog behind the showcase demo data: organizations and their branches, Egyptian
 * names, specialty titles and price ranges, and review texts. Data only; no behaviour.
 */
final class ShowcaseCatalog
{
    /** slug => [name_ar, name_en, [[city slug, branch ar, branch en, address ar, address en], ...]] */
    public const CLINICS = [
        'al-nada-specialized-hospital' => ['مستشفى الندى التخصصي', 'Al Nada Specialized Hospital', [
            ['smouha', 'فرع سموحة', 'Smouha Branch', 'طريق فوزي معاذ، سموحة', 'Fawzy Moaz Rd, Smouha'],
            ['sidi-gaber', 'فرع سيدي جابر', 'Sidi Gaber Branch', 'شارع أبو قير، سيدي جابر', 'Abu Qir St, Sidi Gaber'],
        ]],
        'care-medical-complex' => ['مجمع الرعاية الطبية', 'Care Medical Complex', [
            ['sheikh-zayed', 'فرع الشيخ زايد', 'Sheikh Zayed Branch', 'المحور المركزي، الشيخ زايد', 'Central Axis, Sheikh Zayed'],
            ['6th-of-october', 'فرع أكتوبر', '6th of October Branch', 'الحي المتميز، السادس من أكتوبر', 'Distinguished District, 6th of October'],
            ['mohandessin', 'فرع المهندسين', 'Mohandessin Branch', 'شارع جامعة الدول العربية', 'Gameat El Dewal St'],
        ]],
        'al-hayah-clinics' => ['عيادات الحياة', 'Al Hayah Clinics', [
            ['mansoura', 'فرع المنصورة', 'Mansoura Branch', 'شارع الجمهورية، المنصورة', 'El Gomhoria St, Mansoura'],
            ['tanta', 'فرع طنطا', 'Tanta Branch', 'شارع البحر، طنطا', 'El Bahr St, Tanta'],
        ]],
        'new-cairo-family-clinic' => ['عيادة القاهرة الجديدة للأسرة', 'New Cairo Family Clinic', [
            ['new-cairo', 'التجمع الخامس', 'Fifth Settlement', 'شارع التسعين الشمالي', 'North 90th St'],
        ]],
        // --- expansion (appended: keeps branch indexes of the original doctors stable) ---
        'cairo-heart-hospital' => ['مستشفى القاهرة للقلب', 'Cairo Heart Hospital', [
            ['heliopolis', 'مصر الجديدة', 'Heliopolis', 'شارع الميرغني', 'El Merghany St'],
            ['maadi', 'المعادي', 'Maadi', 'شارع 9، المعادي', 'Road 9, Maadi'],
        ]],
        'nile-view-hospital' => ['مستشفى النيل التخصصي', 'Nile View Specialized Hospital', [
            ['downtown', 'وسط البلد', 'Downtown', 'كورنيش النيل', 'Nile Corniche'],
            ['shubra', 'شبرا', 'Shubra', 'شارع شبرا الرئيسي', 'Shubra Main St'],
        ]],
        'giza-medical-center' => ['مركز الجيزة الطبي', 'Giza Medical Center', [
            ['dokki', 'الدقي', 'Dokki', 'شارع مصدق', 'Mossadak St'],
            ['haram', 'الهرم', 'Haram', 'شارع الهرم', 'Haram St'],
        ]],
        'alex-international-hospital' => ['مستشفى الإسكندرية الدولي', 'Alexandria International Hospital', [
            ['miami', 'ميامي', 'Miami', 'طريق الجيش، ميامي', 'El Geish Rd, Miami'],
            ['agami', 'العجمي', 'Agami', 'الطريق الرئيسي، العجمي', 'Main Rd, Agami'],
        ]],
        'delta-care-hospital' => ['مستشفى الدلتا كير', 'Delta Care Hospital', [
            ['zagazig', 'الزقازيق', 'Zagazig', 'شارع فاروق، الزقازيق', 'Farouk St, Zagazig'],
            ['shebin-el-kom', 'شبين الكوم', 'Shebin El Kom', 'شارع الجيش، شبين الكوم', 'El Geish St, Shebin El Kom'],
            ['banha', 'بنها', 'Banha', 'شارع فريد ندا، بنها', 'Farid Nada St, Banha'],
        ]],
        'canal-medical-center' => ['المركز الطبي لمدن القناة', 'Canal Cities Medical Center', [
            ['ismailia-city', 'الإسماعيلية', 'Ismailia', 'شارع الثلاثيني', 'El Thalatini St'],
            ['port-said-city', 'بورسعيد', 'Port Said', 'شارع 23 يوليو', '23 July St'],
            ['suez-city', 'السويس', 'Suez', 'شارع الجيش، السويس', 'El Geish St, Suez'],
        ]],
        'upper-egypt-hospital' => ['مستشفى الصعيد التخصصي', 'Upper Egypt Specialized Hospital', [
            ['asyut-city', 'أسيوط', 'Asyut', 'شارع الجمهورية، أسيوط', 'El Gomhoria St, Asyut'],
            ['minya-city', 'المنيا', 'Minya', 'كورنيش النيل، المنيا', 'Nile Corniche, Minya'],
            ['sohag-city', 'سوهاج', 'Sohag', 'شارع أحمد عرابي، سوهاج', 'Ahmed Orabi St, Sohag'],
        ]],
        'luxor-aswan-clinics' => ['عيادات الأقصر وأسوان', 'Luxor and Aswan Clinics', [
            ['luxor-city', 'الأقصر', 'Luxor', 'شارع التلفزيون، الأقصر', 'Television St, Luxor'],
            ['aswan-city', 'أسوان', 'Aswan', 'كورنيش النيل، أسوان', 'Nile Corniche, Aswan'],
        ]],
        'red-sea-medical-center' => ['مركز البحر الأحمر الطبي', 'Red Sea Medical Center', [
            ['hurghada', 'الغردقة', 'Hurghada', 'شارع الشيراتون', 'Sheraton Rd'],
            ['sharm-el-sheikh', 'شرم الشيخ', 'Sharm El Sheikh', 'خليج نعمة', 'Naama Bay'],
        ]],
        'kids-first-pediatric-hospital' => ['مستشفى الأطفال أولاً', 'Kids First Pediatric Hospital', [
            ['nasr-city', 'مدينة نصر', 'Nasr City', 'شارع مكرم عبيد', 'Makram Ebeid St'],
            ['mansoura', 'المنصورة', 'Mansoura', 'شارع جيهان، المنصورة', 'Gihan St, Mansoura'],
        ]],
        'smile-dental-centers' => ['مراكز سمايل لطب الأسنان', 'Smile Dental Centers', [
            ['mohandessin', 'المهندسين', 'Mohandessin', 'شارع شهاب', 'Shehab St'],
            ['smouha', 'سموحة', 'Smouha', 'شارع ألبرت الأول', 'Albert I St'],
            ['new-cairo', 'التجمع', 'New Cairo', 'شارع التسعين الجنوبي', 'South 90th St'],
        ]],
        'eye-vision-center' => ['مركز الرؤية لطب العيون', 'Eye Vision Center', [
            ['heliopolis', 'روكسي', 'Roxy', 'ميدان روكسي', 'Roxy Square'],
            ['tanta', 'طنطا', 'Tanta', 'شارع سعيد، طنطا', 'Saeed St, Tanta'],
        ]],
        'faiyum-beni-suef-hospital' => ['مستشفى الفيوم وبني سويف', 'Faiyum and Beni Suef Hospital', [
            ['faiyum-city', 'الفيوم', 'Faiyum', 'شارع الحرية، الفيوم', 'El Horreya St, Faiyum'],
            ['beni-suef-city', 'بني سويف', 'Beni Suef', 'شارع صلاح سالم', 'Salah Salem St'],
        ]],
        'coast-delta-clinics' => ['عيادات الساحل والدلتا', 'Coast and Delta Clinics', [
            ['damanhour', 'دمنهور', 'Damanhour', 'شارع عبد السلام الشاذلي', 'Abdel Salam El Shazly St'],
            ['kafr-el-sheikh-city', 'كفر الشيخ', 'Kafr El Sheikh', 'شارع الجيش', 'El Geish St'],
            ['damietta-city', 'دمياط', 'Damietta', 'كورنيش النيل، دمياط', 'Nile Corniche, Damietta'],
        ]],
    ];

    /** Organization kind per slug (showcase and core demo organizations). */
    public const TYPES = [
        'al-nada-specialized-hospital' => 'hospital', 'care-medical-complex' => 'medical_center', 'al-hayah-clinics' => 'clinic',
        'new-cairo-family-clinic' => 'clinic', 'cairo-heart-hospital' => 'hospital', 'nile-view-hospital' => 'hospital',
        'giza-medical-center' => 'medical_center', 'alex-international-hospital' => 'hospital', 'delta-care-hospital' => 'hospital',
        'canal-medical-center' => 'medical_center', 'upper-egypt-hospital' => 'hospital', 'luxor-aswan-clinics' => 'clinic',
        'red-sea-medical-center' => 'medical_center', 'kids-first-pediatric-hospital' => 'hospital', 'smile-dental-centers' => 'medical_center',
        'eye-vision-center' => 'medical_center', 'faiyum-beni-suef-hospital' => 'hospital', 'coast-delta-clinics' => 'clinic',
        'al-shifa-medical-center' => 'medical_center', 'nile-clinic' => 'clinic',
    ];

    public const MALE = ['أحمد', 'محمد', 'مصطفى', 'خالد', 'شريف', 'إسلام', 'وليد', 'تامر', 'حسام', 'عمرو', 'أيمن', 'باسم', 'مازن', 'رامي', 'هشام'];

    public const FEMALE = ['مريم', 'ياسمين', 'دينا', 'هبة', 'رنا', 'نهى', 'إيمان', 'شيماء', 'آية', 'سارة', 'منة', 'دعاء', 'رحاب', 'نيرة', 'غادة'];

    public const FAMILY = ['عبد الرحمن', 'السيد', 'الشافعي', 'المصري', 'فهمي', 'رشدي', 'عبد العزيز', 'النجار', 'الشريف', 'بدوي', 'زكي', 'حلمي', 'الجندي', 'سليمان', 'عثمان'];

    public const UNIVERSITIES = ['جامعة القاهرة', 'جامعة عين شمس', 'جامعة الإسكندرية', 'جامعة المنصورة', 'جامعة طنطا', 'جامعة أسيوط'];

    /** specialty slug => [title_ar consultant, title_ar specialist, title_en, price range] */
    public const TITLES = [
        'cardiology' => ['استشاري أمراض القلب والأوعية الدموية', 'أخصائي أمراض القلب', 'Cardiology', [400, 700]],
        'dermatology' => ['استشاري الأمراض الجلدية والتجميل', 'أخصائي الجلدية', 'Dermatology', [300, 600]],
        'pediatrics' => ['استشاري طب الأطفال وحديثي الولادة', 'أخصائي طب الأطفال', 'Pediatrics', [300, 500]],
        'orthopedics' => ['استشاري جراحة العظام والمفاصل', 'أخصائي جراحة العظام', 'Orthopedics', [400, 650]],
        'ophthalmology' => ['استشاري طب وجراحة العيون', 'أخصائي طب العيون', 'Ophthalmology', [300, 550]],
        'ent' => ['استشاري الأنف والأذن والحنجرة', 'أخصائي الأنف والأذن والحنجرة', 'ENT', [300, 500]],
        'neurology' => ['استشاري المخ والأعصاب', 'أخصائي المخ والأعصاب', 'Neurology', [450, 700]],
        'psychiatry' => ['استشاري الطب النفسي', 'أخصائي الطب النفسي', 'Psychiatry', [500, 800]],
        'general-surgery' => ['استشاري الجراحة العامة والمناظير', 'أخصائي الجراحة العامة', 'General Surgery', [350, 600]],
        'gynecology' => ['استشاري أمراض النساء والتوليد', 'أخصائي النساء والتوليد', 'Obstetrics & Gynecology', [350, 600]],
        'internal-medicine' => ['استشاري الباطنة والجهاز الهضمي', 'أخصائي الباطنة', 'Internal Medicine', [300, 500]],
        'dentistry' => ['استشاري طب وتجميل الأسنان', 'أخصائي طب الأسنان', 'Dentistry', [250, 450]],
        'urology' => ['استشاري المسالك البولية', 'أخصائي المسالك البولية', 'Urology', [350, 600]],
        'general-practice' => ['ممارس عام - طب الأسرة', 'ممارس عام', 'Family Medicine / GP', [150, 250]],
    ];

    public const REVIEWS_AR = [
        [5, 'دكتور ممتاز ومتمكن، شرح لي الحالة بالتفصيل وطمأنني جداً.'],
        [5, 'العيادة نظيفة والمواعيد دقيقة، والدكتور محترم جداً.'],
        [4, 'تجربة جيدة، الانتظار كان أقل من ربع ساعة.'],
        [5, 'من أفضل الأطباء اللي تعاملت معهم، أنصح به بشدة.'],
        [4, 'تشخيص دقيق وعلاج مناسب، بس الزحمة شوية.'],
        [3, 'الدكتور كويس لكن الكشف كان سريع شوية.'],
        [5, 'متابعة ممتازة بعد الكشف ورد على استفساراتي.'],
        [4, 'السعر مناسب والخدمة محترمة.'],
    ];

    public const REVIEWS_EN = [
        [5, 'Very professional and patient, explained everything clearly.'],
        [4, 'Good experience overall, short waiting time.'],
        [5, 'Excellent doctor, the clinic staff were very helpful.'],
        [3, 'Competent doctor but the visit felt a bit rushed.'],
    ];

    /** Core demo doctors (email prefix => female?) that also get a generated avatar. */
    public const CORE_DOCTORS = [
        'dr.karim' => false, 'dr.salma' => true, 'dr.omar' => false, 'dr.nour' => true, 'dr.youssef' => false,
        'dr.mona' => true, 'dr.hany' => false, 'dr.volunteer' => true, 'dr.pending' => false, 'dr.pending2' => true,
    ];
}
