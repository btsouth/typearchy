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
  title: 'Typearchy | Keep Your Fingers Sharp',
  description: 'A focused, local-first typing game built for Omarchy. Seven modes, useful practice insights, and no account required.',
  alternates: { canonical: '/' },
  category: 'technology',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Typearchy | Keep Your Fingers Sharp',
    description: 'A focused, local-first typing game built for Omarchy.',
    url: 'https://typearchy.com',
    siteName: 'Typearchy',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Typearchy. Keep your fingers sharp.' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Typearchy | Keep Your Fingers Sharp',
    description: 'A focused, local-first typing game built for Omarchy.',
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
