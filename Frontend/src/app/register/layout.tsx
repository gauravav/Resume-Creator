import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Resume Creator (Restor)',
  description: 'Create your Resume Creator account and start building customized resumes for any job opportunity.',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}