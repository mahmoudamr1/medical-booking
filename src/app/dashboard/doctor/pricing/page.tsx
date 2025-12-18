'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, DollarSign, Save, History, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface PriceHistory {
  id: string;
  oldPrice: number;
  newPrice: number;
  date: string;
  reason: string;
}

export default function DoctorPricingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [currentPrice, setCurrentPrice] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/dashboard/doctor');
      return;
    }
    
    if (isAuthenticated && user) {
      loadDoctorData();
    }
  }, [isAuthenticated, authLoading, user]);

  const loadDoctorData = async () => {
    try {
      // جلب أول طبيب متاح للاختبار
      const allDoctorsResult = await fetch('/api/admin/doctors');
      const allDoctorsData = await allDoctorsResult.json();
      
      if (allDoctorsData.success && allDoctorsData.data && allDoctorsData.data.length > 0) {
        const doctor = allDoctorsData.data[0];
        setDoctorData(doctor);
        setCurrentPrice(doctor.price);
        setNewPrice(doctor.price);
        
        // محاكاة تاريخ الأسعار (في التطبيق الحقيقي سيأتي من قاعدة البيانات)
        setPriceHistory([
          {
            id: '1',
            oldPrice: doctor.price - 50,
            newPrice: doctor.price,
            date: '2024-11-01',
            reason: 'تحديث الأسعار حسب السوق'
          }
        ]);
      }
    } catch (error) {
      alert('حدث خطأ في تحميل البيانات');
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPrice === currentPrice) {
      toast.error('السعر الجديد مطابق للسعر الحالي');
      return;
    }

    if (newPrice < 50) {
      toast.error('السعر يجب أن يكون أكبر من 50 ريال');
      return;
    }

    if (!reason.trim()) {
      toast.error('يرجى كتابة سبب تغيير السعر');
      return;
    }

    setIsLoading(true);
    
    try {
      // محاكاة تحديث السعر (في التطبيق الحقيقي سيتم حفظه في قاعدة البيانات)
      await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة تأخير الشبكة

      // إضافة سجل في تاريخ الأسعار
      const newHistoryRecord = {
        id: Date.now().toString(),
        oldPrice: currentPrice,
        newPrice: newPrice,
        date: new Date().toISOString().split('T')[0],
        reason: reason
      };

      setPriceHistory(prev => [newHistoryRecord, ...prev]);
      setCurrentPrice(newPrice);
      setReason('');
      
      // تحديث بيانات الطبيب محلياً
      if (doctorData) {
        setDoctorData({
          ...doctorData,
          price: newPrice
        });
      }
      
      toast.success('تم تحديث السعر بنجاح!');
    } catch (error) {
      toast.error('حدث خطأ في تحديث السعر');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePriceChange = () => {
    const change = newPrice - currentPrice;
    const percentage = ((change / currentPrice) * 100).toFixed(1);
    return { change, percentage };
  };

  const { change, percentage } = calculatePriceChange();

  // التحقق من المصادقة
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
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
              className="w-full bg-green-600 hover:bg-green-700"
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
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">تحديث الأسعار</h1>
                <p className="text-sm text-gray-600">إدارة أسعار الاستشارات</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Price & Update Form */}
          <div className="space-y-6">
            {/* Current Price Card */}
            <Card className="bg-white rounded-lg shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">السعر الحالي</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {currentPrice} ريال
                  </div>
                  <p className="text-gray-600">سعر الاستشارة الواحدة</p>
                </div>
              </CardContent>
            </Card>

            {/* Update Price Form */}
            <Card className="bg-white rounded-lg shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">تحديث السعر</h3>
                
                <form onSubmit={handleUpdatePrice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      السعر الجديد (ريال)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="2000"
                      step="25"
                      value={newPrice}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                      required
                    />
                  </div>

                  {/* Price Change Preview */}
                  {newPrice !== currentPrice && (
                    <div className={`p-4 rounded-lg border ${
                      change > 0 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className={`h-4 w-4 ${
                          change > 0 ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <span className={`font-medium ${
                          change > 0 ? 'text-green-900' : 'text-red-900'
                        }`}>
                          معاينة التغيير
                        </span>
                      </div>
                      <div className={`text-sm ${
                        change > 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {change > 0 ? 'زيادة' : 'تخفيض'} بقيمة {Math.abs(change)} ريال 
                        ({change > 0 ? '+' : ''}{percentage}%)
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      سبب تغيير السعر
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="اكتب سبب تغيير السعر..."
                      rows={3}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || newPrice === currentPrice}
                    className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? 'جاري التحديث...' : 'تحديث السعر'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Price History */}
          <div>
            <Card className="bg-white rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-bold text-gray-900">تاريخ الأسعار</h3>
                </div>
                
                {priceHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>لا يوجد تاريخ لتغيير الأسعار</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {priceHistory.map((record, index) => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">#{priceHistory.length - index}</span>
                            <span className="text-sm text-gray-600">{record.date}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.newPrice > record.oldPrice
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.newPrice > record.oldPrice ? 'زيادة' : 'تخفيض'}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-gray-600">من: {record.oldPrice} ريال</span>
                          <span className="text-gray-400">←</span>
                          <span className="font-semibold text-gray-900">إلى: {record.newPrice} ريال</span>
                        </div>
                        
                        <p className="text-sm text-gray-700">{record.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pricing Tips */}
        <Card className="bg-blue-50 border-blue-200 mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">نصائح التسعير</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>ادرس أسعار المنافسين في نفس التخصص</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>اعتبر مستوى خبرتك وتخصصك</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>راعي الموقع الجغرافي والمنطقة</span>
                </li>
              </ul>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>تجنب التغييرات المتكررة للأسعار</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>أعلن عن التغييرات مسبقاً للمرضى</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>احتفظ بسجل واضح لأسباب التغيير</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}