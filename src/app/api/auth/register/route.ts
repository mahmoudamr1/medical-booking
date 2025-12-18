import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      role = 'patient',
      specialty,
      location,
      experience,
      bio,
      licenseNumber
    } = await request.json();

    // التحقق من البيانات المطلوبة
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' },
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

    // التحقق من عدم وجود المستخدم مسبقاً
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 409 }
      );
    }

    // إنشاء المستخدم الجديد
    const newUser = db.createUser({
      name,
      email,
      password, // في التطبيق الحقيقي يجب تشفير كلمة المرور
      phone: phone || '',
      role: role as 'patient' | 'doctor' | 'admin',
      is_active: true
    });

    // إذا كان المستخدم طبيب، إنشاء بيانات الطبيب
    let doctorData = null;
    if (role === 'doctor' && specialty) {
      // البحث عن التخصص والموقع
      const specialtyObj = db.getSpecialties().find(s => s.name === specialty);
      const locationObj = db.getLocations().find(l => l.governorate === location || l.area === location);
      
      doctorData = db.createDoctor({
        user_id: newUser.id,
        specialty_id: specialtyObj?.id || '1',
        location_id: locationObj?.id || '1',
        price: 300, // سعر افتراضي
        consultation_duration: 30,
        bio: bio || '',
        experience_years: parseInt(experience) || 0,
        license_number: licenseNumber || '',
        is_verified: false, // يحتاج موافقة الإدارة
        is_active: true,
        rating: 0,
        total_reviews: 0
      });
    }

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
      ...(doctorData && { doctor: doctorData })
    };

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token
      },
      message: role === 'doctor' 
        ? 'تم إنشاء حساب الطبيب بنجاح! سيتم مراجعة البيانات من قبل الإدارة'
        : 'تم إنشاء الحساب بنجاح'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في إنشاء الحساب' },
      { status: 500 }
    );
  }
}
