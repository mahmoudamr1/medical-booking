'use client';

import Link from 'next/link';
import { Calendar, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">منصة الحجز الطبي</span>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              منصة رقمية متطورة تربط المرضى بأفضل الأطباء المتخصصين في جميع أنحاء المملكة العربية السعودية. 
              نوفر تجربة حجز سهلة وآمنة مع أعلى معايير الجودة والخدمة.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>920000000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>info@medical-booking.sa</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link href="/" className="hover:text-blue-600 transition-colors">
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-blue-600 transition-colors">
                  البحث عن طبيب
                </Link>
              </li>
              <li>
                <Link href="/specialties" className="hover:text-blue-600 transition-colors">
                  التخصصات الطبية
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-blue-600 transition-colors">
                  من نحن
                </Link>
              </li>
            </ul>
          </div>

          {/* For Doctors */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">للأطباء</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link href="/dashboard/doctor" className="hover:text-blue-600 transition-colors">
                  تسجيل دخول الأطباء
                </Link>
              </li>
              <li>
                <Link href="/doctor/register" className="hover:text-blue-600 transition-colors">
                  انضم كطبيب
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin" className="hover:text-blue-600 transition-colors">
                  لوحة الإدارة
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-blue-600 transition-colors">
                  الدعم الفني
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-right text-gray-600">
              <p>جميع الحقوق محفوظة © 2024 منصة الحجز الطبي</p>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                سياسة الخصوصية
              </Link>
              <Link href="/terms" className="hover:text-blue-600 transition-colors">
                الشروط والأحكام
              </Link>
              <Link href="/contact" className="hover:text-blue-600 transition-colors">
                اتصل بنا
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}