import { Phone } from 'lucide-react';
import { Button } from './button';

interface ContactMethodsProps {
  doctorId: string;
  phoneNumber: string;
  email: string;
}

export function ContactMethods({ doctorId, phoneNumber, email }: ContactMethodsProps) {
  const handleCall = () => {
    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleCall}
        variant="outline"
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
        title={`اتصل على ${phoneNumber}`}
      >
        <Phone className="h-4 w-4" />
        <span>اتصال هاتفي</span>
      </Button>
    </div>
  );
}
