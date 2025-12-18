import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // التحقق من البيانات المطلوبة
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    // البحث عن المستخدم
    const user = db.getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // التحقق من كلمة المرور (في التطبيق الحقيقي يجب استخدام hashing)
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // التحقق من أن الحساب نشط
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'الحساب غير نشط، يرجى التواصل مع الإدارة' },
        { status: 403 }
      );
    }

    // إنشاء token بسيط (في التطبيق الحقيقي يجب استخدام JWT)
    const token = `token_${user.id}_${Date.now()}`;

    // جلب بيانات إضافية حسب نوع المستخدم
    let additionalData = {};
    
    if (user.role === 'doctor') {
      const doctor = db.getDoctorByUserId(user.id);
      if (doctor) {
        const specialty = db.getSpecialtyById(doctor.specialty_id);
        const location = db.getLocationById(doctor.location_id);
        
        additionalData = {
          doctor: {
            ...doctor,
            specialty,
            location
          }
        };
      }
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      is_active: user.is_active,
      created_at: user.created_at,
      ...additionalData
    };

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token
      },
      message: 'تم تسجيل الدخول بنجاح'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في تسجيل الدخول' },
      { status: 500 }
    );
  }
}
