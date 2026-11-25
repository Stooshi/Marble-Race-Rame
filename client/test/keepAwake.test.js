// The screen kept on while a race is on screen (Moses, 26 Oct 2026): from the start show or the countdown
// until the results board; released on the board, on leaving the race and in the background. The apps use
// the native keep-screen-on plugin, the website the Screen Wake Lock API (nothing where it's missing).
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { holdAwake, keepAwakeForTests as T } from '../src/app/keepAwake';
import { finishPlan, phaseAt } from '../src/utils/finishShow';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

/** A browser tab: its visibility, and a wake lock that records what it was asked. */
function browser({ supported = true, refuse = false } = {}) {
  const listeners = {};
  const doc = { visibilityState: 'visible', addEventListener: (k, f) => { listeners[k] = f; } };
  const log = [];
  const lock = {
    async request(kind) {
      log.push(`request ${kind}`);
      if (refuse) throw new Error('NotAllowedError');
      const handlers = {};
      return {
        addEventListener: (k, f) => { handlers[k] = f; },
        async release() { log.push('release'); handlers.release?.(); },
        drop() { handlers.release?.(); }, // (the browser letting go itself: the tab hidden)
      };
    },
  };
  const nav = supported ? { wakeLock: lock } : {};
  const hide = (hidden) => { doc.visibilityState = hidden ? 'hidden' : 'visible'; listeners.visibilitychange?.(); return T.settled(); };
  return { env: { native: () => false, doc: () => doc, nav: () => nav }, log, hide };
}

/**
 * The app: the native plugin, recording its calls. Like a real Capacitor plugin it is a proxy that
 * answers every property, `then` too, with a native call (one it doesn't have rejects): a promise that
 * resolved to the plugin itself would fail, as it did on Moses's Samsung (27 Oct 2026).
 */
function capacitorPlugin(methods, log) {
  return new Proxy({}, {
    get: (_, prop) => (...args) => {
      if (methods[prop]) return methods[prop](...args);
      log.push(`not implemented: ${String(prop)}`);
      return Promise.reject(new Error(`"KeepAwake.${String(prop)}()" is not implemented on android`));
    },
  });
}
function app() {
  const log = [];
  const KeepAwake = capacitorPlugin({ keepAwake: async () => { log.push('keepAwake'); }, allowSleep: async () => { log.push('allowSleep'); } }, log);
  const doc = { visibilityState: 'visible', addEventListener() {} };
  // (The plugin's module, as import() gives it.)
  return { env: { native: () => true, plugin: async () => ({ KeepAwake }), doc: () => doc, nav: () => ({}) }, log };
}

describe('the website: the Screen Wake Lock API', () => {
  let b;
  beforeEach(() => { b = browser(); T.reset(b.env); });

  it('on while held, released when let go', async () => {
    const release = holdAwake();
    await T.settled();
    expect(b.log).toEqual(['request screen']);
    expect(T.state().held).toBe(true);
    release();
    await T.settled();
    expect(b.log).toEqual(['request screen', 'release']);
    expect(T.state()).toMatchObject({ holders: 0, held: false });
    release(); // (a second call does nothing)
    await T.settled();
    expect(T.state().holders).toBe(0);
  });

  it('let go while hidden, asked for again when the tab is visible, but only if a race is still on screen', async () => {
    const release = holdAwake();
    await T.settled();
    await b.hide(true);
    expect(T.state().held).toBe(false);
    await b.hide(false);
    expect(b.log.filter((x) => x === 'request screen')).toHaveLength(2);
    expect(T.state().held).toBe(true);
    release();
    await T.settled();
    await b.hide(true);
    await b.hide(false);
    expect(b.log.filter((x) => x === 'request screen')).toHaveLength(2); // (no race: not asked again)
  });

  it('two overlapping holders: on until the last lets go, asked for once', async () => {
    const a = holdAwake();
    const c = holdAwake();
    await T.settled();
    a();
    await T.settled();
    expect(T.state().held).toBe(true);
    c();
    await T.settled();
    expect(b.log).toEqual(['request screen', 'release']);
  });

  it('let go before the browser answered: the lock is given straight back', async () => {
    const release = holdAwake();
    release();
    await T.settled();
    expect(T.state().held).toBe(false);
    // (Never left holding: every lock asked for was given back.)
    expect(b.log.filter((x) => x === 'request screen').length).toBe(b.log.filter((x) => x === 'release').length);
  });

  it('the results board comes while the browser is still answering: the lock is given straight back', async () => {
    let answer;
    const log = [];
    const nav = { wakeLock: { request: () => new Promise((r) => { answer = r; }) } };
    T.reset({ native: () => false, doc: () => ({ visibilityState: 'visible', addEventListener() {} }), nav: () => nav });
    const release = holdAwake();
    await Promise.resolve();
    release();
    answer({ addEventListener() {}, release: async () => { log.push('release'); } });
    await T.settled();
    expect(log).toEqual(['release']);
    expect(T.state().held).toBe(false);
  });

  it('no wake lock in this browser, or refused: nothing happens, no errors', async () => {
    for (const opts of [{ supported: false }, { refuse: true }]) {
      const x = browser(opts);
      T.reset(x.env);
      const release = holdAwake();
      await expect(T.settled()).resolves.toBeUndefined();
      expect(T.state().held).toBe(false);
      release();
      await expect(T.settled()).resolves.toBeUndefined();
    }
    expect(src('src/app/keepAwake.js')).not.toMatch(/<video|createElement\('video'\)|NoSleep/);
  });
});

