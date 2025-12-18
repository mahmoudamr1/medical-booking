'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Calendar, Clock, Save, Plus, Trash2 } from 'lucide-react';

interface WorkingHour {
  id: string;
  day: string;
  dayArabic: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function DoctorSchedulePage() {
  const router = useRouter();
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctorSchedule();
  }, []);

  const loadDoctorSchedule = async () => {
    setLoading(true);
    try {
      let currentDoctorData = null;

      // محاولة جلب أول طبيب متاح
      const allDoctorsResult = await fetch('/api/admin/doctors');
      const allDoctorsData = await allDoctorsResult.json();
      
      if (allDoctorsData.success && allDoctorsData.data && allDoctorsData.data.length > 0) {
        currentDoctorData = allDoctorsData.data[0];
        setDoctorData(currentDoctorData);
      } else {
        toast.error('لم يتم العثور على أطباء في النظام');
        return;
      }

      // جلب جدول مواعيد الطبيب
      const scheduleResult = await fetch(`/api/doctors/${currentDoctorData.id}/schedule`);
      const scheduleData = await scheduleResult.json();
      
      if (scheduleData.success && scheduleData.data) {
        // تحويل البيانات إلى الشكل المطلوب
        const formattedHours = scheduleData.data.map((schedule: any) => ({
          id: schedule.id,
          day: schedule.dayOfWeek.toLowerCase(),
          dayArabic: getDayArabicName(schedule.dayOfWeek),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isActive: schedule.isActive
        }));
        setWorkingHours(formattedHours);
      }
    } catch (error) {
      toast.error('حدث خطأ في تحميل الجدول');
    } finally {
      setLoading(false);
    }
  };

  const getDayArabicName = (englishDay: string) => {
    const dayMap: { [key: string]: string } = {
      'Sunday': 'الأحد',
      'Monday': 'الاثنين',
      'Tuesday': 'الثلاثاء',
      'Wednesday': 'الأربعاء',
      'Thursday': 'الخميس',
      'Friday': 'الجمعة',
      'Saturday': 'السبت'
    };
    return dayMap[englishDay] || englishDay;
  };

  const daysOfWeek = [
    { key: 'sunday', arabic: 'الأحد' },
    { key: 'monday', arabic: 'الاثنين' },
    { key: 'tuesday', arabic: 'الثلاثاء' },
    { key: 'wednesday', arabic: 'الأربعاء' },
    { key: 'thursday', arabic: 'الخميس' },
    { key: 'friday', arabic: 'الجمعة' },
    { key: 'saturday', arabic: 'السبت' },
  ];

  const updateWorkingHour = (id: string, field: keyof WorkingHour, value: string | boolean) => {
    setWorkingHours(prev => prev.map(hour => 
      hour.id === id ? { ...hour, [field]: value } : hour
    ));
  };

  const addWorkingHour = (day: string, dayArabic: string) => {
    const newHour: WorkingHour = {
      id: Date.now().toString(),
      day,
      dayArabic,
      startTime: '09:00',
      endTime: '17:00',
      isActive: true
    };
    setWorkingHours(prev => [...prev, newHour]);
  };

  const removeWorkingHour = (id: string) => {
    setWorkingHours(prev => prev.filter(hour => hour.id !== id));
  };

  const handleSave = async () => {
    if (!doctorData?.id) {
      toast.error('لم يتم العثور على بيانات الطبيب');
      return;
    }

    setIsLoading(true);
    
    try {
      // حفظ الجدول في قاعدة البيانات
      const response = await fetch(`/api/doctors/${doctorData.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: workingHours })
      });

      if (!response.ok) {
        throw new Error('فشل في حفظ الجدول');
      }

      toast.success('تم حفظ أوقات العمل بنجاح!');
    } catch (error) {
      toast.error('حدث خطأ في حفظ الجدول');
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkingHoursForDay = (day: string) => {
    return workingHours.filter(hour => hour.day === day);
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
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">تحديث أوقات العمل</h1>
                <p className="text-sm text-gray-600">إدارة جدولك الأسبوعي</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="bg-white rounded-lg shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">الجدول الأسبوعي</h2>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>

            <div className="space-y-6">
              {daysOfWeek.map(day => {
                const dayHours = getWorkingHoursForDay(day.key);
                
                return (
                  <div key={day.key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{day.arabic}</h3>
                      <Button
                        onClick={() => addWorkingHour(day.key, day.arabic)}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        إضافة فترة
                      </Button>
                    </div>

                    {dayHours.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>لا توجد فترات عمل في هذا اليوم</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dayHours.map(hour => (
                          <div key={hour.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={hour.isActive}
                                onChange={(e) => updateWorkingHour(hour.id, 'isActive', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-600">مفعل</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600">من:</label>
                              <input
                                type="time"
                                value={hour.startTime}
                                onChange={(e) => updateWorkingHour(hour.id, 'startTime', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600">إلى:</label>
                              <input
                                type="time"
                                value={hour.endTime}
                                onChange={(e) => updateWorkingHour(hour.id, 'endTime', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <Button
                              onClick={() => removeWorkingHour(hour.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">نصائح مهمة</h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>يمكنك إضافة عدة فترات عمل في نفس اليوم (مثل الصباح والمساء)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>تأكد من عدم تداخل الأوقات في نفس اليوم</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>يمكنك إلغاء تفعيل أي فترة مؤقتاً بدون حذفها</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>سيتم تطبيق التغييرات على جميع المواعيد الجديدة</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}