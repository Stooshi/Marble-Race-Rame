import { useState } from 'react';
import { describeReport } from '../three/diagnostics';

/** The on-screen explanation when the 3D view can't start or draw. */
export default function SceneFailure({ failure }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="preview3d__overlay preview3d__overlay--error" role="alert">
      <div>
        <p><strong>The 3D view failed while {failure.stage}.</strong></p>
        <p className="preview3d__errmsg">{failure.name}: {failure.message}</p>
        <ul className="preview3d__report">
          {describeReport(failure.report).map((line) => <li key={line}>{line}</li>)}
        </ul>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            const text = [`Failed while ${failure.stage}`, `${failure.name}: ${failure.message}`, ...describeReport(failure.report), '', failure.stack || ''].join('\n');
            navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
          }}
        >
          {copied ? 'Copied' : 'Copy details'}
        </button>
        <p className="muted small">Full details are also in the browser console. The normal 2D race view is unaffected.</p>
      </div>
    </div>
  );
}
