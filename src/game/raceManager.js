'use strict';

const db = require('../db');
const raceService = require('./raceService');

/**
 * Owns the real-time side of races: countdown timers, frame streaming over
 * Socket.io, late-joiner sync, crash recovery and scheduled starts.
 *
 * Socket rooms:
 *   "lobby"          — race list updates
 *   "race:<id>"      — everything about one race
 */

const SCHEDULER_INTERVAL_MS = 5000;

/**
 * The marbles that crossed the finish line after race time `from` and by `to`
 * (ms), as [{ i: entry index, ms: official finish time }] in finishing order.
 */
function finishesBetween(sim, from, to) {
  return (sim.results ?? [])
    .filter((r) => Number.isFinite(r.finishTimeMs) && r.finishTimeMs > from && r.finishTimeMs <= to)
    .sort((a, b) => a.finishTimeMs - b.finishTimeMs)
    .map((r) => ({ i: r.index, ms: r.finishTimeMs }));
}

class RaceManager {
  constructor() {
    this.io = null;
    this.active = new Map(); // raceId -> ActiveRace
    this.schedulerTimer = null;
  }

  init(io) {
    this.io = io;
  }

  room(raceId) {
    return `race:${raceId}`;
  }

  emitLobby(event, payload) {
    this.io?.to('lobby').emit(event, payload);
  }

  emitRace(raceId, event, payload) {
    this.io?.to(this.room(raceId)).emit(event, payload);
  }

  /** Called by routes after any change to a lobby race (join/leave/create). */
  notifyRaceUpdated(race, extra = {}) {
    const payload = { raceId: race.id, status: race.status, ...extra };
    this.emitLobby('lobby:race_updated', payload);
    this.emitRace(race.id, 'race:updated', payload);
  }

  /** Decides the race on the server and begins the countdown + stream. */
  async start(raceId, actor) {
    const { race, entries, sim } = await raceService.decide(raceId, actor);
    this.track(race, entries, sim);
    return race;
  }

  /** Registers a decided race and wires up its timers. */
  track(race, entries, sim) {
    this.stop(race.id);
    const meta = {
      ...raceService.describeForClients(race, entries),
      durationMs: sim.durationMs,
      tickMs: sim.tickMs,
      tickRateHz: sim.tickRateHz,
      startsAt: new Date(race.started_at).toISOString(),
      // The starting gate (new physics): when each paddle drops, and the field waiting behind it.
      ...(sim.start && { start: sim.start, firstFrame: sim.frames[0] }),
    };
    const active = {
      raceId: race.id,
      meta,
      sim,
      startMs: new Date(race.started_at).getTime(),
      lastFrame: -1,
      lastEventIdx: 0,
      startTimer: null,
      tickTimer: null,
      finishing: false,
    };
    this.active.set(race.id, active);

    const untilStart = active.startMs - Date.now();
    if (untilStart > 0) {
      this.emitRace(race.id, 'race:countdown', { raceId: race.id, startsAt: meta.startsAt, countdownMs: untilStart, meta });
      this.emitLobby('lobby:race_updated', { raceId: race.id, status: 'countdown', startsAt: meta.startsAt });
      active.startTimer = setTimeout(() => this.beginStreaming(active), untilStart);
    } else {
      this.beginStreaming(active);
    }
  }

  async beginStreaming(active) {
    try {
      await raceService.markRunning(active.raceId);
    } catch (err) {
      console.error(`[race ${active.raceId}] failed to mark running`, err);
    }
    if (this.active.get(active.raceId) !== active) return; // stopped meanwhile

    this.emitRace(active.raceId, 'race:start', active.meta);
    this.emitLobby('lobby:race_updated', { raceId: active.raceId, status: 'running' });

    // Tick at the frame rate but derive the frame from wall-clock time so a
    // slow event loop never makes the stream drift from the official timeline.
    active.tickTimer = setInterval(() => this.tick(active), active.sim.tickMs);
    this.tick(active);
  }

