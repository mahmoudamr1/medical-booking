import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET() {
  try {
    const locations = db.getLocations();
    
    return NextResponse.json({
      success: true,
      data: locations
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}