import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      doctorId,
      patientName,
      patientEmail,
      patientPhone,
      appointmentDate,
      startTime,
      endTime,
      price,
      notes
    } = await request.json();

    // التحقق من البيانات المطلوبة
    if (!doctorId || !patientName || !patientEmail || !patientPhone || !appointmentDate || !startTime) {
      return NextResponse.json(
        { success: false, error: 'البيانات المطلوبة ناقصة' },
        { status: 400 }
      );
    }

    // التحقق من وجود الطبيب
    const doctor = db.getDoctorById(doctorId);
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'الطبيب غير موجود' },
        { status: 404 }
      );
    }

    // البحث عن مريض موجود أو إنشاء مريض جديد
    let patient = db.getUserByEmail(patientEmail);
    
    if (!patient) {
      // إنشاء مريض جديد
      patient = db.createUser({
        email: patientEmail,
        name: patientName,
        phone: patientPhone,
        password: 'temp123456', // كلمة مرور مؤقتة
        role: 'patient',
        is_active: true
      });
    }

    // التحقق من عدم وجود تعارض في المواعيد
    const existingAppointments = db.getAppointmentsByDoctorId(doctorId);
    const conflictingAppointments = existingAppointments.filter(apt => 
      apt.date === appointmentDate && 
      apt.status !== 'cancelled' && 
      ((apt.start_time <= startTime && apt.end_time > startTime) || 
       (apt.start_time < endTime && apt.end_time >= endTime))
    );

    if (conflictingAppointments.length > 0) {
      return NextResponse.json(
        { success: false, error: 'هذا الموعد محجوز بالفعل، يرجى اختيار وقت آخر' },
        { status: 409 }
      );
    }

    // إنشاء الحجز
    const appointment = db.createAppointment({
      doctor_id: doctorId,
      patient_id: patient.id,
      date: appointmentDate,
      start_time: startTime,
      end_time: endTime || startTime,
      status: 'confirmed',
      price: price || doctor.price,
      notes: notes || '',
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone
    });

    return NextResponse.json({ 
      success: true, 
      data: appointment,
      message: 'تم حجز الموعد بنجاح'
    });

  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ في إنشاء الحجز' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    let appointments;

    if (doctorId) {
      appointments = db.getAppointmentsByDoctorId(doctorId);
    } else if (patientId) {
      appointments = db.getAppointmentsByPatientId(patientId);
    } else {
      appointments = db.getAppointments();
    }

    // تطبيق فلتر الحالة إذا تم تحديدها
    if (status) {
      appointments = appointments.filter(apt => apt.status === status);
    }

    // إضافة بيانات إضافية لكل موعد
    const enrichedAppointments = appointments.map(appointment => {
      const doctor = db.getDoctorById(appointment.doctor_id);
      const doctorUser = doctor ? db.getUserById(doctor.user_id) : null;
      const specialty = doctor ? db.getSpecialtyById(doctor.specialty_id) : null;
      const patient = db.getUserById(appointment.patient_id);

      return {
        ...appointment,
        expand: {
          patient: patient ? {
            id: patient.id,
            name: patient.name,
            email: patient.email,
            phone: patient.phone
          } : {
            id: 'guest',
            name: appointment.patient_name,
            email: appointment.patient_email,
            phone: appointment.patient_phone
          },
          doctor: doctor ? {
            ...doctor,
            user: doctorUser,
            specialty: specialty
          } : null
        }
      };
    });

    return NextResponse.json({ success: true, data: enrichedAppointments });

  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}