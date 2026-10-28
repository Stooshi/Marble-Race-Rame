'use strict';

// Pro Leagues (Leagues part 2, 28 Oct 2026; src/leagues, src/credits, src/routes/credits.js): 10 tracks,
// paid by the creator only (2 credits or the Pro pass), members free, Run again pays again, the
// 3-ranked-players rule, the league marble once with League wins counting, league_results for Pro only,
// credit packs (the test provider, as Stripe test mode would), the one-way swap. Against a real
// database when ROOMS_TEST_DATABASE_URL is set; the rules that need none run always.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const leagues = require('../src/leagues');
const catalog = require('../src/marbles/catalog');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the Pro rules in the code: 10 tracks, 3 ranked players for the marble, the league marble never sold', () => {
  assert.equal(leagues.PRO_TRACKS, 10);
  assert.equal(leagues.MIN_RANKED, 3);
  assert.equal(leagues.tracksFor('pro'), 10);
  assert.equal(leagues.tracksFor('league'), 5);
  const m = catalog.leagueMarble();
  assert.equal(m.slug, 'racing-stripes-pro');
  assert.equal(m.id, 'LG011');
  assert.equal(m.kind, 'league');
  assert.equal(m.price.coins, null);
  assert.equal(catalog.saleState(m), 'league-only');
  // Only Pro Leagues write league_results and feed the Major League.
  const lib = read('src/leagues/index.js');
  assert.match(lib, /if \(league\.kind === 'pro'\) await endPro\(client/);
  assert.match(lib, /\$8::varchar = 'pro'\)/); // (feeds_major: true for a Pro League only)
  assert.match(read('src/leagues/night.js'), /if \(league\?\.kind !== 'pro'\) return 0;/);
  // The creator pays, never a member; join has no payment.
  const join = lib.slice(lib.indexOf('async function join('), lib.indexOf('async function triesUsed'));
  assert.doesNotMatch(join, /credits|spend/);
});

