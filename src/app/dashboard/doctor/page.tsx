'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      console.error(err);
      setError('حدث خطأ في تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
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

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>بيانات تجريبية:</p>
              <p>البريد: doctor1@clinic.com إلى doctor5@clinic.com</p>
              <p>كلمة المرور: 12345678</p>
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
                <p className="text-sm text-gray-600">مرحبا د. {user.name}</p>
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
                  <p className="text-2xl font-bold text-gray-900">8</p>
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
                  <p className="text-2xl font-bold text-gray-900">32</p>
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
                  <p className="text-2xl font-bold text-gray-900">156</p>
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
                  <p className="text-2xl font-bold text-gray-900">24,000 ريال</p>
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
              <h3 className="text-lg font-bold text-gray-900 mb-4">مواعيد اليوم</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">أحمد علي</p>
                    <p className="text-sm text-gray-600">فحص دوري - 09:00 صباحا</p>
                  </div>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">بدء الكشف</Button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">فاطمة محمد</p>
                    <p className="text-sm text-gray-600">استشارة - 10:30 صباحا</p>
                  </div>
                  <Button size="sm" variant="outline">في الانتظار</Button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">محمد السيد</p>
                    <p className="text-sm text-gray-600">متابعة - 02:00 مساء</p>
                  </div>
                  <Button size="sm" variant="outline">في الانتظار</Button>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">عرض جميع المواعيد</Button>
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
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white rounded-lg shadow-sm mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">النشاط الأخير</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">موعد جديد تم حجزه</p>
                  <p className="text-sm text-gray-600">مريض جديد - غدا الساعة 10:00 صباحا</p>
                </div>
                <span className="text-sm text-gray-500">منذ 10 دقائق</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">تقييم جديد</p>
                  <p className="text-sm text-gray-600">5 نجوم من أحمد علي</p>
                </div>
                <span className="text-sm text-gray-500">منذ ساعة</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">مريض جديد انضم</p>
                  <p className="text-sm text-gray-600">سارة أحمد - أول زيارة</p>
                </div>
                <span className="text-sm text-gray-500">منذ 3 ساعات</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
