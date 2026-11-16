<?php

return [
    'open_platform' => 'فتح منصة الحجز الطبي',
    'verification' => [
        'title' => 'تحديث حالة التوثيق',
        'approved' => 'تم توثيق ملفك كطبيب وأصبح ظاهراً للمرضى.',
        'rejected' => 'لم تتم الموافقة على طلب التوثيق.',
        'suspended' => 'تم إيقاف ملفك كطبيب.',
        'pending' => 'طلب التوثيق قيد المراجعة.',
        'draft' => 'يرجى استكمال بيانات ملفك.',
    ],
    'verification_requested' => [
        'title' => 'طلب توثيق جديد',
        'body' => 'قام :name بإرسال مستندات التوثيق.',
    ],
    'appointment' => [
        'booked_patient' => ['title' => 'تم حجز الموعد', 'body' => 'تم حجز موعدك :reference مع :doctor يوم :when.'],
        'booked_doctor' => ['title' => 'موعد جديد', 'body' => 'قام :patient بحجز الموعد :reference يوم :when.'],
        'booked_clinic' => ['title' => 'حجز جديد في العيادة', 'body' => 'قام :patient بحجز موعد مع :doctor (:reference) يوم :when.'],
        'confirmed' => ['title' => 'تم تأكيد الموعد', 'body' => 'تم تأكيد موعدك :reference مع :doctor يوم :when.'],
        'rejected' => ['title' => 'تم رفض طلب الحجز', 'body' => 'تم رفض طلبك :reference مع :doctor يوم :when. :reason'],
        'cancelled' => ['title' => 'تم إلغاء الموعد', 'body' => 'تم إلغاء الموعد :reference يوم :when. :reason'],
        'completed' => ['title' => 'اكتملت الزيارة', 'body' => 'اكتملت زيارتك :reference مع :doctor. يمكنك الآن تقييم الطبيب.'],
        'no_show' => ['title' => 'موعد فائت', 'body' => 'تم تسجيل عدم الحضور للموعد :reference يوم :when.'],
        'expired' => ['title' => 'انتهت صلاحية الطلب', 'body' => 'انتهت صلاحية طلبك :reference مع :doctor قبل التأكيد.'],
        'rescheduled_doctor' => ['title' => 'تم تغيير موعد', 'body' => 'قام :patient بتغيير موعده إلى :when (:reference).'],
        'rescheduled_patient' => ['title' => 'تم تغيير الموعد', 'body' => 'أصبح موعدك مع :doctor يوم :when (:reference).'],
        'reminder' => ['title' => 'تذكير بموعد', 'body' => 'تذكير: موعدك :reference مع :doctor يوم :when.'],
    ],
    'clinic_invitation' => ['title' => 'دعوة للانضمام لعيادة', 'body' => 'تمت دعوتك للانضمام إلى :clinic بصفة :role.'],
    'urgent' => [
        'new_request' => ['title' => 'طلب عاجل جديد', 'body' => 'مريض بالقرب من :place يحتاج :specialty (:severity حسب وصف المريض). افتح الطلب للقبول أو الاعتذار.'],
        'accepted' => ['title' => 'قبل طبيب طلبك', 'body' => 'قبل :doctor طلبك العاجل وسيتواصل معك.'],
        'taken' => ['title' => 'تم قبول الطلب من طبيب آخر', 'body' => 'قبل متطوع آخر الطلب العاجل بالقرب من :place. شكراً لك.'],
        'waiting' => ['title' => 'لا يوجد طبيب متاح الآن', 'body' => 'لا يوجد طبيب متاح لاستقبال طلبك العاجل الآن. سنُبقي طلبك مفتوحاً حتى :until وسنُبلغك فور توفر طبيب. يمكنك إلغاء الطلب أو حجز موعد عادي في أي وقت.'],
        'redispatched' => ['title' => 'أصبح طبيب متاحاً الآن', 'body' => 'تم إرسال طلبك العاجل إلى طبيب أصبح متاحاً للتو. سنُبلغك فور قبول أحد الأطباء للطلب.'],
        'unmatched' => ['title' => 'لم يتمكن أي طبيب من قبول طلبك', 'body' => 'لم يتمكن أي طبيب من قبول طلبك العاجل الآن. يمكنك المحاولة مرة أخرى بعد دقائق أو حجز موعد عادي.'],
        'cancelled' => ['title' => 'تم إلغاء الطلب العاجل', 'body' => 'قام المريض بإلغاء الطلب العاجل.'],
    ],
    'admin' => [
        'review_reported' => ['title' => 'بلاغ عن تقييم', 'body' => 'تم الإبلاغ عن تقييم مريض ويحتاج إلى مراجعة.'],
        'urgent_flagged' => ['title' => 'بلاغ عن طلب عاجل', 'body' => 'أبلغ طبيب متطوع عن طلب عاجل كإساءة استخدام محتملة.'],
        'suspicious_activity' => ['title' => 'نشاط مريب', 'body' => 'تم رصد نشاط غير معتاد على أحد الحسابات.'],
    ],
];
