import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = decodeURIComponent(searchParams.get('specialty') || '');
    const location = decodeURIComponent(searchParams.get('location') || '');
    const searchTerm = decodeURIComponent(searchParams.get('search') || searchParams.get('q') || '');
    const minPrice = parseInt(searchParams.get('minPrice') || '0');
    const maxPrice = parseInt(searchParams.get('maxPrice') || '999999');
    const sortBy = searchParams.get('sortBy') || 'rating'; // rating, price, experience
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc, desc
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    // البحث في الأطباء
    const searchResults = db.searchDoctors({
      specialty,
      location,
      searchTerm
    });

    let filteredDoctors = searchResults.filter(doctor => {
      if (!doctor) return false;
      
      // فلتر السعر
      if (doctor.price < minPrice || doctor.price > maxPrice) return false;
      
      return true;
    });

    // الترتيب
    filteredDoctors.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a?.price || 0;
          bValue = b?.price || 0;
          break;
        case 'experience':
          aValue = a?.experience_years || 0;
          bValue = b?.experience_years || 0;
          break;
        case 'rating':
        default:
          aValue = a?.rating || 0;
          bValue = b?.rating || 0;
          break;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // تطبيق الـ pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex);

    // تنسيق البيانات للعرض
    const formattedDoctors = paginatedDoctors.map(doctor => ({
      id: doctor?.id,
      name: doctor?.user?.name,
      specialty: doctor?.specialty?.name,
      location: doctor?.location ? `${doctor.location.governorate} - ${doctor.location.area}` : '',
      governorate: doctor?.location?.governorate,
      area: doctor?.location?.area,
      price: doctor?.price,
      rating: doctor?.rating,
      reviews: doctor?.total_reviews,
      experience: doctor?.experience_years,
      bio: doctor?.bio,
      consultationDuration: doctor?.consultation_duration,
      isVerified: doctor?.is_verified,
      isActive: doctor?.is_active,
      phone: doctor?.user?.phone,
      email: doctor?.user?.email
    }));

    return NextResponse.json({
      success: true,
      data: formattedDoctors,
      doctors: formattedDoctors,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredDoctors.length / limit),
        totalItems: filteredDoctors.length,
        itemsPerPage: limit
      },
      filters: {
        specialty,
        location,
        searchTerm,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
