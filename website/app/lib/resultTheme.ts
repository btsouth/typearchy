export const THEMES = [
  { name: 'OSAKA JADE', short: 'OSAKA', bg: '#0b1511', panel: '#101d17', ink: '#d7d7ad', muted: '#6d806f', accent: '#56a47b', error: '#e95d4f' },
  { name: 'TOKYO NIGHT', short: 'TOKYO', bg: '#1a1b26', panel: '#24283b', ink: '#c0caf5', muted: '#565f89', accent: '#7aa2f7', error: '#f7768e' },
  { name: 'CATPPUCCIN', short: 'MOCHA', bg: '#1e1e2e', panel: '#313244', ink: '#cdd6f4', muted: '#6c7086', accent: '#cba6f7', error: '#f38ba8' },
  { name: 'GRUVBOX', short: 'GRUV', bg: '#282828', panel: '#3c3836', ink: '#ebdbb2', muted: '#928374', accent: '#b8bb26', error: '#fb4934' },
  { name: 'PAPER', short: 'PAPER', bg: '#f4f0e6', panel: '#e7e1d4', ink: '#282b27', muted: '#77786f', accent: '#426b8a', error: '#b4473f' },
  { name: 'AMBER CRT', short: 'AMBER', bg: '#151006', panel: '#21190a', ink: '#f2e5bd', muted: '#8f7951', accent: '#e9a520', error: '#ef5b45' },
];

export type ResultTheme = { name: string; short: string; bg: string; panel: string; ink: string; muted: string; accent: string; error: string };
export function parseResultTheme(value: unknown): ResultTheme {
  if (!value || typeof value !== 'object') return THEMES[0];
  const source = value as Record<string, unknown>;
  const keys = ['bg','panel','ink','muted','accent','error'] as const;
  if (!keys.every(key => typeof source[key] === 'string' && /^#[a-fA-F0-9]{6}$/.test(source[key] as string))) return THEMES[0];
  const colors = Object.fromEntries(keys.map(key => [key, String(source[key]).toLowerCase()])) as Omit<ResultTheme, 'name' | 'short'>;
  const preset = THEMES.find(theme => keys.every(key => theme[key] === colors[key]));
  return { ...colors, name: preset?.name || 'OMARCHY', short: preset?.short || 'OMARCHY' };
}
export function selectedResultTheme(): ResultTheme {
  try { const index = Number(window.localStorage.getItem('typearchy.web.theme.v1')); return THEMES[index] || THEMES[0]; }
  catch { return THEMES[0]; }
}
function channels(color: string): number[] {
  return [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16));
}

export function contrastRatio(foreground: string, background: string): number {
  function luminance(color: string) {
    const rgb = channels(color).map(channel => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Keep the saved palette intact. Adjust only rendered text that would be faint.
function readableColor(color: string, background: string) {
  if (contrastRatio(color, background) >= 4.5) return color;
  const target = contrastRatio('#ffffff', background) > contrastRatio('#000000', background) ? 255 : 0;
  const original = channels(color);
  for (let step = 1; step <= 100; step++) {
    const candidate = '#' + original.map(value => Math.round(value + (target - value) * step / 100).toString(16).padStart(2, '0')).join('');
    if (contrastRatio(candidate, background) >= 4.5) return candidate;
  }
  return target ? '#ffffff' : '#000000';
}

export function readableResultTheme(saved: ResultTheme): ResultTheme {
  const theme = parseResultTheme(saved);
  const ink = readableColor(theme.ink, theme.bg);
  return { ...theme, ink, muted: readableColor(theme.muted, theme.bg),
    accent: readableColor(theme.accent, theme.bg), error: readableColor(theme.error, theme.bg),
    panel: contrastRatio(ink, theme.panel) >= 4.5 ? theme.panel : theme.bg };
}

export function themeStyle(saved: ResultTheme) {
  const theme = readableResultTheme(saved);
  return { '--bg':theme.bg,'--panel':theme.panel,'--ink':theme.ink,'--muted':theme.muted,'--accent':theme.accent,'--urgent':theme.error,'--faint':`${theme.muted}44`,background:theme.bg,color:theme.ink };
}

export function decodeResultTheme(json: string | undefined): ResultTheme {
  try { return parseResultTheme(JSON.parse(json || '{}')); } catch { return THEMES[0]; }
}
