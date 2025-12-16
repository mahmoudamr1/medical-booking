'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import pb, { Booking } from '@/lib/pocketbase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function PatientDashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'patient')) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Fetch patient bookings
  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['patient-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const records = await pb.collection('bookings').getList<Booking>(1, 50, {
        filter: `patient = "${user.id}"`,
        expand: 'doctor.user,doctor.specialty,doctor.location',
        sort: '-date,-start_time'
      });
      
      return records.items;
    },
    enabled: !!user && isAuthenticated
  });

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return <div>جاري إعادة التوجيه...</div>;
  }

  const upcomingBookings = bookings.filter(b => 
    b.status === 'confirmed' && 
    new Date(`${b.date}T${b.start_time}`) > new Date()
  );

  const pastBookings = bookings.filter(b => 
    b.status === 'completed' || 
    (b.status === 'confirmed' && new Date(`${b.date}T${b.start_time}`) <= new Date())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">لوحة تحكم المريض</h1>
            <p className="text-muted-foreground">مرحباً، {user.name}</p>
          </div>
          <div className="space-x-2 space-x-reverse">
            <Link href="/search">
              <Button>حجز موعد جديد</Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المواعيد القادمة</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المواعيد السابقة</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المواعيد</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>المواعيد القادمة</CardTitle>
            <CardDescription>
              مواعيدك المؤكدة القادمة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBookings ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">لا توجد مواعيد قادمة</p>
                <Link href="/search">
                  <Button>احجز موعد جديد</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-semibold">
                          د. {booking.expand?.doctor?.expand?.user?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {booking.expand?.doctor?.expand?.specialty?.name}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(booking.date), 'dd MMMM yyyy', { locale: ar })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {booking.start_time} - {booking.end_time}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {booking.expand?.doctor?.expand?.location?.governorate}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          مؤكد
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>المواعيد السابقة</CardTitle>
            <CardDescription>
              تاريخ مواعيدك السابقة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pastBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">لا توجد مواعيد سابقة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4 opacity-75">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-semibold">
                          د. {booking.expand?.doctor?.expand?.user?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {booking.expand?.doctor?.expand?.specialty?.name}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(booking.date), 'dd MMMM yyyy', { locale: ar })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {booking.start_time} - {booking.end_time}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          مكتمل
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
