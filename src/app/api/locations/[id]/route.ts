import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const location = db.getLocationById(params.id);
    
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
    console.error('Error fetching location:', error);
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
    const { governorate, area } = body;

    if (!governorate || !area) {
      return NextResponse.json(
        { success: false, error: 'Governorate and area are required' },
        { status: 400 }
      );
    }

    const updatedLocation = db.updateLocation(params.id, {
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
    console.error('Error updating location:', error);
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
    // التحقق من وجود أطباء مرتبطين بهذا الموقع
    const doctorsWithLocation = db.getDoctors().filter(doctor => 
      doctor.location_id === params.id
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

    const deleted = db.deleteLocation(params.id);

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
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}