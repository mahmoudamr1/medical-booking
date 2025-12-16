import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // جلب جدول مواعيد الطبيب
    const schedules = db.getDoctorSchedulesByDoctorId(id);
    
    // تنسيق البيانات
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      doctorId: schedule.doctor_id,
      dayOfWeek: dayNames[schedule.day_of_week],
      day: dayNames[schedule.day_of_week].toLowerCase(),
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      isActive: schedule.is_active
    }));
    
    return NextResponse.json({ success: true, data: formattedSchedules });
  } catch (error: any) {
    console.error('Error fetching doctor schedule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { schedules } = await request.json();
    
    // حذف الجدول القديم (في التطبيق الحقيقي)
    const existingSchedules = db.getDoctorSchedulesByDoctorId(id);
    // في قاعدة البيانات المحلية، سنحدث البيانات مباشرة
    
    // إضافة الجدول الجديد
    const createdSchedules = [];
    for (const schedule of schedules) {
      const dayIndex = dayNames.findIndex(day => 
        day.toLowerCase() === schedule.day.toLowerCase()
      );
      
      const scheduleData = {
        doctor_id: id,
        day_of_week: dayIndex,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
        is_active: schedule.isActive !== false
      };
      
      const created = db.createDoctorSchedule(scheduleData);
      createdSchedules.push({
        id: created.id,
        doctorId: created.doctor_id,
        dayOfWeek: dayNames[created.day_of_week],
        day: dayNames[created.day_of_week].toLowerCase(),
        startTime: created.start_time,
        endTime: created.end_time,
        isActive: created.is_active
      });
    }
    
    return NextResponse.json({ success: true, data: createdSchedules });
  } catch (error: any) {
    console.error('Error updating doctor schedule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}