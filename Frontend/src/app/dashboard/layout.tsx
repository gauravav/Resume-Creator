import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Resume Creator (Restor)',
  description: 'Manage your resumes, parse new ones, and create custom versions for specific job opportunities.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}