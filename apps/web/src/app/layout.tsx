import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from '../components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TMG — Audit-First Website Intelligence & Growth',
  description: 'TMG audits your website across 36 dimensions and delivers a scored report with prioritized fixes. Website redesign, SEO, and AI search optimization for Texas businesses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