test('a Pro League from credits to the league marble', { skip: !DB }, async () => {
  process.env.LEAGUES = 'on';
  process.env.LEAGUES_PRO = 'on';
  process.env.PAYMENTS_TEST = 'true';
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const raceManager = require('../src/game/raceManager');
  const raceService = require('../src/game/raceService');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const register = async (name) => (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
  const stamp = Date.now().toString(36).slice(-5);
  let woken = [];
  try {
    const [a, b, c, d] = [await register(`pA${stamp}`), await register(`pB${stamp}`), await register(`pC${stamp}`), await register(`pD${stamp}`)];
    // (A small test database may have fewer than 10 active tracks: some switched on for this test, off again after.)
    const { rows: woke } = await db.query(
      `UPDATE tracks SET is_active = true WHERE id IN (
         SELECT id FROM tracks WHERE NOT is_active AND season_key IS NULL ORDER BY slug
          LIMIT GREATEST(0, 10 - (SELECT COUNT(*) FROM tracks WHERE is_active AND season_key IS NULL))) RETURNING id`,
    );
    woken = woke.map((t) => t.id);
    const { rows: tracks } = await db.query('SELECT id FROM tracks WHERE is_active AND season_key IS NULL ORDER BY physics IS NULL, slug LIMIT 10');
    assert.equal(tracks.length, 10, 'ten active tracks in the test database');
    const ten = tracks.map((t) => t.id);

    // Off: no credits, no Pro.
    process.env.LEAGUES_PRO = 'off';
    assert.equal((await call('/leagues/status', { token: a.token })).body.pro, false);
    assert.equal((await call('/credits', { token: a.token })).status, 404);
    assert.equal((await call('/leagues', { method: 'POST', token: a.token, body: { kind: 'pro', name: 'Pros', track_ids: ten, days: 3 } })).status, 404);
    assert.equal((await call('/payments/checkout', { method: 'POST', token: a.token, body: { productId: 'credits-10', provider: 'test', consent: true } })).status, 404);
    process.env.LEAGUES_PRO = 'on';
    const status = (await call('/leagues/status', { token: a.token })).body;
    assert.equal(status.pro, true);
    assert.deepEqual(status.prices, { proLeague: 2, proPass: 5, passDays: 30, swapRate: 1000 });

    // Not enough credits: 402, nothing created.
    const broke = await call('/leagues', { method: 'POST', token: a.token, body: { kind: 'pro', name: 'Friday Pros', track_ids: ten, days: 3 } });
    assert.equal(broke.status, 402);
    assert.equal(broke.body.details.code, 'not_enough_credits');
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM leagues WHERE created_by = $1", [a.user.id])).rows[0].n, 0);

    // A credit pack (the test provider: paid at once), the consent stored with it.
    assert.equal((await call('/payments/checkout', { method: 'POST', token: a.token, body: { productId: 'credits-10', provider: 'test' } })).status, 400); // (no consent)
    const bought = await call('/payments/checkout', { method: 'POST', token: a.token, body: { productId: 'credits-10', provider: 'test', consent: true } });
    assert.equal(bought.status, 200, JSON.stringify(bought.body));
    assert.equal(bought.body.credits, 10);
    const { rows: [pay] } = await db.query("SELECT * FROM payments WHERE user_id = $1 AND product_id = 'credits-10'", [a.user.id]);
    assert.equal(pay.coins, 0);
    assert.equal(pay.credit_amount, 10);
    assert.match(pay.consent_text, /credits delivered right away/);
    const coinsBefore = (await db.query('SELECT coins FROM users WHERE id = $1', [a.user.id])).rows[0].coins;
    let wallet = (await call('/credits', { token: a.token })).body;
    assert.equal(wallet.balance, 10);
    assert.equal(wallet.coins, coinsBefore);
    assert.deepEqual(wallet.packs.map((p) => p.id), ['credits-5', 'credits-10', 'credits-25']);
    assert.equal(wallet.lines[0].kind, 'credit-pack');
    assert.equal(wallet.lines[0].order_no, pay.order_no);

    // Create: 10 tracks; 2 credits from the creator.
    assert.equal((await call('/leagues', { method: 'POST', token: a.token, body: { kind: 'pro', name: 'Friday Pros', track_ids: ten.slice(0, 5), days: 3 } })).status, 400);
    const made = await call('/leagues', { method: 'POST', token: a.token, body: { kind: 'pro', name: 'Friday Pros', track_ids: ten, days: 3, attempts: 5 } });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    assert.equal(made.body.league.kind, 'pro');
    assert.equal(made.body.league.paid_with, 'credits');
    assert.equal(made.body.tracks.length, 10);
    const { code } = made.body.league;
    const { rows: [lg] } = await db.query('SELECT * FROM leagues WHERE code = $1', [code]);
    assert.equal(lg.feeds_major, true);
    assert.equal((await call('/credits', { token: a.token })).body.balance, 8);

    // Members join free.
    for (const who of [b, c, d]) assert.equal((await call(`/leagues/${code}/join`, { method: 'POST', token: who.token })).status, 200);
    for (const who of [b, c, d]) assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM credit_ledger WHERE user_id = $1', [who.user.id])).rows[0].n, 0);

    // The Pro pass (5 credits, confirmed): the next Pro League costs nothing; a second pass is queued.
    assert.equal((await call('/credits/pass', { method: 'POST', token: a.token, body: {} })).status, 400);
    const passed = await call('/credits/pass', { method: 'POST', token: a.token, body: { confirm: true } });
    assert.equal(passed.status, 200, JSON.stringify(passed.body));
    assert.equal(passed.body.balance, 3);
    assert.ok(passed.body.pass);
    const free = await call('/leagues', { method: 'POST', token: a.token, body: { kind: 'pro', name: 'Saturday Pros', track_ids: ten, days: 1 } });
    assert.equal(free.status, 201);
    assert.equal(free.body.league.paid_with, 'pass');
    assert.equal((await call('/credits', { token: a.token })).body.balance, 3);

    // The swap: one way, confirmed, 1,000 coins a credit.
    assert.equal((await call('/credits/swap', { method: 'POST', token: a.token, body: { credits: 1 } })).status, 400);
    wallet = (await call('/credits/swap', { method: 'POST', token: a.token, body: { credits: 1, confirm: true } })).body;
    assert.equal(wallet.balance, 2);
    assert.equal(wallet.coins, coinsBefore + 1000);

    // Times: A, B and C finish all 10 tracks (A fastest), D only 6. One real league race, then the
    // rest of the runs written straight on it (the scoreboard counts runs of races made before the end).
    const r = await call(`/leagues/${code}/race`, { method: 'POST', token: a.token, body: { track_id: ten[0] } });
    assert.equal(r.status, 201);
    await raceManager.start(r.body.race.id, { id: a.user.id, role: 'player' });
    raceManager.stop(r.body.race.id);
    await raceService.finalize(r.body.race.id);
    const raceId = r.body.race.id;
    // (Each run needs a race of its own: a copy of the real one; the scoreboard reads only the run's time.)
    const copyRace = async () => (await db.query(
      `INSERT INTO races (track_id, name, min_marbles, max_marbles, entry_fee_coins, fill_with_bots, created_by, tick_rate_hz, countdown_ms, status)
       SELECT track_id, name, min_marbles, max_marbles, 0, true, created_by, tick_rate_hz, countdown_ms, 'cancelled' FROM races WHERE id = $1 RETURNING id`,
      [raceId],
    )).rows[0].id;
    const run = async (leagueId, who, k, ms) => db.query('INSERT INTO league_runs (league_id, user_id, track_id, race_id, time_ms, finished_at) VALUES ($1, $2, $3, $4, $5, now())', [leagueId, who.user.id, ten[k], await copyRace(), ms]);
    const put = (who, k, ms) => run(lg.id, who, k, ms);
    for (let k = 0; k < 10; k += 1) { await put(a, k, 40_000); await put(b, k, 41_000); await put(c, k, 42_000); if (k < 6) await put(d, k, 39_000); }
    let view = (await call(`/leagues/${code}`, { token: b.token })).body;
    assert.equal(view.league.ranked, 3);
    assert.equal(view.league.min_ranked, 3);
    assert.equal(view.league.paid_with, undefined); // (only the creator sees how it was paid)
    assert.equal(view.scoreboard[0].user_id, a.user.id);

    // The end: A wins Racing Stripes; league_results one row per member, D's without a place.
    await db.query('UPDATE leagues SET ends_at = now() WHERE id = $1', [lg.id]);
    await db.query("UPDATE leagues SET ends_at = now() + interval '1 day' WHERE code = $1", [free.body.league.code]);
    assert.ok(await leagues.endDue(db, new Date(Date.now() + 1000)) >= 1);
    view = (await call(`/leagues/${code}`, { token: b.token })).body;
    assert.equal(view.league.status, 'ended');
    assert.equal(view.league.winner.id, a.user.id);
    assert.match(view.league.winner.marble_code, /^LG011-\d{6}$/);
    assert.equal(view.league.winner.league_wins, 1);
    const { rows: results } = await db.query('SELECT user_id, kind, place, ranked_humans, tracks_finished FROM league_results WHERE league_id = $1 ORDER BY place NULLS LAST', [lg.id]);
    assert.deepEqual(results.map((x) => [x.user_id, x.place, x.ranked_humans, x.tracks_finished]), [[a.user.id, 1, 3, 10], [b.user.id, 2, 3, 10], [c.user.id, 3, 3, 10], [d.user.id, null, 3, 6]]);
    assert.ok(results.every((x) => x.kind === 'challenge'));
    const bag = (await call('/collection/bag', { token: a.token })).body;
    assert.ok(JSON.stringify(bag).includes('racing-stripes-pro'), 'the marble is in the winner\'s bag');
    const cert = (await call(`/collection/certificate/${view.league.winner.marble_code}`)).body.certificate;
    assert.equal(cert.league.wins, 1);
    assert.equal(cert.league.firstWon.name, 'Friday Pros');
    // (Never sold.)
    assert.equal((await call('/collection/racing-stripes-pro/buy', { method: 'POST', token: b.token })).status, 409);

    // Run again pays again (the pass covers it here), and a second win adds League wins, not a second marble.
    const again = await call(`/leagues/${code}/again`, { method: 'POST', token: a.token });
    assert.equal(again.status, 201, JSON.stringify(again.body));
    assert.equal(again.body.league.kind, 'pro');
    assert.equal(again.body.league.paid_with, 'pass');
    const { rows: [lg2] } = await db.query('SELECT * FROM leagues WHERE code = $1', [again.body.league.code]);
    for (let k = 0; k < 10; k += 1) for (const [who, ms] of [[a, 40_000], [b, 41_000], [c, 42_000]]) await run(lg2.id, who, k, ms);
    await db.query('UPDATE leagues SET ends_at = now() WHERE id = $1', [lg2.id]);
    await leagues.endDue(db, new Date(Date.now() + 1000));
    const v2 = (await call(`/leagues/${again.body.league.code}`, { token: a.token })).body;
    assert.equal(v2.league.winner.league_wins, 2);
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM user_collection WHERE user_id = $1 AND item_slug = 'racing-stripes-pro'", [a.user.id])).rows[0].n, 1);

    // Fewer than 3 ranked players: no marble, and why.
    const few = await call('/leagues', { method: 'POST', token: b.token, body: { kind: 'pro', name: 'Two of us', track_ids: ten, days: 1 } });
    assert.equal(few.status, 402); // (B has no credits)
    await db.withTransaction((cl) => require('../src/credits').change(cl, { userId: b.user.id, amount: 2, kind: 'admin', note: 'test' }));
    const few2 = await call('/leagues', { method: 'POST', token: b.token, body: { kind: 'pro', name: 'Two of us', track_ids: ten, days: 1 } });
    assert.equal(few2.status, 201);
    const { rows: [lg3] } = await db.query('SELECT * FROM leagues WHERE code = $1', [few2.body.league.code]);
    await call(`/leagues/${lg3.code}/join`, { method: 'POST', token: c.token });
    for (let k = 0; k < 10; k += 1) for (const [who, ms] of [[b, 40_000], [c, 41_000]]) await run(lg3.id, who, k, ms);
    await db.query('UPDATE leagues SET ends_at = now() WHERE id = $1', [lg3.id]);
    await leagues.endDue(db, new Date(Date.now() + 1000));
    const v3 = (await call(`/leagues/${lg3.code}`, { token: b.token })).body;
    assert.equal(v3.league.winner, null);
    assert.equal(v3.league.no_winner_reason, 'too_few_finishers');
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM user_collection WHERE user_id = $1 AND item_slug = 'racing-stripes-pro'", [b.user.id])).rows[0].n, 0);

    // A League never writes league_results.
    const plain = await call('/leagues', { method: 'POST', token: c.token, body: { name: 'Just fun', track_ids: ten.slice(0, 5), days: 1 } });
    const { rows: [lg4] } = await db.query('SELECT * FROM leagues WHERE code = $1', [plain.body.league.code]);
    assert.equal(lg4.feeds_major, false);
    await db.query('UPDATE leagues SET ends_at = now() WHERE id = $1', [lg4.id]);
    await leagues.endDue(db, new Date(Date.now() + 1000));
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM league_results WHERE league_id = $1', [lg4.id])).rows[0].n, 0);

    // A credit pack refunded (the test provider): the credits left taken back, the rest short.
    const admin = { id: null };
    const refund = await require('../src/payments').refund(db, pay.id, { adminId: admin.id, reason: 'test refund' });
    assert.equal(refund.credits.taken + refund.credits.swappedBack + refund.credits.short, 10);
    assert.equal((await call('/credits', { token: a.token })).body.balance, 0);
  } finally {
    if (woken.length) await db.query('UPDATE tracks SET is_active = false WHERE id = ANY($1::uuid[])', [woken]);
    server.close();
    await db.pool?.end?.().catch?.(() => {});
  }
});
