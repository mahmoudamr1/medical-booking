'use client';

import { useEffect, useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { doctorsAPI, dataAPI, Doctor, Specialty, Location } from '@/lib/pocketbase';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Clock, Filter, Calendar, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

function DoctorCard({ doctor, onBook }: { doctor: Doctor; onBook: (doctor: Doctor) => void }) {
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
            {doctor.doctorName || doctor.expand?.user?.name || 'طبيب'}
          </h3>
          <p className="text-sm sm:text-base text-blue-600 font-medium">
            {doctor.specialty || 'تخصص طبي'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate max-w-[100px] sm:max-w-none">
                {doctor.expand?.location?.governorate || doctor.expand?.location?.area || 'المدينة'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              {doctor.consultation_duration || 30} دقيقة
            </span>
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

function SearchPageContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const specialtyParam = searchParams.get('specialty') || '';
    const locationParam = searchParams.get('location') || '';
    const qParam = searchParams.get('q') || '';

    setSelectedSpecialty(specialtyParam);
    setSelectedLocation(locationParam);
    setSearchTerm(qParam);
  }, [searchParams]);

  // Fetch specialties
  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const response = await fetch('/api/specialties');
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations');
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch doctors
  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', searchTerm, selectedSpecialty, selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (selectedSpecialty) params.set('specialty', selectedSpecialty);
      if (selectedLocation) params.set('location', selectedLocation);
      params.set('limit', '20');
      
      const response = await fetch(`/api/doctors/search?${params.toString()}`);
      const result = await response.json();
      
      return result.success && result.data ? result.data : [];
    }
  });

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

  const openBooking = (doctor: Doctor) => {
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
      const response = await fetch(`/api/bookings?doctorId=${doctorId}&date=${date}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const result = await response.json();
      if (result.success) {
        const times = result.data
          .filter((apt: any) => apt.date === date && apt.status !== 'cancelled')
          .map((apt: any) => apt.start_time);
        setBookedTimes(times);
        console.log(`📅 Booked times for ${date}:`, times);
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
          endTime: getEndTime(selectedTime, bookingDoctor.consultation_duration || 30),
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search Header */}
        <div className="mb-6 sm:mb-8 text-right">
          <div className="mb-4 sm:mb-6">
            <p className="text-gray-600 text-xs sm:text-sm mb-2">الصفحة الرئيسية &gt; الأطباء</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">البحث عن أطباء</h1>
          </div>
        </div>

        {/* Search Filters */}
        <Card className="mb-6 sm:mb-8 bg-white rounded-[16px] sm:rounded-[22px] shadow-[0px_1px_29px_0px_rgba(32,34,39,0.11)] border-0">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-medium">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              فلترة النتائج
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ابحث بالاسم أو التخصص..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 rounded-2xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-12"
                />
              </div>
              
              <select
                className="flex h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <option value="">جميع التخصصات</option>
                {specialties.map((specialty: any) => (
                  <option key={specialty.id} value={specialty.name}>
                    {specialty.name}
                  </option>
                ))}
              </select>

              <select
                className="flex h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="">جميع المناطق</option>
                {locations.map((location: any) => (
                  <option key={location.id} value={location.governorate}>
                    {location.governorate} - {location.area}
                  </option>
                ))}
              </select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSpecialty('');
                  setSelectedLocation('');
                  router.push('/search');
                }}
                className="rounded-2xl border-gray-200 hover:bg-gray-50 h-12"
              >
                مسح الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            عدد الأطباء: ({doctors.length})
          </h2>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="bg-white rounded-[22px] shadow-[0px_1px_29px_0px_rgba(32,34,39,0.11)] border-0 animate-pulse">
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gray-200 mb-4"></div>
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
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <Card className="bg-white rounded-[22px] shadow-[0px_1px_29px_0px_rgba(32,34,39,0.11)] border-0">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">لم يتم العثور على أطباء</h3>
              <p className="text-gray-600 mb-6">جرب تغيير معايير البحث أو الفلاتر</p>
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSpecialty('');
                  setSelectedLocation('');
                  router.push('/search');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 py-3"
              >
                مسح جميع الفلاتر
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {doctors.map((doctor: any) => (
              <DoctorCard key={doctor.id} doctor={doctor} onBook={openBooking} />
            ))}
          </div>
        )}
      </div>

      {/* Booking Overlay (page-level) */}
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
              <h3 className="text-base sm:text-xl font-semibold text-right flex-1">احجز موعدك مع {bookingDoctor.doctorName || bookingDoctor.expand?.user?.name || 'الطبيب'}</h3>
              <Button variant="outline" onClick={closeBooking} className="text-xs sm:text-sm">إغلاق</Button>
            </div>

            {/* رسالة ترحيبية للزوار */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="h-3 w-3 text-green-600" />
                </div>
                <div className="text-xs sm:text-sm text-green-800">
                  <p className="font-medium mb-1">حجز سريع للزوار</p>
                  <p>يمكنك حجز موعد بدون الحاجة لإنشاء حساب. فقط أدخل بياناتك وسنتواصل معك لتأكيد الموعد.</p>
                </div>
              </div>
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
                      onClick={() => {
                        setSelectedDate(d.date);
                        setSelectedTime('');
                        if (bookingDoctor) {
                          fetchBookedTimes(bookingDoctor.id, d.date);
                        }
                      }}
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
                  {bookedTimes.length > 0 && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                      ⚠️ الأوقات المحجوزة غير متاحة للحجز
                    </div>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto rounded-lg">
                    {getAvailableTimes().map((time) => {
                      const isBooked = bookedTimes.includes(time);
                      return (
                        <button
                          key={time}
                          onClick={() => !isBooked && setSelectedTime(time)}
                          disabled={isBooked}
                          className={`p-2 rounded-lg border text-center transition-colors text-xs sm:text-sm ${
                            isBooked
                              ? 'bg-red-100 text-red-500 border-red-200 cursor-not-allowed opacity-60'
                              : selectedTime === time
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                          }`}
                        >
                          {time}
                          {isBooked && <div className="text-[10px]">محجوز</div>}
                        </button>
                      );
                    })}
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
                  <div>المدة: {bookingDoctor.consultation_duration} دقيقة</div>
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

export default function SearchPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center py-16">
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </MainLayout>
    }>
      <SearchPageContent />
    </Suspense>
  );
}