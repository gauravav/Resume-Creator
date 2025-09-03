import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Resume - Resume Creator (Restor)',
  description: 'Edit and customize your resume data with our intuitive interface.',
};

export default function EditResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}