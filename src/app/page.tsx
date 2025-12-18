'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Star, Calendar, Users, Shield, Heart, Brain, Eye, Stethoscope, Baby, Bone, Clock, Award } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import toast from 'react-hot-toast';

// Dynamic icon mapping based on icon name from backend
const getIconComponent = (iconName?: string) => {
  const icons: Record<string, any> = {
    'heart': Heart,
    'baby': Baby,
    'eye': Eye,
    'brain': Brain,
    'bone': Bone,
    'stethoscope': Stethoscope,
  };
  return icons[iconName?.toLowerCase() || ''] || Stethoscope;
};

// Doctor Card Component
function DoctorCard({ doctor, onBook }: { doctor: any; onBook: (doctor: any) => void }) {
  return (
    <Card className="bg-white rounded-[20px] shadow-[0px_2px_20px_0px_rgba(0,0,0,0.08)] border-0 overflow-hidden hover:shadow-[0px_4px_30px_0px_rgba(0,0,0,0.12)] transition-all duration-300 h-full">
      <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-3 sm:gap-4 h-full">
        {/* صورة الطبيب */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
        </div>

        {/* معلومات الطبيب */}
        <div className="space-y-1 w-full flex-1">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            {doctor.name || 'طبيب'}
          </h3>
          <p className="text-sm sm:text-base text-blue-600 font-medium">
            {doctor.specialty || 'تخصص طبي'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate max-w-[100px] sm:max-w-none">
                {doctor.governorate || 'المدينة'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              {doctor.consultationDuration || doctor.consultation_duration} دقيقة
            </span>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-gray-600">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current" />
            <span>{doctor.rating || 4.8} ({doctor.reviews || doctor.total_reviews || 0})</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-green-600 mt-2">{doctor.price} ريال</div>
        </div>

        {/* أزرار الإجراء */}
        <div className="w-full flex flex-col gap-2 mt-auto">
          <Button onClick={() => onBook(doctor)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-3 text-xs sm:text-sm font-semibold">
            <Calendar className="h-4 w-4 ml-1 inline-block sm:hidden" />
            حجز موعد
          </Button>
          <Link href={`/doctor/${doctor.id}`} className="w-full">
            <Button variant="outline" className="w-full py-2 sm:py-3 text-xs sm:text-sm font-semibold">
              عرض الملف الشخصي
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [bookingDoctor, setBookingDoctor] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  // جلب أفضل الأطباء
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['featuredDoctors'],
    queryFn: async () => {
      const response = await fetch('/api/doctors/search?limit=3&sortBy=rating&sortOrder=desc');
      const result = await response.json();
      return result.success && result.data ? result.data.slice(0, 3) : [];
    }
  });

  // جلب التخصصات من الباك إند
  const { data: specialtiesData, isLoading: specialtiesLoading } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const response = await fetch('/api/specialties');
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // جلب الإحصائيات الحقيقية
  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats');
      const result = await response.json();
      return result.success ? result.data : null;
    }
  });

  const featuredDoctors = doctorsData || [];
  const specialties = specialtiesData || [];

  // helper: generate dates for next 14 days
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('ar-SA', { weekday: 'long' }),
        dayNumber: date.getDate(),
        monthName: date.toLocaleDateString('ar-SA', { month: 'long' })
      });
    }
    return dates;
  };

  // helper: time slots 9:00-21:00 every 30 minutes
  const getAvailableTimes = () => {
    const times: string[] = [];
    for (let hour = 9; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return times;
  };

  const getEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const openBooking = (doctor: any) => {
    setBookingDoctor(doctor);
    setSelectedDate('');
    setSelectedTime('');
    setPatientName('');
    setPatientEmail('');
    setPatientPhone('');
    setBookingNotes('');
    setBookedTimes([]);
  };

  // جلب الأوقات المحجوزة عند تغيير التاريخ
  const fetchBookedTimes = async (doctorId: string, date: string) => {
    try {
      const response = await fetch(`/api/bookings?doctorId=${doctorId}&date=${date}`);
      const result = await response.json();
      if (result.success) {
        const times = result.data
          .filter((apt: any) => apt.date === date && apt.status !== 'cancelled')
          .map((apt: any) => apt.start_time);
        setBookedTimes(times);
      }
    } catch (error) {
      console.error('Error fetching booked times:', error);
    }
  };

  const closeBooking = () => {
    setBookingDoctor(null);
    setSelectedDate('');
    setSelectedTime('');
    setBookingNotes('');
  };

  const handleConfirmBooking = async () => {
    if (!bookingDoctor) return;
    if (!patientName.trim()) return toast.error('يرجى إدخال اسمك');
    if (!patientEmail.trim()) return toast.error('يرجى إدخال بريدك الإلكتروني');
    if (!patientPhone.trim()) return toast.error('يرجى إدخال رقم هاتفك');
    if (!selectedDate) return toast.error('يرجى اختيار التاريخ');
    if (!selectedTime) return toast.error('يرجى اختيار الوقت');

    try {
      setSubmittingBooking(true);
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: bookingDoctor.id,
          patientName,
          patientEmail,
          patientPhone,
          appointmentDate: selectedDate,
          startTime: selectedTime,
          endTime: getEndTime(selectedTime, bookingDoctor.consultationDuration || bookingDoctor.consultation_duration || 30),
          price: bookingDoctor.price,
          notes: bookingNotes
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'فشل في إنشاء الحجز');
      }

      toast.success('تم حجز الموعد بنجاح');
      closeBooking();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ أثناء الحجز');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <MainLayout>
      {/* Hero Section - مطابق لتصميم CliniDo */}
      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* النص الرئيسي */}
            <div className="text-right">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                محتاج دكتور شاطر؟
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                احجز مع أفضل الأطباء في المملكة
              </p>
              
              {/* شريط البحث */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="ابحث عن طبيب أو تخصص"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none"
                    >
                      <option value="">اختر المدينة</option>
                      <option value="الرياض">الرياض</option>
                      <option value="جدة">جدة</option>
                      <option value="الدمام">الدمام</option>
                      <option value="مكة المكرمة">مكة المكرمة</option>
                      <option value="المدينة المنورة">المدينة المنورة</option>
                      <option value="الطائف">الطائف</option>
                    </select>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (searchTerm) params.set('q', searchTerm);
                      if (selectedLocation) params.set('location', selectedLocation);
                      window.location.href = `/search${params.toString() ? '?' + params.toString() : ''}`;
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white py-3 px-6 rounded-lg font-semibold"
                  >
                    ابحث
                  </Button>
                </div>
              </div>

              {/* الخدمات السريعة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/specialties" className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Stethoscope className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">كشف طبي</p>
                </Link>
                
                <Link href="/specialties" className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Heart className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">فحص شامل</p>
                </Link>
                
                <Link href="/specialties" className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">استشارة</p>
                </Link>
                
                <Link href="/specialties" className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">متابعة</p>
                </Link>
              </div>
            </div>

            {/* الصورة الجانبية */}
            <div className="relative">
              <div className="bg-white rounded-3xl p-8 shadow-xl">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="h-16 w-16 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    أكثر من {statsData?.totalDoctors || 20} طبيب
                  </h3>
                  <p className="text-gray-600 mb-6">في جميع التخصصات الطبية</p>
                  <div className="flex justify-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-teal-600">4.9</div>
                      <div className="flex justify-center">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{statsData?.totalPatients || 3}+</div>
                      <div className="text-sm text-gray-600">مريض راضي</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* أفضل الأطباء */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">أفضل الأطباء المتاحين</h2>
            <p className="text-gray-600">احجز مع أفضل الأطباء في تخصصات مختلفة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {doctorsLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i} className="bg-white rounded-[20px] shadow-[0px_2px_20px_0px_rgba(0,0,0,0.08)] border-0 animate-pulse">
                  <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 mb-4"></div>
                    <div className="mb-6 w-full">
                      <div className="h-5 bg-gray-200 rounded mb-2 w-3/4 mx-auto"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2 w-2/3 mx-auto"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2 w-full"></div>
                    </div>
                    <div className="w-full space-y-2">
                      <div className="h-10 bg-gray-200 rounded-lg"></div>
                      <div className="h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              featuredDoctors.map((doctor: any) => (
                <DoctorCard key={doctor.id} doctor={doctor} onBook={openBooking} />
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <Link href="/search">
              <Button variant="outline" className="px-8 py-3 rounded-xl">
                عرض جميع الأطباء
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* التخصصات الطبية */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">ابحث حسب التخصص</h2>
            <p className="text-gray-600">اختر التخصص المناسب لحالتك الصحية</p>
          </div>

          {specialtiesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-2xl mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : specialties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">لا توجد تخصصات متاحة</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {specialties.slice(0, 6).map((specialty: any) => {
                const IconComponent = getIconComponent(specialty.icon);
                const colorClasses = specialty.color || 'bg-teal-100 text-teal-600';
                
                return (
                  <Link 
                    key={specialty.id}
                    href={`/search?specialty=${specialty.name}`}
                    className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className={`w-16 h-16 ${colorClasses} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                      {specialty.name}
                    </h3>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/specialties">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl">
                عرض جميع التخصصات
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* المميزات */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">لماذا تختارنا؟</h2>
            <p className="text-gray-600">نقدم لك أفضل تجربة طبية رقمية</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">حجز سهل وسريع</h3>
              <p className="text-gray-600 leading-relaxed">
                احجز موعدك في دقائق معدودة واختر الوقت المناسب لك
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Award className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">أطباء معتمدون</h3>
              <p className="text-gray-600 leading-relaxed">
                جميع أطبائنا حاصلون على تراخيص معتمدة وخبرة واسعة
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">آمن وموثوق</h3>
              <p className="text-gray-600 leading-relaxed">
                بياناتك محمية بأعلى معايير الأمان والخصوصية
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* الإحصائيات */}
      <section className="py-16 bg-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">{statsData?.totalDoctors || 20}+</div>
              <div className="text-teal-100">طبيب معتمد</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">{statsData?.totalPatients || 3}+</div>
              <div className="text-teal-100">مريض راضي</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">{statsData?.totalSpecialties || 10}+</div>
              <div className="text-teal-100">تخصص طبي</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">{statsData?.totalCities || 6}+</div>
              <div className="text-teal-100">مدينة مغطاة</div>
            </div>
          </div>
        </div>
      </section>

      {/* دعوة للعمل */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">ابدأ رحلتك الصحية اليوم</h2>
          <p className="text-xl mb-8 opacity-90">انضم إلى آلاف المرضى الذين يثقون بنا</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-xl text-lg font-semibold">
                إنشاء حساب مجاني
              </Button>
            </Link>
            <Link href="/doctor/register">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold">
                انضم كطبيب
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Booking Overlay */}
      {bookingDoctor && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
          onClick={closeBooking}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 relative my-2 sm:my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
              <h3 className="text-base sm:text-xl font-semibold text-right flex-1">احجز موعدك مع {bookingDoctor.name}</h3>
              <Button variant="outline" onClick={closeBooking} className="text-xs sm:text-sm">إغلاق</Button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">اختر التاريخ</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto rounded-lg">
                  {getAvailableDates().map((d) => (
                    <button
                      key={d.date}
                      onClick={() => setSelectedDate(d.date)}
                      className={`p-2 sm:p-3 rounded-lg border text-center transition-colors text-xs sm:text-sm ${
                        selectedDate === d.date
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-[10px] sm:text-xs truncate">{d.dayName}</div>
                      <div className="font-bold text-sm sm:text-base">{d.dayNumber}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">اختر الوقت</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto rounded-lg">
                    {getAvailableTimes().map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-2 rounded-lg border text-center transition-colors text-xs sm:text-sm ${
                          selectedTime === time
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">ملاحظات (اختياري)</label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  rows={3}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {selectedDate && selectedTime && (
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm text-gray-700 space-y-1">
                  <div>التاريخ: {selectedDate}</div>
                  <div>الوقت: {selectedTime}</div>
                  <div>المدة: {bookingDoctor.consultationDuration || bookingDoctor.consultation_duration} دقيقة</div>
                  <div className="font-bold text-green-600">السعر: {bookingDoctor.price} ريال</div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-3"
                  disabled={submittingBooking || !selectedDate || !selectedTime || !patientName || !patientEmail || !patientPhone}
                  onClick={handleConfirmBooking}
                >
                  {submittingBooking ? 'جاري التأكيد...' : 'تأكيد الحجز'}
                </Button>
                <Link href={`/doctor/${bookingDoctor.id}`} className="w-full">
                  <Button variant="outline" className="w-full text-sm sm:text-base py-2 sm:py-3" disabled={submittingBooking}>
                    متابعة لصفحة الطبيب
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}