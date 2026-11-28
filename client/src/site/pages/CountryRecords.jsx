import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { formatTime } from '../../utils/format';
import { handle } from '../../shared/playerName';
import ReportName from '../../components/ReportName';
import CountryPicker from '../country/CountryPicker';
import { browserCountry, countryName } from '../country/countries';

const day = (t) => (t ? new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');
const MEDAL = { 1: 'var(--ms-yellow)', 2: 'var(--ms-soft)', 3: 'var(--ms-orange)' };

/** One track's country records: the fastest time by a player of each country (src/country/records on the server). */
export function TrackCountryRecords({ slug, limit = null, empty = null, heading = null, more = null }) {
  const { user } = useAuth();
  const { data, error } = useAsync(() => (slug ? api.countryRecords(slug) : Promise.resolve(null)), [slug]);
  const rows = data?.records ?? [];
  const shown = limit ? rows.slice(0, limit) : rows;
  if (error) return <div className="ms-msg ms-msg--bad">The country records couldn't be loaded. Try again in a moment.</div>;
  if (!data) return null; // (also on the pre-rendered page: the records come once it runs)
  if (!rows.length) return empty && <>{heading}{empty}</>;
  return (
    <>
    {heading}
    <div className="ms-card" style={{ padding: 0, overflowX: 'auto' }}>
      <table className="ms-table ms-table--scores">
        <thead><tr><th scope="col">#</th><th scope="col">Country</th><th scope="col">Player</th><th scope="col" className="num">Time</th><th scope="col" className="ms-wide-only">Set on</th></tr></thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={r.country} className={user?.id === r.userId ? 'is-me' : undefined}>
              <td style={{ color: MEDAL[i + 1] ?? 'var(--ms-text)', fontWeight: 800 }}>{i + 1}</td>
              <td>{r.name ?? countryName(r.country) ?? r.country}</td>
              <td className="ms-scores__player">{r.player ?? handle(r.username)}{user?.id === r.userId ? ' (you)' : <ReportName userId={r.userId} name={r.player ?? handle(r.username)} where="scoreboard" compact />}</td>
              <td className="num">{formatTime(r.ms)}</td>
              <td className="ms-wide-only" style={{ color: 'var(--ms-soft)' }}>{day(r.at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {limit && rows.length > limit && more}
    </>
  );
}

/** One country's records: its fastest time on each live track. */
function CountryOwnRecords({ code }) {
  const { user } = useAuth();
  const { data, error } = useAsync(() => (code ? api.countryRecordsOf(code) : Promise.resolve(null)), [code]);
  if (!code) return <p className="ms-note" style={{ margin: 0 }}>Choose a country to see its records.</p>;
  if (error) return <div className="ms-msg ms-msg--bad">The records couldn't be loaded. Try again in a moment.</div>;
  if (!data) return <p className="ms-note">Loading…</p>;
  if (!data.records.length) return <div className="ms-card">No records for {countryName(code)} yet. Race for it: choose it in <Link to="/settings">Settings</Link>.</div>;
  return (
    <div className="ms-card" style={{ padding: 0, overflowX: 'auto' }}>
      <table className="ms-table ms-table--scores">
        <thead><tr><th scope="col">Track</th><th scope="col">Player</th><th scope="col" className="num">Time</th><th scope="col" className="ms-wide-only">Set on</th></tr></thead>
        <tbody>
          {data.records.map((r) => (
            <tr key={r.slug} className={user?.id === r.userId ? 'is-me' : undefined}>
              <td><Link to={`/tracks/${r.slug}`}>{r.track}</Link></td>
              <td className="ms-scores__player">{r.player ?? handle(r.username)}{user?.id === r.userId ? ' (you)' : <ReportName userId={r.userId} name={r.player ?? handle(r.username)} where="scoreboard" compact />}</td>
              <td className="num">{formatTime(r.ms)}</td>
              <td className="ms-wide-only" style={{ color: 'var(--ms-soft)' }}>{day(r.at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The scoreboards' "Countries" tab (Moses, 22 Oct 2026): pick a track and see each country's record on
 * it (the fastest time by a saved player racing for that country), or pick a country and see its
 * record on every track.
 */
export default function CountryRecords({ initialTrack = null }) {
  const { user } = useAuth();
  const [view, setView] = useState('track');
  const { data: list } = useAsync(() => api.tracks(), [], 'tracks');
  const tracks = useMemo(() => [...(list?.tracks ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [list]);
  const [slug, setSlug] = useState(initialTrack);
  useEffect(() => { if (!slug && tracks.length) setSlug(tracks[0].slug); }, [slug, tracks]);
  const [code, setCode] = useState('');
  useEffect(() => { if (!code) setCode(user?.country || browserCountry() || ''); }, [user, code]);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p className="ms-note" style={{ margin: 0 }}>
        Country records: the fastest time on each track by a player racing for each country. Saved accounts count, with the country they chose (<Link to="/settings">Settings</Link>); computer players never do.
      </p>
      <div className="ms-row" style={{ gap: 8, alignItems: 'center' }}>
        <div role="tablist" aria-label="Country records" className="ms-tabs">
          <button type="button" role="tab" aria-selected={view === 'track'} onClick={() => setView('track')}>By track</button>
          <button type="button" role="tab" aria-selected={view === 'country'} onClick={() => setView('country')}>By country</button>
        </div>
        {view === 'track' ? (
          <select aria-label="Track" value={slug ?? ''} onChange={(e) => setSlug(e.target.value)}>
            {tracks.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        ) : (
          <CountryPicker label="Country" value={code} onChange={setCode} noneLabel="Choose a country" />
        )}
      </div>
      {view === 'track'
        ? <TrackCountryRecords slug={slug} empty={<div className="ms-card">No country records on this track yet. Choose your country in <Link to="/settings">Settings</Link> and set the first one.</div>} />
        : <CountryOwnRecords code={code} />}
    </div>
  );
}
