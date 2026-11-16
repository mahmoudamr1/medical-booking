'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, Clock, Settings, LogOut, Eye, EyeOff, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // دالة للحصول على التواريخ المتاحة (آخر 7 أيام + اليوم + القادم 7 أيام)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    // آخر 7 أيام
    for (let i = 7; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push({
        date: date.toISOString().split('T')[0],
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        dayName: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
        isPast: true
      });
    }
    
    // اليوم
    dates.push({
      date: today.toISOString().split('T')[0],
      label: `${today.getDate()}/${today.getMonth() + 1}`,
      dayName: 'اليوم',
      isToday: true
    });
    
    // القادم 7 أيام
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        dayName: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
        isFuture: true
      });
    }
    
    return dates;
  };

  // جلب بيانات الطبيب
  const { data: doctorData, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctorProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/doctors/profile/${user.id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const result = await response.json();
      return result.success ? result.data : null;
    },
    enabled: !!user?.id && user?.role === 'doctor',
    retry: 3,
    staleTime: 0,
    gcTime: 0
  });

  // حالة التاريخ المحدد والفلتر
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');

  // جلب حجوزات الطبيب
  const { data: appointmentsData, refetch: refetchAppointments, isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ['doctorAppointments', doctorData?.id],
    queryFn: async () => {
      if (!doctorData?.id) return [];
      const response = await fetch(`/api/bookings?doctorId=${doctorData.id}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const result = await response.json();
      return result.success ? result.data : [];
    },
    enabled: !!doctorData?.id,
    refetchInterval: 5000, // تحديث كل 5 ثواني
    refetchOnWindowFocus: true, // تحديث عند العودة للنافذة
    refetchOnMount: 'always', // تحديث دائماً عند تحميل المكون
    staleTime: 0, // البيانات تعتبر قديمة فوراً
    gcTime: 0 // عدم حفظ البيانات في الكاش
  });

  const appointments: any[] = appointmentsData || [];
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((apt: any) => apt.date === today);
  
  // تطبيق فلاتر التاريخ والحالة
  let selectedDateAppointments = appointments.filter((apt: any) => apt.date === selectedDate);
  if (statusFilter !== 'all') {
    selectedDateAppointments = selectedDateAppointments.filter((apt: any) => apt.status === statusFilter);
  }
  const thisWeekAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.date);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return aptDate >= weekStart && aptDate <= weekEnd;
  });

  const totalPatients = [...new Set(appointments.map((apt: any) => apt.patient_id))].length;
  const monthlyRevenue = appointments
    .filter((apt: any) => {
      const aptDate = new Date(apt.date);
      const now = new Date();
      return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear() && apt.status === 'completed';
    })
    .reduce((sum: number, apt: any) => sum + (apt.price || 0), 0);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const success = await login(email, password);
      if (success) {
        setEmail('');
        setPassword('');
      } else {
        setError('بيانات الدخول غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ في تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bookings/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await refetchAppointments();
      }
    } catch (error) {
      // Handle error silently
    }
  };

  if (isLoading || doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'doctor') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">لوحة الطبيب</h1>
              <p className="text-gray-600">تسجيل دخول الأطباء</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="doctor1@clinic.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                    placeholder="12345678"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              >
                {isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">حسابات الأطباء للتجربة:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div><strong>د. أحمد محمد السيد:</strong> doctor1@clinic.com</div>
                <div><strong>د. فاطمة علي أحمد:</strong> doctor2@clinic.com</div>
                <div><strong>د. يوسف إبراهيم:</strong> doctor7@clinic.com</div>
                <div className="mt-2"><strong>كلمة المرور:</strong> 12345678</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">لوحة الطبيب</h1>
                <p className="text-sm text-gray-600">
                  مرحبا د. {doctorData?.name || user?.name}
                  {doctorData?.specialty && <span> - {doctorData.specialty}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                الموقع الرئيسي
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">مواعيد اليوم</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointmentsLoading ? '...' : todayAppointments.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">مواعيد هذا الأسبوع</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointmentsLoading ? '...' : thisWeekAppointments.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المرضى</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointmentsLoading ? '...' : totalPatients}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الإيرادات الشهرية</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointmentsLoading ? '...' : `${monthlyRevenue.toLocaleString()} ريال`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  المواعيد ({selectedDateAppointments.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchAppointments()}
                    className="text-xs"
                  >
                    تحديث
                  </Button>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="confirmed">مؤكدة</option>
                    <option value="completed">مكتملة</option>
                    <option value="cancelled">ملغية</option>
                    <option value="pending">في الانتظار</option>
                  </select>
                  <div className="text-sm text-gray-600">
                    {selectedDate === today ? 'اليوم' : new Date(selectedDate).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>
              
              {/* شريط التواريخ */}
              <div className="mb-4 overflow-x-auto">
                <div className="flex gap-2 pb-2">
                  {getAvailableDates().map((dateInfo) => (
                    <button
                      key={dateInfo.date}
                      onClick={() => setSelectedDate(dateInfo.date)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedDate === dateInfo.date
                          ? 'bg-blue-600 text-white'
                          : dateInfo.isToday
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : dateInfo.isPast
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <div className="text-center">
                        <div>{dateInfo.dayName}</div>
                        <div>{dateInfo.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {selectedDateAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد مواعيد في هذا التاريخ</p>
                  </div>
                ) : (
                  selectedDateAppointments
                    .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
                    .map((appointment: any) => (
                    <div key={appointment.id} className={`flex items-center gap-4 p-4 rounded-lg ${
                      appointment.status === 'confirmed' ? 'bg-blue-50' : 
                      appointment.status === 'completed' ? 'bg-green-50' : 
                      appointment.status === 'cancelled' ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        appointment.status === 'confirmed' ? 'bg-blue-100' : 
                        appointment.status === 'completed' ? 'bg-green-100' : 
                        appointment.status === 'cancelled' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <Users className={`h-5 w-5 ${
                          appointment.status === 'confirmed' ? 'text-blue-600' : 
                          appointment.status === 'completed' ? 'text-green-600' : 
                          appointment.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{appointment.patient_name}</p>
                        <p className="text-sm text-gray-600">
                          {appointment.notes || 'استشارة طبية'} - {appointment.start_time}
                          {appointment.end_time && ` إلى ${appointment.end_time}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appointment.patient_phone} • {appointment.price} ريال
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {appointment.status === 'confirmed' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                              className="bg-green-600 hover:bg-green-700 text-xs"
                            >
                              إكمال الكشف
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                            >
                              إلغاء
                            </Button>
                          </>
                        )}
                        {appointment.status === 'completed' && (
                          <Button size="sm" variant="outline" className="text-xs text-green-600" disabled>
                            ✓ مكتمل
                          </Button>
                        )}
                        {appointment.status === 'cancelled' && (
                          <Button size="sm" variant="outline" className="text-xs text-red-600" disabled>
                            ✗ ملغي
                          </Button>
                        )}
                        {appointment.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                          >
                            تأكيد
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">إدارة الجدول</h3>
              <div className="space-y-3">
                <Button onClick={() => router.push('/dashboard/doctor/schedule')} className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 ml-2" />
                  تحديث أوقات العمل
                </Button>
                <Button onClick={() => router.push('/dashboard/doctor/vacation')} className="w-full justify-start" variant="outline">
                  <Clock className="h-4 w-4 ml-2" />
                  إضافة إجازة
                </Button>
                <Button onClick={() => router.push('/dashboard/doctor/pricing')} className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 ml-2" />
                  تحديث الأسعار
                </Button>
                <Button onClick={() => router.push('/dashboard/doctor/patients')} className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 ml-2" />
                  إدارة المرضى
                </Button>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">حالة الحساب</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">الحساب مفعل ومعتمد</span>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>

              {/* إحصائيات سريعة */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">إحصائيات المواعيد</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">المؤكدة:</span>
                    <span className="font-medium text-blue-900">
                      {appointments.filter((apt: any) => apt.status === 'confirmed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">المكتملة:</span>
                    <span className="font-medium text-blue-900">
                      {appointments.filter((apt: any) => apt.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">الملغية:</span>
                    <span className="font-medium text-blue-900">
                      {appointments.filter((apt: any) => apt.status === 'cancelled').length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white rounded-lg shadow-sm mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">النشاط الأخير</h3>
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا يوجد نشاط حديث</p>
                </div>
              ) : (
                appointments
                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 3)
                  .map((appointment: any) => {
                    const createdDate = new Date(appointment.created_at);
                    const now = new Date();
                    const diffMs = now.getTime() - createdDate.getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffHours / 24);
                    
                    let timeAgo = '';
                    if (diffDays > 0) {
                      timeAgo = `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`;
                    } else if (diffHours > 0) {
                      timeAgo = `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
                    } else {
                      timeAgo = 'منذ قليل';
                    }

                    return (
                      <div key={appointment.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">موعد جديد تم حجزه</p>
                          <p className="text-sm text-gray-600">
                            {appointment.patient_name} - {appointment.date} الساعة {appointment.start_time}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">{timeAgo}</span>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
