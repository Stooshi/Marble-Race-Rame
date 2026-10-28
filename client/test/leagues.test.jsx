// Leagues on the website (Leagues v1 part 1, 27 Oct 2026): behind the server's LEAGUES switch, the
// fourth yellow button, the My leagues card, the pages, "New best!" on a league race's result, and the
// texts (never a frequency, dates or prizes for the Major League; with Pro off no credits).
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GO_PRO, lapTime, timeLeft, triesText } from '../src/site/leagues/status';
import { LeagueList, LeagueWelcome, LeaguesSoon } from '../src/site/leagues/LeaguesPages';
import { metaFor } from '../src/site/pageMeta';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const PAGES = src('src/site/leagues/LeaguesPages.jsx');
const STATUS = src('src/site/leagues/status.js');

describe('leagues: small helpers', () => {
  it('time left by the server\'s clock, then Ended', () => {
    const now = Date.UTC(2026, 9, 27, 12, 0);
    expect(timeLeft(new Date(now + 9 * 60000 - 1).toISOString(), now)).toBe('9 min left');
    expect(timeLeft(new Date(now + (3 * 60 + 12) * 60000).toISOString(), now)).toBe('3 h 12 min left');
    expect(timeLeft(new Date(now + (2 * 24 + 4) * 3600000).toISOString(), now)).toBe('2 days 4 h left');
    expect(timeLeft(new Date(now + 24 * 3600000).toISOString(), now)).toBe('1 day left');
    expect(timeLeft(new Date(now - 1).toISOString(), now)).toBe('Ended');
    // (skew: this device's clock 5 minutes behind the server's)
    expect(timeLeft(new Date(now + 10 * 60000).toISOString(), now, 5 * 60000)).toBe('5 min left');
  });
  it('times and tries', () => {
    expect(lapTime(52310)).toBe('52.31 s');
    expect(lapTime(61020)).toBe('1:01.02');
    expect(lapTime(269150)).toBe('4:29.15');
    expect(lapTime(null)).toBe('—');
    expect(triesText(null)).toBe('Unlimited tries');
    expect(triesText(5)).toBe('5 tries per track');
  });
});

describe('leagues: behind the switch', () => {
  it('the site asks the server (GET /api/leagues/status); an older server (404) means off', () => {
    expect(STATUS).toContain('api.leaguesStatus().catch(() => ({ enabled: false }))');
    expect(src('src/api/client.js')).toContain("leaguesStatus: () => request('/leagues/status')");
  });
  it('off: /leagues and /leagues/new are the 404, an invite link "Leagues are coming soon", and nothing else shows', () => {
    expect(PAGES).toContain('return on ? children : <Closed />;');
    for (const page of ['LeaguesHome', 'CreateLeague']) expect(PAGES).toContain(`export function ${page}({ NotFound }) {\n  return <Gate NotFound={NotFound}>`);
    expect(PAGES).toContain('export function LeaguePage({ NotFound }) {\n  return <Gate NotFound={NotFound} Closed={LeaguesSoon}>');
    const soon = renderToString(<MemoryRouter><LeaguesSoon /></MemoryRouter>);
    expect(soon).toContain('Leagues are coming soon');
    expect(soon).toContain('href="/race"');
    expect(soon).not.toMatch(/404|not found/i);
    const hub = src('src/site/pages/HomeHub.jsx');
    expect(hub).toContain('{leaguesOn && <Link to="/leagues" className="ms-race-choice ms-race-leagues"><b>LEAGUES</b><span>Race your friends all week</span></Link>}');
    expect(hub).toContain('<MyLeaguesCard />');
    expect(PAGES).toContain('if (!on || !open.length) return null;');
    expect(src('src/site/pages/RaceFlow.jsx')).toContain('{leaguesOn && <Link to="/leagues/new" className="ms-league-link">Or start a league');
    const app = src('src/App.jsx');
    for (const r of ['"/leagues"', '"/leagues/new"', '"/l/:code"']) expect(app).toContain(`<Route path=${r}`);
  });
  it('league pages stay out of search results', () => {
    for (const p of ['/leagues', '/leagues/new', '/l/K7QF2M']) expect(metaFor(p).noindex).toBe(true);
  });
});

