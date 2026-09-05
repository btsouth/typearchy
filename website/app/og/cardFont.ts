import source from './fonts/GeistMono-Regular.ttf?inline';

// Vite embeds the font in the Worker. Social previews need no remote font fetch.
const data = Uint8Array.from(atob(source.slice(source.indexOf(',') + 1)), character => character.charCodeAt(0)).buffer;
export const cardFonts = [{ name: 'Geist Mono', data, weight: 400 as const, style: 'normal' as const }];
