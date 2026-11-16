'use client';

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Clock } from 'lucide-react';

export default function SupportPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">الدعم الفني</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              نحن هنا لمساعدتك! تواصل معنا في أي وقت للحصول على الدعم والمساعدة
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Methods */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">طرق التواصل</h2>
              
              <div className="space-y-6">
                <Card className="bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Phone className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">الهاتف</h3>
                        <p className="text-gray-600">920000000</p>
                        <p className="text-sm text-gray-500">متاح 24/7</p>
                      </div>
                      <Button 
                        onClick={() => window.open('tel:920000000', '_self')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        اتصل الآن
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">البريد الإلكتروني</h3>
                        <p className="text-gray-600">support@medical-booking.sa</p>
                        <p className="text-sm text-gray-500">نرد خلال 24 ساعة</p>
                      </div>
                      <Button 
                        onClick={() => window.open('mailto:support@medical-booking.sa', '_self')}
                        variant="outline"
                      >
                        راسلنا
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Clock className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">ساعات العمل</h3>
                        <p className="text-gray-600">السبت - الخميس: 8:00 ص - 10:00 م</p>
                        <p className="text-gray-600">الجمعة: 2:00 م - 10:00 م</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">الأسئلة الشائعة</h2>
              
              <div className="space-y-4">
                <Card className="bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">كيف يمكنني حجز موعد؟</h3>
                    <p className="text-gray-600">يمكنك حجز موعد من خلال البحث عن الطبيب المناسب واختيار الوقت المناسب لك.</p>
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">هل يمكنني إلغاء الموعد؟</h3>
                    <p className="text-gray-600">نعم، يمكنك إلغاء الموعد قبل 24 ساعة من الموعد المحدد.</p>
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">كيف يمكنني التواصل مع الطبيب؟</h3>
                    <p className="text-gray-600">يمكنك التواصل مع الطبيب عبر الهاتف المتاح في صفحة الطبيب.</p>
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">هل الخدمة مجانية؟</h3>
                    <p className="text-gray-600">الحجز مجاني، وتدفع رسوم الاستشارة للطبيب مباشرة.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}