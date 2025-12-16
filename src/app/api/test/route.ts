import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // اختبار جميع الوظائف
    const stats = {
      users: db.getUsers().length,
      doctors: db.getDoctors().length,
      specialties: db.getSpecialties().length,
      locations: db.getLocations().length,
      appointments: db.getAppointments().length,
      schedules: db.getDoctorSchedules().length
    };

    // اختبار البحث
    const searchResults = db.searchDoctors({
      specialty: 'طب القلب'
    });

    // اختبار الإحصائيات
    const systemStats = db.getStatistics();

    return NextResponse.json({
      success: true,
      message: 'جميع الـ APIs تعمل بشكل صحيح',
      data: {
        counts: stats,
        searchTest: {
          query: 'طب القلب',
          results: searchResults.length
        },
        systemStats
      }
    });

  } catch (error: any) {
    console.error('Test API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}