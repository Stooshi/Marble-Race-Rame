'use strict';

const { Server } = require('socket.io');
const config = require('../config');
const db = require('../db');
const { loadUser } = require('../middleware/auth');
const { UUID_RE } = require('../utils/validate');
const raceManager = require('../game/raceManager');
const raceService = require('../game/raceService');

/**
 * Socket.io entry point.
 *
 * Authentication is optional: pass a JWT as `auth: { token }` in the handshake
 * to be identified; anonymous sockets can still spectate.
 *
 * Client -> server (all accept an optional ack callback):
 *   lobby:subscribe                 join the lobby room for race list updates
 *   lobby:unsubscribe
 *   race:watch    { raceId }        join a race room; ack returns current state
 *   race:unwatch  { raceId }
 *
 * Server -> client:
 *   lobby:race_created / lobby:race_updated
 *   race:updated     entries changed while in the lobby
 *   race:countdown   race decided, starts at `startsAt` (includes stream header)
 *   race:start       stream header: track, entries (index order), durationMs, tickMs
 *   race:frame       { frame, t, p[], l[], s[], events? } — p = progress 0..1,
 *                    l = lateral offset -1..1, s = standings (entry indexes);
 *                    finishes? [{ i, ms }] = official finish times of marbles
 *                    that just crossed the line (every 20th frame and the
 *                    final one carry all of them so far)
 *   race:finished    official results
 *   race:next        { raceId, nextRaceId, scheduledAt } the rematch was set up
 *   race:cancelled
 */
function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: config.corsOrigin !== '*' },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || null;
      socket.data.user = token ? await loadUser(token) : null;
      if (token && !socket.data.user) return next(new Error('Invalid token'));
      return next();
    } catch (err) {
      return next(err);
    }
  });

  io.on('connection', (socket) => {
    const reply = (ack, payload) => (typeof ack === 'function' ? ack(payload) : undefined);

    socket.on('lobby:subscribe', (_payload, ack) => {
      if (typeof _payload === 'function') ack = _payload;
      socket.join('lobby');
      reply(ack, { ok: true });
    });

    socket.on('lobby:unsubscribe', (_payload, ack) => {
      if (typeof _payload === 'function') ack = _payload;
      socket.leave('lobby');
      reply(ack, { ok: true });
    });

    socket.on('race:watch', async (payload, ack) => {
      const raceId = payload?.raceId;
      if (typeof raceId !== 'string' || !UUID_RE.test(raceId)) {
        return reply(ack, { ok: false, error: 'raceId must be a UUID' });
      }
      try {
        const { rows } = await db.query('SELECT id, status FROM races WHERE id = $1', [raceId]);
        if (!rows[0]) return reply(ack, { ok: false, error: 'Race not found' });

        socket.join(raceManager.room(raceId));
        const live = raceManager.snapshot(raceId);
        if (live) return reply(ack, { ok: true, ...live });
        if (rows[0].status === 'finished') {
          const results = await raceService.getResults(db, raceId);
          return reply(ack, { ok: true, status: 'finished', results });
        }
        return reply(ack, { ok: true, status: rows[0].status });
      } catch (err) {
        console.error('[socket] race:watch failed', err);
        return reply(ack, { ok: false, error: 'Internal error' });
      }
    });

    socket.on('race:unwatch', (payload, ack) => {
      if (typeof payload?.raceId === 'string') socket.leave(raceManager.room(payload.raceId));
      reply(ack, { ok: true });
    });
  });

  raceManager.init(io);
  return io;
}

module.exports = { createSocketServer };
