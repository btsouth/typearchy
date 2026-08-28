'use client';

import { useState } from 'react';

export default function ProfileActions({ handle, primarySlug }: { handle: string; primarySlug?: string }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = `https://typearchy.com/u/${handle}`;

  const copyProfile = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="profile-actions">
      {primarySlug ? <a className="primary-action" href={`/r/${primarySlug}`}>CHALLENGE PRIMARY PIN</a> : <a className="primary-action" href="/play">PLAY TYPEARCHY</a>}
      <button type="button" onClick={copyProfile}>{copied ? 'PROFILE LINK COPIED' : 'COPY PROFILE'}</button>
    </div>
  );
}
