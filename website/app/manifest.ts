import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Typearchy',
    short_name: 'Typearchy',
    description: 'A focused, local-first typing game built for Omarchy.',
    start_url: '/play',
    display: 'standalone',
    background_color: '#0b1511',
    theme_color: '#0b1511',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
