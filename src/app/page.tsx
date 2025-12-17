'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Star, Phone, Calendar, Users, Shield, Heart, Brain, Eye, Stethoscope, Baby, Bone, Clock, Award } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { doctorsAPI, dataAPI, Doctor } from '@/lib/pocketbase';

// Dynamic icon mapping based on icon name from backend
const getIconComponent = (iconName?: string) => {
  const icons: Record<string, any> = {
    'heart': Heart,
    'baby': Baby,
    'eye': Eye,
    'brain': Brain,
    'bone': Bone,
    'stethoscope': Stethoscope,
  };
  return icons[iconName?.toLowerCase() || ''] || Stethoscope;
};

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // جلب أفضل الأطباء
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['featuredDoctors'],
    queryFn: async () => {
      const result = await doctorsAPI.searchDoctors({ limit: 3 });
      return result.success && result.data ? result.data.items.slice(0, 3) : [];
    }
  });

  // جلب التخصصات من الباك إند
  const { data: specialtiesData, isLoading: specialtiesLoading } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const result = await dataAPI.getSpecialties();
      return result.success ? result.data : [];
    }
  });

  const featuredDoctors = doctorsData || [];
  const specialties = specialtiesData || [];

  return (
    <MainLayout>
      {/* Hero Section - مطابق لتصميم CliniDo */}
      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* النص الرئيسي */}
            <div className="text-right">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                محتاج دكتور شاطر؟
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                احجز مع أفضل الأطباء في المملكة
              </p>
              
              {/* شريط البحث */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="ابحث عن طبيب أو تخصص"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none"
                    >
                      <option value="">اختر المدينة</option>
                      <option value="riyadh">الرياض</option>
                      <option value="jeddah">جدة</option>
                      <option value="dammam">الدمام</option>
                      <option value="mecca">مكة المكرمة</option>
                    </select>
                  </div>
                  
                  <Button 
                    onClick={() => window.location.href = `/search?q=${searchTerm}&location=${selectedLocation}`}
                    className="bg-teal-600 hover:bg-teal-700 text-white py-3 px-6 rounded-lg font-semibold"
                  >
                    ابحث
                  </Button>
                </div>
              </div>

              {/* الخدمات السريعة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/specialties" className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Stethoscope className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">كشف طبي</p>
                </Link>
                
                <Link href="/specialties" className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Heart className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">فحص شامل</p>
                </Link>
                
                <Link href="/specialties" className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">استشارة</p>
                </Link>
                
                <Link href="/specialties" className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">متابعة</p>
                </Link>
              </div>
            </div>

            {/* الصورة الجانبية */}
            <div className="relative">
              <div className="bg-white rounded-3xl p-8 shadow-xl">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="h-16 w-16 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">أكثر من 500 طبيب</h3>
                  <p className="text-gray-600 mb-6">في جميع التخصصات الطبية</p>
                  <div className="flex justify-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-teal-600">4.9</div>
                      <div className="flex justify-center">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">10K+</div>
                      <div className="text-sm text-gray-600">مريض راضي</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* أفضل الأطباء */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">أفضل الأطباء المتاحين</h2>
            <p className="text-gray-600">احجز مع أفضل الأطباء في تخصصات مختلفة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {doctorsLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i} className="bg-white rounded-2xl shadow-lg border-0 animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                      </div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded mb-4"></div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                      <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              featuredDoctors.map((doctor: Doctor) => (
                <Card key={doctor.id} className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {doctor.doctorName || doctor.expand?.user?.name || 'طبيب'}
                        </h3>
                        <p className="text-teal-600 font-medium text-sm mb-2">
                          {doctor.expand?.specialty?.name || 'تخصص طبي'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {doctor.expand?.location?.governorate || 'المدينة'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            4.8 (127)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="text-2xl font-bold text-green-600">{doctor.price} ريال</div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{doctor.consultation_duration} دقيقة</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/search`} className="flex-1">
                        <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                          <Calendar className="h-4 w-4 ml-2" />
                          حجز موعد
                        </Button>
                      </Link>
                      <Link href={`/doctor/${doctor.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          عرض الملف الشخصي
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <Link href="/search">
              <Button variant="outline" className="px-8 py-3 rounded-xl">
                عرض جميع الأطباء
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* التخصصات الطبية */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">ابحث حسب التخصص</h2>
            <p className="text-gray-600">اختر التخصص المناسب لحالتك الصحية</p>
          </div>

          {specialtiesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-2xl mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : specialties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">لا توجد تخصصات متاحة</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {specialties.slice(0, 6).map((specialty) => {
                const IconComponent = getIconComponent(specialty.icon);
                const colorClasses = specialty.color || 'bg-teal-100 text-teal-600';
                
                return (
                  <Link 
                    key={specialty.id}
                    href={`/search?specialty=${specialty.id}`}
                    className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className={`w-16 h-16 ${colorClasses} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                      {specialty.name}
                    </h3>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/specialties">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl">
                عرض جميع التخصصات
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* المميزات */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">لماذا تختارنا؟</h2>
            <p className="text-gray-600">نقدم لك أفضل تجربة طبية رقمية</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">حجز سهل وسريع</h3>
              <p className="text-gray-600 leading-relaxed">
                احجز موعدك في دقائق معدودة واختر الوقت المناسب لك
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Award className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">أطباء معتمدون</h3>
              <p className="text-gray-600 leading-relaxed">
                جميع أطبائنا حاصلون على تراخيص معتمدة وخبرة واسعة
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">آمن وموثوق</h3>
              <p className="text-gray-600 leading-relaxed">
                بياناتك محمية بأعلى معايير الأمان والخصوصية
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* الإحصائيات */}
      <section className="py-16 bg-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-teal-100">طبيب معتمد</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-teal-100">مريض راضي</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25+</div>
              <div className="text-teal-100">تخصص طبي</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-teal-100">مدينة مغطاة</div>
            </div>
          </div>
        </div>
      </section>

      {/* دعوة للعمل */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">ابدأ رحلتك الصحية اليوم</h2>
          <p className="text-xl mb-8 opacity-90">انضم إلى آلاف المرضى الذين يثقون بنا</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-xl text-lg font-semibold">
                إنشاء حساب مجاني
              </Button>
            </Link>
            <Link href="/doctor/register">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold">
                انضم كطبيب
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}