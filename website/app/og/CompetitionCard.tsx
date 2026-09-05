import { ImageResponse } from 'next/og';
import { cardFonts } from './cardFont';
import { THEMES, readableResultTheme, type ResultTheme } from '../lib/resultTheme';

export function competitionCard({ title, handle, language, time, metrics, path, theme: savedTheme = THEMES[0] }: {
  title: string; handle: string; language: string; time?: number; metrics: string; path: string; theme?: ResultTheme;
}) {
  const theme = readableResultTheme(savedTheme);
  return new ImageResponse(<div style={{ width: '100%', height: '100%', background: theme.bg, color: theme.ink, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '54px 64px', borderLeft: `10px solid ${theme.accent}`, fontFamily: 'Geist Mono' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: theme.muted }}><span>TYPEARCHY</span><span>{language.toUpperCase()} CHALLENGE</span></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: time ? 40 : 64, lineHeight: 1.15, fontWeight: 700 }}>{title}</div>
      {time ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}><span style={{ fontSize: 140, lineHeight: 1 }}>{(time / 1000).toFixed(2)}</span><span style={{ fontSize: 36, color: theme.accent }}>seconds</span></div> : <div style={{ fontSize: 36, color: theme.accent }}>Same passage. Your best time.</div>}
      <div style={{ fontSize: 26, color: theme.muted }}>{metrics}</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24 }}><span>{time ? 'Beat ' : 'Created by '}@{handle}</span><span style={{ color: theme.muted }}>typearchy.com/{path}</span></div>
  </div>, { width: 1200, height: 630, fonts: cardFonts, headers: { 'Cache-Control': 'no-store' } });
}
