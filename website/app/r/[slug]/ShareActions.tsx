'use client';

import { useState } from 'react';

type ShareActionsProps = {
  accuracy: number;
  label: string;
  paceText: string;
  slug: string;
  wpm: number;
};

export default function ShareActions({ accuracy, label, paceText, slug, wpm }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const resultUrl = `https://typearchy.com/r/${slug}`;
  const resultText = `TYPEARCHY / ${label}\n${wpm} WPM  |  ${accuracy}% ACC\nPACE  ${paceText}\nDEMO RUN  ${resultUrl}`;

  const copy = async () => {
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="receipt-actions">
      <a className="primary-action" href="/play">TRY TYPEARCHY</a>
      <button type="button" onClick={copy}>{copied ? 'COPIED' : 'COPY DEMO'}</button>
    </div>
  );
}
