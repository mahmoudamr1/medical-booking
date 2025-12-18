import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // جلب إجازات الطبيب
    const vacations = db.getDoctorVacationsByDoctorId(id);
    
    // تنسيق البيانات
    const formattedVacations = vacations.map(vacation => ({
      id: vacation.id,
      doctorId: vacation.doctor_id,
      doctor: vacation.doctor_id,
      startDate: vacation.start_date,
      endDate: vacation.end_date,
      date: vacation.start_date, // للتوافق مع الواجهة
      reason: vacation.reason,
      created_at: vacation.created_at
    }));
    
    return NextResponse.json({ success: true, data: formattedVacations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vacationData = await request.json();
    
    // إضافة إجازة جديدة
    const vacation = db.createDoctorVacation({
      doctor_id: id,
      start_date: vacationData.startDate || vacationData.date,
      end_date: vacationData.endDate || vacationData.date,
      reason: vacationData.reason || 'إجازة'
    });
    
    const formattedVacation = {
      id: vacation.id,
      doctorId: vacation.doctor_id,
      doctor: vacation.doctor_id,
      startDate: vacation.start_date,
      endDate: vacation.end_date,
      date: vacation.start_date,
      reason: vacation.reason,
      created_at: vacation.created_at
    };
    
    return NextResponse.json({ success: true, data: formattedVacation });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}