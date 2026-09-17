import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wen Yang — Industrial Designer',
  description: 'An industrial design portfolio: objects made from ambiguity, intent, and production constraints.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
