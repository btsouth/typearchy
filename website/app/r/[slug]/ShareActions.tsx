'use client';

import { useState } from 'react';

type ShareActionsProps = {
  accuracy: number;
  challengeKey: string;
  demo: boolean;
  label: string;
  paceText: string;
  slug: string;
  wpm: number;
};

export default function ShareActions({ accuracy, challengeKey, demo, label, paceText, slug, wpm }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const resultUrl = `https://typearchy.com/r/${slug}`;
  const resultText = `TYPEARCHY / ${label}\n${Math.round(wpm)} WPM  |  ${accuracy}% ACC\nPACE  ${paceText}\n${demo ? 'EXAMPLE' : 'CHALLENGE'}  ${resultUrl}`;

  const copy = async () => {
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="receipt-actions">
      <a className="primary-action" href={`/play?challenge=${encodeURIComponent(challengeKey)}`}>BEAT THIS RUN</a>
      <button type="button" onClick={copy}>{copied ? 'COPIED' : 'COPY RESULT'}</button>
    </div>
  );
}
