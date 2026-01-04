import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const location = db.getLocationById(id);
    
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // إضافة عدد الأطباء
    const doctorsCount = db.getDoctors().filter(doctor => 
      doctor.location_id === location.id && doctor.is_active && doctor.is_verified
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        ...location,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { governorate, area } = body;

    if (!governorate || !area) {
      return NextResponse.json(
        { success: false, error: 'Governorate and area are required' },
        { status: 400 }
      );
    }

    const updatedLocation = db.updateLocation(id, {
      governorate,
      area
    });

    if (!updatedLocation) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedLocation,
      message: 'Location updated successfully'
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // التحقق من وجود أطباء مرتبطين بهذا الموقع
    const doctorsWithLocation = db.getDoctors().filter(doctor => 
      doctor.location_id === id
    );

    if (doctorsWithLocation.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete location. ${doctorsWithLocation.length} doctors are associated with this location.` 
        },
        { status: 400 }
      );
    }

    const deleted = db.deleteLocation(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}