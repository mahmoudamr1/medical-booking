'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Users, Search, Filter, Eye, Phone, Calendar, Star } from 'lucide-react';
import { bookingAPI } from '@/lib/pocketbase';
import { useAuth } from '@/lib/auth-context';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  lastVisit: string;
  totalVisits: number;
  status: 'active' | 'inactive';
  notes: string;
}

export default function DoctorPatientsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorData, setDoctorData] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/dashboard/doctor');
      return;
    }
    
    if (isAuthenticated && user) {
      loadDoctorAndPatients();
    }
  }, [isAuthenticated, isLoading, user]);

  const loadDoctorAndPatients = async () => {
    setLoading(true);
    try {
      // جلب أول طبيب متاح للاختبار
      const allDoctorsResult = await fetch('/api/admin/doctors');
      const allDoctorsData = await allDoctorsResult.json();
      
      if (!allDoctorsData.success || !allDoctorsData.data || allDoctorsData.data.length === 0) {
        toast.error('لم يتم العثور على أطباء في النظام');
        return;
      }

      const doctorData = { success: true, data: allDoctorsData.data[0] };

      setDoctorData(doctorData.data);

      // جلب حجوزات الطبيب لاستخراج المرضى
      const bookingsResult = await bookingAPI.getDoctorBookings(doctorData.data.id);
      
      if (bookingsResult.success && bookingsResult.data) {
        // تجميع المرضى من الحجوزات
        const patientsMap = new Map();
        
        bookingsResult.data.forEach((booking: any) => {
          if (booking.expand?.patient) {
            const patient = booking.expand.patient;
            const patientId = patient.id;
            
            if (!patientsMap.has(patientId)) {
              patientsMap.set(patientId, {
                id: patientId,
                name: patient.name,
                email: patient.email,
                phone: patient.phone || 'غير محدد',
                lastVisit: booking.date,
                totalVisits: 1,
                status: 'active' as const,
                notes: booking.notes || 'لا توجد ملاحظات'
              });
            } else {
              const existingPatient = patientsMap.get(patientId);
              existingPatient.totalVisits += 1;
              // تحديث آخر زيارة إذا كانت أحدث
              if (new Date(booking.date) > new Date(existingPatient.lastVisit)) {
                existingPatient.lastVisit = booking.date;
              }
            }
          }
        });

        setPatients(Array.from(patientsMap.values()));
      }
    } catch (error) {
      toast.error('حدث خطأ في تحميل المرضى');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (patient.phone || '').includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || patient.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status: string) => {
    return status === 'active' ? 'نشط' : 'غير نشط';
  };

  // التحقق من المصادقة
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">تسجيل الدخول مطلوب</h2>
            <p className="text-gray-600 mb-6">يجب تسجيل الدخول للوصول إلى هذه الصفحة</p>
            <Button 
              onClick={() => router.push('/dashboard/doctor')}
              className="w-full bg-purple-600 hover:bg-purple-700"
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
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة المرضى</h1>
                <p className="text-sm text-gray-600">عرض وإدارة قائمة المرضى</p>
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
                    placeholder="البحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">جميع المرضى</option>
                  <option value="active">المرضى النشطون</option>
                  <option value="inactive">المرضى غير النشطين</option>
                </select>
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
                  <p className="text-sm text-gray-600">إجمالي المرضى</p>
                  <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المرضى النشطون</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patients.filter(p => p.status === 'active').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">متوسط الزيارات</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patients.length > 0 ? Math.round(patients.reduce((sum, p) => sum + p.totalVisits, 0) / patients.length) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المرضى الجدد</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patients.filter(p => p.totalVisits === 1).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patients List */}
        <Card className="bg-white rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              قائمة المرضى ({filteredPatients.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-500">جاري تحميل المرضى...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد نتائج للبحث</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPatients.map(patient => (
                  <div key={patient.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{patient.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
                            {getStatusText(patient.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">البريد:</span> {patient.email}
                          </div>
                          <div>
                            <span className="font-medium">الهاتف:</span> {patient.phone}
                          </div>
                          <div>
                            <span className="font-medium">الحالة:</span> {patient.status === 'active' ? 'نشط' : 'غير نشط'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">آخر زيارة:</span> {patient.lastVisit}
                          </div>
                          <div>
                            <span className="font-medium">إجمالي الزيارات:</span> {patient.totalVisits}
                          </div>
                          <div>
                            <span className="font-medium">الهاتف:</span> {patient.phone}
                          </div>
                        </div>
                        
                        {patient.notes && (
                          <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded">
                            <span className="font-medium">ملاحظات:</span> {patient.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setSelectedPatient(patient)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => window.open(`tel:${patient.phone || '+966500000000'}`, '_self')}
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="اتصال هاتفي"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">تفاصيل المريض</h3>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الاسم</label>
                    <p className="text-gray-900">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الهاتف</label>
                    <p className="text-gray-900">{selectedPatient.phone}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                    <p className="text-gray-900">{selectedPatient.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
                    <p className="text-gray-900">{selectedPatient.phone}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">آخر زيارة</label>
                    <p className="text-gray-900">{selectedPatient.lastVisit}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">إجمالي الزيارات</label>
                    <p className="text-gray-900">{selectedPatient.totalVisits}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">الملاحظات</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedPatient.notes}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  <Calendar className="h-4 w-4 ml-2" />
                  حجز موعد جديد
                </Button>
                <Button 
                  onClick={() => window.open(`tel:${selectedPatient.phone || '+966500000000'}`, '_self')}
                  variant="outline" 
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 ml-2" />
                  اتصال هاتفي
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}