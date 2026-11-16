'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, Shield, Settings, LogOut, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// مكون الإحصائيات
function StatsCards() {
  const [stats, setStats] = useState({
    totalDoctors: 0,
    activeDoctors: 0,
    verifiedDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    totalSpecialties: 0,
    appointmentsByStatus: {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    },
    doctorsByStatus: {
      active: 0,
      inactive: 0,
      verified: 0,
      unverified: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1,2,3,4].map(i => (
          <Card key={i} className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-white rounded-lg shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الأطباء</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDoctors}</p>
              <p className="text-xs text-green-600">
                {stats.doctorsByStatus.verified} معتمد • {stats.doctorsByStatus.active} نشط
              </p>
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
              <p className="text-sm text-gray-600">المرضى المسجلين</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
              <p className="text-xs text-gray-500">مستخدمين نشطين</p>
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
              <p className="text-sm text-gray-600">المواعيد اليوم</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              <p className="text-xs text-blue-600">
                {stats.appointmentsByStatus.confirmed} مؤكد • {stats.appointmentsByStatus.pending} في الانتظار
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
              <p className="text-sm text-gray-600">التخصصات</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSpecialties}</p>
              <p className="text-xs text-purple-600">تخصصات طبية متنوعة</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // التحقق من صلاحيات المدير
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role !== 'admin') {
        router.push('/auth/login');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (success) {
        // التحقق من أن المستخدم مدير
        if (email !== 'mahmoudamr700@gmail.com') {
          setError('ليس لديك صلاحيات إدارية');
          logout();
          return;
        }
        setEmail('');
        setPassword('');
      } else {
        setError('بيانات الدخول غير صحيحة');
      }
    } catch (error) {
      setError('حدث خطأ في تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // شاشة التحميل
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

  // صفحة تسجيل الدخول
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">لوحة الإدارة</h1>
              <p className="text-gray-600">تسجيل دخول المدير</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="mahmoudamr700@gmail.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    placeholder="0123456789"
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
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // لوحة الإدارة الرئيسية
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">لوحة الإدارة</h1>
                <p className="text-sm text-gray-600">مرحباً بك في نظام إدارة المنصة</p>
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

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <StatsCards />

        {/* Management Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Doctors Management */}
          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">إدارة الأطباء</h3>
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/dashboard/admin/doctors')}
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Users className="h-4 w-4 ml-2" />
                  عرض جميع الأطباء
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard/admin/doctors?status=unverified')}
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Shield className="h-4 w-4 ml-2" />
                  الأطباء في انتظار الموافقة
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard/admin/specialties')}
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Settings className="h-4 w-4 ml-2" />
                  إدارة التخصصات
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Management */}
          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">إدارة النظام</h3>
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/dashboard/admin/appointments')}
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Calendar className="h-4 w-4 ml-2" />
                  إدارة المواعيد
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard/admin/locations')}
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Settings className="h-4 w-4 ml-2" />
                  إدارة المواقع
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard/admin/specialties')}
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Settings className="h-4 w-4 ml-2" />
                  إدارة التخصصات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
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
                  <p className="text-sm text-gray-600">مع د. أحمد محمد - تخصص القلب</p>
                </div>
                <span className="text-sm text-gray-500">منذ 5 دقائق</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">طبيب جديد انضم للمنصة</p>
                  <p className="text-sm text-gray-600">د. فاطمة علي - تخصص الأطفال</p>
                </div>
                <span className="text-sm text-gray-500">منذ ساعة</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">طلب تحديث بيانات طبيب</p>
                  <p className="text-sm text-gray-600">د. محمد السيد - تحديث الأسعار</p>
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