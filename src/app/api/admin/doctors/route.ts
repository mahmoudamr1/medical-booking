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

    console.log('API Filters:', { search, specialty, status, page, limit });

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

    console.log('Total doctors before filtering:', allDoctors.length);

    let filteredDoctors = [...allDoctors];

    // تطبيق الفلاتر
    if (search && search.trim() !== '') {
      const searchTerm = search.toLowerCase().trim();
      console.log('Applying search filter:', searchTerm);
      
      filteredDoctors = filteredDoctors.filter(doctor => {
        // البحث في الاسم
        const nameMatch = doctor.name && doctor.name.toLowerCase().includes(searchTerm);
        const doctorNameMatch = doctor.doctorName && doctor.doctorName.toLowerCase().includes(searchTerm);
        
        // البحث في البريد الإلكتروني
        const emailMatch = doctor.email && doctor.email.toLowerCase().includes(searchTerm);
        
        // البحث في التخصص
        const specialtyMatch = doctor.specialty && doctor.specialty.toLowerCase().includes(searchTerm);
        
        // البحث في الموقع
        const locationMatch = doctor.location && doctor.location.toLowerCase().includes(searchTerm);
        const governorateMatch = doctor.governorate && doctor.governorate.toLowerCase().includes(searchTerm);
        
        // البحث في الوصف
        const bioMatch = doctor.bio && doctor.bio.toLowerCase().includes(searchTerm);
        
        // البحث في رقم الهاتف
        const phoneMatch = doctor.phone && doctor.phone.includes(searchTerm);
        
        // البحث في رقم الترخيص
        const licenseMatch = doctor.licenseNumber && doctor.licenseNumber.toLowerCase().includes(searchTerm);
        
        const matches = nameMatch || doctorNameMatch || emailMatch || specialtyMatch || 
                       locationMatch || governorateMatch || bioMatch || phoneMatch || licenseMatch;
        
        return matches;
      });
      
      console.log('After search filter:', filteredDoctors.length);
    }

    if (specialty && specialty.trim() !== '') {
      console.log('Applying specialty filter:', specialty);
      filteredDoctors = filteredDoctors.filter(doctor =>
        doctor.specialty && doctor.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
      console.log('After specialty filter:', filteredDoctors.length);
    }

    if (status && status.trim() !== '' && status !== 'all') {
      console.log('Applying status filter:', status);
      
      if (status === 'active') {
        filteredDoctors = filteredDoctors.filter(doctor => doctor.isActive === true);
      } else if (status === 'inactive') {
        filteredDoctors = filteredDoctors.filter(doctor => doctor.isActive === false);
      } else if (status === 'verified') {
        filteredDoctors = filteredDoctors.filter(doctor => doctor.isVerified === true);
      } else if (status === 'unverified') {
        filteredDoctors = filteredDoctors.filter(doctor => doctor.isVerified === false);
      }
      
      console.log('After status filter:', filteredDoctors.length);
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
      },
      filters: {
        search: search || '',
        specialty: specialty || '',
        status: status || ''
      },
      debug: {
        totalDoctorsBeforeFilter: allDoctors.length,
        totalDoctorsAfterFilter: filteredDoctors.length,
        appliedFilters: {
          hasSearch: !!search,
          hasSpecialty: !!specialty,
          hasStatus: !!status
        }
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