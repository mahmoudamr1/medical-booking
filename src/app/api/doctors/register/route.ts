import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      // بيانات المستخدم
      name,
      email,
      password,
      phone,
      // بيانات الطبيب
      specialtyId,
      locationId,
      price,
      consultationDuration = 30,
      bio,
      experienceYears,
      licenseNumber
    } = await request.json();

    // التحقق من البيانات المطلوبة
    if (!name || !email || !password || !specialtyId || !locationId || !price || !licenseNumber) {
      return NextResponse.json(
        { success: false, error: 'جميع البيانات المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني غير صحيح' },
        { status: 400 }
      );
    }

    // التحقق من طول كلمة المرور
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    // التحقق من صحة السعر
    if (price < 50 || price > 10000) {
      return NextResponse.json(
        { success: false, error: 'السعر يجب أن يكون بين 50 و 10000 ريال' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود المستخدم مسبقاً
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 409 }
      );
    }

    // التحقق من وجود التخصص والموقع
    const specialty = db.getSpecialtyById(specialtyId);
    const location = db.getLocationById(locationId);
    
    if (!specialty) {
      return NextResponse.json(
        { success: false, error: 'التخصص المحدد غير موجود' },
        { status: 400 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'الموقع المحدد غير موجود' },
        { status: 400 }
      );
    }

    // إنشاء المستخدم الجديد
    const newUser = db.createUser({
      name,
      email,
      password, // في التطبيق الحقيقي يجب تشفير كلمة المرور
      phone: phone || '',
      role: 'doctor',
      is_active: true
    });

    // إنشاء بيانات الطبيب
    const newDoctor = db.createDoctor({
      user_id: newUser.id,
      specialty_id: specialtyId,
      location_id: locationId,
      price: Number(price),
      consultation_duration: Number(consultationDuration),
      bio: bio || '',
      experience_years: Number(experienceYears) || 0,
      license_number: licenseNumber,
      is_verified: false, // يحتاج موافقة الإدارة
      is_active: false, // يحتاج تفعيل من الإدارة
      rating: 0,
      total_reviews: 0
    });

    // إنشاء token بسيط
    const token = `token_${newUser.id}_${Date.now()}`;

    const userData = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      is_active: newUser.is_active,
      created_at: newUser.created_at,
      doctor: {
        ...newDoctor,
        specialty,
        location
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token
      },
      message: 'تم تسجيل الطبيب بنجاح، سيتم مراجعة البيانات وتفعيل الحساب قريباً'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في تسجيل الطبيب' },
      { status: 500 }
    );
  }
}
