/**
 * "Report this name" (Moses, 22 Oct 2026): on scoreboards, race results and the tapped-marble card.
 * Asks once ("Report this player's name as offensive?"), then sends it to the back office
 * (src/names). Not for your own name, computer players, or when nobody is logged in.
 */
import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ReportName({ userId, name, where, compact = false }) {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState('idle'); // idle | ask | busy | done | failed
  if (!userId || !isAuthenticated || userId === user?.id) return null;
  const send = async () => {
    setStep('busy');
    try { await api.reportName(userId, where, name); setStep('done'); } catch { setStep('failed'); }
  };
  if (step === 'done') return <span className="report-name report-name--done" role="status">Reported. Thanks: we'll check it.</span>;
  if (step === 'ask' || step === 'busy') {
    return (
      <span className="report-name report-name--ask" role="group" aria-label="Report this name">
        <span>Report {name ? <b>{name}</b> : "this player's name"} as offensive?</span>
        <button type="button" className="ms-btn ms-btn--sm ms-btn--danger" disabled={step === 'busy'} onClick={send}>Report</button>
        <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" disabled={step === 'busy'} onClick={() => setStep('idle')}>Cancel</button>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`report-name__btn${compact ? ' report-name__btn--compact' : ''}`}
      onClick={() => setStep('ask')}
      aria-label={`Report the name ${name ?? ''}`.trim()}
      title="Report this name"
    >
      {compact ? '⚑' : <>⚑ Report this name{step === 'failed' ? ' (try again)' : ''}</>}
    </button>
  );
}
