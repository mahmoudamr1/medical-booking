import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let specialties = db.getSpecialties();

    // تطبيق البحث
    if (search) {
      specialties = specialties.filter(specialty =>
        specialty.name.toLowerCase().includes(search.toLowerCase()) ||
        specialty.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // إضافة عدد الأطباء لكل تخصص
    const specialtiesWithCount = specialties.map(specialty => {
      const doctorsCount = db.getDoctors().filter(doctor => 
        doctor.specialty_id === specialty.id && doctor.is_active && doctor.is_verified
      ).length;

      return {
        id: specialty.id,
        name: specialty.name,
        description: specialty.description,
        icon: specialty.icon,
        doctorsCount,
        created_at: specialty.created_at
      };
    });

    return NextResponse.json({
      success: true,
      data: specialtiesWithCount,
      specialties: specialtiesWithCount
    });
  } catch (error: any) {
    console.error('Error fetching specialties:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const specialty = {
      id: (db.getSpecialties().length + 1).toString(),
      name: body.name,
      description: body.description || '',
      icon: body.icon || 'medical',
      created_at: new Date().toISOString()
    };

    // إضافة التخصص (في التطبيق الحقيقي سيتم حفظه في قاعدة البيانات)
    db.getSpecialties().push(specialty);

    return NextResponse.json({
      success: true,
      data: specialty
    });
  } catch (error: any) {
    console.error('Error creating specialty:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}