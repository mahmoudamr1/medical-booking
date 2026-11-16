import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    // التحقق من وجود الحجز
    const appointment = db.getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'الحجز غير موجود' },
        { status: 404 }
      );
    }

    // تحديث الحجز
    const updatedAppointment = db.updateAppointment(id, updates);
    if (!updatedAppointment) {
      return NextResponse.json(
        { success: false, error: 'فشل في تحديث الحجز' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: 'تم تحديث الحجز بنجاح'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ في تحديث الحجز' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // التحقق من وجود الحجز
    const appointment = db.getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'الحجز غير موجود' },
        { status: 404 }
      );
    }

    // حذف الحجز (تحديث الحالة إلى cancelled)
    const updatedAppointment = db.updateAppointment(id, { status: 'cancelled' });
    if (!updatedAppointment) {
      return NextResponse.json(
        { success: false, error: 'فشل في حذف الحجز' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الحجز بنجاح'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ في حذف الحجز' },
      { status: 500 }
    );
  }
}