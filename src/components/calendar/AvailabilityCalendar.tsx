'use client';

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { SlotButton } from './SlotButton';
import { generateAvailableSlots, TimeSlot } from '@/lib/booking-utils';
import { DoctorSchedule, DoctorBlock, Booking } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AvailabilityCalendarProps {
  doctorId: string;
  schedules: DoctorSchedule[];
  blocks: DoctorBlock[];
  bookings: Booking[];
  consultationDuration: number;
  onSlotSelect: (date: Date, slot: TimeSlot) => void;
}

export function AvailabilityCalendar({
  doctorId,
  schedules,
  blocks,
  bookings,
  consultationDuration,
  onSlotSelect
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // تحديث الـ slots عند تغيير التاريخ
  useEffect(() => {
    if (selectedDate) {
      const daySchedule = schedules.find(s => s.day_of_week === selectedDate.getDay());
      const slots = generateAvailableSlots(
        selectedDate,
        daySchedule || null,
        blocks,
        bookings,
        consultationDuration
      );
      setAvailableSlots(slots);
      setSelectedSlot(null);
    }
  }, [selectedDate, schedules, blocks, bookings, consultationDuration]);

  const handleSlotClick = (slot: TimeSlot) => {
    if (!selectedDate || !slot.available) return;
    
    setSelectedSlot(slot);
    onSlotSelect(selectedDate, slot);
  };

  // تحديد الأيام المتاحة (التي لها جدولة)
  const availableDays = schedules
    .filter(s => s.is_active)
    .map(s => s.day_of_week);

  const isDayAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availableDays.includes(dayOfWeek) && date >= startOfDay(new Date());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اختر التاريخ</CardTitle>
        </CardHeader>
        <CardContent>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => !isDayAvailable(date)}
            locale={ar}
            className="w-full"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
            }}
          />
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? `المواعيد المتاحة - ${format(selectedDate, 'dd/MM/yyyy')}` : 'اختر تاريخ أولاً'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot, index) => (
                  <SlotButton
                    key={index}
                    slot={slot}
                    selected={selectedSlot?.start === slot.start}
                    onClick={() => handleSlotClick(slot)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                لا توجد مواعيد متاحة في هذا اليوم
              </p>
            )
          ) : (
            <p className="text-center text-muted-foreground py-8">
              اختر تاريخ لعرض المواعيد المتاحة
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}