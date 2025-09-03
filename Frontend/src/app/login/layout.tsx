import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Resume Creator (Restor)',
  description: 'Sign in to your Resume Creator account to access your resumes and create new ones.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}