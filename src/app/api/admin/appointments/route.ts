import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const date = searchParams.get('date') || '';
    const doctorId = searchParams.get('doctorId') || '';

    const allAppointments = db.getAppointments().map(appointment => {
      const doctor = db.getDoctorById(appointment.doctor_id);
      const doctorUser = doctor ? db.getUserById(doctor.user_id) : null;
      const specialty = doctor ? db.getSpecialtyById(doctor.specialty_id) : null;
      const patient = db.getUserById(appointment.patient_id);

      return {
        id: appointment.id,
        patientName: appointment.patient_name,
        patientEmail: appointment.patient_email,
        patientPhone: appointment.patient_phone,
        doctorName: doctorUser?.name || 'غير محدد',
        doctorId: appointment.doctor_id,
        specialty: specialty?.name || 'غير محدد',
        date: appointment.date,
        appointmentDate: appointment.date,
        time: appointment.start_time,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        duration: appointment.end_time ? 
          (new Date(`2000-01-01T${appointment.end_time}`).getTime() - new Date(`2000-01-01T${appointment.start_time}`).getTime()) / (1000 * 60) 
          : 30,
        price: appointment.price,
        status: appointment.status,
        notes: appointment.notes,
        created_at: appointment.created_at
      };
    });

    let filteredAppointments = [...allAppointments];

    // تطبيق الفلاتر
    if (search) {
      filteredAppointments = filteredAppointments.filter(appointment =>
        appointment.patientName.toLowerCase().includes(search.toLowerCase()) ||
        appointment.patientEmail.toLowerCase().includes(search.toLowerCase()) ||
        appointment.doctorName.toLowerCase().includes(search.toLowerCase()) ||
        appointment.specialty.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status) {
      filteredAppointments = filteredAppointments.filter(appointment =>
        appointment.status === status
      );
    }

    if (date) {
      filteredAppointments = filteredAppointments.filter(appointment =>
        appointment.date === date
      );
    }

    if (doctorId) {
      filteredAppointments = filteredAppointments.filter(appointment =>
        appointment.doctorId === doctorId
      );
    }

    // ترتيب حسب التاريخ والوقت
    filteredAppointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateB.getTime() - dateA.getTime();
    });

    // تطبيق الـ pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedAppointments,
      appointments: paginatedAppointments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredAppointments.length / limit),
        totalItems: filteredAppointments.length,
        itemsPerPage: limit
      }
    });
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const appointment = db.createAppointment({
      doctor_id: body.doctorId,
      patient_id: body.patientId || 'guest',
      date: body.appointmentDate,
      start_time: body.startTime,
      end_time: body.endTime,
      status: 'pending',
      price: body.price,
      notes: body.notes,
      patient_name: body.patientName,
      patient_email: body.patientEmail,
      patient_phone: body.patientPhone
    });

    return NextResponse.json({
      success: true,
      data: appointment
    });
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}