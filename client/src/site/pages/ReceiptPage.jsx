import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import BillingDocument from '../../shared/billing/BillingDocument';

/**
 * One of the player's own receipts (K-…) or credit notes (KR-…) for a website purchase (Moses, 16 Nov 2026, CRM
 * phase 1). The purchase confirmation email links here; /purchases lists them. Only the player who bought sees it.
 */
export default function ReceiptPage() {
  const { number } = useParams();
  const { isAuthenticated, loading } = useAuth();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  // (The same document as an A4 PDF, from the server: Moses, 16 Nov 2026.)
  const downloadPdf = async () => {
    setSaving(true);
    setPdfError(null);
    try {
      const blob = await api.myDocumentPdf(number);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `Marble-Spins-${number}.pdf` });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setPdfError(e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    setError(null);
    api.myDocument(number).then((r) => setDoc(r.document), (e) => setError(e.status === 404 ? 'not-found' : e.status === 403 ? 'other-account' : e.message));
  }, [isAuthenticated, number]);

  if (!loading && !isAuthenticated) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h1 className="ms-h2">Receipt {number}</h1>
          <p className="ms-lede" style={{ margin: 0 }}>Log in with the account you bought with to see this receipt.</p>
          <div className="ms-row"><Link to={`/signup?mode=login&next=${encodeURIComponent(`/purchases/receipt/${number}`)}`} className="ms-btn ms-btn--primary">Log in</Link></div>
        </div>
      </div>
    );
  }
  return (
    <div className="ms-page ms-page--narrow" style={{ display: 'grid', gap: 16 }}>
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/purchases" className="ms-btn">← Your purchases</Link>
        {doc && <button type="button" className="ms-btn ms-btn--primary" onClick={downloadPdf} disabled={saving}>{saving ? 'ONE MOMENT…' : 'Download PDF'}</button>}
      </div>
      {pdfError && <div className="ms-msg ms-msg--bad" role="alert">The PDF couldn't be made: {pdfError}. Try again in a moment.</div>}
      {error === 'not-found' && <div className="ms-msg ms-msg--bad" role="alert">No receipt {number} on this account. If you bought on another account, log in with that one.</div>}
      {error === 'other-account' && <div className="ms-msg ms-msg--bad" role="alert">This receipt belongs to another account. Log in with the account you bought with to see it.</div>}
      {error && error !== 'not-found' && error !== 'other-account' && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      {!doc && !error && <p className="ms-note">Loading…</p>}
      {doc && <BillingDocument doc={doc} />}
      {doc && <p className="ms-note">Keep this page's address to find it again; it's always on <Link to="/purchases">your purchases</Link>. Questions: <Link to="/help#contact">contact us</Link> with the number {doc.number}.</p>}
    </div>
  );
}
