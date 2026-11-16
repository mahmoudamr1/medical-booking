import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // جلب الإحصائيات من قاعدة البيانات
    const stats = db.getStatistics();
    
    // إحصائيات إضافية للحجوزات
    const appointments = db.getAppointments();
    const appointmentsByStatus = {
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length
    };

    // إحصائيات إضافية للأطباء
    const doctors = db.getDoctors();
    const doctorsByStatus = {
      active: doctors.filter(d => d.is_active).length,
      inactive: doctors.filter(d => !d.is_active).length,
      verified: doctors.filter(d => d.is_verified).length,
      unverified: doctors.filter(d => !d.is_verified).length
    };

    const enhancedStats = {
      ...stats,
      appointmentsByStatus,
      doctorsByStatus
    };

    console.log('📊 Admin stats loaded:', enhancedStats);

    return NextResponse.json({
      success: true,
      data: enhancedStats
    });

  } catch (error: any) {
    console.error('❌ Error loading admin stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ في جلب الإحصائيات' },
      { status: 500 }
    );
  }
}