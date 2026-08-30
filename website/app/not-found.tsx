import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="receipt-page">
      <nav className="receipt-nav"><Link className="wordmark" href="/" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></Link><span>NOT FOUND</span></nav>
      <section className="connect-card missing-card">
        <p className="section-tag">404</p>
        <h1>NOTHING HERE.</h1>
        <p>This run or profile does not exist, was removed, or was made private. Local Typearchy history is never affected.</p>
        <Link className="primary-action" href="/">BACK TO TYPEARCHY</Link>
      </section>
    </main>
  );
}
