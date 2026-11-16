import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    // البحث عن الطبيب باستخدام user_id
    const doctor = db.getDoctorByUserId(userId);
    
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'الطبيب غير موجود' },
        { status: 404 }
      );
    }

    // الحصول على بيانات المستخدم والتخصص والموقع
    const user = db.getUserById(doctor.user_id);
    const specialty = db.getSpecialtyById(doctor.specialty_id);
    const location = db.getLocationById(doctor.location_id);

    const doctorProfile = {
      ...doctor,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      specialty: specialty?.name,
      location: location ? `${location.governorate} - ${location.area}` : 'غير محدد'
    };

    return NextResponse.json({
      success: true,
      data: doctorProfile
    });

  } catch (error: any) {
    console.error('Error fetching doctor profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ في جلب بيانات الطبيب' },
      { status: 500 }
    );
  }
}