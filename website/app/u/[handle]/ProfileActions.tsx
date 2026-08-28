'use client';

import { useState } from 'react';

export default function ProfileActions({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = `https://typearchy.com/u/${handle}`;

  const copyProfile = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="profile-actions">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="primary-action" href="/r/F4S8RP">OPEN PRIMARY PIN</a>
      <button type="button" onClick={copyProfile}>{copied ? 'PROFILE LINK COPIED' : 'COPY PROFILE'}</button>
    </div>
  );
}
