'use client';

import BrowserAccount from '../../account/BrowserAccount';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHALLENGE_LANGUAGES } from '../../lib/challengeContract';
import { curatedPassages } from '../../lib/curatedPassages';

const RUBY = 'def tally_words(text)\n  text.downcase.scan(/[a-z]+/).tally\nend\n\ncounts = tally_words("Practice makes progress")\ncounts.sort.each do |word, count|\n  puts "#{word}: #{count}"\nend';
const starter = curatedPassages[0];

export default function ChallengeCreator() {
  const router = useRouter();
  const [title, setTitle] = useState(starter.title);
  const [language, setLanguage] = useState(starter.language);
  const [passage, setPassage] = useState(starter.passage);
  const [attribution, setAttribution] = useState(starter.attribution);
  const [autoIndent, setAutoIndent] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem('typearchy.challenge-draft.v1') || 'null');
        if (saved && typeof saved.title === 'string' && saved.title.length <= 80
          && typeof saved.passage === 'string' && saved.passage.length <= 4000
          && typeof saved.attribution === 'string' && saved.attribution.length <= 240
          && CHALLENGE_LANGUAGES.includes(saved.language) && typeof saved.autoIndent === 'boolean'
          && ['public', 'unlisted'].includes(saved.visibility)) {
          setTitle(saved.title); setPassage(saved.passage); setAttribution(saved.attribution);
          setLanguage(saved.language); setAutoIndent(saved.autoIndent); setVisibility(saved.visibility);
        }
      } catch { /* The editor still works when browser storage is unavailable. */ }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem('typearchy.challenge-draft.v1', JSON.stringify({ title, passage, attribution, language, autoIndent, visibility }));
        setDraftSaved(true);
      } catch { setDraftSaved(false); }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [draftReady, title, passage, attribution, language, autoIndent, visibility]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNeedsProfile(false);
    try {
      const response = await fetch('/api/challenges', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, language, passage, attribution, autoIndent, visibility }) });
      const result = await response.json() as { slug: string; error?: string };
      if (response.status === 401) setNeedsProfile(true);
      if (!response.ok) throw new Error(result.error || 'Could not publish the challenge');
      setDraftReady(false); setDraftSaved(false);
      try { sessionStorage.removeItem('typearchy.challenge-draft.v1'); } catch {}
      router.push(`/c/${result.slug}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not publish'); } finally { setBusy(false); }
  }
  return <><form className="challenge-creator" onSubmit={submit}>
    <div className="challenge-editor"><label htmlFor="rails-example">Start with a reviewed passage</label><select id="rails-example" value="" onChange={event => {
      const snippet = curatedPassages.find(item => item.id === event.target.value);
      if (snippet) { setTitle(snippet.title); setPassage(snippet.passage); setLanguage(snippet.language); setAutoIndent(snippet.language !== 'prose'); setAttribution(snippet.attribution); }
    }}><option value="">Choose a reviewed excerpt</option>{curatedPassages.map(snippet => <option key={snippet.id} value={snippet.id}>{snippet.title} · {snippet.passage.split('\n').length} {snippet.passage.includes('\n') ? 'lines' : 'line'}</option>)}</select>
      <p className="competition-note">Original source is credited with each excerpt. <a href="/sources">Read the source notes and license</a>.</p>
      <label htmlFor="challenge-title">Title</label><input id="challenge-title" value={title} onChange={event => setTitle(event.target.value)} minLength={3} maxLength={80} required />
      <div className="challenge-editor-tools"><label>Language<select value={language} onChange={event => setLanguage(event.target.value)}>{CHALLENGE_LANGUAGES.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <div><button type="button" onClick={() => { setPassage(RUBY); setLanguage('ruby'); setTitle('A little Ruby'); setAttribution(''); setAutoIndent(true); }}>Ruby example</button><button type="button" onClick={() => { setPassage(starter.passage); setLanguage('prose'); setTitle(starter.title); setAttribution(starter.attribution); setAutoIndent(false); }}>Prose example</button></div></div>
      <label htmlFor="challenge-passage">Passage</label><textarea id="challenge-passage" value={passage} onChange={event => setPassage(event.target.value)} minLength={40} maxLength={4000} rows={12} spellCheck={false} required />
      <small>{passage.length.toLocaleString()} / 4,000 characters. Tabs become two spaces.</small>
      <label htmlFor="challenge-source">Attribution <span>(optional)</span></label><input id="challenge-source" value={attribution} onChange={event => setAttribution(event.target.value)} maxLength={240} placeholder="Author, project, or source" />
    </div>
    <aside className="challenge-settings">{draftSaved && <p className="competition-note">Draft kept in this tab until you save the challenge or close the tab.</p>}<h2>One passage. Equal rules.</h2><p>Fastest complete time wins. Everyone corrects their mistakes before finishing.</p>
      <label className="competition-check"><input type="checkbox" checked={autoIndent} onChange={event => setAutoIndent(event.target.checked)} /><span>Automatic indentation<small>Leading spaces after Enter are filled in and excluded from WPM.</small></span></label>
      <label>Who can find it?<select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="public">Everyone, in the library after review</option><option value="unlisted">Anyone with the link</option></select></label>
      <p>The passage and rules are fixed when saved. Only submit text you have permission to share. Your link works right away; a moderator reviews custom passages before they appear in the public library. Keep links out of the title.</p>
      {error && !needsProfile && <p className="competition-error" role="alert">{error}</p>}
      {needsProfile && <p>Your passage is saved. Connect your profile below, then get your link.</p>}
      <button className="competition-button primary" disabled={busy || !draftReady || needsProfile} type="submit">{busy ? 'Saving…' : 'Save and get the link'}</button>
    </aside>
  </form>{needsProfile && <BrowserAccount readyLabel="Back to my challenge" onReady={() => { setNeedsProfile(false); setError(''); }} />}</>;
}
