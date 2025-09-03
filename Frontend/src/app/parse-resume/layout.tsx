import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Parse Resume - Resume Creator (Restor)',
  description: 'Parse your resume file and save structured JSON data for easy customization and editing.',
};

export default function ParseResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}