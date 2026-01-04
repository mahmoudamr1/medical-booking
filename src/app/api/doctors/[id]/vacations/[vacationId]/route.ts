import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vacationId: string }> }
) {
  try {
    const { vacationId } = await params;
    const vacationData = await request.json();
    
    // تحديث الإجازة
    const vacation = await pb.collection('doctor_blocks').update(vacationId, vacationData);
    
    return NextResponse.json({ success: true, data: vacation });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vacationId: string }> }
) {
  try {
    const { vacationId } = await params;
    
    // حذف الإجازة
    await pb.collection('doctor_blocks').delete(vacationId);
    
    return NextResponse.json({ success: true, message: 'Vacation deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}