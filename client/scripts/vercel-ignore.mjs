// Vercel's "Ignored Build Step" for the website (client/vercel.json ignoreCommand; Moses, 28 Oct 2026:
// deployment storage filled up). Exit 0 = skip this build, exit 1 = build. When in doubt it builds.
//
//   - Branches: only Main (the live site) and leagues-pro (Leagues part 2 previews) build. Work
//     branches (leagues-v1 mirrors Main, flyover-…, peaks-wip…) never make preview deployments.
//   - The same commit again (a Redeploy, or a Deploy Hook on an unchanged branch): always builds.
//   - FORCED windows (below): always builds, whatever changed. The season-start Deploy Hook on
//     1 Dec 2026 must rebuild even if only docs changed since the last build (the holiday tracks
//     come from the server, not from a commit).
//   - Otherwise it builds only if something the website is built from changed since the last
//     deployment that built (VERCEL_GIT_PREVIOUS_SHA): client/ except its tests, review reports,
//     the Android and iPhone projects and Markdown. Docs, server code (src/), server tests and data
//     updates never change the website (the website build reads nothing outside client/).
import { execFileSync } from 'node:child_process';

export const BRANCHES = ['Main', 'leagues-pro'];
export const FORCED = [
  { from: '2026-11-30T22:30:00Z', to: '2026-12-01T03:00:00Z', why: 'the season-start rebuild (1 Dec 2026, holiday tracks)' },
];
/** Changed files that never change the website. */
export const NOT_WEBSITE = [
  /^client\/test\//, /^client\/report\//, /^client\/android\//, /^client\/ios\//,
  /\.md$/i, /^client\/scripts\/(app-|android-|ios-)/, /^client\/capacitor\.config\.json$/, /^client\/app-version\.json$/,
];
export const affectsWebsite = (file) => file.startsWith('client/') && !NOT_WEBSITE.some((re) => re.test(file));

/** → [build?, why]. `changed`: () → the changed files since the last build, or null if unknown. */
export function decide({ ref, sha, prev, now = new Date(), changed }) {
  if (!BRANCHES.includes(ref)) return [false, `branch ${ref}: previews only for ${BRANCHES.join(' and ')}`];
  const forced = FORCED.find((w) => now >= new Date(w.from) && now < new Date(w.to));
  if (forced) return [true, `forced: ${forced.why}`];
  if (!prev) return [true, 'no previous build to compare with'];
  if (prev === sha) return [true, 'the same commit again (Redeploy or Deploy Hook)'];
  const files = changed();
  if (!files) return [true, 'could not compare with the previous build'];
  const site = files.filter(affectsWebsite);
  if (site.length) return [true, `${site.length} website file(s) changed, e.g. ${site.slice(0, 3).join(', ')}`];
  return [false, `only ${files.length} file(s) the website isn't built from (docs, server, tests, reports)`];
}

function gitChanged(prev, sha) {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    try { git('cat-file', '-e', `${prev}^{commit}`); } catch { git('fetch', '--quiet', '--depth=200', 'origin', prev); }
    // (From the repository root: names relative to it, client/…)
    return git('-C', git('rev-parse', '--show-toplevel').trim(), 'diff', '--name-only', prev, sha).split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const env = process.env;
  const sha = env.VERCEL_GIT_COMMIT_SHA || 'HEAD';
  const prev = env.VERCEL_GIT_PREVIOUS_SHA || '';
  const [build, why] = decide({ ref: env.VERCEL_GIT_COMMIT_REF || '', sha, prev, changed: () => gitChanged(prev, sha) });
  console.log(`[ignored build step] ${build ? 'BUILD' : 'SKIP'}: ${why}`);
  process.exit(build ? 1 : 0);
}
