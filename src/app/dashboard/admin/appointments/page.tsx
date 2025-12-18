'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Calendar, Users, Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // التحقق من الصلاحيات
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user || user.role !== 'admin')) {
      router.push('/dashboard/admin');
    }
  }, [authLoading, isAuthenticated, user?.role, router]);

  // جلب جميع الحجوزات
  const { data: appointments = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['adminAppointments', searchTerm, statusFilter, dateFilter],
    queryFn: async () => {
      if (!isAuthenticated || !user || user.role !== 'admin') {
        return [];
      }

      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (dateFilter) {
        params.append('date', dateFilter);
      }
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/bookings?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const result = await response.json();
      
      let data = result.success ? result.data : [];
      
      // تطبيق فلتر البحث النصي
      if (searchTerm && searchTerm.trim()) {
        const search = searchTerm.toLowerCase().trim();
        data = data.filter((apt: any) => 
          apt.patient_name?.toLowerCase().includes(search) ||
          apt.doctorName?.toLowerCase().includes(search) ||
          apt.patient_email?.toLowerCase().includes(search) ||
          apt.patient_phone?.includes(search) ||
          apt.notes?.toLowerCase().includes(search)
        );
      }

      return data;
    },
    enabled: !!isAuthenticated && !!user && user.role === 'admin',
    refetchInterval: 10000, // تحديث كل 10 ثواني
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 0
  });

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bookings/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await refetch();
        alert(`تم تحديث حالة الحجز إلى: ${
          newStatus === 'confirmed' ? 'مؤكد' :
          newStatus === 'completed' ? 'مكتمل' :
          newStatus === 'cancelled' ? 'ملغي' : 'في الانتظار'
        }`);
      } else {
        alert('حدث خطأ في تحديث حالة الحجز');
      }
    } catch (error) {
      alert('حدث خطأ في تحديث حالة الحجز');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">مؤكد</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">مكتمل</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">ملغي</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">في الانتظار</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">غير محدد</span>;
    }
  };

  // التحقق من المصادقة
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">صلاحيات إدارية مطلوبة</h2>
            <p className="text-gray-600 mb-6">يجب تسجيل الدخول كمدير للوصول إلى هذه الصفحة</p>
            <Button 
              onClick={() => router.push('/dashboard/admin')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((apt: any) => apt.date === today);
  const pendingAppointments = appointments.filter((apt: any) => apt.status === 'pending');
  const confirmedAppointments = appointments.filter((apt: any) => apt.status === 'confirmed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              العودة
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة الحجوزات</h1>
                <p className="text-sm text-gray-600">عرض وإدارة جميع حجوزات المرضى</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الحجوزات</p>
                  <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
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
                  <p className="text-sm text-gray-600">حجوزات اليوم</p>
                  <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">في الانتظار</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingAppointments.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المؤكدة</p>
                  <p className="text-2xl font-bold text-gray-900">{confirmedAppointments.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="bg-white rounded-lg shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="البحث بالاسم، الطبيب، البريد الإلكتروني..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="pending">في الانتظار</option>
                  <option value="confirmed">مؤكدة</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغية</option>
                </select>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                {(searchTerm || statusFilter !== 'all' || dateFilter) && (
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setDateFilter('');
                    }}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    مسح الفلاتر
                  </Button>
                )}

                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {isLoading ? 'جاري التحديث...' : 'تحديث'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className="bg-white rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                قائمة الحجوزات ({appointments.length})
              </h3>
              {isLoading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">جاري التحديث...</span>
                </div>
              )}
            </div>
            
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد حجوزات</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((appointment: any) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {appointment.patient_name}
                          </h4>
                          {getStatusBadge(appointment.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">الطبيب:</span> {appointment.doctorName || 'غير محدد'}
                          </div>
                          <div>
                            <span className="font-medium">التاريخ:</span> {appointment.date} - {appointment.start_time}
                          </div>
                          <div>
                            <span className="font-medium">الهاتف:</span> {appointment.patient_phone}
                          </div>
                          <div>
                            <span className="font-medium">السعر:</span> {appointment.price} ريال
                          </div>
                        </div>
                        
                        {appointment.notes && (
                          <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded mb-3">
                            <span className="font-medium">الملاحظات:</span> {appointment.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setSelectedAppointment(appointment)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {appointment.status === 'pending' && (
                          <Button
                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {appointment.status === 'confirmed' && (
                          <Button
                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            ✓
                          </Button>
                        )}
                        
                        {appointment.status !== 'cancelled' && (
                          <Button
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">تفاصيل الحجز</h3>
                <button 
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">اسم المريض</label>
                    <p className="text-gray-900">{selectedAppointment.patient_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الطبيب</label>
                    <p className="text-gray-900">{selectedAppointment.doctorName || 'غير محدد'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">التاريخ</label>
                    <p className="text-gray-900">{selectedAppointment.date}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الوقت</label>
                    <p className="text-gray-900">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                    <p className="text-gray-900">{selectedAppointment.patient_email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
                    <p className="text-gray-900">{selectedAppointment.patient_phone}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">السعر</label>
                    <p className="text-gray-900">{selectedAppointment.price} ريال</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الحالة</label>
                    <div>{getStatusBadge(selectedAppointment.status)}</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">الملاحظات</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAppointment.notes || 'لا توجد ملاحظات'}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                {selectedAppointment.status === 'pending' && (
                  <Button 
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment.id, 'confirmed');
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    تأكيد الحجز
                  </Button>
                )}
                {selectedAppointment.status === 'confirmed' && (
                  <Button 
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment.id, 'completed');
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    إكمال الحجز
                  </Button>
                )}
                {selectedAppointment.status !== 'cancelled' && (
                  <Button 
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment.id, 'cancelled');
                      setSelectedAppointment(null);
                    }}
                    variant="outline" 
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    إلغاء الحجز
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}