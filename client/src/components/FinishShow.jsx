import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import MarbleBall from './MarbleBall';
import Confetti from './Confetti';
import { formatTime, ordinal } from '../utils/format';
import { PODIUM_STEP_MS, ROW_MS, arrivals, boardRows, finishPlan, phaseAt, showerFor } from '../utils/finishShow';

/**
 * The finish show's clock and stage, for a race viewer: `time` (a replay's
 * clock) or `clock()` (live: polled ten times a second, running on after the
 * stream ends). finishes: { entry index: finish ms } known so far; complete:
 * no more finishers to come.
 */
export function useFinishShow({ finishes, count, complete, time = null, clock = null }) {
  const [ticked, setTicked] = useState(null);
  const [paused, setPaused] = useState(false); // the clock standing still (a paused replay): the ceremony's motion holds too
  useEffect(() => {
    if (!clock) return undefined;
    let last = null;
    const id = setInterval(() => {
      const now = clock();
      setPaused(now === last);
      last = now;
      setTicked(now);
    }, 100);
    return () => clearInterval(id);
  }, [clock]);
  const t = clock ? ticked : time;
  const plan = useMemo(() => finishPlan(finishes, count, complete), [finishes, count, complete]);
  const [skipped, setSkipped] = useState(false);
  // A replay rewound to before the finish: the show starts afresh.
  if (skipped && plan && t !== null && t < plan.winnerMs) setSkipped(false);
  const phase = phaseAt(t, plan, skipped);
  // For the confetti, drawn every animation frame: the smooth clock, or the last time given.
  const timeRef = useRef(time);
  timeRef.current = time;
  const [readTime] = useState(() => () => timeRef.current);
  return { t, plan, phase, complete, paused: Boolean(clock) && paused, clock: clock ?? readTime, skip: () => setSkipped(true) };
}

/** Room for a cheer when the winner crosses (sound comes later). */
function cheer() {}

/** A marble's colour, lifted if too dark to read on the dark banner and board. */
function readable(hex) {
  const n = Number.parseInt((hex || '#888888').slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.45) {
    const k = (0.45 - lum) / (1 - lum) + 0.15;
    r += (255 - r) * k;
    g += (255 - g) * k;
    b += (255 - b) * k;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Keeps a part of the ceremony's CSS animations on the race clock: `elapsed`
 * (ms since that part began). Paused with a paused replay, and put right
 * whenever the clock jumps (a replay scrubbed, opened part-way, or a live
 * view joining late), so the steps, sweeps and sparkles always show the
 * moment the race is at.
 */
function useOnClock(ref, elapsed, paused) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.getAnimations || !Number.isFinite(elapsed)) return;
    for (const a of el.getAnimations({ subtree: true })) {
      if (paused) {
        a.pause();
        a.currentTime = elapsed;
      } else {
        if (a.playState === 'paused') a.play();
        if (Math.abs((a.currentTime ?? 0) - elapsed) > 250) a.currentTime = elapsed;
      }
    }
  });
}

/**
 * The finish show, drawn over a race view (2D or 3D): the winner's banner with
 * a flash and confetti, the ticker counting the field home, the podium and the
 * results board, with `next` (the next race) at its foot.
 *
 * show: from useFinishShow; entries: the race's entries; mine: the viewer's
 * entry indexes; raceId: for the official results (track record and personal
 * best flags), unless `official` rows are given. onSkip: what "Skip to results"
 * does (a replay jumps ahead; live, the board shows at once).
 */
