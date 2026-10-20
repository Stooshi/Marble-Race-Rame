import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import Certificate from '../marbles/Certificate';
import StarterCertificate from '../marbles/StarterCertificate';

/** A marble's certificate by its ID (shareable: anyone with the link can see it). */
export default function CertificatePage() {
  const { code } = useParams();
  const { data, error, loading } = useAsync(() => api.certificate(code), [code]);
  return (
    <div className="ms-page" style={{ maxWidth: 560 }}>
      {loading && <p className="ms-note">Loading the certificate…</p>}
      {error && (
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h1 className="ms-h2">No marble has this ID</h1>
          <p className="ms-note">Check the ID ({code}) and try again.</p>
          <Link to="/collection" className="ms-btn">See the collection</Link>
        </div>
      )}
      {data && (data.certificate.kind === 'starter' ? <StarterCertificate cert={data.certificate} /> : <Certificate cert={data.certificate} />)}
      {data && <Link to="/bag" style={{ color: 'var(--ms-soft)' }}>← Marble Bag</Link>}
    </div>
  );
}
