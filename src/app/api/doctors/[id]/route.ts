import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: doctorId } = await params;
    
    // جلب بيانات الطبيب مع التفاصيل
    const doctorWithDetails = db.getDoctorWithDetails(doctorId);
    
    if (!doctorWithDetails) {
      return NextResponse.json(
        { success: false, error: 'الطبيب غير موجود' },
        { status: 404 }
      );
    }

    // تنسيق البيانات للعرض
    const formattedDoctor = {
      id: doctorWithDetails.id,
      name: doctorWithDetails.user?.name,
      specialty: doctorWithDetails.specialty?.name,
      location: doctorWithDetails.location ? `${doctorWithDetails.location.governorate} - ${doctorWithDetails.location.area}` : '',
      governorate: doctorWithDetails.location?.governorate,
      area: doctorWithDetails.location?.area,
      price: doctorWithDetails.price,
      rating: doctorWithDetails.rating,
      reviews: doctorWithDetails.total_reviews,
      experience: doctorWithDetails.experience_years,
      bio: doctorWithDetails.bio,
      consultationDuration: doctorWithDetails.consultation_duration,
      isVerified: doctorWithDetails.is_verified,
      isActive: doctorWithDetails.is_active,
      phone: doctorWithDetails.user?.phone,
      email: doctorWithDetails.user?.email,
      licenseNumber: doctorWithDetails.license_number
    };

    return NextResponse.json({
      success: true,
      data: formattedDoctor
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}