export default function FinishShow({ show, finishes, entries, mine = [], raceId = null, official = null, trackName = '', next = null, onSkip = null }) {
  const { t, plan, phase, complete, skip } = show;
  const shower = useMemo(() => showerFor(plan), [plan]);
  const [fetched, setFetched] = useState(null);
  const late = phase === 'podium' || phase === 'board';
  useEffect(() => {
    // Only once the race is over (live, its results are filed as the stream ends).
    if (!late || !complete || official || !raceId || fetched) return undefined;
    let stop = false;
    let timer;
    const load = (tries) => api.results(raceId).then((d) => !stop && setFetched(d.results)).catch(() => {
      // The results are filed a moment after the last marble is home: try again shortly.
      if (!stop && tries > 0) timer = setTimeout(() => load(tries - 1), 2000);
    });
    load(3);
    return () => { stop = true; clearTimeout(timer); };
  }, [late, complete, official, raceId, fetched]);

  // The cheer, once, as the winner crosses while the race is playing (not when scrubbing to it).
  const cheered = useRef(null);
  useEffect(() => {
    if (phase === 'racing') cheered.current = null;
    if (phase === 'winner' && plan && cheered.current !== plan.winnerMs && t - plan.winnerMs < 1000) {
      cheered.current = plan.winnerMs;
      cheer();
    }
  }, [phase, plan, t]);

  if (phase === 'racing' || !plan) return null;
  const since = t - plan.winnerMs;
  const home = arrivals(finishes, t);
  const winner = home[0] && entries[home[0].index];
  const mineWon = home[0] && mine.includes(home[0].index);

  return (
    <div className={`finish finish--${phase}`}>
      {phase === 'winner' && since < 600 && <div className="finish__flash" style={{ opacity: 1 - since / 600 }} />}
      {phase !== 'board' && <Confetti clock={show.clock} shower={shower} />}

      {(phase === 'winner' || phase === 'field') && winner && (
        <WinnerBanner key={home[0].index} small={phase === 'field'} mineWon={mineWon} winner={winner} ms={home[0].ms} elapsed={t - plan.winnerMs} paused={show.paused} />
      )}

      {phase === 'field' && home.length > 1 && (
        <ol className="finish__ticker" aria-label="Marbles home">
          {home.slice(-3).reverse().map((a) => (
            <li key={a.index} className={mine.includes(a.index) ? 'is-mine' : undefined}>
              <span className="finish__place">{ordinal(a.place)}</span>
              <MarbleBall marble={entries[a.index]?.marble} size={14} />
              <span className="finish__tname">{entries[a.index]?.marble?.name}</span>
              <span className="finish__ttime">{formatTime(a.ms)}</span>
            </li>
          ))}
          <li className="finish__count">{home.length}/{entries.length} home</li>
        </ol>
      )}

      {(phase === 'winner' || phase === 'field') && (
        <button type="button" className="finish__skip btn btn--sm" onClick={onSkip ?? skip}>Skip to results</button>
      )}

      {phase === 'podium' && <Podium top={home.slice(0, 3)} entries={entries} mine={mine} elapsed={t - plan.podiumAt} paused={show.paused} />}

      {phase === 'board' && (
        <Board
          rows={boardRows({ entries, finishes: Object.fromEntries(home.map((a) => [a.index, a.ms])), official: official ?? fetched, mine })}
          trackName={trackName}
          next={next}
        />
      )}
    </div>
  );
}

/** The winner's banner: metallic gold lettering with a light sweeping across it, glowing rays behind. */
function WinnerBanner({ small, mineWon, winner, ms, elapsed, paused }) {
  const ref = useRef(null);
  useOnClock(ref, elapsed, paused);
  return (
    <div ref={ref} className={`finish__banner${small ? ' is-small' : ''}${mineWon ? ' is-mine' : ''}`} role="status" aria-live="polite">
      {!small && <span className="finish__rays" aria-hidden="true" />}
      <span className="finish__title" data-text={mineWon ? 'You win!' : 'Winner'}>{mineWon ? 'You win!' : 'Winner'}</span>
      <span className="finish__who">
        <MarbleBall marble={winner.marble} size={small ? 20 : 32} />
        <span className="finish__name" style={{ color: readable(winner.marble?.color_primary) }}>{winner.marble?.name}</span>
      </span>
      <span className="finish__owner">
        {winner.user ? `@${winner.user.username}` : 'House marble'} <span className="finish__dot">◆</span> {formatTime(ms)}
      </span>
    </div>
  );
}

/** A marble shown large, slowly turning, with the light staying put on it. */
function SpinningMarble({ marble, size }) {
  return (
    <span className="spin-marble" style={{ width: size, height: size }}>
      <span className="spin-marble__body"><MarbleBall marble={marble} size={size} title="" /></span>
      <span className="spin-marble__shade" />
    </span>
  );
}

/** A small gold crown, for first place. */
function Crown() {
  return (
    <svg className="podium-crown" viewBox="0 0 64 44" aria-hidden="true">
      <defs>
        <linearGradient id="crown-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4c2" />
          <stop offset="0.45" stopColor="#f2c94c" />
          <stop offset="0.7" stopColor="#b8861f" />
          <stop offset="1" stopColor="#f7dc80" />
        </linearGradient>
      </defs>
      <path d="M6 36 L2 10 L18 22 L32 4 L46 22 L62 10 L58 36 Z" fill="url(#crown-gold)" stroke="#7a5410" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="6" y="35" width="52" height="7" rx="2" fill="url(#crown-gold)" stroke="#7a5410" strokeWidth="1.6" />
      <circle cx="32" cy="25" r="3.6" fill="#e23a5b" stroke="#7a1028" strokeWidth="1" />
      <circle cx="18" cy="28" r="2.6" fill="#3f7fe8" stroke="#1c3f86" strokeWidth="1" />
      <circle cx="46" cy="28" r="2.6" fill="#3f7fe8" stroke="#1c3f86" strokeWidth="1" />
      <circle cx="2" cy="10" r="2.4" fill="#fff4c2" /><circle cx="32" cy="4" r="2.6" fill="#fff4c2" /><circle cx="62" cy="10" r="2.4" fill="#fff4c2" />
    </svg>
  );
}

