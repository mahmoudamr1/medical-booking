'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Phone, Mail, User, Users, ArrowRight } from 'lucide-react';

import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';

export default function DoctorProfilePage() {
  const params = useParams();
  const doctorId = params.id as string;
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');

  // جلب بيانات الطبيب
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      const response = await fetch(`/api/doctors/${doctorId}`);
      const result = await response.json();
      return result.success ? result.data : null;
    }
  });

  // إنشاء تواريخ متاحة للأسبوع القادم
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

  // إنشاء أوقات متاحة
  const getAvailableTimes = () => {
    const times = [];
    const startHour = 9;
    const endHour = 21;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    
    return times;
  };

  const handleBooking = async () => {
    // التحقق من البيانات المطلوبة
    if (!patientName.trim()) {
      toast.error('يرجى إدخال اسمك');
      return;
    }

    if (!patientEmail.trim()) {
      toast.error('يرجى إدخال بريدك الإلكتروني');
      return;
    }

    if (!patientPhone.trim()) {
      toast.error('يرجى إدخال رقم هاتفك');
      return;
    }

    if (!selectedDate) {
      toast.error('يرجى اختيار التاريخ');
      return;
    }

    if (!selectedTime) {
      toast.error('يرجى اختيار الوقت');
      return;
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctorId,
          patientName,
          patientEmail,
          patientPhone,
          appointmentDate: selectedDate,
          startTime: selectedTime,
          endTime: getEndTime(selectedTime, doctor?.consultationDuration || 30),
          price: doctor?.price || 0,
          notes: bookingNotes
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('تم حجز الموعد بنجاح!');
        // إعادة تعيين النموذج
        setSelectedDate('');
        setSelectedTime('');
        setBookingNotes('');
        setPatientName('');
        setPatientPhone('');
        setPatientEmail('');
      } else {
        throw new Error(result.error || 'فشل في الحجز');
      }
    } catch (error: any) {
      toast.error('حدث خطأ في الحجز: ' + error.message);
    }
  };

  // دالة لحساب وقت انتهاء الموعد
  const getEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + duration * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  if (doctorLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل بيانات الطبيب...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!doctor) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">الطبيب غير موجود</h2>
            <p className="text-gray-600 mb-8">لم يتم العثور على الطبيب المطلوب</p>
            <Link href="/search">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                العودة للبحث
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />
        
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-blue-600">الرئيسية</Link>
              <span>›</span>
              <Link href="/search" className="hover:text-blue-600">الأطباء</Link>
              <span>›</span>
              <span className="text-gray-900">{doctor.name}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* معلومات الطبيب */}
            <div className="lg:col-span-2">
              <Card className="bg-white rounded-2xl shadow-sm border-0 mb-6">
                <CardContent className="p-8">
                  <div className="flex items-start gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Users className="h-12 w-12 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {doctor.name}
                      </h1>
                      <p className="text-xl text-blue-600 font-medium mb-4">
                        {doctor.specialty}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-5 w-5" />
                          <span>{doctor.governorate} - {doctor.area}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-5 w-5" />
                          <span>{doctor.consultationDuration} دقيقة</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-5 w-5" />
                          <span>{doctor.experience} سنة خبرة</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="h-5 w-5" />
                          <span>⭐ {doctor.rating} ({doctor.reviews} تقييم)</span>
                        </div>
                      </div>
                      
                      <div className="text-3xl font-bold text-green-600 mb-4">
                        {doctor.price} ريال
                      </div>
                      
                      {doctor.bio && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">نبذة عن الطبيب</h3>
                          <p className="text-gray-700 leading-relaxed">{doctor.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* معلومات الاتصال */}
              <Card className="bg-white rounded-2xl shadow-sm border-0">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">معلومات الاتصال</h3>
                  <div className="space-y-4">
                    <Button 
                      onClick={() => window.open(`tel:${doctor.phone}`, '_self')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Phone className="h-5 w-5" />
                      اتصال هاتفي
                    </Button>
                    
                    {doctor.email && (
                      <Button 
                        onClick={() => window.open(`mailto:${doctor.email}`, '_self')}
                        variant="outline"
                        className="w-full py-3 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Mail className="h-5 w-5" />
                        إرسال بريد إلكتروني
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* نموذج الحجز */}
            <div className="lg:col-span-1">
              <Card className="bg-white rounded-2xl shadow-sm border-0 sticky top-8">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">احجز موعدك</h3>
                  
                  <div className="space-y-4">
                    {/* بيانات المريض */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="أدخل اسمك الكامل"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                      <input
                        type="tel"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="05xxxxxxxx"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* اختيار التاريخ */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">اختر التاريخ</label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {getAvailableDates().map((dateInfo) => (
                          <button
                            key={dateInfo.date}
                            onClick={() => setSelectedDate(dateInfo.date)}
                            className={`p-3 rounded-lg border text-center transition-colors text-sm ${
                              selectedDate === dateInfo.date
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="text-xs">{dateInfo.dayName}</div>
                            <div className="font-bold">{dateInfo.dayNumber}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* اختيار الوقت */}
                    {selectedDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اختر الوقت</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {getAvailableTimes().map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`p-2 rounded-lg border text-center transition-colors text-sm ${
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

                    {/* ملاحظات */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات (اختياري)</label>
                      <textarea
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                        placeholder="أي ملاحظات إضافية..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* ملخص الحجز */}
                    {selectedDate && selectedTime && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">ملخص الحجز</h4>
                        <div className="text-sm space-y-1 text-gray-700">
                          <div>التاريخ: {selectedDate}</div>
                          <div>الوقت: {selectedTime}</div>
                          <div>المدة: {doctor.consultationDuration} دقيقة</div>
                          <div className="font-bold text-green-600">السعر: {doctor.price} ريال</div>
                        </div>
                      </div>
                    )}

                    {/* زر الحجز */}
                    <Button 
                      onClick={handleBooking}
                      disabled={!selectedDate || !selectedTime || !patientName || !patientEmail || !patientPhone}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                    >
                      تأكيد الحجز
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}