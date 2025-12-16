import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const stats = db.getStatistics();
    
    // إحصائيات إضافية
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const appointments = db.getAppointments();
    const todayAppointments = appointments.filter(a => a.date === today);
    const thisMonthAppointments = appointments.filter(a => a.date.startsWith(thisMonth));
    
    // إحصائيات الحالة
    const appointmentsByStatus = {
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length
    };

    // إحصائيات الأطباء
    const doctors = db.getDoctors();
    const doctorsByStatus = {
      active: doctors.filter(d => d.is_active).length,
      inactive: doctors.filter(d => !d.is_active).length,
      verified: doctors.filter(d => d.is_verified).length,
      unverified: doctors.filter(d => !d.is_verified).length
    };

    // إحصائيات الإيرادات
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const totalRevenue = completedAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const todayRevenue = todayAppointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);
    const thisMonthRevenue = thisMonthAppointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);

    // أفضل الأطباء (حسب عدد المواعيد المكتملة)
    const doctorAppointments = doctors.map(doctor => {
      const doctorCompletedAppointments = appointments.filter(
        a => a.doctor_id === doctor.id && a.status === 'completed'
      );
      const user = db.getUserById(doctor.user_id);
      const specialty = db.getSpecialtyById(doctor.specialty_id);
      
      return {
        id: doctor.id,
        name: user?.name || '',
        specialty: specialty?.name || '',
        completedAppointments: doctorCompletedAppointments.length,
        revenue: doctorCompletedAppointments.reduce((sum, a) => sum + (a.price || 0), 0),
        rating: doctor.rating,
        reviews: doctor.total_reviews
      };
    }).sort((a, b) => b.completedAppointments - a.completedAppointments).slice(0, 5);

    // إحصائيات التخصصات
    const specialties = db.getSpecialties().map(specialty => {
      const specialtyDoctors = doctors.filter(d => d.specialty_id === specialty.id);
      const specialtyAppointments = appointments.filter(a => {
        const doctor = doctors.find(d => d.id === a.doctor_id);
        return doctor?.specialty_id === specialty.id;
      });
      
      return {
        id: specialty.id,
        name: specialty.name,
        doctorsCount: specialtyDoctors.length,
        appointmentsCount: specialtyAppointments.length,
        revenue: specialtyAppointments
          .filter(a => a.status === 'completed')
          .reduce((sum, a) => sum + (a.price || 0), 0)
      };
    }).sort((a, b) => b.appointmentsCount - a.appointmentsCount);

    const detailedStats = {
      ...stats,
      todayAppointments: todayAppointments.length,
      thisMonthAppointments: thisMonthAppointments.length,
      appointmentsByStatus,
      doctorsByStatus,
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        thisMonth: thisMonthRevenue
      },
      topDoctors: doctorAppointments,
      specialtyStats: specialties
    };

    return NextResponse.json({
      success: true,
      data: detailedStats
    });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}