import { DashboardRoot } from '@/components/layout/dashboard/DashboardRoot';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardRoot>{children}</DashboardRoot>;
}
