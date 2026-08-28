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
  const resultText = `TYPEARCHY / ${label}\n${wpm} WPM  |  ${accuracy}% ACC\nPACE  ${paceText}\nBEAT THIS RUN  ${resultUrl}`;
  const postUrl = `https://x.com/intent/post?text=${encodeURIComponent(resultText)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="receipt-actions">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="primary-action" href="/#typing-demo">BEAT THIS RUN</a>
      <button type="button" onClick={copy}>{copied ? 'COPIED' : 'COPY RESULT'}</button>
      <a href={postUrl} target="_blank" rel="noreferrer">POST TO X</a>
    </div>
  );
}
