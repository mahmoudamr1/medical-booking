import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'التاريخ مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الطبيب
    const doctor = db.getDoctorById(id);
    if (!doctor || !doctor.is_active || !doctor.is_verified) {
      return NextResponse.json(
        { success: false, error: 'الطبيب غير متاح' },
        { status: 404 }
      );
    }

    // الحصول على يوم الأسبوع للتاريخ المحدد
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // جلب جدول الطبيب لهذا اليوم
    const schedules = db.getDoctorSchedulesByDoctorId(id).filter(
      schedule => schedule.day_of_week === dayOfWeek && schedule.is_active
    );

    if (schedules.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          availableSlots: [],
          message: 'الطبيب غير متاح في هذا اليوم'
        }
      });
    }

    // التحقق من الإجازات
    const vacations = db.getDoctorVacationsByDoctorId(id);
    const isOnVacation = vacations.some(vacation => {
      const startDate = new Date(vacation.start_date);
      const endDate = new Date(vacation.end_date);
      return targetDate >= startDate && targetDate <= endDate;
    });

    if (isOnVacation) {
      return NextResponse.json({
        success: true,
        data: {
          availableSlots: [],
          message: 'الطبيب في إجازة في هذا التاريخ'
        }
      });
    }

    // جلب المواعيد المحجوزة لهذا التاريخ
    const bookedAppointments = db.getAppointmentsByDoctorId(id).filter(
      appointment => appointment.date === date && appointment.status !== 'cancelled'
    );

    // إنشاء قائمة المواعيد المتاحة
    const availableSlots = [];
    
    for (const schedule of schedules) {
      const startTime = schedule.start_time;
      const endTime = schedule.end_time;
      const duration = doctor.consultation_duration || 30;

      // تحويل الأوقات إلى دقائق
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // إنشاء المواعيد المتاحة
      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += duration) {
        const slotStartTime = minutesToTime(currentMinutes);
        const slotEndTime = minutesToTime(currentMinutes + duration);

        // التحقق من عدم تعارض مع المواعيد المحجوزة
        const isBooked = bookedAppointments.some(appointment => {
          const appointmentStart = timeToMinutes(appointment.start_time);
          const appointmentEnd = timeToMinutes(appointment.end_time);
          
          return (currentMinutes >= appointmentStart && currentMinutes < appointmentEnd) ||
                 (currentMinutes + duration > appointmentStart && currentMinutes + duration <= appointmentEnd);
        });

        if (!isBooked && currentMinutes + duration <= endMinutes) {
          availableSlots.push({
            startTime: slotStartTime,
            endTime: slotEndTime,
            duration: duration,
            price: doctor.price
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        availableSlots,
        doctorInfo: {
          id: doctor.id,
          name: db.getUserById(doctor.user_id)?.name,
          price: doctor.price,
          consultationDuration: doctor.consultation_duration
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// دالة مساعدة لتحويل الوقت إلى دقائق
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// دالة مساعدة لتحويل الدقائق إلى وقت
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}