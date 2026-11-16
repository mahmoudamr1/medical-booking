'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Heart, Brain, Eye, Bone, Baby, Stethoscope, Scissors, Ear } from 'lucide-react';
import router from 'next/router';

interface Specialty {
  id: string;
  name: string;
  description: string;
  icon: any;
  doctorCount: number;
  color: string;
}

export default function SpecialtiesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);

  // خريطة الأيقونات
  const iconMap: Record<string, any> = {
    'heart': Heart,
    'baby': Baby,
    'eye': Eye,
    'brain': Brain,
    'bone': Bone,
    'medical': Stethoscope,
    'surgery': Scissors,
    'tooth': Stethoscope,
    'skin': Stethoscope,
    'female': Baby
  };

  // خريطة الألوان
  const colorMap: Record<string, string> = {
    'طب القلب': 'bg-red-100 text-red-600',
    'طب الأطفال': 'bg-pink-100 text-pink-600',
    'طب العيون': 'bg-blue-100 text-blue-600',
    'طب الأعصاب': 'bg-purple-100 text-purple-600',
    'العظام والمفاصل': 'bg-orange-100 text-orange-600',
    'الطب الباطني': 'bg-green-100 text-green-600',
    'الجراحة العامة': 'bg-gray-100 text-gray-600',
    'طب الأسنان': 'bg-cyan-100 text-cyan-600',
    'الأمراض الجلدية': 'bg-yellow-100 text-yellow-600',
    'طب النساء والولادة': 'bg-indigo-100 text-indigo-600'
  };

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/specialties');
      const result = await response.json();
      
      if (result.success && result.data) {
        const formattedSpecialties = result.data.map((spec: any) => ({
          id: spec.id,
          name: spec.name,
          description: spec.description,
          icon: iconMap[spec.icon] || Stethoscope,
          doctorCount: spec.doctorsCount || 0,
          color: colorMap[spec.name] || 'bg-gray-100 text-gray-600'
        }));
        setSpecialties(formattedSpecialties);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecialties = specialties.filter(specialty =>
    specialty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    specialty.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSpecialtyClick = (specialty: Specialty) => {
    router.push(`/search?specialty=${encodeURIComponent(specialty.name)}`);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">التخصصات الطبية</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              اختر التخصص المناسب لحالتك الصحية واعثر على أفضل الأطباء المتخصصين
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="ابحث عن التخصص..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-12 py-4 text-lg border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Specialties Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل التخصصات...</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {filteredSpecialties.length} تخصص متاح
                  </h2>
                  <p className="text-gray-600">
                    إجمالي {specialties.reduce((sum, s) => sum + s.doctorCount, 0)} طبيب متخصص
                  </p>
                </div>

                {filteredSpecialties.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد تخصصات تطابق البحث</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredSpecialties.map((specialty) => {
                      const IconComponent = specialty.icon;
                      return (
                        <Card 
                          key={specialty.id}
                          className="bg-white rounded-2xl shadow-sm border-0 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                          onClick={() => handleSpecialtyClick(specialty)}
                        >
                          <CardContent className="p-6 text-center">
                            <div className={`w-16 h-16 ${specialty.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                              <IconComponent className="h-8 w-8" />
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                              {specialty.name}
                            </h3>
                            
                            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                              {specialty.description}
                            </p>
                            
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                              <Stethoscope className="h-4 w-4" />
                              <span>{specialty.doctorCount} طبيب متاح</span>
                            </div>
                            
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:bg-blue-700 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSpecialtyClick(specialty);
                              }}
                            >
                              عرض الأطباء
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Popular Specialties */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">التخصصات الأكثر طلباً</h2>
              <p className="text-xl text-gray-600">التخصصات التي يبحث عنها المرضى أكثر</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {specialties
                .sort((a, b) => b.doctorCount - a.doctorCount)
                .slice(0, 3)
                .map((specialty, index) => {
                  const IconComponent = specialty.icon;
                  return (
                    <Card 
                      key={specialty.id}
                      className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-sm border-0 hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => handleSpecialtyClick(specialty)}
                    >
                      <CardContent className="p-8 text-center">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm mr-2">
                            {index + 1}
                          </div>
                          <div className={`w-12 h-12 ${specialty.color} rounded-xl flex items-center justify-center`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {specialty.name}
                        </h3>
                        
                        <p className="text-gray-600 mb-4">
                          {specialty.doctorCount} طبيب متخصص
                        </p>
                        
                        <Button 
                          variant="outline" 
                          className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpecialtyClick(specialty);
                          }}
                        >
                          احجز الآن
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg border-0">
              <CardContent className="p-12">
                <h2 className="text-3xl font-bold text-white mb-4">
                  لم تجد التخصص المناسب؟
                </h2>
                <p className="text-xl text-blue-100 mb-8">
                  تواصل معنا وسنساعدك في العثور على الطبيب المناسب لحالتك
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => router.push('/support')}
                    className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
                  >
                    تواصل معنا
                  </Button>
                  <Button 
                    onClick={() => router.push('/search')}
                    variant="outline" 
                    className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
                  >
                    البحث العام
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