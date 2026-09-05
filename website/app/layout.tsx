import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const mono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://typearchy.com'),
  applicationName: 'Typearchy',
  title: 'Typearchy | A Typing Game for Everyone',
  description: 'A typing game for everyone. Practice words, race the clock, drill frequent mistypes, or type real code. Share challenges and play in your browser or the native Omarchy app.',
  alternates: { canonical: '/' },
  category: 'technology',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Typearchy | A Typing Game for Everyone',
    description: 'Practice words, race the clock, or test yourself on real code. Share challenges with friends. Play in your browser or the native Omarchy app.',
    url: 'https://typearchy.com',
    siteName: 'Typearchy',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Typearchy. Keep your fingers sharp.' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Typearchy | A Typing Game for Everyone',
    description: 'Practice words, race the clock, or test yourself on real code. Share challenges with friends. Play in your browser or the native Omarchy app.',
    images: [{ url: '/og.png', alt: 'Typearchy. Keep your fingers sharp.' }],
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b1511',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={mono.variable}>{children}</body>
    </html>
  );
}
