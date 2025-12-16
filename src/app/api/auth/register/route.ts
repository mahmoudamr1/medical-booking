import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, role = 'patient' } = await request.json();

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

    // إنشاء token بسيط
    const token = `token_${newUser.id}_${Date.now()}`;

    const userData = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      is_active: newUser.is_active,
      created_at: newUser.created_at
    };

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token
      },
      message: 'تم إنشاء الحساب بنجاح'
    });

  } catch (error: any) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في إنشاء الحساب' },
      { status: 500 }
    );
  }
}