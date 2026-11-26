export function Spinner({ label = 'Loading…' }) {
  return <div className="spinner" role="status"><span className="spinner__dot" />{label}</div>;
}

export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="error-box" role="alert">
      <p>{error.message || String(error)}</p>
      {onRetry && <button type="button" className="btn btn--sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}