describe('leagues: the pages', () => {
  it('My leagues: time left, players, my place or tracks done', () => {
    const html = renderToString(
      <MemoryRouter>
        <LeagueList leagues={[
          { code: 'AB12CD', name: 'Office Cup', status: 'open', ends_at: new Date(Date.now() + 3 * 3600000 - 30000).toISOString(), players: 4, place: 2, done: 5, tracks: 5 },
          { code: 'EF34GH', name: 'Family', status: 'open', ends_at: new Date(Date.now() + 26 * 3600000 + 30000).toISOString(), players: 1, place: null, done: 3, tracks: 5 },
          { code: 'JK56LM', name: 'Last time', status: 'ended', ends_at: new Date(Date.now() - 3600000).toISOString(), players: 6, place: 1, done: 5, tracks: 5 },
        ]} />
      </MemoryRouter>,
    );
    expect(html).toContain('href="/l/AB12CD"');
    expect(html).toContain('3 h left');
    expect(html).toContain('4<!-- --> <!-- -->players');
    expect(html).toContain('2nd');
    expect(html).toContain('3<!-- --> of <!-- -->5');
    expect(html).toContain('1<!-- --> <!-- -->player<');
    expect(html).toContain('Final standings');
    expect(html).toContain('you finished');
  });
  it('create: 5 different tracks, 1–7 days, unlimited/3/5/10 tries; holiday tracks only for pass holders', () => {
    expect(PAGES).toContain('const DAYS = [1, 2, 3, 4, 5, 6, 7];');
    expect(PAGES).toContain("const TRIES = [[null, 'Unlimited'], [3, '3'], [5, '5'], [10, '10']];");
    expect(PAGES).toContain("api.createLeague({ name: name.trim(), track_ids: picked, days, attempts: tries, ...(isPro && { kind: 'pro' }) })");
    expect(PAGES).toContain("disabled={busy || !nameOk || picked.length !== TRACKS || (isPro && !wallet)}");
    // (A season track locked for this player can't be picked: the server refuses it too.)
    expect(PAGES).toContain('disabled={(t.locked && !on) || (full && !on)}');
    expect(PAGES).toContain("'Season pass holders only'");
    expect(PAGES).toContain('<b>League</b><span>5 tracks · free · for fun</span>');
  });
  it('saved accounts only: a guest saves their marble, a visitor saves one or logs in and comes back', () => {
    expect(PAGES).toContain("<SaveFirst next={`/l/${code}?join=1`} onSaved={joinNow}");
    expect(PAGES).toContain('<QuickSignup heading="h3"');
    expect(PAGES).toContain('to={`/signup?mode=login&next=${encodeURIComponent(next)}`}');
  });
  it('a league race: started from the league, then the start show (?go=1); the next try from the league too', () => {
    expect(PAGES).toContain('const { race: r } = await api.leagueRace(code, trackId);');
    expect(PAGES).toContain('navigate(`/race/${r.id}?go=1`);');
    const next = src('src/components/NextRace.jsx');
    expect(next).toContain('{leagueCode ? <LeagueNext raceId={raceId} code={leagueCode} />');
    expect(next).toContain('<strong>New best!</strong>');
    expect(next).toContain('const { race } = await api.leagueRace(code, trackId);');
    expect(next).toContain('to={`/l/${code}`}');
    expect(src('src/pages/Race.jsx')).toContain('leagueCode={race?.league_code ?? null}');
  });
  it('the creator: add by name, remove (two taps, no browser dialogs), Run again once it has ended', () => {
    expect(PAGES).toContain("api.leagueAdd(code, name)");
    expect(PAGES).toContain("api.leagueRemove(code, r.user_id)");
    expect(PAGES).toContain("{sure ? 'Remove for good?' : 'Remove'}");
    expect(PAGES).toContain('disabled={Boolean(busy) || (isPro && !status?.pro)} onClick={again}>');
    expect(PAGES).not.toMatch(/window\.(confirm|alert|prompt)\(/);
  });
});

describe('leagues: the texts', () => {
  it('never a frequency, dates or prizes for the Major League; Pro and credits only behind LEAGUES_PRO', () => {
    const PRO = src('src/site/leagues/Pro.jsx');
    const texts = [PAGES, STATUS, PRO, src('src/components/NextRace.jsx')].join('\n');
    for (const word of [/weekly/i, /monthly/i, /every week/i, /every month/i, /prize/i]) expect(texts).not.toMatch(word);
    expect(GO_PRO).toBe('Pro Leagues are coming. Race your way to the Marble Spins Major League. Date to be announced.');
    // (Credits and Pro are drawn only when the server says Pro is open to this player: status.pro.)
    expect(PAGES).toContain('const pro = Boolean(status?.pro);');
    expect(PAGES).toContain('{pro ? GO_PRO_ON : GO_PRO}');
    expect(PRO).toContain("if (!status?.pro) return NotFound ? <NotFound /> : null;");
    expect(src('src/site/account/NameChip.jsx')).toContain("{pro && <Link to=\"/wallet\"");
    expect(src('src/components/NextRace.jsx')).not.toMatch(/credit/i);
  });
});

describe('an invite link: the welcome', () => {
  const now = Date.UTC(2026, 9, 27, 18, 0);
  const view = {
    league: { code: 'K7QF2M', name: 'Friday Spins', status: 'open', ends_at: new Date(now + (2 * 24 + 3) * 3600_000).toISOString(), attempts: 3, creator: { id: 'a', name: 'Nia' } },
    tracks: ['meadow-loop', 'are-run', 'bobsleigh-run', 'san-francisco', 'table-mountain-run'].map((slug, k) => ({ id: `t${k}`, slug, name: `Track ${k + 1}` })),
    scoreboard: [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }],
    member: false,
  };
  const page = (props) => renderToString(<MemoryRouter><LeagueWelcome view={view} code="K7QF2M" now={now} skew={0} onJoin={() => {}} onPeek={() => {}} {...props} /></MemoryRouter>);
  it('who invited you to which league, its 5 tracks, when it ends, players, tries, one big button', () => {
    const html = page({ saved: true });
    expect(html).toContain('Nia<!-- --> has invited you to join <span class="ms-league-welcome__name">Friday Spins</span>');
    expect(html.match(/ms-league-welcome__pic/g)).toHaveLength(5);
    for (let k = 1; k <= 5; k += 1) expect(html).toContain(`Track ${k}`);
    expect(html).toMatch(/Ends <!-- -->[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}, \d{2}:\d{2}/);
    expect(html).toContain('2 days 3 h left');
    expect(html).toMatch(/3<!-- --> <!-- -->players/);
    expect(html).toContain('3 tries per track');
    expect(html.match(/JOIN AND START RACING/g)).toHaveLength(1);
    expect(html).not.toContain('saved account');
  });
  it('a guest or visitor: one line that leagues need a saved account (free)', () => {
    const html = page({ saved: false });
    expect(html).toContain('Leagues need a saved account, so your times keep your name. It&#x27;s free.');
    expect(html).toContain('JOIN AND START RACING');
  });
  it('the page: a member skips it; a guest saves and joins, a visitor may log in and come back joined, track 1 ready', () => {
    expect(PAGES).toContain('if (!member && isOpen && !peek) {');
    expect(PAGES).toContain('onSaved={() => onJoin()}');
    expect(PAGES).toContain('const back = `/l/${code}?join=1`;');
    expect(PAGES).toContain("else if (saved && view.league.status === 'open') joinNow();");
    expect(PAGES).toContain("setSearch({ joined: '1' }, { replace: true });");
    expect(PAGES).toContain("'RACE TRACK 1'");
  });
});