  tick(active) {
    const { sim } = active;
    const elapsed = Date.now() - active.startMs;
    const done = elapsed >= sim.durationMs;
    // The last frame sits exactly on durationMs, which needn't be a tick multiple.
    const frameIdx = done ? sim.frames.length - 1 : Math.min(sim.frames.length - 2, Math.floor(elapsed / sim.tickMs));

    if (frameIdx > active.lastFrame) {
      const frame = sim.frames[frameIdx];
      // Marbles across the line since the last frame sent, with their official
      // times (revealed as they cross). Every 20th frame and the final one carry
      // the whole list so far, in case a viewer missed a frame.
      const resend = done || frameIdx % 20 === 0;
      const finishes = finishesBetween(sim, !resend && active.lastFrame >= 0 ? sim.frames[active.lastFrame].t : -Infinity, frame.t);
      const events = [];
      while (active.lastEventIdx < sim.events.length && sim.events[active.lastEventIdx].t <= frame.t) {
        events.push(sim.events[active.lastEventIdx]);
        active.lastEventIdx += 1;
      }
      active.lastFrame = frameIdx;
      // Volatile: a client that misses a frame should just get the next one.
      // The final frame is always delivered.
      const target = this.io?.to(this.room(active.raceId));
      (done ? target : target?.volatile)?.emit('race:frame', {
        raceId: active.raceId,
        frame: frameIdx,
        ...frame,
        ...(events.length && { events }),
        ...(finishes.length && { finishes }),
      });
    }

    if (done && !active.finishing) {
      active.finishing = true;
      this.finish(active).catch((err) => console.error(`[race ${active.raceId}] finalize failed`, err));
    }
  }

  async finish(active) {
    clearInterval(active.tickTimer);
    const results = await raceService.finalize(active.raceId);
    this.active.delete(active.raceId);
    if (results) {
      this.emitRace(active.raceId, 'race:finished', { raceId: active.raceId, durationMs: active.sim.durationMs, results });
      this.emitLobby('lobby:race_updated', { raceId: active.raceId, status: 'finished' });
    }
  }

  stop(raceId) {
    const active = this.active.get(raceId);
    if (!active) return;
    clearTimeout(active.startTimer);
    clearInterval(active.tickTimer);
    this.active.delete(raceId);
  }

  /**
   * Snapshot sent to a client that subscribes mid-race so it can render
   * immediately instead of waiting for the next frame.
   */
  snapshot(raceId) {
    const active = this.active.get(raceId);
    if (!active) return null;
    const elapsed = Date.now() - active.startMs;
    const running = elapsed >= 0;
    const frameIdx = running ? Math.min(active.sim.frames.length - 1, Math.floor(elapsed / active.sim.tickMs)) : null;
    return {
      status: running ? 'running' : 'countdown',
      serverTime: new Date().toISOString(),
      elapsedMs: Math.max(0, elapsed),
      meta: active.meta,
      ...(running && { frame: frameIdx, ...active.sim.frames[frameIdx] }),
      ...(running && { finishes: finishesBetween(active.sim, -Infinity, active.sim.frames[frameIdx].t) }),
    };
  }

  /** Rebuilds timers for races that were mid-flight when the process stopped. */
  async recover() {
    const { rows } = await db.query(`SELECT id FROM races WHERE status IN ('countdown', 'running')`);
    for (const { id } of rows) {
      try {
        const { race, entries } = await raceService.loadSimulationInput(db, id);
        const sim = await raceService.loadRun(db, race, entries);
        const endMs = new Date(race.started_at).getTime() + sim.durationMs;
        if (Date.now() >= endMs) {
          await raceService.finalize(id);
          console.log(`[race ${id}] finalized after restart`);
        } else {
          this.track(race, entries, sim);
          console.log(`[race ${id}] resumed stream after restart`);
        }
      } catch (err) {
        console.error(`[race ${id}] recovery failed`, err);
      }
    }
  }

  /** Periodically auto-starts lobby races whose scheduled time has arrived. */
  startScheduler() {
    const run = async () => {
      try {
        const { rows } = await db.query(
          `SELECT id FROM races WHERE status = 'lobby' AND scheduled_at IS NOT NULL AND scheduled_at <= now()`,
        );
        for (const { id } of rows) {
          await this.start(id, null).catch(async (err) => {
            console.error(`[race ${id}] scheduled start failed: ${err.message}`);
            // Leave it in the lobby for a manual start instead of retrying forever.
            await db.query(`UPDATE races SET scheduled_at = NULL WHERE id = $1 AND status = 'lobby'`, [id]);
          });
        }
      } catch (err) {
        console.error('[scheduler] poll failed', err);
      }
    };
    this.schedulerTimer = setInterval(run, SCHEDULER_INTERVAL_MS);
    this.schedulerTimer.unref?.();
  }

  shutdown() {
    clearInterval(this.schedulerTimer);
    for (const raceId of [...this.active.keys()]) this.stop(raceId);
  }
}

module.exports = new RaceManager();
