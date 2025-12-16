'use client';

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Users, Award, Clock, Shield, Star } from 'lucide-react';

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">من نحن</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              منصة طبية رائدة تهدف إلى تسهيل الوصول للرعاية الصحية وربط المرضى بأفضل الأطباء في المملكة العربية السعودية
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <Card className="bg-white rounded-2xl shadow-sm border-0">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                    <Heart className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">رسالتنا</h2>
                  <p className="text-gray-600 leading-relaxed">
                    نسعى لتوفير منصة طبية متطورة تجمع بين أفضل الأطباء والمرضى، 
                    مما يضمن حصول كل مريض على الرعاية الصحية المناسبة في الوقت المناسب 
                    وبأعلى معايير الجودة والأمان.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl shadow-sm border-0">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                    <Star className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">رؤيتنا</h2>
                  <p className="text-gray-600 leading-relaxed">
                    أن نكون المنصة الطبية الأولى في المنطقة، والمرجع الموثوق للمرضى 
                    والأطباء على حد سواء، من خلال الابتكار في تقديم الخدمات الصحية 
                    الرقمية وتحسين تجربة الرعاية الصحية.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">لماذا تختارنا؟</h2>
              <p className="text-xl text-gray-600">نقدم خدمات طبية متميزة تلبي احتياجاتك</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gray-50 rounded-2xl shadow-sm border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">أطباء معتمدون</h3>
                  <p className="text-gray-600">
                    جميع أطبائنا حاصلون على تراخيص معتمدة ولديهم خبرة واسعة في تخصصاتهم
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 rounded-2xl shadow-sm border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">حجز سريع</h3>
                  <p className="text-gray-600">
                    احجز موعدك في دقائق معدودة واختر الوقت المناسب لك من الأوقات المتاحة
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 rounded-2xl shadow-sm border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">أمان وخصوصية</h3>
                  <p className="text-gray-600">
                    نحافظ على سرية بياناتك الطبية بأعلى معايير الأمان والخصوصية
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">أرقامنا تتحدث</h2>
              <p className="text-xl text-gray-600">إنجازاتنا في خدمة المجتمع الطبي</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
                <p className="text-gray-600">طبيب معتمد</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">10,000+</div>
                <p className="text-gray-600">مريض راضي</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">25+</div>
                <p className="text-gray-600">تخصص طبي</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">15+</div>
                <p className="text-gray-600">مدينة مغطاة</p>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">فريق العمل</h2>
              <p className="text-xl text-gray-600">نخبة من المتخصصين في المجال الطبي والتقني</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gray-50 rounded-2xl shadow-sm border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl font-bold">أ.د</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">د. أحمد محمد</h3>
                  <p className="text-blue-600 mb-2">المدير الطبي</p>
                  <p className="text-gray-600 text-sm">
                    استشاري طب الباطنة مع خبرة 20 عام في المجال الطبي
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 rounded-2xl shadow-sm border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl font-bold">م</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">سارة أحمد</h3>
                  <p className="text-green-600 mb-2">مديرة التقنية</p>
                  <p className="text-gray-600 text-sm">
                    مهندسة برمجيات متخصصة في تطوير الأنظمة الطبية
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 rounded-2xl shadow-sm border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl font-bold">د</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">د. فاطمة علي</h3>
                  <p className="text-purple-600 mb-2">مديرة الجودة</p>
                  <p className="text-gray-600 text-sm">
                    متخصصة في ضمان الجودة والمعايير الطبية
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg border-0">
              <CardContent className="p-12">
                <h2 className="text-3xl font-bold text-white mb-4">
                  انضم إلى منصتنا اليوم
                </h2>
                <p className="text-xl text-blue-100 mb-8">
                  احجز موعدك مع أفضل الأطباء واحصل على الرعاية الصحية التي تستحقها
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => window.location.href = '/search'}
                    className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
                  >
                    ابحث عن طبيب
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/doctor/register'}
                    variant="outline" 
                    className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
                  >
                    انضم كطبيب
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}