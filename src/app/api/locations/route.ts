import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const governorate = searchParams.get('governorate') || '';
    const search = searchParams.get('search') || '';

    let locations = db.getLocations();

    // تطبيق الفلاتر
    if (governorate) {
      locations = locations.filter(location =>
        location.governorate === governorate
      );
    }

    if (search) {
      locations = locations.filter(location =>
        location.governorate.toLowerCase().includes(search.toLowerCase()) ||
        location.area.toLowerCase().includes(search.toLowerCase())
      );
    }

    // إضافة عدد الأطباء لكل موقع
    const locationsWithCount = locations.map(location => {
      const doctorsCount = db.getDoctors().filter(doctor => 
        doctor.location_id === location.id && doctor.is_active && doctor.is_verified
      ).length;

      return {
        id: location.id,
        governorate: location.governorate,
        area: location.area,
        fullLocation: `${location.governorate} - ${location.area}`,
        doctorsCount,
        created_at: location.created_at
      };
    });

    // تجميع حسب المحافظة
    const governorates = [...new Set(locations.map(l => l.governorate))].map(gov => {
      const govLocations = locationsWithCount.filter(l => l.governorate === gov);
      const totalDoctors = govLocations.reduce((sum, loc) => sum + loc.doctorsCount, 0);
      
      return {
        name: gov,
        locations: govLocations,
        doctorsCount: totalDoctors
      };
    });

    return NextResponse.json({
      success: true,
      data: locationsWithCount,
      locations: locationsWithCount,
      governorates: governorates
    });
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const location = {
      id: (db.getLocations().length + 1).toString(),
      governorate: body.governorate,
      area: body.area,
      created_at: new Date().toISOString()
    };

    // إضافة الموقع (في التطبيق الحقيقي سيتم حفظه في قاعدة البيانات)
    db.getLocations().push(location);

    return NextResponse.json({
      success: true,
      data: location
    });
  } catch (error: any) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}