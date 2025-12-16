import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const specialty = searchParams.get('specialty') || '';
    const status = searchParams.get('status') || '';

    // جلب جميع الأطباء مع التفاصيل
    const allDoctors = db.getDoctors().map(doctor => {
      const user = db.getUserById(doctor.user_id);
      const specialtyData = db.getSpecialtyById(doctor.specialty_id);
      const location = db.getLocationById(doctor.location_id);

      return {
        id: doctor.id,
        name: user?.name || '',
        doctorName: user?.name || '',
        specialty: specialtyData?.name || '',
        location: location ? `${location.governorate} - ${location.area}` : '',
        governorate: location?.governorate || '',
        price: doctor.price,
        rating: doctor.rating,
        reviews: doctor.total_reviews,
        total_reviews: doctor.total_reviews,
        isVerified: doctor.is_verified,
        is_verified: doctor.is_verified,
        isActive: doctor.is_active,
        is_active: doctor.is_active,
        phone: user?.phone || '',
        email: user?.email || '',
        experience: doctor.experience_years,
        experience_years: doctor.experience_years,
        bio: doctor.bio,
        consultationDuration: doctor.consultation_duration,
        consultation_duration: doctor.consultation_duration,
        licenseNumber: doctor.license_number,
        license_number: doctor.license_number,
        joinDate: doctor.created_at.split('T')[0],
        created_at: doctor.created_at,
        user_id: doctor.user_id,
        specialty_id: doctor.specialty_id,
        location_id: doctor.location_id,
        expand: {
          user: user ? { name: user.name, email: user.email, phone: user.phone } : null,
          specialty: specialtyData ? { name: specialtyData.name, description: specialtyData.description } : null,
          location: location ? { governorate: location.governorate, area: location.area } : null
        }
      };
    });

    let filteredDoctors = [...allDoctors];

    // تطبيق الفلاتر
    if (search) {
      filteredDoctors = filteredDoctors.filter(doctor =>
        doctor.name.toLowerCase().includes(search.toLowerCase()) ||
        doctor.email.toLowerCase().includes(search.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(search.toLowerCase()) ||
        doctor.bio.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (specialty) {
      filteredDoctors = filteredDoctors.filter(doctor =>
        doctor.specialty === specialty
      );
    }

    if (status) {
      if (status === 'active') {
        filteredDoctors = filteredDoctors.filter(doctor => doctor.isActive);
      } else if (status === 'inactive') {
        filteredDoctors = filteredDoctors.filter(doctor => !doctor.isActive);
      } else if (status === 'verified') {
        filteredDoctors = filteredDoctors.filter(doctor => doctor.isVerified);
      } else if (status === 'unverified') {
        filteredDoctors = filteredDoctors.filter(doctor => !doctor.isVerified);
      }
    }

    // تطبيق الـ pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedDoctors,
      doctors: paginatedDoctors,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredDoctors.length / limit),
        totalItems: filteredDoctors.length,
        itemsPerPage: limit
      }
    });
  } catch (error: any) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}