describe('the apps: the native keep-screen-on', () => {
  let a;
  beforeEach(() => { a = app(); T.reset(a.env); });

  it('keepAwake while held, allowSleep when let go; off in the background, on again when back', async () => {
    const release = holdAwake();
    await T.settled();
    expect(a.log).toEqual(['keepAwake']);
    await T.appState(false);
    expect(a.log).toEqual(['keepAwake', 'allowSleep']);
    await T.appState(true);
    expect(a.log).toEqual(['keepAwake', 'allowSleep', 'keepAwake']);
    release();
    await T.settled();
    expect(a.log.at(-1)).toBe('allowSleep');
    expect(T.state().native).toBe(false);
  });

  it('the plugin is the Capacitor 8 one, pinned', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.dependencies['@capacitor-community/keep-awake']).toBe('8.0.1');
    expect(pkg.dependencies['@capacitor/core']).toMatch(/^8\./);
  });
});

describe('when: from the start show and countdown until the results board', () => {
  it('on through the race and the finish ceremony, off from the board on', () => {
    const finishes = { 0: 50000, 1: 51000, 2: 52000, 3: 60000 };
    const plan = finishPlan(finishes, 4, true);
    const on = (t) => phaseAt(t, plan) !== 'board';
    expect(on(null)).toBe(true);   // the start show, the countdown (no race clock yet)
    expect(on(0)).toBe(true);      // GO
    expect(on(30000)).toBe(true);  // racing
    expect(on(plan.winnerMs)).toBe(true); // the winner home: the ceremony
    expect(on(plan.boardAt - 1)).toBe(true);
    expect(on(plan.boardAt)).toBe(false); // the results board
    expect(phaseAt(plan.winnerMs + 100, plan, true)).toBe('board'); // skipped to the results
  });

  it('the live viewers hold it; a replay does not', () => {
    expect(src('src/components/LiveRaceViewer3D.jsx')).toContain("useKeepAwake(show.phase !== 'board');");
    expect(src('src/components/RaceViewer.jsx')).toContain("useKeepAwake(live && show.phase !== 'board');");
    // (Leaving the race unmounts the viewer: the hook lets go.)
    expect(src('src/app/keepAwake.js')).toContain('useEffect(() => (on ? holdAwake() : undefined), [on]);');
  });

  it('the plugin is used through its module, never resolved as itself (a Capacitor plugin answers `then`)', async () => {
    const { env, log } = app();
    T.reset(env);
    const release = holdAwake();
    await T.settled();
    expect(log).toEqual(['keepAwake']);
    expect(T.state().native).toBe(true);
    release();
    await T.settled();
    expect(log).toEqual(['keepAwake', 'allowSleep']);
    expect(log.some((l) => l.startsWith('not implemented'))).toBe(false);
    const code = src('src/app/keepAwake.js');
    expect(code).toContain("plugin: () => import('@capacitor-community/keep-awake'),");
    expect(code).not.toMatch(/import\('@capacitor-community\/keep-awake'\)\.then\(\(m\) => m\.KeepAwake\)/);
    // (In the log: "[keep-awake] screen kept on", and why when it can't.)
    expect(code).toContain('[keep-awake] screen ${want ? \'kept on\' : \'allowed to sleep\'}');
    // The same trap in push: its module, not the plugin, from an async function.
    expect(src('src/app/push.js')).toContain("if (!mod) mod = await import('@capacitor/push-notifications');");
  });
});
