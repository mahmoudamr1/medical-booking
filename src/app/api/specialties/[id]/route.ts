import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const specialty = db.getSpecialtyById(params.id);
    
    if (!specialty) {
      return NextResponse.json(
        { success: false, error: 'Specialty not found' },
        { status: 404 }
      );
    }

    // إضافة عدد الأطباء
    const doctorsCount = db.getDoctors().filter(doctor => 
      doctor.specialty_id === specialty.id && doctor.is_active && doctor.is_verified
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        ...specialty,
        doctorsCount
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, icon } = body;

    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: 'Name and description are required' },
        { status: 400 }
      );
    }

    const updatedSpecialty = db.updateSpecialty(params.id, {
      name,
      description,
      icon
    });

    if (!updatedSpecialty) {
      return NextResponse.json(
        { success: false, error: 'Specialty not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedSpecialty,
      message: 'Specialty updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // التحقق من وجود أطباء مرتبطين بهذا التخصص
    const doctorsWithSpecialty = db.getDoctors().filter(doctor => 
      doctor.specialty_id === params.id
    );

    if (doctorsWithSpecialty.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete specialty. ${doctorsWithSpecialty.length} doctors are associated with this specialty.` 
        },
        { status: 400 }
      );
    }

    const deleted = db.deleteSpecialty(params.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Specialty not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Specialty deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}