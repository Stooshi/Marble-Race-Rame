import { useEffect, useMemo, useRef, useState } from 'react';
import { aspectRatio, buildPath, fitTransform, pointAt } from '../utils/trackGeometry';
import { HALFWAY, splitOrder } from '../utils/splits';
import { formatDelta, formatTime } from '../utils/format';
import { OBSTACLE_COLORS } from './TrackPreview';
import MarbleBall from './MarbleBall';

/**
 * Renders a race: the track on a canvas with marbles animated along it, plus
 * live standings and the halfway split board.
 *
 * Props:
 *   meta       stream header: { track, entries[], durationMs }
 *   sample()   returns the interpolated frame to draw right now ({ p[], l[] })
 *   frame      latest frame (drives standings; updates ~10x/s)
 *   splits     { [entryIndex]: ms | null } halfway split times
 *   highlight  entry indexes to emphasise (the viewer's marbles)
 */
export default function RaceViewer({ meta, sample, frame, splits = {}, highlight = [], footer }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const path = useMemo(() => buildPath(meta?.track?.waypoints), [meta]);
  const entries = meta?.entries ?? [];
  const highlightKey = highlight.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const highlightSet = useMemo(() => new Set(highlight), [highlightKey]);

  // Track the container width; height follows the track's shape.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.max(220, Math.round(Math.min(width * aspectRatio(path), window.innerHeight * 0.62, 640)));
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [path]);

  // Pre-render the static track, then animate marbles on top every frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !meta) return undefined;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    const ctx = canvas.getContext('2d');

    const trackWidth = Math.max(16, Math.min(46, size.width / 13));
    const { apply } = fitTransform(path, size.width, size.height, trackWidth);
    const radius = Math.max(3.5, Math.min(9, trackWidth * 0.24));
    const bg = drawTrack({ path, apply, size, dpr, trackWidth, obstacles: meta.track?.obstacles ?? [] });

    const toScreen = (progress, lateral) => {
      const p = pointAt(path, progress);
      const s = apply(p);
      const off = lateral * (trackWidth / 2 - radius - 1);
      return { x: s.x - p.dy * off, y: s.y + p.dx * off };
    };

    let raf;
    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bg, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const f = sample?.();
      if (f) {
        // Draw back-markers first so the leaders sit on top.
        const order = (f.s ?? entries.map((e) => e.index)).slice().reverse();
        for (const i of order) {
          const entry = entries[i];
          if (!entry) continue;
          const pos = toScreen(f.p[i] ?? 0, f.l[i] ?? 0);
          drawMarble(ctx, pos, radius, entry.marble, highlightSet.has(i));
        }
      } else {
        // Before the start: line everyone up on the grid.
        entries.forEach((entry, i) => {
          const lateral = entries.length > 1 ? -1 + (2 * (i % 5)) / 4 : 0;
          const pos = toScreen(Math.max(0, 0.004 - Math.floor(i / 5) * 0.006), lateral);
          drawMarble(ctx, pos, radius, entry.marble, highlightSet.has(i));
        });
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, meta, path, sample, entries, highlightSet]);

  const standings = frame?.s ?? entries.map((e) => e.index);
  const splitRank = splitOrder(splits);
  const leaderSplit = splits[splitRank[0]];
  const elapsed = frame?.t ?? 0;
  const myRank = splitRank.findIndex((i) => highlightSet.has(i));

  return (
    <div className="race-viewer">
      <div className="race-viewer__stage">
        <div className="race-viewer__hud">
          <span className="race-viewer__clock">{formatTime(elapsed)}<small> / {formatTime(meta?.durationMs)}</small></span>
          <span className="race-viewer__track">{meta?.track?.name}</span>
        </div>
        <div ref={wrapRef} className="race-viewer__canvas-wrap">
          <canvas ref={canvasRef} style={{ width: size.width, height: size.height }} aria-label="Race track" role="img" />
        </div>
        <div className="race-viewer__progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (elapsed / (meta?.durationMs || 1)) * 100)}%` }} />
        </div>
        {footer}
      </div>

      <aside className="race-viewer__side">
        <section className="panel">
          <h3>Standings</h3>
          <ol className="standings">
            {standings.map((i, rank) => {
              const e = entries[i];
              if (!e) return null;
              const p = frame?.p[i] ?? 0;
              const split = splits[i];
              return (
                <li key={e.entryId} className={highlightSet.has(i) ? 'is-me' : undefined}>
                  <span className="standings__pos">{rank + 1}</span>
                  <MarbleBall marble={e.marble} size={18} />
                  <span className="standings__name">
                    {e.marble.name}
                    <small>{e.user ? e.user.username : 'bot'}</small>
                  </span>
                  <span className="standings__bar" title={`${Math.round(p * 100)}%`}>
                    <span style={{ width: `${p * 100}%` }} />
                    <i style={{ left: `${HALFWAY * 100}%` }} />
                  </span>
                  <span className="standings__split">{p >= 1 ? 'FIN' : split ? formatTime(split) : split === null ? '—' : ''}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="panel">
          <h3>Halfway split</h3>
          {!splitRank.length ? (
            <p className="muted small">Split times appear as marbles pass the ½ marker.</p>
          ) : (
            <ol className="split-board">
              {splitRank.slice(0, 8).map((i, rank) => (
                <li key={i} className={highlightSet.has(i) ? 'is-me' : undefined}>
                  <span>{rank + 1}</span>
                  <MarbleBall marble={entries[i]?.marble} size={14} />
                  <span className="split-board__name">{entries[i]?.marble.name}</span>
                  <span className="num">{rank === 0 ? formatTime(splits[i]) : formatDelta(splits[i] - leaderSplit)}</span>
                </li>
              ))}
            </ol>
          )}
          {myRank >= 8 && (
            <p className="small split-board__me">
              You: P{myRank + 1} at halfway, {formatDelta(splits[splitRank[myRank]] - leaderSplit)}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function drawTrack({ path, apply, size, dpr, trackWidth, obstacles }) {
  const off = document.createElement('canvas');
  off.width = size.width * dpr;
  off.height = size.height * dpr;
  const ctx = off.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pts = path.points.map(apply);
  const stroke = (width, color, dash) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.setLineDash(dash || []);
    ctx.stroke();
  };
  stroke(trackWidth + 6, '#0b0d12');
  stroke(trackWidth, '#2a2f3d');
  stroke(1, 'rgba(255,255,255,.18)', [6, 8]);

  for (const o of obstacles) {
    ctx.beginPath();
    const steps = 12;
    for (let k = 0; k <= steps; k += 1) {
      const s = apply(pointAt(path, o.at + ((o.span ?? 0.03) * k) / steps));
      if (k) ctx.lineTo(s.x, s.y);
      else ctx.moveTo(s.x, s.y);
    }
    ctx.setLineDash([]);
    ctx.lineWidth = trackWidth;
    ctx.strokeStyle = hexAlpha(OBSTACLE_COLORS[o.type] || '#ffffff', 0.35);
    ctx.stroke();
  }

  const crossLine = (progress, color, label, checkered) => {
    const p = pointAt(path, progress);
    const c = apply(p);
    const half = trackWidth / 2 + 3;
    const nx = -p.dy;
    const ny = p.dx;
    if (checkered) {
      const squares = 6;
      for (let k = 0; k < squares; k += 1) {
        const a = -half + (2 * half * k) / squares;
        const b = -half + (2 * half * (k + 1)) / squares;
        ctx.beginPath();
        ctx.moveTo(c.x + nx * a, c.y + ny * a);
        ctx.lineTo(c.x + nx * b, c.y + ny * b);
        ctx.lineWidth = 6;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = k % 2 ? '#111' : '#f5f5f5';
        ctx.stroke();
      }
      ctx.lineCap = 'round';
    } else {
      ctx.beginPath();
      ctx.moveTo(c.x - nx * half, c.y - ny * half);
      ctx.lineTo(c.x + nx * half, c.y + ny * half);
      ctx.lineWidth = 3;
      ctx.setLineDash(progress === HALFWAY ? [4, 3] : []);
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (label) {
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Keep the label inside the canvas when the line sits near an edge.
      const halfText = ctx.measureText(label).width / 2 + 4;
      const lx = Math.min(size.width - halfText, Math.max(halfText, c.x + nx * (half + 12)));
      const ly = Math.min(size.height - 8, Math.max(8, c.y + ny * (half + 12)));
      ctx.fillText(label, lx, ly);
    }
  };
  crossLine(0, '#9aa4b2', 'START');
  crossLine(HALFWAY, '#facc15', '½');
  crossLine(1, '#f5f5f5', 'FINISH', true);
  return off;
}

function drawMarble(ctx, pos, r, marble, highlighted) {
  const primary = marble?.color_primary || '#999';
  const secondary = marble?.color_secondary || primary;
  if (highlighted) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250, 204, 21, .35)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(pos.x - r * 0.35, pos.y - r * 0.35, r * 0.1, pos.x, pos.y, r);
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(0.25, primary);
  g.addColorStop(1, secondary === primary ? darken(primary) : secondary);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.stroke();
}

function hexAlpha(hex, a) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function darken(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * 0.45)}, ${Math.round(((n >> 8) & 255) * 0.45)}, ${Math.round((n & 255) * 0.45)})`;
}
