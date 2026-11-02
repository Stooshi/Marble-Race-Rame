'use strict';

/**
 * A vertical loop (track kit: loop; Moses, 2 Nov 2026): a roller-coaster loop, not a
 * circle. Its curvature grows steadily from nothing at the bottom to its tightest at the top (a
 * clothoid, the "teardrop" of a coaster loop) and eases off again the same way coming down, so a
 * marble is never thrown into a sudden curve and needs far less speed over the top than a circle as tall.
 *
 * Shape, along the loop's own path (u, metres from where it rises):
 *   - the rise and the fall, U = 2π·topRadius metres each: the slope's angle phi grows as π(u/U)²
 *     (curvature 2πu/U², 1/topRadius at the top);
 *   - the run-out, `runout` metres along the ground after it.
 * The loop leans sideways as it goes round (`shift` metres, as a coaster's does), so the way down
 * runs beside the way in where they cross at the bottom; the run-out brings it back in line.
 *
 * Plain numbers only: the physics (src/game/physicsSimulator.js) and the 3D view
 * (client/src/three/loopShape.js, the same maths; a test checks they agree) both use it.
 * f: metres forwards along the ground from where it rises; z: metres up; q: metres aside;
 * phi: the slope's angle (0 forwards, π/2 straight up, π upside down at the top);
 * kappa: curvature (1/m) in the loop's own plane.
 */

const LOOP_STEP = 0.25; // metres between samples along the loop
const NET_LOW = 3;      // metres: the net lets a caught marble out where the way down is this low
const LIP = (40 * Math.PI) / 180; // radians: round the loop the U's walls are low (the floor holds the marble
                                  // in its middle), so a marble on it shows from beside the loop
const LIP_EASE = 12;    // metres along the path over which the walls come down at the start and go up again after

function loopShape({ topRadius = 6, shift = 11, runout = 40 } = {}) {
  const U = 2 * Math.PI * topRadius;
  const total = 2 * U + runout;
  const n = Math.ceil(total / LOOP_STEP);
  const step = total / n;
  const phiAt = (u) => {
    if (u <= U) return Math.PI * (u / U) ** 2;
    if (u <= 2 * U) return 2 * Math.PI - Math.PI * ((2 * U - u) / U) ** 2;
    return 2 * Math.PI;
  };
  const kappaAt = (u) => (u <= U ? (2 * Math.PI * u) / (U * U) : u <= 2 * U ? (2 * Math.PI * (2 * U - u)) / (U * U) : 0);
  const smooth = (k) => { const x = Math.min(1, Math.max(0, k)); return x * x * (3 - 2 * x); };
  // Aside: level on the way in, leaning across over the top (half a loop's length), level again on the
  // way down, then back in line along the run-out.
  const qAt = (u) => (u <= 2 * U ? shift * smooth((u - 0.5 * U) / U) : shift * (1 - smooth((u - 2 * U) / runout)));
  const u = new Float64Array(n + 1);
  const f = new Float64Array(n + 1);
  const z = new Float64Array(n + 1);
  const q = new Float64Array(n + 1);
  const phi = new Float64Array(n + 1);
  const kappa = new Float64Array(n + 1);
  for (let i = 0; i <= n; i += 1) {
    u[i] = i * step;
    phi[i] = phiAt(u[i]);
    kappa[i] = kappaAt(u[i]);
    q[i] = qAt(u[i]);
    if (i > 0) {
      // The midpoint rule, step by step (exact enough at 0.25 m: the ends meet the ground within a millimetre).
      const mid = phiAt(u[i] - step / 2);
      f[i] = f[i - 1] + Math.cos(mid) * step;
      z[i] = z[i - 1] + Math.sin(mid) * step;
    }
  }
  z[n] = 0;
  let height = 0;
  for (let i = 0; i <= n; i += 1) if (z[i] > height) height = z[i];
  return {
    topRadius, shift, runout, rise: U, length: total, ground: f[n], height, step, n,
    u, f, z, q, phi, kappa,
    /** Index and weight of the sample pair either side of u. */
    at(uu) {
      const x = Math.min(n, Math.max(0, uu / step));
      const i = Math.min(n - 1, Math.floor(x));
      return { i, w: x - i };
    },
    lerp(arr, uu) {
      const { i, w } = this.at(uu);
      return arr[i] + (arr[i + 1] - arr[i]) * w;
    },
    /**
     * A marble that loses its hold at u drops into the net hung inside the loop, which lets it out onto
     * the way down: the sample where (low, under NET_LOW metres, and as near below it as there is).
     */
    /** How far up its walls the U goes at u (radians), given the channel's own (`full`). */
    lipAt(uu, full) {
      const body = 2 * U;
      const k = uu < body ? Math.min(1, uu / LIP_EASE) : Math.max(0, 1 - (uu - body) / LIP_EASE);
      const e = k * k * (3 - 2 * k);
      return full - (full - Math.min(full, LIP)) * e;
    },
    netLanding(uu) {
      const fd = this.lerp(f, uu);
      let land = null;
      for (let i = this.at(Math.max(uu, U)).i; i <= this.at(2 * U).i; i += 1) {
        if (z[i] > NET_LOW) continue;
        if (land === null || Math.abs(f[i] - fd) < Math.abs(f[land] - fd)) land = i;
      }
      return land === null ? this.at(2 * U).i : land;
    },
  };
}

module.exports = { loopShape, LOOP_STEP };
