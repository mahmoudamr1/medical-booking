'use client';

import { Button } from "@/components/ui/button";
import { TimeSlot } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

interface SlotButtonProps {
  slot: TimeSlot;
  selected?: boolean;
  onClick: () => void;
}

export function SlotButton({ slot, selected, onClick }: SlotButtonProps) {
  return (
    <Button
      variant={selected ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={!slot.available}
      className={cn(
        "w-full text-xs",
        !slot.available && "opacity-50 cursor-not-allowed",
        selected && "bg-blue-600 hover:bg-blue-700"
      )}
    >
      {slot.start}
    </Button>
  );
}