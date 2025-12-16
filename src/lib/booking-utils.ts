import { format, addMinutes, isSameDay, parseISO, isAfter, isBefore } from 'date-fns';
import { DoctorSchedule, DoctorBlock, Booking } from './pocketbase';

export interface TimeSlot {
  start: string; // "14:00"
  end: string;   // "14:30"
  available: boolean;
}

// تحويل الوقت من string إلى minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// تحويل minutes إلى string
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// توليد الـ slots المتاحة لطبيب في يوم معين
export function generateAvailableSlots(
  date: Date,
  schedule: DoctorSchedule | null,
  blocks: DoctorBlock[],
  bookings: Booking[],
  consultationDuration: number
): TimeSlot[] {
  if (!schedule || !schedule.is_active) {
    return [];
  }

  const dayOfWeek = date.getDay();
  if (schedule.day_of_week !== dayOfWeek) {
    return [];
  }

  const dateStr = format(date, 'yyyy-MM-dd');
  const slots: TimeSlot[] = [];

  // تحويل أوقات العمل إلى minutes
  const startMinutes = timeToMinutes(schedule.start_time);
  const endMinutes = timeToMinutes(schedule.end_time);

  // توليد كل الـ slots الممكنة
  for (let current = startMinutes; current + consultationDuration <= endMinutes; current += consultationDuration) {
    const slotStart = minutesToTime(current);
    const slotEnd = minutesToTime(current + consultationDuration);
    
    slots.push({
      start: slotStart,
      end: slotEnd,
      available: true
    });
  }

  // إزالة الـ slots المحجوزة
  bookings.forEach(booking => {
    if (booking.date === dateStr && booking.status === 'confirmed') {
      slots.forEach(slot => {
        if (slot.start === booking.start_time) {
          slot.available = false;
        }
      });
    }
  });

  // إزالة الـ slots المقفولة
  blocks.forEach(block => {
    if (block.date === dateStr) {
      const blockStart = timeToMinutes(block.start_time);
      const blockEnd = timeToMinutes(block.end_time);
      
      slots.forEach(slot => {
        const slotStart = timeToMinutes(slot.start);
        const slotEnd = timeToMinutes(slot.end);
        
        // إذا كان الـ slot يتداخل مع الـ block
        if (slotStart < blockEnd && slotEnd > blockStart) {
          slot.available = false;
        }
      });
    }
  });

  // إزالة الـ slots في الماضي
  const now = new Date();
  if (isSameDay(date, now)) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    slots.forEach(slot => {
      if (timeToMinutes(slot.start) <= currentMinutes) {
        slot.available = false;
      }
    });
  }

  return slots.filter(slot => slot.available);
}

// فحص إذا كان الـ slot متاح للحجز
export function isSlotAvailable(
  doctorId: string,
  date: string,
  startTime: string,
  bookings: Booking[]
): boolean {
  return !bookings.some(booking => 
    booking.doctor === doctorId &&
    booking.date === date &&
    booking.start_time === startTime &&
    booking.status === 'confirmed'
  );
}