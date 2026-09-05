'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CHALLENGE_LANGUAGES } from '../lib/challengeContract';

export default function ChallengeFilters({ search, language, hasCursor }: { search: string; language: string; hasCursor: boolean }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  function update() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!form.current) return;
    const data = new FormData(form.current);
    const params = new URLSearchParams();
    const text = String(data.get('q') || '').trim();
    const selected = String(data.get('language') || '');
    if (text) params.set('q', text);
    if (selected) params.set('language', selected);
    const target = '/challenges' + (params.size ? '?' + params : '');
    startTransition(() => router.replace(target, { scroll: false }));
  }

  useEffect(() => {
    // Uncontrolled fields preserve typing focus while server results refresh.
    // History navigation should restore the fields to the URL being restored.
    const restore = () => {
      if (timer.current) clearTimeout(timer.current);
      const params = new URLSearchParams(window.location.search);
      const text = form.current?.elements.namedItem('q') as HTMLInputElement | null;
      const select = form.current?.elements.namedItem('language') as HTMLSelectElement | null;
      if (text) text.value = params.get('q') || '';
      if (select) select.value = params.get('language') || '';
    };
    window.addEventListener('popstate', restore);
    return () => { if (timer.current) clearTimeout(timer.current); window.removeEventListener('popstate', restore); };
  }, []);

  return <form ref={form} className="challenge-filters" action="/challenges" method="get" onSubmit={event => { event.preventDefault(); update(); }}>
    <label>Find a passage or player<input type="search" name="q" defaultValue={search} maxLength={80} placeholder="Title or handle" onChange={event => {
      if (timer.current) clearTimeout(timer.current);
      if ((event.nativeEvent as InputEvent).isComposing) return;
      timer.current = setTimeout(update, 300);
    }} onCompositionEnd={() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(update, 300); }} /></label>
    <label>Language<select name="language" defaultValue={language} onChange={update}><option value="">All languages</option>{CHALLENGE_LANGUAGES.map(value => <option key={value} value={value}>{{ prose:'Prose', ruby:'Ruby', javascript:'JavaScript', typescript:'TypeScript', python:'Python', rust:'Rust', bash:'Bash', go:'Go', text:'Plain text' }[value]}</option>)}</select></label>
    {(search || language || hasCursor) && <a href="/challenges">Clear filters</a>}
    <span className="challenge-filter-status" role="status">{pending ? 'Updating…' : 'Filters apply automatically'}</span>
  </form>;
}