const SPARKLES = [[-18, 18, 0], [112, 8, 0.5], [-6, 72, 1.1], [104, 66, 0.3], [48, -16, 0.8], [20, 96, 1.4]];

/**
 * The podium: gold, silver and bronze steps rising one at a time (third,
 * second, then first, last and tallest), each top-three marble large and
 * turning on its step, first place crowned and sparkling, under sweeping
 * spotlights.
 */
function Podium({ top, entries, mine, elapsed, paused }) {
  const ref = useRef(null);
  useOnClock(ref, elapsed, paused);
  const steps = [[top[1], 'silver', PODIUM_STEP_MS[1]], [top[0], 'gold', PODIUM_STEP_MS[0]], [top[2], 'bronze', PODIUM_STEP_MS[2]]];
  return (
    <div ref={ref} className="finish__podium" aria-label="Podium">
      <span className="podium-light podium-light--left" aria-hidden="true" />
      <span className="podium-light podium-light--right" aria-hidden="true" />
      <span className="podium-glow" aria-hidden="true" />
      <div className="podium-stage">
        {steps.map(([a, kind, at]) => {
          if (!a) return <div key={kind} className="podium-step" />;
          const e = entries[a.index];
          return (
            <div key={kind} className={`podium-step podium-step--${kind}${mine.includes(a.index) ? ' is-mine' : ''}`} style={{ '--at': `${at}ms` }}>
              <div className="podium-step__top">
                {kind === 'gold' && <Crown />}
                <span className="podium-step__marble">
                  <SpinningMarble marble={e?.marble} size="var(--marble)" />
                  {kind === 'gold' && SPARKLES.map(([x, y, d], k) => (
                    <i key={k} className="podium-sparkle" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />
                  ))}
                </span>
              </div>
              <div className="podium-step__block">
                <span className="podium-step__num">{a.place}</span>
                <span className="podium-step__plate">
                  <span className="podium-step__name" style={{ color: readable(e?.marble?.color_primary) }}>{e?.marble?.name}</span>
                  <span className="podium-step__owner">{e?.user ? `@${e.user.username}` : 'House'}</span>
                  <span className="podium-step__time">{formatTime(a.ms)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Board({ rows, trackName, next }) {
  // Once the rows have landed, bring the viewer's own row into view (within the board only).
  const ref = useRef(null);
  const mineAt = rows.findIndex((r) => r.mine);
  useEffect(() => {
    if (mineAt < 0) return undefined;
    const id = setTimeout(() => {
      const box = ref.current;
      const row = box?.querySelectorAll('tbody tr')[mineAt];
      if (!box || !row) return;
      const head = box.querySelector('.board__head')?.offsetHeight ?? 0;
      const foot = box.querySelector('.board__next')?.offsetHeight ?? 0;
      const at = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      const room = box.clientHeight - head - foot;
      box.scrollTo({ top: Math.max(0, at - head - (room - row.offsetHeight) / 2), behavior: 'smooth' });
    }, rows.length * ROW_MS + 400);
    return () => clearTimeout(id);
  }, [mineAt, rows.length]);
  return (
    <div className="finish__board" role="region" aria-label="Results" ref={ref}>
      <header className="board__head">
        <span>Results</span>
        {trackName && <small>{trackName}</small>}
      </header>
      <table className="board__table">
        <thead>
          <tr>
            <th scope="col" className="num">Pl</th>
            <th scope="col" className="num" title="Starting place">Start</th>
            <th scope="col">Marble</th>
            <th scope="col" className="board__ownercol">Owner</th>
            <th scope="col" className="num">Time</th>
            <th scope="col" className="num">Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={r.index} className={r.mine ? 'is-mine' : undefined} style={{ animationDelay: `${k * ROW_MS}ms` }}>
              <td className="num board__pl">{r.place ?? '–'}</td>
              <td className="num board__start">{r.start ?? '–'}</td>
              <td>
                <div className="board__marble">
                  <MarbleBall marble={r.marble} size={14} />
                  <span className="board__name" style={{ color: readable(r.marble?.color_primary) }}>{r.marble?.name}</span>
                  {r.record && <span className="board__flag board__flag--record">Track record</span>}
                  {r.pb && <span className="board__flag board__flag--pb">Personal best</span>}
                  {r.username && <span className="board__owner board__owner--under">@{r.username}</span>}
                </div>
              </td>
              <td className="board__owner board__ownercol">{r.username ? `@${r.username}` : <span className="muted">House</span>}</td>
              <td className="num board__time">{r.racing ? 'racing' : formatTime(r.ms)}</td>
              <td className="num board__gap">{r.racing ? '' : r.gap === 0 ? '' : `+${(r.gap / 1000).toFixed(2)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {next && <footer className="board__next">{next}</footer>}
    </div>
  );
}
