import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import MarbleBall from './MarbleBall';
import { formatTime, ordinal } from '../utils/format';
import { ROW_MS, arrivals, boardRows, finishPlan, phaseAt } from '../utils/finishShow';

/**
 * The finish show's clock and stage, for a race viewer: `time` (a replay's
 * clock) or `clock()` (live: polled ten times a second, running on after the
 * stream ends). finishes: { entry index: finish ms } known so far; complete:
 * no more finishers to come.
 */
export function useFinishShow({ finishes, count, complete, time = null, clock = null }) {
  const [ticked, setTicked] = useState(null);
  useEffect(() => {
    if (!clock) return undefined;
    const id = setInterval(() => setTicked(clock()), 100);
    return () => clearInterval(id);
  }, [clock]);
  const t = clock ? ticked : time;
  const plan = useMemo(() => finishPlan(finishes, count, complete), [finishes, count, complete]);
  const [skipped, setSkipped] = useState(false);
  // A replay rewound to before the finish: the show starts afresh.
  if (skipped && plan && t !== null && t < plan.winnerMs) setSkipped(false);
  const phase = phaseAt(t, plan, skipped);
  return { t, plan, phase, complete, skip: () => setSkipped(true) };
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

const CONFETTI = Array.from({ length: 70 }, (_, k) => {
  const rnd = (s) => { const x = Math.sin(k * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
  return {
    left: `${(rnd(1) * 100).toFixed(1)}%`,
    delay: `${(rnd(2) * 0.9).toFixed(2)}s`,
    dur: `${(1.9 + rnd(3) * 1.3).toFixed(2)}s`,
    drift: `${((rnd(4) - 0.5) * 120).toFixed(0)}px`,
    spin: `${(360 + rnd(5) * 720).toFixed(0)}deg`,
    color: ['#ffd21f', '#ff4d6d', '#3ec1ff', '#7ae582', '#ffffff', '#ff9f1c'][k % 6],
    wide: k % 3 === 0,
  };
});

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
      {phase === 'winner' && since < 450 && <div className="finish__flash" style={{ opacity: 1 - since / 450 }} />}
      {phase === 'winner' && since < 3600 && (
        <div className="finish__confetti" aria-hidden="true">
          {CONFETTI.map((c, k) => (
            <i
              key={k}
              className={c.wide ? 'is-wide' : undefined}
              style={{ left: c.left, background: c.color, animationDelay: c.delay, animationDuration: c.dur, '--drift': c.drift, '--spin': c.spin }}
            />
          ))}
        </div>
      )}

      {(phase === 'winner' || phase === 'field') && winner && (
        <div className={`finish__banner${phase === 'field' ? ' is-small' : ''}${mineWon ? ' is-mine' : ''}`} role="status" aria-live="polite">
          <span className="finish__title">{mineWon ? 'You win!' : 'Winner'}</span>
          <span className="finish__who">
            <MarbleBall marble={winner.marble} size={phase === 'field' ? 20 : 34} />
            <span className="finish__name" style={{ color: readable(winner.marble?.color_primary) }}>{winner.marble?.name}</span>
          </span>
          <span className="finish__owner">
            {winner.user ? `@${winner.user.username}` : 'House marble'} · {formatTime(home[0].ms)}
          </span>
        </div>
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

      {phase === 'podium' && <Podium top={home.slice(0, 3)} entries={entries} mine={mine} />}

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

function Podium({ top, entries, mine }) {
  const steps = [top[1], top[0], top[2]]; // silver, gold, bronze: the winner in the middle
  const kind = ['silver', 'gold', 'bronze'];
  return (
    <div className="finish__podium" aria-label="Podium">
      {steps.map((a, k) => (a ? (
        <div key={a.index} className={`podium-step podium-step--${kind[k]}${mine.includes(a.index) ? ' is-mine' : ''}`}>
          <MarbleBall marble={entries[a.index]?.marble} size={k === 1 ? 46 : 36} />
          <span className="podium-step__name" style={{ color: readable(entries[a.index]?.marble?.color_primary) }}>{entries[a.index]?.marble?.name}</span>
          <span className="podium-step__owner">{entries[a.index]?.user ? `@${entries[a.index].user.username}` : 'House'}</span>
          <span className="podium-step__block"><strong>{a.place}</strong><small>{formatTime(a.ms)}</small></span>
        </div>
      ) : <div key={`gap${k}`} className="podium-step" />))}
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
