'use strict';

/**
 * The track report page: the same layout for every track. Verdict and the
 * two lines Moses needs (preview link, switch-on line) at the top, then one
 * table per part with a pass or fail beside each line, then the drawing load
 * through a race and the fixed screenshots.
 */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PARTS = ['Fairness', 'Pace', 'Close racing', 'Splitters', 'Obstacles, boosts, bumps', 'Safety', 'Ground', 'Camera', 'Drawing load'];
const BUDGETS = { computer: { calls: 60, triangles: 150_000 }, phone: { calls: 35, triangles: 60_000 } };

const mark = (pass) => (pass === true ? '<span class="mark pass">Pass</span>' : pass === false ? '<span class="mark fail">Fail</span>' : '<span class="mark info">Shown</span>');

/** A small bar chart of draw calls through the race, with the budget drawn across it. */
function loadChart(frames, screen) {
  if (!frames?.length) return '';
  const W = 560;
  const H = 120;
  const pad = { l: 34, r: 8, t: 10, b: 22 };
  const budget = BUDGETS[screen].calls;
  const top = Math.max(budget * 1.25, ...frames.map((f) => f.calls));
  const x = (i) => pad.l + ((W - pad.l - pad.r) * (i + 0.5)) / frames.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const bw = Math.max(2, ((W - pad.l - pad.r) / frames.length) * 0.7);
  const bars = frames.map((f, i) => `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${y(f.calls).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0) - y(f.calls)).toFixed(1)}" class="${f.calls > budget ? 'bar over' : 'bar'}"><title>${(f.t / 1000).toFixed(0)} s: ${f.calls} calls, ${Math.round(f.triangles / 1000)}k triangles</title></rect>`).join('');
  const last = frames[frames.length - 1].t / 1000;
  return `<figure class="chart">
  <figcaption>${screen === 'phone' ? 'Phone' : 'Computer'}: draw calls every 2 s of the race (budget ${budget})</figcaption>
  <div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${screen} draw calls through the race">
    <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}" class="axis"/>
    <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(budget).toFixed(1)}" y2="${y(budget).toFixed(1)}" class="budget"/>
    <text x="${pad.l - 6}" y="${(y(budget) + 4).toFixed(1)}" class="tick" text-anchor="end">${budget}</text>
    <text x="${pad.l - 6}" y="${y(0) + 4}" class="tick" text-anchor="end">0</text>
    ${bars}
    <text x="${pad.l}" y="${H - 6}" class="tick">GO</text>
    <text x="${W - pad.r}" y="${H - 6}" class="tick" text-anchor="end">${last.toFixed(0)} s</text>
  </svg></div>
</figure>`;
}

