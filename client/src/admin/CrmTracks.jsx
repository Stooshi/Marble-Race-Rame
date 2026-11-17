import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from './adminApi';
import { BASE, Card, Icon, Pill, ReasonAction, Rows } from './Crm';

/**
 * The CRM's Races & tracks (Moses, 17 Nov 2026; until now: the classic Race readiness page, and tracks switched on
 * with SQL). Two tabs:
 *   Tracks     every track, on or off, with its pack, wildness and races in the last 7 days; a preview link; and
 *              (tracks:switch, the owner) Switch on / Switch off with a reason, kept in the audit log
 *   Readiness  which screens weren't ready by GO, and what they missed (as on the classic page)
 */
const TABS = [
  { key: 'tracks', title: 'Tracks' },
  { key: 'readiness', title: 'Race readiness' },
];
const WILD = { easy: 'Easy', wild: 'Wild', extreme: 'Extreme' };

export function TracksPage({ tab, can }) {
  const navigate = useNavigate();
  const cur = TABS.find((t) => t.key === tab) ?? TABS[0];
  return (
    <div className="crm-page">
      <div className="crm-chips" role="tablist" aria-label="Races & tracks">
        {TABS.map((t) => <button key={t.key} type="button" role="tab" aria-selected={cur.key === t.key} onClick={() => navigate(`${BASE}/tracks/${t.key}`)}>{t.title}</button>)}
      </div>
      {cur.key === 'tracks' && <Tracks can={can} />}
      {cur.key === 'readiness' && <Readiness />}
    </div>
  );
}

function Tracks({ can }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [show, setShow] = useState('all');
  const load = useCallback(() => adminApi.tracks().then((r) => setData(r.tracks), (e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const rows = useMemo(() => (data ?? []).filter((t) => (show === 'all' || (show === 'on' ? t.is_active : !t.is_active))
    && (!q.trim() || `${t.name} ${t.slug} ${t.pack ?? ''} ${t.season_key ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [data, q, show]);
  const counts = { all: data?.length ?? 0, on: data?.filter((t) => t.is_active).length ?? 0, off: data?.filter((t) => !t.is_active).length ?? 0 };
  const switcher = (t) => (!can('tracks:switch') ? null : (
    <ReasonAction
      label={t.is_active ? 'Switch off' : 'Switch on'}
      danger={t.is_active}
      confirm={t.is_active ? `Switch ${t.name} off` : `Switch ${t.name} on`}
      run={async ({ reason }) => { await adminApi.setTrack(t.slug, !t.is_active, reason); return `${t.name} is ${t.is_active ? 'off' : 'on'} now.`; }}
      done={load}
    />
  ));
  return (
    <Card title="Tracks">
      <p className="crm-muted">
        On: players can race it (and, in a pack, buy it). Switching is for the owner, with a reason kept in the audit log; the race picker and the
        packs follow at once, the website&apos;s track pages and counts with its next build. A track can only go on when the server has its code
        {data && data.some((t) => !t.built) ? ' (the ones marked "not on this server" need a server deploy first)' : ''}.
      </p>
      <div className="crm-actions">
        <div className="crm-search crm-search--small"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, pack or season" aria-label="Search tracks" /></div>
        <div className="crm-chips" role="group" aria-label="Show">
          {[['all', 'All'], ['on', 'On'], ['off', 'Off']].map(([k, label]) => <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)}>{label} {counts[k]}</button>)}
        </div>
      </div>
      {error && <p className="crm-alert">{error}</p>}
      {!data && !error && <p className="crm-muted">Loading…</p>}
      {data && (
        <Rows
          wrap
          head={['Track', 'Status', 'Pack', 'Level', 'Races (7 days)', 'Preview', '']}
          rows={rows.map((t) => [
            <span key="n"><b>{t.name}</b><br /><small className="crm-muted">{t.slug}</small></span>,
            <span key="s">{t.is_active ? <Pill tone="good">On</Pill> : <Pill>Off</Pill>}{!t.built && <><br /><small className="crm-muted">not on this server</small></>}</span>,
            t.season_key ? `Season: ${t.season_key}` : t.pack ? `${t.pack}${t.is_free ? ' · free' : ''}` : t.is_free ? 'Free' : '—',
            t.wildness ? `${WILD[t.wildness]}${t.wildness_score != null ? ` ${t.wildness_score}` : ''}` : '—',
            t.races_7d,
            <a key="p" href={`/preview/physics?track=${encodeURIComponent(t.slug)}`} target="_blank" rel="noreferrer">Preview</a>,
            switcher(t),
          ])}
          empty="No tracks match."
        />
      )}
    </Card>
  );
}

function Readiness() {
  const [days, setDays] = useState(7);
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { setR(null); adminApi.readiness(days).then(setR, (e) => setError(e.message)); }, [days]);
  const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
  const at = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Stockholm' });
  return (
    <>
      <Card title="Race readiness">
        <p className="crm-muted">Each screen reports once per race whether the track, the marbles and the sound were all loaded by GO. Reports are kept 30 days.</p>
        <div className="crm-chips" role="group" aria-label="Period">
          {[1, 7, 30].map((d) => <button key={d} type="button" aria-pressed={d === days} onClick={() => setDays(d)}>Last {d === 1 ? 'day' : `${d} days`}</button>)}
        </div>
        {error && <p className="crm-alert">{error}</p>}
        {!r && !error && <p className="crm-muted">Loading…</p>}
        {r && <Rows head={['Platform', 'Race', 'Screens', 'Ready by GO', 'Caught up after (avg)']} rows={r.byPlatform.map((p) => [p.platform, p.kind, p.screens, pct(p.ready, p.screens), p.avg_late_ms == null ? '—' : `${(p.avg_late_ms / 1000).toFixed(1)} s`])} />}
      </Card>
      {r && (
        <>
          <Card title="What was missing">
            <Rows head={['Platform', 'Missing', 'Kind', 'Times']} rows={r.missing.map((m) => [m.platform, m.missing, m.piece, m.times])} />
          </Card>
          <Card title="Latest app races">
            <p className="crm-muted">Every race in the apps, ready or not: the build (its time), the sound player, what became of the countdown beeps, how far the sound&apos;s GO was from GO as shown, and any sound file the player couldn&apos;t load.</p>
            <Rows head={['When', 'Platform', 'Build', 'Sound', 'Beeps', "Sound's GO off by", "Couldn't load"]} rows={(r.apps ?? []).map((l) => [
              at(l.created_at), `${l.platform} · ${l.kind}`, l.details?.build ?? '(older build)', l.details?.backend ?? '—', l.details?.beeps ?? '—',
              Number.isFinite(l.details?.goGapMs) ? `${(l.details.goGapMs / 1000).toFixed(1)} s` : '—', l.details?.loadFailed?.length ? l.details.loadFailed.join(', ') : '—',
            ])} />
          </Card>
          <Card title="Latest screens not ready">
            <Rows head={['When', 'Platform', 'Missing', 'Caught up after', 'Sound', 'Connection', 'Device']} rows={r.latest.map((l) => [
              at(l.created_at), `${l.platform} · ${l.kind}`, l.missing.join(', '), `${(l.late_ms / 1000).toFixed(1)} s`,
              `${l.details?.backend ?? '—'}${l.details?.started === false ? ' (no tap)' : ''}`, l.details?.connection ?? '—', <small key="d" className="crm-muted">{l.device ?? '—'}</small>,
            ])} />
          </Card>
        </>
      )}
    </>
  );
}
