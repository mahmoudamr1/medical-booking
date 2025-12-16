'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronDown, Menu, X } from 'lucide-react';
import { dataAPI, doctorsAPI, Doctor, Specialty } from '@/lib/pocketbase';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: specialties = [], isLoading: isLoadingSpecialties } = useQuery<Specialty[]>({
    queryKey: ['header-specialties'],
    queryFn: async () => {
      const res = await dataAPI.getSpecialties();
      return res.success ? res.data : [];
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: fallbackSpecialties = [] } = useQuery<Specialty[]>({
    queryKey: ['header-fallback-specialties'],
    queryFn: async () => {
      const res = await doctorsAPI.searchDoctors({ page: 1, limit: 50 });
      if (!res.success || !res.data) return [];

      const unique: Record<string, Specialty> = {};
      (res.data.items as Doctor[]).forEach((doc) => {
        const spec = doc.expand?.specialty;
        if (spec && !unique[spec.id]) {
          unique[spec.id] = spec;
        }
      });
      return Object.values(unique);
    },
    enabled: specialties.length === 0,
    staleTime: 5 * 60 * 1000
  });

  const displaySpecialties = specialties.length > 0 ? specialties : fallbackSpecialties;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">منصة الحجز الطبي</h1>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-900 font-medium hover:text-blue-600 transition-colors">
                الرئيسية
              </Link>
              <Link href="/search" className="text-gray-600 hover:text-gray-900 transition-colors">
                الأطباء
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
                  <span>التخصصات</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                  {isLoadingSpecialties ? (
                    <div className="px-4 py-3 text-sm text-gray-500">جاري التحميل...</div>
                  ) : displaySpecialties.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">لا توجد تخصصات متاحة</div>
                  ) : (
                    displaySpecialties.slice(0, 12).map((specialty) => (
                      <Link
                        key={specialty.id}
                        href={`/search?specialty=${specialty.id}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {specialty.name}
                      </Link>
                    ))
                  )}
                  {displaySpecialties.length > 12 && (
                    <div className="border-t border-gray-100 mt-1">
                      <Link
                        href="/search"
                        className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                      >
                        عرض جميع التخصصات
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </nav>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                تسجيل الدخول
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-2xl">
                إنشاء حساب
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-100">
            <nav className="flex flex-col gap-4 mt-4">
              <Link 
                href="/" 
                className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                الرئيسية
              </Link>
              <Link 
                href="/search" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                الأطباء
              </Link>
              <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-gray-600 hover:text-gray-900">
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl">
                    إنشاء حساب
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}