function renderReport(report, track) {
  const lines = report.lines;
  const failed = lines.filter((l) => l.pass === false);
  const passed = lines.filter((l) => l.pass === true);
  const date = new Date(report.at).toISOString().slice(0, 16).replace('T', ' ');
  const kit = Boolean(track.physics.kit);
  const parts = PARTS.map((part) => {
    const rows = lines.filter((l) => l.part === part);
    if (!rows.length) return '';
    const bad = rows.filter((l) => l.pass === false).length;
    return `<section class="part" id="${part.toLowerCase().replace(/[^a-z]+/g, '-')}">
  <h2>${esc(part)} <span class="count ${bad ? 'bad' : 'good'}">${bad ? `${bad} to fix` : 'all clear'}</span></h2>
  <div class="table-scroll"><table>
    <thead><tr><th>Check</th><th>Result</th><th>Target</th><th></th></tr></thead>
    <tbody>${rows.map((l) => `<tr class="${l.pass === false ? 'is-fail' : ''}"><td>${esc(l.what)}</td><td class="num">${esc(l.value)}</td><td class="target">${esc(l.target)}</td><td>${mark(l.pass)}</td></tr>`).join('')}</tbody>
  </table></div>
</section>`;
  }).join('\n');
  const shots = [...(report.shots ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((s) => `<figure class="shot${s.phone ? ' phone' : ''}">
  <img src="${esc(s.name)}.png" alt="${esc(s.title)}">
  <figcaption><span>${esc(s.title)}</span><span class="num">${s.calls} calls · ${Math.round(s.triangles / 1000)}k tri</span></figcaption>
</figure>`).join('\n');

  return `<title>${esc(report.name)} Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  /* Layout: a steward's inspection sheet. Verdict first, then one ruled table per part, then the pictures. */
  :root {
    --bg: #f3f6f9; --paper: #ffffff; --ink: #14202e; --muted: #5b6b7d; --rule: #d6dee7;
    --accent: #1f5fa8; --pass: #1d7a4c; --pass-bg: #e1f2e8; --fail: #b4232c; --fail-bg: #fbe3e4; --info: #5b6b7d; --info-bg: #e8edf2;
    --display: "Barlow Semi Condensed", "Arial Narrow", sans-serif;
    --body: "IBM Plex Sans", system-ui, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, monospace;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --bg: #0e151d; --paper: #151f2a; --ink: #e4ebf2; --muted: #93a3b5; --rule: #2a3847;
    --accent: #6fa8e8; --pass: #5fd09a; --pass-bg: #163526; --fail: #ff8088; --fail-bg: #3b1a1e; --info: #93a3b5; --info-bg: #1f2b38; color-scheme: dark } }
  :root[data-theme="dark"] {
    --bg: #0e151d; --paper: #151f2a; --ink: #e4ebf2; --muted: #93a3b5; --rule: #2a3847;
    --accent: #6fa8e8; --pass: #5fd09a; --pass-bg: #163526; --fail: #ff8088; --fail-bg: #3b1a1e; --info: #93a3b5; --info-bg: #1f2b38; color-scheme: dark }
  body { background: var(--bg); color: var(--ink); font: 15px/1.5 var(--body); }
  .wrap { max-width: 1080px; margin: 0 auto; padding-inline: 20px; padding-block: 28px 56px; display: grid; gap: 28px; }
  header { display: grid; gap: 14px; }
  .eyebrow { font: 500 12px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  h1 { font: 700 clamp(30px, 5vw, 44px)/1.05 var(--display); margin: 0; text-wrap: balance; }
  .verdict { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .pill { font: 600 14px var(--body); padding: 6px 12px; border-radius: 999px; }
  .pill.fail { background: var(--fail-bg); color: var(--fail); }
  .pill.pass { background: var(--pass-bg); color: var(--pass); }
  .meta { color: var(--muted); font-size: 13px; }
  .lines { display: grid; gap: 8px; background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; padding: 14px 16px; }
  .lines div { display: grid; grid-template-columns: 9.5em 1fr; gap: 12px; min-width: 0; }
  .lines dt { color: var(--muted); font-size: 13px; }
  .lines code { font: 13px var(--mono); overflow-wrap: anywhere; }
  .todo { background: var(--fail-bg); border-radius: 8px; padding: 12px 16px; }
  .todo h2 { font: 700 18px var(--display); margin: 0 0 6px; color: var(--fail); }
  .todo ul { margin: 0; padding-left: 18px; }
  .part h2 { font: 700 22px var(--display); margin: 0 0 8px; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
  .count { font: 500 12px var(--mono); letter-spacing: .04em; text-transform: uppercase; }
  .count.good { color: var(--pass); } .count.bad { color: var(--fail); }
  .table-scroll { overflow-x: auto; background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; min-width: 640px; }
  th { text-align: left; font: 500 11px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 10px 12px; border-bottom: 1px solid var(--rule); }
  td { padding: 10px 12px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  tr.is-fail td:first-child { box-shadow: inset 3px 0 0 var(--fail); }
  .num { font: 13px var(--mono); font-variant-numeric: tabular-nums; }
  .target { color: var(--muted); font-size: 13px; }
  .mark { font: 600 11px var(--mono); letter-spacing: .05em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }
  .mark.pass { background: var(--pass-bg); color: var(--pass); }
  .mark.fail { background: var(--fail-bg); color: var(--fail); }
  .mark.info { background: var(--info-bg); color: var(--info); }
  .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .chart { margin: 0; background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; padding: 12px; min-width: 0; }
  .chart figcaption { font-size: 13px; color: var(--muted); margin-bottom: 6px; }
  .chart-scroll { overflow-x: auto; }
  .chart svg { width: 100%; min-width: 300px; height: auto; display: block; }
  .bar { fill: var(--accent); } .bar.over { fill: var(--fail); }
  .axis { stroke: var(--rule); } .budget { stroke: var(--fail); stroke-dasharray: 4 3; }
  .tick { fill: var(--muted); font: 10px var(--mono); }
  .shots h2 { font: 700 22px var(--display); margin: 0 0 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  .shot { margin: 0; background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; }
  .shot img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--info-bg); }
  .shot.phone img { aspect-ratio: 16 / 9; object-fit: contain; }
  .shot figcaption { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 8px 10px; font-size: 13px; }
  .shot figcaption .num { color: var(--muted); }
  footer { color: var(--muted); font-size: 12px; }
  @media (max-width: 520px) { .lines div { grid-template-columns: 1fr; gap: 2px; } }
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">Track report · ${kit ? 'kit track' : 'hand-built track'} · ${esc(date)} UTC</div>
    <h1>${esc(report.name)}</h1>
    <div class="verdict">
      ${failed.length ? `<span class="pill fail">${failed.length} to fix</span>` : '<span class="pill pass">Ready for your review</span>'}
      <span class="pill pass">${passed.length} passed</span>
      <span class="meta">${report.batches} batches of ${report.races.toLocaleString('en')} races · ${report.minutes} min</span>
    </div>
    <dl class="lines">
      <div><dt>Preview link</dt><dd><code>/preview/physics?track=${esc(report.slug)}</code></dd></div>
      <div><dt>Switch on</dt><dd><code>UPDATE tracks SET is_active = true WHERE slug = '${esc(report.slug)}';</code></dd></div>
      <div><dt>Track file</dt><dd><code>src/tracks/${esc(report.slug)}.js</code></dd></div>
    </dl>
    ${failed.length ? `<div class="todo"><h2>To fix before it goes live</h2><ul>${failed.map((l) => `<li><strong>${esc(l.part)}:</strong> ${esc(l.what)}: ${esc(l.value)} (target ${esc(l.target)})</li>`).join('')}</ul></div>` : ''}
  </header>
${parts}
  ${report.load ? `<section class="charts">${loadChart(report.load.computer, 'computer')}${loadChart(report.load.phone, 'phone')}</section>` : ''}
  ${shots ? `<section class="shots"><h2>Screenshots</h2><div class="grid">${shots}</div></section>` : ''}
  <footer>Drawing load and screenshots come from a headless browser with no graphics chip: its frame rate means nothing, so smoothness on a real phone is checked on the preview link with the frame meter.</footer>
</div>
`;
}

module.exports = { renderReport };
