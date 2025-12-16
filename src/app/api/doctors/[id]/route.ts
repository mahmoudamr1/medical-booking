import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // التحقق من صحة السعر
    if (body.price !== undefined) {
      const priceNum = Number(body.price);
      if (Number.isNaN(priceNum) || priceNum < 50) {
        return NextResponse.json({ success: false, error: 'Invalid price' }, { status: 400 });
      }
    }

    // تحديث بيانات الطبيب
    const updatedDoctor = db.updateDoctor(id, body);
    
    if (!updatedDoctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // جلب البيانات المحدثة مع التفاصيل
    const doctorWithDetails = db.getDoctorWithDetails(id);
    
    return NextResponse.json({ success: true, data: doctorWithDetails });
  } catch (error: any) {
    console.error('Error updating doctor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // جلب بيانات الطبيب مع التفاصيل
    const doctorWithDetails = db.getDoctorWithDetails(id);
    
    if (!doctorWithDetails) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // جلب جدول الطبيب
    const schedule = db.getDoctorSchedulesByDoctorId(id);
    
    // جلب إجازات الطبيب
    const vacations = db.getDoctorVacationsByDoctorId(id);
    
    // جلب مواعيد الطبيب
    const appointments = db.getAppointmentsByDoctorId(id);

    const doctorData = {
      ...doctorWithDetails,
      schedule,
      vacations,
      appointments: appointments.map(appointment => ({
        ...appointment,
        patient: db.getUserById(appointment.patient_id)
      }))
    };
    
    return NextResponse.json({ success: true, data: doctorData });
  } catch (error: any) {
    console.error('Error fetching doctor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
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
    
    // تعطيل الطبيب بدلاً من حذفه
    const updatedDoctor = db.updateDoctor(id, { is_active: false });
    
    if (!updatedDoctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Doctor deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting doctor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}