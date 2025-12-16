'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Calendar, Search, Filter, Eye, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'pending';
  notes?: string;
}

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'cancelled' | 'completed' | 'pending'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // التحقق من صلاحيات المدير
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user || user.role !== 'admin')) {
      router.push('/dashboard/admin');
    }
  }, [authLoading, isAuthenticated, user, router]);
  
  const [appointments] = useState<Appointment[]>([
    {
      id: '1',
      patientName: 'أحمد محمد علي',
      doctorName: 'د. سارة أحمد الغامدي',
      specialty: 'طب الأطفال',
      date: '2024-12-17',
      time: '10:00',
      duration: 30,
      price: 200,
      status: 'confirmed',
      notes: 'فحص دوري للطفل'
    },
    {
      id: '2',
      patientName: 'فاطمة علي الزهراني',
      doctorName: 'د. عمر خالد القحطاني',
      specialty: 'أمراض القلب',
      date: '2024-12-17',
      time: '14:30',
      duration: 30,
      price: 250,
      status: 'pending',
      notes: 'استشارة أولى'
    },
    {
      id: '3',
      patientName: 'خالد عبدالله العتيبي',
      doctorName: 'د. فاطمة علي العمري',
      specialty: 'النساء والتوليد',
      date: '2024-12-16',
      time: '11:00',
      duration: 30,
      price: 300,
      status: 'completed',
      notes: 'متابعة حمل'
    },
    {
      id: '4',
      patientName: 'نورا حسن الدوسري',
      doctorName: 'د. محمد سعد المطيري',
      specialty: 'الأمراض الجلدية',
      date: '2024-12-15',
      time: '16:00',
      duration: 30,
      price: 350,
      status: 'cancelled',
      notes: 'ألغى المريض'
    },
    {
      id: '5',
      patientName: 'محمد سعد المطيري',
      doctorName: 'د. نورا حسن الدوسري',
      specialty: 'طب العيون',
      date: '2024-12-18',
      time: '09:30',
      duration: 30,
      price: 400,
      status: 'confirmed',
      notes: 'فحص نظر'
    }
  ]);

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || appointment.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'مؤكد';
      case 'pending': return 'في الانتظار';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return 'غير محدد';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    // محاكاة تحديث حالة الموعد
    alert(`تم تحديث حالة الموعد إلى: ${getStatusText(newStatus)}`);
  };

  const getTotalRevenue = () => {
    return appointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + apt.price, 0);
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
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة المواعيد</h1>
                <p className="text-sm text-gray-600">عرض وإدارة جميع المواعيد</p>
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
                    placeholder="البحث بالمريض، الطبيب، أو التخصص..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">جميع المواعيد</option>
                  <option value="confirmed">المؤكدة</option>
                  <option value="pending">في الانتظار</option>
                  <option value="completed">المكتملة</option>
                  <option value="cancelled">الملغية</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
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
                  <p className="text-sm text-gray-600">المؤكدة</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'confirmed').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المكتملة</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'completed').length}
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
                  <p className="text-sm text-gray-600">الملغية</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'cancelled').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-gray-900">{getTotalRevenue()} ريال</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card className="bg-white rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              قائمة المواعيد ({filteredAppointments.length})
            </h3>
            
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد نتائج للبحث</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map(appointment => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{appointment.patientName}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(appointment.status)}`}>
                            {getStatusIcon(appointment.status)}
                            {getStatusText(appointment.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">الطبيب:</span> {appointment.doctorName}
                          </div>
                          <div>
                            <span className="font-medium">التخصص:</span> {appointment.specialty}
                          </div>
                          <div>
                            <span className="font-medium">التاريخ:</span> {appointment.date}
                          </div>
                          <div>
                            <span className="font-medium">الوقت:</span> {appointment.time}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">المدة:</span> {appointment.duration} دقيقة
                          </div>
                          <div>
                            <span className="font-medium">السعر:</span> {appointment.price} ريال
                          </div>
                        </div>
                        
                        {appointment.notes && (
                          <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded">
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
                          <>
                            <Button
                              onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
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
                    <label className="block text-sm font-medium text-gray-700">المريض</label>
                    <p className="text-gray-900">{selectedAppointment.patientName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الطبيب</label>
                    <p className="text-gray-900">{selectedAppointment.doctorName}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">التخصص</label>
                    <p className="text-gray-900">{selectedAppointment.specialty}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الحالة</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                      {getStatusText(selectedAppointment.status)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">التاريخ</label>
                    <p className="text-gray-900">{selectedAppointment.date}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الوقت</label>
                    <p className="text-gray-900">{selectedAppointment.time}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المدة</label>
                    <p className="text-gray-900">{selectedAppointment.duration} دقيقة</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">السعر</label>
                    <p className="text-gray-900">{selectedAppointment.price} ريال</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">الملاحظات</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAppointment.notes || 'لا توجد ملاحظات'}</p>
                </div>
              </div>
              
              {selectedAppointment.status === 'pending' && (
                <div className="flex gap-3 mt-6">
                  <Button 
                    onClick={() => handleStatusChange(selectedAppointment.id, 'confirmed')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    تأكيد الموعد
                  </Button>
                  <Button 
                    onClick={() => handleStatusChange(selectedAppointment.id, 'cancelled')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    إلغاء الموعد
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}