/**
 * The front matter of a hub article (the block between the two `---` lines at the top of its .md
 * file): a small YAML subset, enough for the article fields. Scalars (`key: value`, optionally
 * quoted) and one level of lists of maps:
 *
 *   sources:
 *     - title: Marble (toy)
 *       url: https://www.britannica.com/topic/marble-toy
 *       used_for: game families
 *
 * Returns { data, body }. A file without front matter gives { data: {}, body: the whole text }.
 */
const unquote = (v) => {
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
};

export function parseFrontMatter(text) {
  const src = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  const data = {};
  let list = null; // the list being filled (key: followed by "- " lines)
  let item = null;
  for (const raw of m[1].split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const dash = /^\s+-\s+(.*)$/.exec(raw);
    if (dash && list) {
      item = {};
      list.push(item);
      const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(dash[1]);
      if (kv) item[kv[1]] = unquote(kv[2]);
      else { list[list.length - 1] = unquote(dash[1]); item = null; }
      continue;
    }
    const nested = /^\s+([A-Za-z_][\w-]*):\s*(.*)$/.exec(raw);
    if (nested && item) { item[nested[1]] = unquote(nested[2]); continue; }
    const top = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(raw);
    if (top) {
      if (top[2].trim() === '') { list = []; item = null; data[top[1]] = list; } else { data[top[1]] = unquote(top[2]); list = null; item = null; }
    }
  }
  return { data, body: src.slice(m[0].length) };
}
