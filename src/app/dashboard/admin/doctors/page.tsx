'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Users, Search, Filter, Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';


interface Doctor {
  id: string;
  doctorName?: string;
  user?: string;
  specialty: string;
  location: string;
  price: number;
  consultation_duration: number;
  bio: string;
  is_verified: boolean;
  is_active: boolean;
  expand?: {
    user?: { name: string };
    specialty: { name: string };
    location: { governorate: string; area: string };
  };
}

export default function AdminDoctorsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified' | 'active' | 'inactive'>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user || user.role !== 'admin')) {
      router.push('/dashboard/admin');
      return;
    }
    
    if (isAuthenticated && user && user.role === 'admin') {
      loadDoctors();
    }
  }, [authLoading, isAuthenticated, user]);

  const loadDoctors = async () => {
    // التأكد من أن المستخدم مصادق عليه قبل تحميل البيانات
    if (!isAuthenticated || !user || user.role !== 'admin') {
      console.log('User not authenticated or not admin, skipping load');
      return;
    }

    setLoading(true);
    try {
      // بناء URL مع الفلاتر
      const params = new URLSearchParams();
      
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      // إضافة pagination
      params.append('page', '1');
      params.append('limit', '100'); // جلب عدد كبير لعرض جميع النتائج
      
      const url = `/api/admin/doctors${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Loading doctors with URL:', url);
      console.log('Current filters:', { searchTerm, filterStatus });
      
      const response = await fetch(url);
      const result = await response.json();
      
      console.log('API Response:', result);
      console.log('Setting doctors to:', result.data);
      
      if (result.success && result.data) {
        setDoctors(result.data);
        console.log('Doctors state updated, new length:', result.data.length);
      } else {
        console.error('API Error:', result);
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // useEffect منفصل للفلاتر
  useEffect(() => {
    console.log('useEffect triggered with:', { searchTerm, filterStatus, isAuthenticated: !!isAuthenticated, userRole: user?.role });
    
    const timeoutId = setTimeout(() => {
      console.log('Calling loadDoctors after timeout');
      loadDoctors();
    }, searchTerm ? 300 : 0); // تأخير 300ms للبحث، فوري للفلاتر الأخرى

    return () => {
      console.log('Clearing timeout');
      clearTimeout(timeoutId);
    };
  }, [searchTerm, filterStatus, isAuthenticated, user]);

  // إزالة الفلتر المكرر - الفلتر يتم في الـ API
  const filteredDoctors = doctors;
  
  console.log('Render - Current doctors:', doctors.length);
  console.log('Render - Current search term:', searchTerm);
  console.log('Render - Current filter status:', filterStatus);

  const getStatusBadge = (doctor: Doctor) => {
    if (!doctor.is_verified) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">غير معتمد</span>;
    }
    if (!doctor.is_active) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">غير نشط</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">نشط ومعتمد</span>;
  };

  const handleToggleVerification = async (doctorId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/doctors/${doctorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !currentStatus })
      });

      if (response.ok) {
        setDoctors(prev => prev.map(doctor => 
          doctor.id === doctorId 
            ? { ...doctor, is_verified: !currentStatus }
            : doctor
        ));
        alert(`تم ${!currentStatus ? 'اعتماد' : 'إلغاء اعتماد'} الطبيب بنجاح!`);
      } else {
        alert('حدث خطأ في تحديث حالة الاعتماد');
      }
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('حدث خطأ في تحديث حالة الاعتماد');
    }
  };

  const handleToggleActive = async (doctorId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/doctors/${doctorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        setDoctors(prev => prev.map(doctor => 
          doctor.id === doctorId 
            ? { ...doctor, is_active: !currentStatus }
            : doctor
        ));
        alert(`تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} الطبيب بنجاح!`);
      } else {
        alert('حدث خطأ في تحديث حالة النشاط');
      }
    } catch (error) {
      console.error('Error updating active status:', error);
      alert('حدث خطأ في تحديث حالة النشاط');
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطبيب؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      try {
        const response = await fetch(`/api/doctors/${doctorId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setDoctors(prev => prev.filter(doctor => doctor.id !== doctorId));
          alert('تم حذف الطبيب بنجاح!');
        } else {
          alert('حدث خطأ في حذف الطبيب');
        }
      } catch (error) {
        console.error('Error deleting doctor:', error);
        alert('حدث خطأ في حذف الطبيب');
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل قائمة الأطباء...</p>
        </div>
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
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة الأطباء</h1>
                <p className="text-sm text-gray-600">عرض وإدارة جميع الأطباء المسجلين</p>
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
                    placeholder="البحث بالاسم، التخصص، أو المنطقة..."
                    value={searchTerm}
                    onChange={(e) => {
                      console.log('Search input changed to:', e.target.value);
                      setSearchTerm(e.target.value);
                    }}
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
                  <option value="all">جميع الأطباء</option>
                  <option value="verified">المعتمدون</option>
                  <option value="unverified">غير المعتمدين</option>
                  <option value="active">النشطون</option>
                  <option value="inactive">غير النشطين</option>
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
                  <p className="text-sm text-gray-600">إجمالي الأطباء</p>
                  <p className="text-2xl font-bold text-gray-900">{doctors.length}</p>
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
                  <p className="text-sm text-gray-600">المعتمدون</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {doctors.filter(d => d.is_verified).length}
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
                  <p className="text-sm text-gray-600">النشطون</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {doctors.filter(d => d.is_active).length}
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
                  <p className="text-sm text-gray-600">في انتظار الاعتماد</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {doctors.filter(d => !d.is_verified).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctors List */}
        <Card className="bg-white rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                قائمة الأطباء ({filteredDoctors.length})
              </h3>
              {loading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">جاري التحديث...</span>
                </div>
              )}
            </div>
            
            {filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد نتائج للبحث</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map(doctor => (
                  <div key={doctor.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {doctor.doctorName || doctor.expand?.user?.name || 'غير محدد'}
                          </h4>
                          {getStatusBadge(doctor)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">التخصص:</span> {doctor.expand?.specialty?.name || 'غير محدد'}
                          </div>
                          <div>
                            <span className="font-medium">المنطقة:</span> {doctor.expand?.location?.area || 'غير محدد'}
                          </div>
                          <div>
                            <span className="font-medium">السعر:</span> {doctor.price} ريال
                          </div>
                        </div>
                        
                        {doctor.bio && (
                          <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded mb-3">
                            <span className="font-medium">النبذة:</span> {doctor.bio}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setSelectedDoctor(doctor)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          onClick={() => handleToggleVerification(doctor.id, doctor.is_verified)}
                          size="sm"
                          variant="ghost"
                          className={doctor.is_verified 
                            ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                            : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }
                        >
                          {doctor.is_verified ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        
                        <Button
                          onClick={() => handleToggleActive(doctor.id, doctor.is_active)}
                          size="sm"
                          variant="ghost"
                          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">تفاصيل الطبيب</h3>
                <button 
                  onClick={() => setSelectedDoctor(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الاسم</label>
                    <p className="text-gray-900">
                      {selectedDoctor.doctorName || selectedDoctor.expand?.user?.name || 'غير محدد'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">التخصص</label>
                    <p className="text-gray-900">{selectedDoctor.expand?.specialty?.name || 'غير محدد'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المنطقة</label>
                    <p className="text-gray-900">{selectedDoctor.expand?.location?.area || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">السعر</label>
                    <p className="text-gray-900">{selectedDoctor.price} ريال</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">مدة الاستشارة</label>
                    <p className="text-gray-900">{selectedDoctor.consultation_duration} دقيقة</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الحالة</label>
                    <div className="flex gap-2">
                      {getStatusBadge(selectedDoctor)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">النبذة التعريفية</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedDoctor.bio || 'لا توجد نبذة'}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={() => handleToggleVerification(selectedDoctor.id, selectedDoctor.is_verified)}
                  className={selectedDoctor.is_verified 
                    ? "flex-1 bg-red-600 hover:bg-red-700 text-white"
                    : "flex-1 bg-green-600 hover:bg-green-700 text-white"
                  }
                >
                  {selectedDoctor.is_verified ? 'إلغاء الاعتماد' : 'اعتماد الطبيب'}
                </Button>
                <Button 
                  onClick={() => handleToggleActive(selectedDoctor.id, selectedDoctor.is_active)}
                  variant="outline" 
                  className="flex-1"
                >
                  {selectedDoctor.is_active ? 'إلغاء التفعيل' : 'تفعيل الحساب'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}