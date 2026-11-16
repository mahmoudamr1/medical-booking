import { Suspense } from 'react';
import { RegisterForm } from '@/features/auth';

export default function Page() {
  return (
    <Suspense>
      <RegisterForm accountType="patient" />
    </Suspense>
  );
}
