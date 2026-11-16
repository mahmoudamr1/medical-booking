'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Calendar, Plus, Trash2, Edit, Clock } from 'lucide-react';

interface Vacation {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'active' | 'upcoming' | 'past';
}

export default function DoctorVacationPage() {
  const router = useRouter();
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctorVacations();
  }, []);

  const loadDoctorVacations = async () => {
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

      // جلب إجازات الطبيب
      const vacationsResult = await fetch(`/api/doctors/${doctorData.data.id}/vacations`);
      const vacationsData = await vacationsResult.json();
      
      if (vacationsData.success && vacationsData.data) {
        // تحديد حالة كل إجازة
        const today = new Date();
        const formattedVacations = vacationsData.data.map((vacation: any) => {
          const startDate = new Date(vacation.date);
          const endDate = new Date(vacation.end_date || vacation.date);
          
          let status: 'active' | 'upcoming' | 'past' = 'past';
          if (startDate <= today && endDate >= today) {
            status = 'active';
          } else if (startDate > today) {
            status = 'upcoming';
          }

          return {
            id: vacation.id,
            title: vacation.reason || 'إجازة',
            startDate: vacation.date,
            endDate: vacation.end_date || vacation.date,
            reason: vacation.reason,
            status
          };
        });
        
        setVacations(formattedVacations);
      }
    } catch (error) {
      toast.error('حدث خطأ في تحميل الإجازات');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      startDate: '',
      endDate: '',
      reason: ''
    });
    setShowAddForm(false);
    setEditingVacation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorData?.id) {
      toast.error('لم يتم العثور على بيانات الطبيب');
      return;
    }

    setIsLoading(true);

    try {
      const vacationData = {
        doctor: doctorData.id,
        date: formData.startDate,
        end_date: formData.endDate,
        start_time: '00:00',
        end_time: '23:59',
        reason: formData.reason || formData.title
      };

      let response;
      if (editingVacation) {
        // تحديث إجازة موجودة
        response = await fetch(`/api/doctors/${doctorData.id}/vacations/${editingVacation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vacationData)
        });
      } else {
        // إضافة إجازة جديدة
        response = await fetch(`/api/doctors/${doctorData.id}/vacations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vacationData)
        });
      }

      if (!response.ok) {
        throw new Error('فشل في حفظ الإجازة');
      }

      // إعادة تحميل الإجازات
      await loadDoctorVacations();
      
      toast.success(editingVacation ? 'تم تحديث الإجازة بنجاح!' : 'تم إضافة الإجازة بنجاح!');
      resetForm();
    } catch (error) {
      toast.error('حدث خطأ في حفظ الإجازة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (vacation: Vacation) => {
    setFormData({
      title: vacation.title,
      startDate: vacation.startDate,
      endDate: vacation.endDate,
      reason: vacation.reason
    });
    setEditingVacation(vacation);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الإجازة؟')) {
      return;
    }

    if (!doctorData?.id) {
      toast.error('لم يتم العثور على بيانات الطبيب');
      return;
    }

    try {
      const response = await fetch(`/api/doctors/${doctorData.id}/vacations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('فشل في حذف الإجازة');
      }

      // إعادة تحميل الإجازات
      await loadDoctorVacations();
      toast.success('تم حذف الإجازة بنجاح!');
    } catch (error) {
      toast.error('حدث خطأ في حذف الإجازة');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'past': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشطة حالياً';
      case 'upcoming': return 'قادمة';
      case 'past': return 'منتهية';
      default: return 'غير محدد';
    }
  };

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
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة الإجازات</h1>
                <p className="text-sm text-gray-600">إضافة وإدارة فترات الإجازة</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Add Vacation Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة إجازة جديدة
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="bg-white rounded-lg shadow-sm mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingVacation ? 'تعديل الإجازة' : 'إضافة إجازة جديدة'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عنوان الإجازة
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثل: إجازة عيد الأضحى"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ البداية
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سبب الإجازة
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="اكتب سبب الإجازة..."
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading ? 'جاري الحفظ...' : editingVacation ? 'تحديث الإجازة' : 'إضافة الإجازة'}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Vacations List */}
        <Card className="bg-white rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">الإجازات المسجلة</h3>
            
            {vacations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">لا توجد إجازات مسجلة</p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  إضافة أول إجازة
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {vacations.map(vacation => (
                  <div key={vacation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{vacation.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(vacation.status)}`}>
                            {getStatusText(vacation.status)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>من: {vacation.startDate}</span>
                          <span>إلى: {vacation.endDate}</span>
                        </div>
                        
                        <p className="text-gray-700">{vacation.reason}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleEdit(vacation)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(vacation.id)}
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

        {/* Info Card */}
        <Card className="bg-yellow-50 border-yellow-200 mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">معلومات مهمة</h3>
            <ul className="space-y-2 text-yellow-800">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>سيتم إلغاء جميع المواعيد المحجوزة خلال فترة الإجازة تلقائياً</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>يُنصح بإضافة الإجازات مسبقاً لتجنب إزعاج المرضى</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>يمكنك تعديل أو حذف الإجازات قبل بدايتها</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}