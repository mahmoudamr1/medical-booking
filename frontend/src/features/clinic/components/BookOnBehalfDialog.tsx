'use client';

import { BookForm } from './BookOnBehalfForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/**
 * Reception booking on behalf of a patient:
 * doctor (clinic affiliations) → service (clinic services of that doctor) → slot (public availability)
 * → patient details → POST /clinics/{clinic}/appointments.
 */
export function BookOnBehalfDialog({
  open,
  onClose,
  onBooked,
}: {
  open: boolean;
  onClose: () => void;
  onBooked?: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        {open && <BookForm onClose={onClose} onBooked={onBooked} />}
      </DialogContent>
    </Dialog>
  );
}