describe('League Night on the website', () => {
  it('the creator sets it (date, time, 3–5 races) inside the league; everyone joins the league room', () => {
    expect(PAGES).toContain('const NIGHT_RACES = [3, 4, 5];');
    expect(PAGES).toContain('api.leagueNight(code, new Date(when).toISOString(), races)');
    expect(PAGES).toContain('api.leagueNightOff(code)');
    expect(PAGES).toContain('<Link to={`/r/${n.room_code}`} className="ms-btn ms-btn--primary ms-btn--lg">JOIN THE LEAGUE ROOM</Link>');
    expect(PAGES).toContain('It never uses your tries.');
    expect(src('src/api/client.js')).toContain("leagueNight: (code, startsAt, races) => request(`/leagues/${encodeURIComponent(code)}/night`");
  });
  it('the League Night button by the header, and "Start it now" for the creator', () => {
    expect(PAGES).toContain('<NightButton night={view.night} member={member} mine={mine} isOpen={isOpen} skew={skew} now={now} />');
    expect(PAGES).toContain('JOIN LEAGUE NIGHT</Link>');
    expect(PAGES).toContain('api.leagueNightNow(code, races)');
    expect(src('src/api/client.js')).toContain("body: { now: true, races }");
  });
  it('the scoreboards name each track (not 1–5, R1–R5)', () => {
    expect(PAGES).toContain('<span>{t.name}</span></th>');
    expect(PAGES).toContain("<span>{trackName(r.track_id) || `Race ${r.k}`}</span></th>");
    expect(PAGES).not.toContain('>R{r.k}</th>');
    expect(PAGES).not.toContain('>{k + 1}</th>');
  });
  it('"League Night in 2 h: Join" on My leagues', async () => {
    const { nightLine } = await import('../src/site/leagues/LeaguesPages');
    const now = Date.UTC(2026, 9, 29, 18, 0);
    expect(nightLine({ status: 'scheduled', starts_at: new Date(now + 2 * 3600_000).toISOString() }, 0, now)).toBe('League Night in 2 h');
    expect(nightLine({ status: 'scheduled', starts_at: new Date(now + 10 * 60_000).toISOString() }, 0, now)).toBe('League Night in 10 min: Join');
    expect(nightLine({ status: 'open', starts_at: new Date(now).toISOString() }, 0, now)).toBe('League Night is on: Join');
    expect(nightLine({ status: 'scheduled', starts_at: new Date(now + 3 * 86_400_000).toISOString() }, 0, now)).toMatch(/^League Night [A-Z][a-z]{2} \d/);
  });
  it('the league room: the league\'s players only, its races in order by themselves (no track, privacy or timer for the host)', () => {
    const room = src('src/site/pages/RoomPage.jsx');
    expect(room).toContain("{night ? 'League Night' : quick ? 'Quick race'");
    expect(room).toContain('{open && me?.isHost && !night && (');
    expect(room).toContain('{open && waiting && me?.isHost && !night && (');
    expect(room).toContain("error.details?.code === 'league_only'");
  });
});

describe('renaming a league', () => {
  it('a pencil next to the name for the creator only, the player-name filter, the server checks it again', () => {
    expect(PAGES).toContain('{mine\n            ? <LeagueName code={code} name={league.name} onView={setView} />');
    expect(PAGES).toContain('aria-label="Rename the league"');
    expect(PAGES).toContain("checkName(tidy) ? NAME_NOT_ALLOWED : null");
    expect(PAGES).toContain('onView(await api.renameLeague(code, tidy))');
    // (Creating one: the same filter.)
    expect(PAGES).toContain('&& !checkName(name.trim())');
    expect(src('src/api/client.js')).toContain("renameLeague: (code, name) => request(`/leagues/${encodeURIComponent(code)}`, { method: 'PATCH', body: { name } })");
  });
});
