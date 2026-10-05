// The real tracks, read straight from the seed SQL and data updates.
import fs from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve(__dirname, '../../../docs');
const ROW = /\('([a-z-]+)',\s*'[^']*',\s*(?:'[^']*',\s*)?'(easy|medium|hard|extreme)',\s*(\d+),\s*(\d+),\s*(?:'(?:[^']|'')*',\s*)?'(\[[^']*\])',\s*'(\[[^']*\])'/g;

export function realTracks() {
  const text = [path.join(DOCS, 'database_schema.sql'), ...fs.readdirSync(path.join(DOCS, 'data_updates')).map((f) => path.join(DOCS, 'data_updates', f))]
    .map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const tracks = new Map();
  for (const m of text.matchAll(ROW)) {
    tracks.set(m[1], { slug: m[1], difficulty: m[2], length_m: Number(m[3]), lane_count: Number(m[4]), waypoints: JSON.parse(m[5]), obstacles: JSON.parse(m[6]) });
  }
  return [...tracks.values()];
}
