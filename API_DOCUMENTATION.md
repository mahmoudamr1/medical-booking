# توثيق APIs النظام الطبي

## نظرة عامة
تم إنشاء جميع الـ APIs المطلوبة للنظام الطبي وهي تعمل مع قاعدة البيانات المحلية.

## الـ APIs المتاحة

### 1. إدارة الأطباء
- **GET** `/api/admin/doctors` - جلب جميع الأطباء مع الفلاتر والبحث
  - Parameters: `page`, `limit`, `search`, `specialty`, `status`
- **GET** `/api/doctors/[id]` - جلب بيانات طبيب محدد
- **PATCH** `/api/doctors/[id]` - تحديث بيانات طبيب
- **DELETE** `/api/doctors/[id]` - تعطيل طبيب

### 2. البحث عن الأطباء
- **GET** `/api/doctors/search` - البحث في الأطباء
  - Parameters: `specialty`, `location`, `search`, `minPrice`, `maxPrice`, `sortBy`, `sortOrder`, `page`, `limit`

### 3. إدارة المواعيد
- **GET** `/api/admin/appointments` - جلب جميع المواعيد مع الفلاتر
  - Parameters: `page`, `limit`, `search`, `status`, `date`, `doctorId`
- **POST** `/api/admin/appointments` - إنشاء موعد جديد

### 4. الحجوزات
- **GET** `/api/bookings` - جلب الحجوزات
  - Parameters: `doctorId`, `patientId`, `status`
- **POST** `/api/bookings` - إنشاء حجز جديد

### 5. جدول الأطباء
- **GET** `/api/doctors/[id]/schedule` - جلب جدول طبيب
- **POST** `/api/doctors/[id]/schedule` - تحديث جدول طبيب

### 6. إجازات الأطباء
- **GET** `/api/doctors/[id]/vacations` - جلب إجازات طبيب
- **POST** `/api/doctors/[id]/vacations` - إضافة إجازة جديدة

### 7. المواعيد المتاحة
- **GET** `/api/doctors/[id]/available-slots?date=YYYY-MM-DD` - جلب المواعيد المتاحة لطبيب في تاريخ محدد

### 8. التخصصات
- **GET** `/api/specialties` - جلب جميع التخصصات مع عدد الأطباء
  - Parameters: `search`
- **POST** `/api/specialties` - إضافة تخصص جديد

### 9. المواقع
- **GET** `/api/locations` - جلب جميع المواقع مع عدد الأطباء
  - Parameters: `governorate`, `search`
- **POST** `/api/locations` - إضافة موقع جديد

### 10. الإحصائيات
- **GET** `/api/admin/stats` - جلب إحصائيات شاملة للنظام

### 11. المصادقة
- **POST** `/api/auth/login` - تسجيل الدخول
- **POST** `/api/auth/register` - تسجيل مستخدم جديد
- **POST** `/api/doctors/register` - تسجيل طبيب جديد

### 12. اختبار النظام
- **GET** `/api/test` - اختبار جميع وظائف النظام

## البيانات المتاحة

### الأطباء
- 10 أطباء في تخصصات مختلفة
- جميع الأطباء نشطين ومعتمدين
- أسعار متنوعة من 180 إلى 400 ريال

### التخصصات
- 10 تخصصات طبية مختلفة
- طب القلب، طب الأطفال، طب العيون، طب الأعصاب، العظام والمفاصل
- الطب الباطني، الجراحة العامة، طب النساء والولادة، الأمراض الجلدية، طب الأسنان

### المواقع
- 12 موقع في 6 محافظات
- الرياض، جدة، الدمام، مكة المكرمة، المدينة المنورة، الطائف

### المستخدمين
- مدير النظام: mahmoudamr700@gmail.com / 0123456789
- 10 أطباء مع بيانات كاملة
- 3 مرضى للاختبار

## ميزات الـ APIs

### الفلترة والبحث
- جميع الـ APIs تدعم البحث والفلترة
- Pagination للنتائج الكبيرة
- ترتيب النتائج حسب معايير مختلفة

### التحقق من البيانات
- التحقق من صحة البيانات المدخلة
- رسائل خطأ واضحة باللغة العربية
- التعامل مع الحالات الاستثنائية

### الأمان
- التحقق من وجود البيانات قبل العمليات
- منع التعارض في المواعيد
- التحقق من صحة المعاملات

## كيفية الاستخدام

1. تشغيل السيرفر: `npm run dev`
2. الوصول للـ APIs على: `http://localhost:3000/api/`
3. استخدام أدوات مثل Postman أو curl للاختبار
4. جميع الاستجابات بصيغة JSON

## أمثلة على الاستخدام

```bash
# جلب جميع الأطباء
curl http://localhost:3000/api/admin/doctors

# البحث عن أطباء القلب
curl "http://localhost:3000/api/doctors/search?specialty=طب القلب"

# جلب المواعيد المتاحة
curl "http://localhost:3000/api/doctors/1/available-slots?date=2024-12-18"

# جلب الإحصائيات
curl http://localhost:3000/api/admin/stats

# اختبار النظام
curl http://localhost:3000/api/test
```

جميع الـ APIs جاهزة للاستخدام وتعمل مع البيانات الحقيقية!