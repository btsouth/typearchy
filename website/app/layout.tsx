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
  description: 'The typing game for people who write code. Real Ruby, Bash, Python, JavaScript, and Rust with honest rules, challenges you can send with a link, and a Linux desktop app. No account needed to practice.',
  alternates: { canonical: '/' },
  category: 'technology',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Typearchy | Keep Your Fingers Sharp',
    description: 'Real code, honest times, and challenges you can send with a link. Play in the browser or the Linux app.',
    url: 'https://typearchy.com',
    siteName: 'Typearchy',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Typearchy. Keep your fingers sharp.' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Typearchy | Keep Your Fingers Sharp',
    description: 'Real code, honest times, and challenges you can send with a link. Play in the browser or the Linux app.',
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
