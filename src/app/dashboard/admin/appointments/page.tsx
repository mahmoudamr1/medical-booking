'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Calendar, Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  notes?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  created_at: string;
  doctor?: {
    name: string;
    specialty: string;
  };
}

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user || user.role !== 'admin')) {
      router.push('/dashboard/admin');
      return;
    }
    
    if (isAuthenticated && user && user.role === 'admin') {
      loadAppointments();
    }
  }, [authLoading, isAuthenticated, user]);

  const loadAppointments = async () => {
    if (!isAuthenticated || !user || user.role !== 'admin') {
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      params.append('page', '1');
      params.append('limit', '100');
      
      const url = `/api/admin/appointments${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success && result.data) {
        setAppointments(result.data);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAppointments();
    }, searchTerm ? 300 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterStatus, isAuthenticated, user]);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setAppointments(prev => prev.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: newStatus as any }
            : appointment
        ));
        alert(`تم تحديث حالة الموعد إلى ${getStatusText(newStatus)} بنجاح!`);
      } else {
        alert('حدث خطأ في تحديث حالة الموعد');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('حدث خطأ في تحديث حالة الموعد');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: 'في الانتظار', class: 'bg-yellow-100 text-yellow-800' },
      confirmed: { text: 'مؤكد', class: 'bg-blue-100 text-blue-800' },
      completed: { text: 'مكتمل', class: 'bg-green-100 text-green-800' },
      cancelled: { text: 'ملغي', class: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <span className={`px-2 py-1 text-xs rounded-full ${config.class}`}>{config.text}</span>;
  };

  const getStatusText = (status: string) => {
    const statusTexts = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  };

  const filteredAppointments = appointments;

  if (authLoading || loading) {
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
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">صلاحيات إدارية مطلوبة</h2>
            <p className="text-gray-600 mb-6">يجب تسجيل الدخول كمدير للوصول إلى هذه الصفحة</p>
            <Button 
              onClick={() => router.push('/dashboard/admin')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              العودة للوحة الإدارة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <h1 className="text-xl font-bold text-gray-900">إدارة المواعيد</h1>
                <p className="text-sm text-gray-600">عرض وإدارة جميع المواعيد الطبية</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filter */}
        <Card className="bg-white rounded-lg shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="البحث بالمريض، الطبيب، أو التاريخ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">جميع المواعيد</option>
                  <option value="pending">في الانتظار</option>
                  <option value="confirmed">مؤكدة</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغية</option>
                </select>
                
                {(searchTerm || filterStatus !== 'all') && (
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المواعيد</p>
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
                  <p className="text-sm text-gray-600">في الانتظار</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'pending').length}
                  </p>
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
                  <p className="text-sm text-gray-600">مؤكدة</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'confirmed').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">مكتملة</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card className="bg-white rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                قائمة المواعيد ({filteredAppointments.length})
              </h3>
              {loading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">جاري التحديث...</span>
                </div>
              )}
            </div>
            
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد مواعيد</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map(appointment => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {appointment.patient_name}
                          </h4>
                          {getStatusBadge(appointment.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">الطبيب:</span> {appointment.doctor?.name || 'غير محدد'}
                          </div>
                          <div>
                            <span className="font-medium">التخصص:</span> {appointment.doctor?.specialty || 'غير محدد'}
                          </div>
                          <div>
                            <span className="font-medium">التاريخ:</span> {new Date(appointment.date).toLocaleDateString('ar-SA')}
                          </div>
                          <div>
                            <span className="font-medium">الوقت:</span> {appointment.start_time} - {appointment.end_time}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">البريد:</span> {appointment.patient_email}
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
                            <span className="font-medium">ملاحظات:</span> {appointment.notes}
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
                            onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                          <Button
                            onClick={() => handleStatusChange(appointment.id, 'cancelled')}
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
                <h3 className="text-xl font-bold text-gray-900">تفاصيل الموعد</h3>
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
                    <label className="block text-sm font-medium text-gray-700">الحالة</label>
                    <div>{getStatusBadge(selectedAppointment.status)}</div>
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
                    <label className="block text-sm font-medium text-gray-700">التاريخ</label>
                    <p className="text-gray-900">{new Date(selectedAppointment.date).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الوقت</label>
                    <p className="text-gray-900">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الطبيب</label>
                    <p className="text-gray-900">{selectedAppointment.doctor?.name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">السعر</label>
                    <p className="text-gray-900">{selectedAppointment.price} ريال</p>
                  </div>
                </div>
                
                {selectedAppointment.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الملاحظات</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                {selectedAppointment.status === 'pending' && (
                  <Button 
                    onClick={() => {
                      handleStatusChange(selectedAppointment.id, 'confirmed');
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    تأكيد الموعد
                  </Button>
                )}
                
                {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed') && (
                  <Button 
                    onClick={() => {
                      handleStatusChange(selectedAppointment.id, 'cancelled');
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    إلغاء الموعد
                  </Button>
                )}
                
                <Button 
                  onClick={() => setSelectedAppointment(null)}
                  variant="outline" 
                  className="flex-1"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}