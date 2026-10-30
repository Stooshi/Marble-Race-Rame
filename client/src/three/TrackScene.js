/**
 * The 3D race scene: a bright cartoon world with one track in it.
 *
 * Built for ordinary phones: one draw call for the whole track, cheap Lambert
 * lighting with no shadows, a capped pixel ratio, and drawing only when
 * something changes (a race replay drives frames while marbles move).
 */
import {
  AmbientLight, BackSide, BoxGeometry, CanvasTexture, Color, NearestFilter, DirectionalLight, DoubleSide, Float32BufferAttribute, Fog,
  FrontSide, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, PlaneGeometry,
  Box3, BufferGeometry, Frustum, Matrix4, Plane, Scene, SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildCenterline, buildTrackGeometry, TRACK_STYLE } from './trackModel';
import { MARBLE_RADIUS, PEN_DROP, RaceMarbles, RUNOUT_LENGTH } from './marbles';
import { buildScenery } from './scenery';
import { buildIceChannelGeometry, channelDetail, channelLipAt, channelPieces, channelPieceSize, channelColors, channelOf, channelRadiusAt, forkAt, forkOffset, forkRadius, ICE_COLORS, STREET_COLORS } from './iceChannel';
import { DEFAULT_THEME, themeFor } from './themes';
import { gatePlaces, StartGate } from './startGate';
import { countdownPose, handover, launchHandover, launchPose, startLineShot } from './startCamera';
import { DETAIL_FADE_MS, flyoverHighlight, flyoverPath, flyoverTop } from './flyover';
import { buildTrackFeatures } from './trackFeatures';
import { buildLaneMarkings } from './scenery/athletics';
import { buildRacingLook } from './scenery/racingLook';
import { TV, biggestBunch, packCams, packRace, packWeight, standingLabel, tvCameras, tvMoment, tvSpots } from './tvMoments';
import { buildStructures } from './structures';
import { roofBlocks, stationRoof } from './scenery/coaster';
import { keepOutBlocks } from './scenery/clearCheck';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildBillboards } from './billboards';
import { fetchBillboards } from '../api/billboards';
import { buildEffects } from './lighting';
import { WinnerGlow } from './winnerGlow';
import { buildHolidayLayer } from './holidayLayer';
import { WINNER_MS } from '../utils/finishShow';
import { CHEER_NEAR } from './scenery/grandPrix';

const LEADER_MARGIN = 3; // metres: the follow camera only switches to a new leader that is clearly ahead
const SCENERY_LAYER = 1;  // scenery is drawn in the big view only (the small corner view skips it, for speed)
const HITCH_MS = 100; // frames further apart than this count as a hold-up (the frame-rate counter shows how many)
const SLOW_FRAME_MS = 40; // frames further apart than this on average (under 25 a second): draw at a lower resolution
// Phones draw at most 60 frames a second: a 90/120 Hz screen otherwise doubles the work (heat,
// battery, and the phone then slows itself down) for motion the races don't need.
const PHONE_FRAME_MS = 1000 / 60;
// How far a phone that still can't keep up may drop its resolution (below 1 pixel per screen
// pixel: a little softer, but smooth).
const PHONE_MIN_PIXEL_RATIO = 0.75;
const PHONE_FLY_CALLS = 35; // the flyover's details come back on a phone only while the frame stays within this many draw calls (the marbles aside)
const FINISH_FROM = 12; // metres short of the line where the big view starts over to the finish shot…
const FINISH_TO = 6; // …and past it where it is there
const ROOF_ON_COMPUTERS = false; // (true: computers keep the canopy until the finish shot cuts it away)
const ROOFLESS_ASPECT = 0.8; // a screen narrower than this (a phone upright) never shows a station's canopy: roofless
const FINISH_CUT_FROM = 0.3; // how far over to the finish shot the big view is when a station's canopy is cut away
const FINISH_HOLD = 0.5;     // …and from when it keeps to the finish shot's own spot (not the followed marble's road)
const SIGHT_EASE = 0.6; // seconds: how gently the follow camera moves back out after coming in to keep its marble in sight
const INSET_CLOSER = 0.6; // the corner view's follow camera sits this much nearer its marble
const OWN_STRETCH = 60;   // metres along the track either side of a marble that count as its own stretch (ice channels; the corkscrew's levels are 155 m apart)
const CHANNEL_SKIRT = 1.6; // metres the ice channel's outer skirt hangs below its floor (iceChannel.js)
const VIADUCT_DECK = 1.3;  // metres more of stone deck under a kit track's stretch crossing over itself (scenery/kitGround.js)

/** A follow camera and its smoothing state: the big view has one, the small corner view another. */
function followRig(camera) {
  return { camera, cam: new Vector3(), target: new Vector3(), ready: false, leader: null, leaderT: undefined };
}

/** A sky dome: pale at the horizon, coloured overhead, whichever way the camera looks. */
function skyDome() {
  const geometry = new SphereGeometry(1, 32, 16);
  geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3), 3));
  const sky = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;
  return sky;
}

/** A group's meshes merged into one mesh per material (same look, fewer draw calls). */
/** A Grand Prix finish banner's chequered pattern: black and white squares, two rows tall. */
function chequerMaterial(width) {
  const cols = Math.max(8, Math.round(width / 0.9));
  const canvas = document.createElement('canvas');
  canvas.width = cols * 8;
  canvas.height = 16;
  const g = canvas.getContext('2d');
  for (let c = 0; c < cols; c += 1) for (let r = 0; r < 2; r += 1) {
    g.fillStyle = (c + r) % 2 ? '#141519' : '#f4f4f2';
    g.fillRect(c * 8, r * 8, 8, 8);
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.magFilter = NearestFilter;
  return new MeshLambertMaterial({ map, emissive: '#2a2a2a' });
}

/** A channel piece with a racing-look part ({ positions, colors }) added to it (both unindexed; the part's normals per triangle). */
function paintInto(piece, part) {
  const g = new BufferGeometry();
  const normals = [];
  const p = part.positions;
  for (let i = 0; i < p.length; i += 9) {
    const ux = p[i + 3] - p[i]; const uy = p[i + 4] - p[i + 1]; const uz = p[i + 5] - p[i + 2];
    const vx = p[i + 6] - p[i]; const vy = p[i + 7] - p[i + 1]; const vz = p[i + 8] - p[i + 2];
    let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }
  for (const [name, extra] of [['position', part.positions], ['color', part.colors], ['normal', normals]]) {
    const a = piece.getAttribute(name);
    if (!a) continue;
    const merged = new Float32Array(a.array.length + extra.length);
    merged.set(a.array);
    merged.set(extra, a.array.length);
    g.setAttribute(name, new Float32BufferAttribute(merged, 3));
  }
  g.computeBoundingSphere();
  return g;
}

function mergeByMaterial(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  const keep = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh || o.material.map || o.material.transparent || Array.isArray(o.material)) { keep.push(o); return; }
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    g = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    // A plain lit colour is baked into the corners, so all of those share one mesh.
    const m = o.material;
    const plain = m.isMeshLambertMaterial && !m.vertexColors && m.emissive.getHex() === 0 && m.side === FrontSide;
    let key = m;
    if (plain) {
      const colours = new Float32Array(g.getAttribute('position').count * 3);
      for (let k = 0; k < colours.length; k += 3) { colours[k] = m.color.r; colours[k + 1] = m.color.g; colours[k + 2] = m.color.b; }
      g.setAttribute('color', new Float32BufferAttribute(colours, 3));
      key = 'baked';
    }
    if (!byMat.has(key)) byMat.set(key, []);
    byMat.get(key).push(g);
  });
  if (byMat.has('baked')) {
    byMat.set(new MeshLambertMaterial({ vertexColors: true, flatShading: true }), byMat.get('baked'));
    byMat.delete('baked');
  }
  const out = new Group();
  out.name = group.name;
  for (const [mat, list] of byMat) {
    const attrs = (g) => Object.keys(g.attributes).sort().join();
    const groups = new Map();
    for (const g of list) { if (!groups.has(attrs(g))) groups.set(attrs(g), []); groups.get(attrs(g)).push(g); }
    for (const same of groups.values()) out.add(new Mesh(mergeGeometries(same), mat));
  }
  for (const o of keep) {
    const m = o.clone();
    o.matrixWorld.decompose(m.position, m.quaternion, m.scale);
    out.add(m);
  }
  return out;
}

/** Paints the sky for a theme, with a warm glow around the sun when the theme has one. */
function paintSky(sky, theme) {
  const top = new Color(theme.sky.top);
  const horizon = new Color(theme.sky.horizon);
  const glow = theme.sky.glow ? new Color(theme.sky.glow) : null;
  const sun = new Vector3(...theme.sun.direction).normalize();
  const pos = sky.geometry.getAttribute('position');
  const col = sky.geometry.getAttribute('color');
  const c = new Color();
  const v = new Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i).normalize();
    c.copy(horizon).lerp(top, Math.min(1, Math.max(0, v.y) * 2.2)); // reach full colour well above the horizon
    if (glow) c.lerp(glow, Math.max(0, v.dot(sun)) ** 6 * 0.85);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

/**
 * Phones (and small tablets) get the lighter version of the world: a touch
 * screen no wider than a big phone or small tablet. ?lite=1 / ?lite=0 in the
 * address forces it either way.
 */
export function prefersLite() {
  try {
    const forced = new URLSearchParams(window.location.search).get('lite');
    if (forced === '1' || forced === '0') return forced === '1';
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    return Boolean(coarse && Math.min(window.screen.width, window.screen.height) <= 900);
  } catch {
    return false;
  }
}

/**
 * Whether to build the tracks' scenery (hills, houses, forests): ?scenery=0 in
 * the address leaves it out, to compare how smoothly a race runs without it.
 */
export function prefersScenery() {
  try {
    return new URLSearchParams(window.location.search).get('scenery') !== '0';
  } catch {
    return true;
  }
}


/**
 * The finish shot (ice channels with a catch area): from above the run-in, looking down over the line
 * into the catch area, where the finished marbles gather against its end cushion, with the view
 * beyond behind them. Framed for the screen (Moses, 22 Oct 2026): the finishers sit a little above
 * the middle of the picture, clear of the results over the bottom and the winner's banner over the
 * top; on a tall phone the camera comes closer, so the catch area's width just fits and the marbles
 * are drawn bigger, with the view beyond still along the top. A coaster station's canopy over the finish is cut away from this
 * shot (finishCutaway), so nothing hangs over the picture. Looks only.
 * → { camera, target } (also used by the finish checks, scenery/clearCheck.js and client/report).
 */
export const FINISH_SHOT = {
  gather: 2.5,          // metres short of the catch area's end where the finishers gather (its cushion)
  back: [40, 30],       // metres from them to the camera along the track: wide screen, tall phone
  up: 8,                // the camera's height over the line
  share: 0.45,          // where they sit in the picture, from the top
  widthShare: 0.8,      // the catch area and a metre either side fill at most this share of the picture's width
};
export function finishShotPose(centerline, channel, aspect, { fov = 50 } = {}) {
  const { samples } = centerline;
  const end = samples[samples.length - 1];
  const forward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const narrow = 1 - Math.min(1, Math.max(0, (aspect - 0.5) / 0.9)); // 0 on a wide screen, 1 on a tall phone
  const mix = ([wide, tall]) => wide + (tall - wide) * narrow;
  const pen = channel.runout ?? { length: RUNOUT_LENGTH, halfWidth: 3.5 };
  const d = Math.max(0, pen.length - FINISH_SHOT.gather);
  const finishers = end.pos.clone().addScaledVector(forward, d);
  finishers.y = end.pos.y - d * PEN_DROP + MARBLE_RADIUS;
  const tan = Math.tan((fov * Math.PI) / 360);
  const fit = (pen.halfWidth + 1) / (FINISH_SHOT.widthShare * tan * aspect);
  const back = Math.max(fit, mix(FINISH_SHOT.back));
  const camera = finishers.clone().addScaledVector(forward, -back);
  camera.y = end.pos.y + FINISH_SHOT.up;
  // Aimed so the finishers sit `share` of the way down the picture.
  const pitch = Math.atan2(camera.y - finishers.y, back) + Math.atan((1 - 2 * FINISH_SHOT.share) * tan);
  const target = camera.clone().addScaledVector(forward, back * Math.cos(pitch)).setY(camera.y - back * Math.sin(pitch));
  return { camera, target };
}

/**
 * The finish shot pushing in on the winner (`zoom` 0–1): towards them across the ground at its own
 * height (coming down with them, the marbles rolling in under the camera would be drawn right in
 * front of the lens), never nearer than PUSH_NEAREST metres across the ground. On a tall phone the shot
 * is already that close, so it stays put. Changes `shot` in place.
 */
const PUSH_NEAREST = 32;
export function finishPush(shot, at, zoom) {
  if (!(zoom > 0) || !at) return shot;
  const across = new Vector3(at.x - shot.camera.x, 0, at.z - shot.camera.z);
  const gap = across.length();
  const move = Math.min(zoom * 0.9 * gap, Math.max(0, gap - PUSH_NEAREST));
  if (gap > 0) shot.camera.addScaledVector(across.normalize(), move);
  shot.target.lerp(at, Math.min(1, zoom * 2.2));
  return shot;
}

/**
 * What the finish shot cuts away: a coaster station's canopy over the finish (and the boards standing
 * on it), seen from the finish camera only. `roof`: coaster.js stationRoof. → { contains(point), planes(on) } or null.
 * A box with a lid (Moses, 25 Oct 2026: a hole in Wadi Mujib Burst's floor at 36 s on an iPhone): open at
 * the top, it cut everything above the canopy too, and on a phone, where the canopy is cut for the whole
 * race (roofless), a stretch passing high over the station lost its floor, walls and the land round it.
 * Looks only.
 */
export const CUT_ABOVE = 8; // metres over the canopy's top still cut (the boards standing on it reach about 5.5)
export function finishCutaway(roof) {
  if (!roof) return null;
  const halfLength = roof.halfLength + 1;
  const halfWidth = roof.halfWidth + 0.6;
  const bottom = roof.bottom - 0.4;
  const top = roof.top + CUT_ABOVE;
  const along = new Vector3(roof.along.x, 0, roof.along.z).normalize();
  const side = new Vector3(roof.side.x, 0, roof.side.z).normalize();
  const c = roof.centre;
  const local = (p) => [(p.x - c.x) * along.x + (p.z - c.z) * along.z, (p.x - c.x) * side.x + (p.z - c.z) * side.z];
  // Clipping planes whose inner (cut) sides meet in the canopy's box: with clipIntersection, only what lies inside all six is cut.
  const at = along.x * c.x + along.z * c.z;
  const st = side.x * c.x + side.z * c.z;
  const planes = [
    new Plane(new Vector3(0, -1, 0), bottom),
    new Plane(new Vector3(0, 1, 0), -top),
    new Plane(along.clone(), -at - halfLength),
    new Plane(along.clone().negate(), at - halfLength),
    new Plane(side.clone(), -st - halfWidth),
    new Plane(side.clone().negate(), st - halfWidth),
  ];
  return {
    halfLength, halfWidth, bottom, top,
    contains(p) {
      const [a, s] = local(p);
      return p.y > bottom && p.y < top && Math.abs(a) <= halfLength && Math.abs(s) <= halfWidth;
    },
    /** Does a mesh (its world box) reach into the cut? */
    touches(box) {
      if (box.max.y < bottom || box.min.y > top) return false;
      const corners = [[box.min.x, box.min.z], [box.min.x, box.max.z], [box.max.x, box.min.z], [box.max.x, box.max.z]].map(([x, z]) => local({ x, z }));
      const span = (k) => [Math.min(...corners.map((q) => q[k])), Math.max(...corners.map((q) => q[k]))];
      const [a0, a1] = span(0);
      const [s0, s1] = span(1);
      return a1 >= -halfLength && a0 <= halfLength && s1 >= -halfWidth && s0 <= halfWidth;
    },
    planes,
    /** On: cut; off: the bottom plane raised out of reach, so nothing is cut (the shader stays the same). */
    set(on) { planes[0].constant = on ? bottom : 1e7; },
  };
}

export class TrackScene {
  constructor(canvas, { interactive = true, maxPixelRatio = 2, lite = prefersLite(), scenery = prefersScenery(), racingLook = true } = {}) {
    this.racingLook = racingLook; // (the racing look: on by default; the dev kit view's ?racing=0 leaves it out, for before pictures)
    const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 && window.devicePixelRatio >= 2;
    this.lite = lite;
    this.sceneryOn = scenery;
    // Where billboard images come from (the server; the dev kit view and tests swap it out).
    this.billboardSource = fetchBillboards;
    this.renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2 && !lite, powerPreference: 'default' });
    this.minPixelRatio = lite ? PHONE_MIN_PIXEL_RATIO : 1;
    this.frameCap = lite ? PHONE_FRAME_MS : 0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd || lite ? 1.5 : maxPixelRatio));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.localClippingEnabled = true; // (the finish shot's cutaway: finishCutaway)
    this.renderer.info.autoReset = false; // counted over both views (see render)
    this.size = { width: 1, height: 1 };

    this.scene = new Scene();
    this.scene.background = new Color();
    this.sky = skyDome();
    this.scene.add(this.sky);
    this.scene.fog = new Fog(new Color(), 400, 2500);

    this.camera = new PerspectiveCamera(50, 1, 0.5, 6000);
    this.camera.layers.enable(SCENERY_LAYER);

    // Cartoon lighting: soft sky/ground fill plus one sun, no shadows.
    this.hemisphere = new HemisphereLight();
    this.ambient = new AmbientLight('#ffffff');
    this.sun = new DirectionalLight();
    this.scene.add(this.hemisphere, this.ambient, this.sun);
    // The winner's spotlight (finish ceremony), built once and kept dark until needed.
    this.glow = new WinnerGlow();
    this.scene.add(this.glow.group);
    this.celebration = null;

    this.ground = new Mesh(new PlaneGeometry(1, 1), new MeshLambertMaterial());
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    this.applyTheme(DEFAULT_THEME);

    this.trackGroup = new Group();
    this.scene.add(this.trackGroup);
    this.tvOn = true; // TV moments (the viewer's setting: setTvMoments)
    this.trackMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide });

    this.controls = null;
    this.userMoved = false;
    if (interactive) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = false;
      this.controls.maxPolarAngle = Math.PI * 0.48; // stay above the ground
      this.controls.addEventListener('change', () => this.render());
      this.controls.addEventListener('start', () => { this.userMoved = true; });
    }
    this.renderQueued = false;
    if (import.meta.env?.DEV) window.__trackScene = this; // for local debugging only
    this.marbles = null;
    this.cameraMode = 'overview'; // overview | follow
    this.main = followRig(this.camera);
    // The small corner view (picture in picture): its own follow camera on the
    // same world, drawn into a corner of the canvas after the big view.
    this.inset = followRig(new PerspectiveCamera(50, 4 / 3, 0.3, 3000));
    this.insetRect = null; // { x, y, width, height } in CSS pixels from the canvas's top left
    this.insetOn = false;
  }

  /** Sky, haze, light and ground for a track's theme (see themes.js). */
  applyTheme(theme) {
    this.theme = theme;
    paintSky(this.sky, theme);
    this.scene.background.set(theme.sky.horizon);
    this.scene.fog.color.set(theme.fog);
    this.hemisphere.color.set(theme.hemisphere.sky);
    this.hemisphere.groundColor.set(theme.hemisphere.ground);
    this.hemisphere.intensity = theme.hemisphere.intensity;
    this.ambient.intensity = theme.ambient;
    this.sun.color.set(theme.sun.color);
    this.sun.intensity = theme.sun.intensity;
    this.sun.position.set(...theme.sun.direction);
    this.ground.material.color.set(theme.ground.color);
    this.ground.position.y = theme.ground.y;
    // Night (kit lighting presets): the channel lifts a little out of the dark.
    this.trackMaterial?.emissive.set(theme.effects?.night ? '#1b2a44' : '#000000');
  }

  /** Builds the given track (from the API: slug, waypoints, length_m, lane_count) in its world. */
  setTrack(track) {
    this.clearRace();
    this.clearTrack();
    this.arcLength = 0;
    this.centerline = buildCenterline(track);
    this.track = track;
    const theme = themeFor(track?.slug, track);
    this.applyTheme(theme);
    const style = { ...TRACK_STYLE, colors: { ...TRACK_STYLE.colors, ...theme.track } };
    this.channel = channelOf(track, this.centerline); // ice channel (bobsleigh) instead of a road
    // (On phones a street's U is drawn in fewer strips across.)
    const geometry = this.channel ? buildIceChannelGeometry(this.centerline, this.channel, channelDetail(track, this.channel, this.lite)) : buildTrackGeometry(track, this.centerline, style);
    this.trackMesh = new Mesh(geometry, this.trackMaterial);
    this.trackGroup.add(this.trackMesh);
    if (this.channel) {
      // Drawn in pieces along the track, so only those in view are drawn (the whole
      // channel stays as trackMesh, hidden, for its size and shape).
      this.trackMesh.visible = false;
      const per = channelPieceSize(track, this.lite);
      const pieces = channelPieces(geometry, per);
      // The racing look (./scenery/racingLook.js: chequered start and finish lines, a kerb or two), painted
      // into the channel's own pieces: no draw call of its own. (Kit tracks; `racingLook: false` leaves it out.)
      const kit = track?.physics?.kit;
      if (kit && this.racingLook) {
        const { parts } = buildRacingLook(this.centerline, this.channel, { lite: this.lite, nature: Boolean(kit.canyon || kit.river || kit.peak), athletics: Boolean(kit.athletics) });
        for (const part of parts) {
          const k = Math.min(pieces.length - 1, Math.floor(Math.min(this.centerline.segments - 1, Math.floor((part.s / this.channel.arc) * this.centerline.segments)) / per));
          pieces[k] = paintInto(pieces[k], part);
        }
      }
      for (const piece of pieces) this.trackGroup.add(new Mesh(piece, this.trackMaterial));
    }
    const arch = this.buildFinishArch(track);
    // The Holiday Season's layer (looks only): string lights, the place's weather, the winner's fireworks (./holidayLayer.js).
    this.holiday?.dispose();
    this.holiday = buildHolidayLayer(track, this.centerline, {
      ...this.archSize,
      startHalf: this.channel ? channelRadiusAt(this.channel, 0) + TRACK_STYLE.wallThickness : this.archSize.half,
      lite: this.lite,
      precipitation: Boolean(theme?.effects?.precipitation),
    });
    if (this.holiday) this.trackGroup.add(this.holiday.group);
    // Kit tracks: the finish's pieces drawn as one mesh per material (a few draw calls, not a dozen).
    // (Phones on the older worlds too: 27 Oct 2026, the phone's 35 calls. All boxes, so their plain colours
    // baked into one flat-shaded mesh look the same.)
    this.trackGroup.add(track?.physics?.kit || this.lite ? mergeByMaterial(arch) : arch);
    // Boost pads, speed bumps and obstacles (ice channels with physics.features).
    this.features = this.channel ? buildTrackFeatures(this.centerline, this.channel, track?.physics?.features, { lite: this.lite, compact: Boolean(track?.physics?.kit) || this.lite, ...(this.lite && !track?.physics?.kit && { area: 1000 }), season: Boolean(track?.physics?.kit?.season) }) : null;
    if (this.features) this.trackGroup.add(this.features.group);
    // Track and Field: the tartan's white lane lines, start and finish lines and lane numbers (part of the track's surface).
    if (this.channel && track?.physics?.kit?.athletics) {
      const marks = buildLaneMarkings(this.centerline, this.channel, { lite: this.lite, kit: track.physics.kit });
      this.trackGroup.add(marks.lines);
      if (marks.numbers) this.trackGroup.add(marks.numbers);
    }
    // TV moments: the track's fixed trackside cameras (./tvMoments.js).
    this.tvCams = tvCameras(this.centerline, this.channel, tvSpots(track?.physics));
    // Mid race, a camera or two keep for the pack shot (TV.pack); the others follow the marble as before.
    this.tvPackCams = packCams(this.tvCams);
    this.tvFollowCams = this.tvCams.filter((c) => !this.tvPackCams.includes(c));
    // Tunnels, bridges and waterfalls (tracks built with the track kit).
    this.structures = this.channel ? buildStructures(this.centerline, this.channel, track?.physics?.kit, { lite: this.lite }) : null;
    if (this.structures) this.trackGroup.add(this.structures.group);
    // Billboards (kit tracks): our own promotions at once, the server's images as they load.
    this.billboards = this.sceneryOn && this.channel ? buildBillboards(this.centerline, this.channel, track?.physics?.kit, { lite: this.lite }) : null;
    if (this.billboards) {
      this.billboards.group.traverse((o) => o.layers.set(SCENERY_LAYER));
      this.trackGroup.add(this.billboards.group);
      const boards = this.billboards;
      this.billboardSource(track.slug)
        .then((list) => { if (boards === this.billboards && !this.disposed) boards.setImages(list); })
        .catch(() => { /* the promotions stay */ });
    }
    // Scenery a moment later, so the track shows straight away even on slow phones.
    const token = (this.buildToken = (this.buildToken || 0) + 1);
    // whenReady(): the whole world built (the scenery too), so a race can be shown without the view stalling.
    let built;
    this.builtPromise = new Promise((resolve) => { built = resolve; });
    if (theme.scenery && this.sceneryOn) {
      setTimeout(() => {
        if (token !== this.buildToken || this.disposed) { built(); return; } // another track was chosen meanwhile
        this.stationRoof = null;
        this.finishCut = undefined;
        this.scenery = buildScenery(theme, this.centerline, track, { lite: this.lite });
        if (this.scenery) {
          this.scenery.traverse((o) => o.layers.set(SCENERY_LAYER));
          this.trackGroup.add(this.scenery);
          this.prepareFinishCut();
          // The TV cameras stand a little higher wherever the scenery leaves room (TV.raise).
          this.tvCams = tvCameras(this.centerline, this.channel, tvSpots(track?.physics), { scenery: this.scenery });
          this.tvPackCams = packCams(this.tvCams);
          this.tvFollowCams = this.tvCams.filter((c) => !this.tvPackCams.includes(c));
        }
        this.render();
        built();
      }, 30);
    } else {
      built();
    }

    // Ground far bigger than the view, fading into the haze so no edge shows.
    const sphere = geometry.boundingSphere;
    const size = Math.max(2000, sphere.radius * 40);
    this.ground.scale.set(size, size, 1);
    this.ground.position.x = sphere.center.x;
    this.ground.position.z = sphere.center.z;
    this.scene.fog.near = sphere.radius * 2;
    this.scene.fog.far = sphere.radius * 7;
    // A preset's own haze (fog, snow, rain, night): metres, the same on every track.
    if (theme.fogRange) [this.scene.fog.near, this.scene.fog.far] = theme.fogRange;
    // Its sky and weather: stars and northern lights on the sky, snow or rain round the camera, rim lights at night.
    this.effects = buildEffects(theme, { centerline: this.centerline, channel: this.channel, lite: this.lite });
    if (this.effects) {
      this.sky.add(this.effects.sky);
      this.scene.add(this.effects.world);
    }
    this.userMoved = false;
    this.frameTrack();
    this.render();
  }

  buildFinishArch(track) {
    const lanes = Math.max(1, Number(track?.lane_count) || 4);
    const pen = this.channel?.runout;
    const half = (pen ? pen.halfWidth + 0.6 : (lanes * TRACK_STYLE.laneWidth) / 2) + TRACK_STYLE.wallThickness;
    const end = this.centerline.samples[this.centerline.samples.length - 1];
    const group = new Group();
    group.name = 'finish arch';
    const archH = pen ? 14 : 6; // tall over a catch area, so the finish shot looks under it at the finishers and the view beyond
    this.archSize = { half, archH };
    const post = new BoxGeometry(0.6, archH, 0.6);
    const white = new MeshLambertMaterial({ color: '#ffffff' });
    const red = new MeshLambertMaterial({ color: '#ef4444' });
    for (const s of [-1, 1]) {
      const m = new Mesh(post, red);
      m.position.set(end.pos.x + end.side.x * half * s, end.pos.y + archH / 2, end.pos.z + end.side.z * half * s);
      group.add(m);
    }
    // A Grand Prix finish: a chequered gantry (posts and banner in black and white).
    const chequered = Boolean(track?.physics?.kit?.grandPrix);
    if (chequered) for (const m of group.children) m.material = new MeshLambertMaterial({ color: '#1d1f24' });
    const banner = new Mesh(new BoxGeometry(half * 2 + 0.6, chequered ? 1.8 : 1.4, 0.4), chequered ? chequerMaterial(half * 2 + 0.6) : white);
    banner.position.set(end.pos.x, end.pos.y + archH, end.pos.z);
    banner.lookAt(end.pos.x + end.tangent.x, end.pos.y + archH, end.pos.z + end.tangent.z);
    group.add(banner);

    if (pen) {
      group.add(this.buildCatchArea(pen, end));
      return group;
    }

    // A flat run-out past the line where finished marbles roll in and park.
    const runout = new Group();
    const floorMat = new MeshLambertMaterial({ color: TRACK_STYLE.colors.floorA });
    const wallMat = new MeshLambertMaterial({ color: TRACK_STYLE.colors.wallInner });
    const inner = (lanes * TRACK_STYLE.laneWidth) / 2;
    const floor = new Mesh(new BoxGeometry(inner * 2, 0.4, RUNOUT_LENGTH), floorMat);
    floor.position.set(0, -0.2, RUNOUT_LENGTH / 2);
    runout.add(floor);
    for (const s of [-1, 1]) {
      const wall = new Mesh(new BoxGeometry(TRACK_STYLE.wallThickness, TRACK_STYLE.wallHeight + 0.4, RUNOUT_LENGTH), wallMat);
      wall.position.set(s * (inner + TRACK_STYLE.wallThickness / 2), TRACK_STYLE.wallHeight / 2 - 0.2, RUNOUT_LENGTH / 2);
      runout.add(wall);
    }
    const endWall = new Mesh(new BoxGeometry(inner * 2 + TRACK_STYLE.wallThickness * 2, TRACK_STYLE.wallHeight + 0.4, TRACK_STYLE.wallThickness), wallMat);
    endWall.position.set(0, TRACK_STYLE.wallHeight / 2 - 0.2, RUNOUT_LENGTH + TRACK_STYLE.wallThickness / 2);
    runout.add(endWall);
    runout.position.copy(end.pos);
    runout.lookAt(end.pos.x + end.tangent.x, end.pos.y, end.pos.z + end.tangent.z);
    group.add(runout);
    return group;
  }

  /**
   * The catch area past an ice channel's finish (physics preview): a pen
   * with brushed ice falling gently to a padded cushion, where finishers
   * roll in and bump into the ones already there.
   */
  buildCatchArea(pen, end) {
    const area = new Group();
    area.name = 'catch area';
    const drop = pen.length * PEN_DROP;
    const tilt = Math.atan(PEN_DROP);
    const floorLen = Math.hypot(pen.length, drop);
    const wallH = 1.6;
    const wallT = TRACK_STYLE.wallThickness;
    const street = this.channel?.look === 'street';
    const plain = channelColors(this.channel); // ice or sand
    const floorMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.floorB : plain.iceB });
    const wallMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.wallA : plain.outer });
    const rimMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.rim : plain.rim });
    const cushionMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.nose : plain.nose });
    // The floor, tipped down towards the cushion (local z runs down the pen).
    const floor = new Mesh(new BoxGeometry(pen.halfWidth * 2, 0.4, floorLen), floorMat);
    floor.position.set(0, -0.2 - drop / 2, pen.length / 2);
    floor.rotation.x = tilt;
    area.add(floor);
    // Brush strips across the floor, every few metres.
    const brushMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.kerbB : plain.outerDark });
    for (let z = 6; z < pen.length - 1; z += 6) {
      const brush = new Mesh(new BoxGeometry(pen.halfWidth * 2, 0.02, 0.8), brushMat);
      brush.position.set(0, 0.01 - z * PEN_DROP, z);
      brush.rotation.x = tilt;
      area.add(brush);
    }
    for (const side of [-1, 1]) {
      const wall = new Mesh(new BoxGeometry(wallT, wallH + drop + 0.4, pen.length), wallMat);
      wall.position.set(side * (pen.halfWidth + wallT / 2), (wallH - drop) / 2 - 0.2, pen.length / 2);
      area.add(wall);
      const rim = new Mesh(new BoxGeometry(wallT + 0.1, 0.12, pen.length), rimMat);
      rim.position.set(side * (pen.halfWidth + wallT / 2), wallH, pen.length / 2);
      area.add(rim);
    }
    // The padded end cushion.
    const cushion = new Mesh(new BoxGeometry(pen.halfWidth * 2 + wallT * 2, wallH + 0.6, 0.8), cushionMat);
    cushion.position.set(0, wallH / 2 - drop, pen.length + 0.4);
    area.add(cushion);
    area.position.copy(end.pos);
    area.lookAt(end.pos.x + end.tangent.x, end.pos.y, end.pos.z + end.tangent.z);
    return area;
  }

  /** Overview camera: the whole track in view from a high three-quarter angle. */
  frameTrack() {
    if (!this.trackMesh) return;
    const { center, radius } = this.trackMesh.geometry.boundingSphere;
    // Fit to the narrower of the vertical and horizontal fields of view (portrait phones).
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const dist = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * 0.95;
    const dir = new Vector3(0.55, 0.55, 0.9).normalize();
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.camera.near = Math.max(0.5, dist / 1000);
    this.camera.far = dist * 6;
    this.sky.position.copy(center);
    this.sky.scale.setScalar(dist * 4);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
    if (this.controls) {
      this.controls.target.copy(center);
      this.controls.minDistance = radius * 0.15;
      this.controls.maxDistance = dist * 2.5;
      this.controls.update();
    }
  }

  /** Adds the marbles of a race (entries from the race meta / replay). */
  /**
   * start (optional, tracks with a starting gate): { releaseMs, frame } — when
   * each paddle lets its marble go, and the first frame (marbles waiting at the gate).
   */
  setRace(entries, highlight = [], results = [], start = null) {
    this.clearRace();
    this.main.leader = null;
    this.tvPack = null;
    this.tvPackDone = null;
    this.tvPackRace = packRace(entries); // (about every other race: TV.pack.share)
    this.tvShot = null;
    this.leadTrail = [];
    this.inset.leader = null;
    this.inset.ready = false;
    this.countdownMs = start?.countdownMs;
    const lanes = Math.max(1, Number(this.track?.lane_count) || 4);
    this.marbles = new RaceMarbles(entries, lanes, highlight, results);
    if (this.theme?.effects?.night) this.marbles.setGlow(true); // (night: marbles glow in their own colours)
    this.marbles.channel = this.channel;
    this.marbles.solidsAt = this.features?.solidsAt ?? null; // drawn round the obstacles, as the physics has them
    this.scene.add(this.marbles.group);
    if (start?.frame && start.releaseMs) {
      this.gate = new StartGate(gatePlaces(this.centerline, start.frame, lanes, this.channel), start.releaseMs, { lights: Boolean(this.track?.physics?.kit?.grandPrix), style: (this.track?.physics?.kit?.start ?? this.track?.physics?.startLook)?.gate ?? 'paddle', athletics: Boolean(this.track?.physics?.kit?.athletics) });
      this.scene.add(this.gate.group);
    }
    this.applyMarbleScale();
  }

  clearRace() {
    this.hitches = 0; // (the frame-rate counter counts hold-ups per race)
    if (this.gate) {
      this.scene.remove(this.gate.group);
      this.gate.dispose();
      this.gate = null;
    }
    if (!this.marbles) return;
    this.scene.remove(this.marbles.group);
    this.marbles.dispose();
    this.marbles = null;
  }

  /** Real size when following; bigger than life in the whole-track view so the pack shows. */
  applyMarbleScale() {
    if (!this.marbles || !this.trackMesh) return;
    const radius = this.trackMesh.geometry.boundingSphere.radius;
    this.marbles.setScale(this.cameraMode === 'follow' ? 1 : Math.min(8, Math.max(1, radius / 45)));
  }

  /** 'overview' (whole track, drag to look around) or 'follow' (chase camera behind one marble). */
  setCameraMode(mode) {
    if (mode === this.cameraMode) return;
    this.cameraMode = mode;
    this.main.ready = false;
    if (this.controls) this.controls.enabled = mode === 'overview';
    if (mode === 'overview') {
      this.userMoved = false;
      this.frameTrack();
    } else {
      this.camera.near = 0.3;
      this.camera.far = this.trackMesh ? this.trackMesh.geometry.boundingSphere.radius * 10 : 3000;
      this.camera.updateProjectionMatrix();
    }
    this.applyMarbleScale();
    this.render();
  }

  /**
   * The flyover before a race (flyover.js): the flight over this track, worked out once per track.
   * → { durationMs, poseAt(ms) } or null (no track yet).
   */
  flyoverFor() {
    if (!this.centerline) return null;
    // (Worked out again for another track, another screen shape, or once the field is at the gate.)
    const key = `${this.track?.slug}|${this.camera.aspect.toFixed(2)}|${Boolean(this.gate)}`;
    if (this.flyover?.key === key) return this.flyover.path;
    this.flyoverTopAt ??= { slug: null };
    if (this.flyoverTopAt.slug !== this.track?.slug) {
      this.flyoverTopAt = {
        slug: this.track?.slug,
        topAt: flyoverTop({
          groups: [this.scenery, this.structures?.group, this.billboards?.group, this.trackMesh],
          trackBelow: (x, z) => this.trackBelow(x, z),
          groundY: TRACK_STYLE.groundY,
        }),
      };
    }
    const path = flyoverPath(this.centerline, this.flyoverTopAt.topAt, {
      highlight: flyoverHighlight(this.track), end: this.countdownStart(), aspect: this.camera.aspect, fov: this.camera.fov,
    });
    this.flyover = { key, path };
    return path;
  }

  /** Where the countdown's camera begins (the flyover ends there), once the field is at the gate; else null. */
  countdownStart() {
    const gate = this.gate?.startFrame?.();
    if (!gate) return null;
    const shots = (this.track?.physics?.kit?.start ?? this.track?.physics?.startLook)?.shots;
    const launch = shots?.launch && shots.launch !== 'high-behind' ? shots.launch : null;
    const shot = (launch && launchPose(launch, gate)) || startLineShot(gate, this.camera.aspect, this.camera.fov);
    const cd = this.countdownMs ?? 3000;
    return countdownPose(-cd, cd, gate, shot, this.camera.aspect, { liftHill: this.scenery?.userData?.liftHill, shot: shots?.countdown ?? 'classic' });
  }

  /** The big view `ms` into the flyover (the race's own camera moves are overridden for that frame). */
  showFlyover(ms) {
    const path = this.flyoverFor();
    if (!path) return;
    const { camera, target } = path.poseAt(ms);
    this.camera.position.copy(camera);
    this.camera.lookAt(target);
    this.main.ready = false; // (the follow camera starts afresh from wherever the race's camera puts it next)
    // (Phones: the smallest details left out of the high wide view, fading back as the camera moves in.)
    this.setFlyoverDetail(this.lite ? this.flyoverDetailAt(path, ms) : 1);
    this.render();
  }

  /**
   * Phones: how much of the flyover's details to draw at `ms` (0 to 1). The flight says when they may come
   * back (path.detailAt: in close, or before a glide reaches the gate); they then fade in over DETAIL_FADE_MS,
   * but only once the frame with them stays within PHONE_FLY_CALLS draw calls; until then they stay out, and
   * the countdown's camera, where the flight hands over, has them all. Never back out once fading in.
   */
  flyoverDetailAt(path, ms) {
    const fly = this.flyDetailRun;
    if (!fly || fly.path !== path || ms < fly.ms) this.flyDetailRun = { path, ms, from: null };
    const run = this.flyDetailRun;
    run.ms = ms;
    const may = path.detailAt?.(ms) ?? 1;
    if (may >= 1 && (ms >= path.durationMs || !path.cut)) return 1; // (the hand-over, or a glide at the gate)
    if (run.from === null) {
      if (may <= 0) return 0;
      if (!path.cut && may > 0) run.from = ms; // (a glide: on schedule, so all is back before the gate)
      else if (this.flyoverCallsWithDetail() <= PHONE_FLY_CALLS) run.from = ms;
      else return 0;
    }
    const k = Math.min(1, Math.max(0, (ms - run.from) / DETAIL_FADE_MS));
    return k * k * (3 - 2 * k);
  }

  /** The draw calls the big view would make with the flyover's details (as the renderer culls; the marbles aside). */
  flyoverCallsWithDetail() {
    this.camera.updateMatrixWorld();
    const frustum = (this.flyFrustum ??= new Frustum());
    frustum.setFromProjectionMatrix((this.flyMatrix ??= new Matrix4()).multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    const marbles = this.marbles?.group;
    const shown = (o) => (o.isMesh || o.isLine || o.isPoints || o.isSprite) && (!o.frustumCulled || frustum.intersectsObject(o));
    // (A see-through two-sided material draws twice: its back faces, then its front.)
    const one = (m) => (m?.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1);
    const calls = (o) => (Array.isArray(o.material) ? o.material.reduce((t, m) => t + one(m), 0) : one(o.material));
    let n = 0;
    this.scene.traverseVisible((o) => { if (shown(o)) n += calls(o); }); // (now, with the details left out)
    for (const g of this.flyDetailGroups ?? []) {
      if (g === marbles || g.userData.flyHidden === false) continue;
      g.traverse((o) => { if ((o === g || o.visible) && shown(o)) n += calls(o); });
    }
    return n;
  }

  /**
   * The flyover's detail level on phones (flyover.js detailAt; Moses, 26 Oct 2026): 0 leaves out the
   * obstacles and their costumes, the billboards, the gate and the field, 1 draws them as always, and in
   * between they fade in (their materials swapped for see-through copies only for those frames). Looks only.
   */
  setFlyoverDetail(k) {
    const level = Math.min(1, Math.max(0, k));
    if (this.flyDetail === level || (this.flyDetail === undefined && level === 1)) return;
    this.flyDetail = level;
    // (The scenery's people too: tiny figures, one or two calls of their own.)
    if (!this.flyFigures || this.flyFigures.of !== this.scenery) {
      const figures = [];
      this.scenery?.traverse((o) => { if (/^figures/.test(o.name)) figures.push(o); });
      this.flyFigures = { of: this.scenery, figures };
    }
    const groups = [this.features?.group, this.billboards?.group, this.gate?.group, this.marbles?.group, ...this.flyFigures.figures].filter(Boolean);
    this.flyDetailGroups = groups;
    for (const g of groups) {
      if (level === 0) {
        if (g.userData.flyHidden === undefined) g.userData.flyHidden = g.visible;
        g.visible = false;
      } else if (g.userData.flyHidden !== undefined) {
        g.visible = g.userData.flyHidden;
        delete g.userData.flyHidden;
      }
      g.traverse((o) => {
        if (!o.isMesh && !o.isPoints && !o.isSprite) return;
        const own = o.userData.flyMaterial;
        if (level <= 0 || level >= 1) {
          if (own) { o.material = own; delete o.userData.flyMaterial; }
          return;
        }
        if (!own) {
          o.userData.flyMaterial = o.material;
          const fade = (m) => { const c = m.clone(); c.transparent = true; c.userData.flyOpacity = m.opacity ?? 1; return c; };
          o.userData.flyFade ??= Array.isArray(o.material) ? o.material.map(fade) : fade(o.material);
          o.material = o.userData.flyFade;
        }
        for (const m of [o.material].flat()) m.opacity = m.userData.flyOpacity * level;
      });
    }
  }

  /** How long the countdown before GO runs (ms), for the starting camera. */
  setCountdown(ms) {
    this.countdownMs = ms;
  }

  /**
   * Which marble a camera follows: an entry index, 'leader', 'second'
   * (whoever is in second place) or 'arriving' (the first marble not yet home:
   * the field coming in after the winner). The leader (or second) only changes
   * when another marble is clearly ahead or behind (a few metres), so a field
   * running level at the start doesn't swing the camera from marble to marble
   * across the track.
   */
  followedIndex(frame, follow, rig = this.main) {
    const rank = follow === 'leader' ? 0 : follow === 'second' ? 1 : follow === 'arriving' ? 0 : -1;
    if (rank < 0) {
      rig.leader = null;
      return follow;
    }
    const s = frame.s ?? [];
    const want = follow === 'arriving'
      ? (s.find((i) => frame.p[i] < 1) ?? s[s.length - 1] ?? 0)
      : (s[rank] ?? s[0] ?? 0);
    // Coming home: on to the next one as soon as the one followed is across the line.
    if (follow === 'arriving' && rig.leader !== null && rig.leader !== undefined && frame.p[rig.leader] >= 1 && frame.p[want] < 1) rig.leader = want;
    const jumpedBack = rig.leaderT !== undefined && frame.t < rig.leaderT - 500; // a replay scrubbed back
    rig.leaderT = frame.t;
    if (rig.leader === null || rig.leader === undefined || jumpedBack || frame.p[rig.leader] === undefined) {
      rig.leader = want;
      return want;
    }
    if (!this.arcLength) this.arcLength = this.measureArc();
    const gap = Math.abs(frame.p[want] - frame.p[rig.leader]) * this.arcLength;
    if (want !== rig.leader && (gap > LEADER_MARGIN || frame.p[want] >= 1)) rig.leader = want;
    return rig.leader;
  }

  measureArc() {
    const { samples } = this.centerline;
    let len = 0;
    for (let i = 1; i < samples.length; i += 1) len += samples[i].pos.distanceTo(samples[i - 1].pos);
    return len;
  }

  /**
   * The crowd stands (Grand Prix) within `metres` of marble `index` now → their numbers (the race view
   * plays the crowd's cheer once per stand when the player's own marble passes one). Drawing only.
   */
  crowdsNear(index, metres = CHEER_NEAR) {
    const crowds = this.scenery?.userData?.crowds;
    const pos = this.marbles?.positions?.[index];
    if (!crowds?.length || !pos) return [];
    const near = [];
    crowds.forEach((c, k) => { if (c.distanceTo(pos) <= metres) near.push(k); });
    return near;
  }

  /**
   * Moves the marbles to a race frame and eases the cameras along.
   * follow: who the big view follows (an entry index, 'leader' or 'second');
   * insetFollow: who the small corner view follows, or null for no corner view.
   * dt = seconds since the last call.
   */
  updateRace(frame, follow = 'leader', dt = 1 / 60, insetFollow = null) {
    this.setFlyoverDetail(1); // (the race's own camera has every detail: the flyover leaves some out only on its frames)
    if (!this.marbles || !frame) return;
    this.gate?.update(frame.t);
    this.marbles.update(this.centerline, frame);
    // The track's features: the bear's swipe, puffs where marbles hit obstacles, boost streaks.
    this.features?.update(frame.t, { frame, positions: this.marbles.positions, contacts: this.marbles.contacts });
    this.structures?.update(frame.t);
    this.scenery?.userData?.update?.(frame.t, { frame, positions: this.marbles.positions, names: this.marbles.names }); // (kit sceneries: idle movements, lifts; Grand Prix crowds)
    const index = this.followedIndex(frame, follow, this.main);
    this.celebrate(frame, index);
    this.holiday?.race(frame.t, this.celebration?.ms ?? null);
    const at = this.marbles.positionOf(index);
    const main = this.main;
    const gate = this.cameraMode === 'follow' && this.gate && at ? this.gate.startFrame() : null;
    // The varied starts: a track's own countdown shot and first-seconds shot (kit start.shots); none: the classic start.
    const shots = (this.track?.physics?.kit?.start ?? this.track?.physics?.startLook)?.shots; // (a hand-built track: its own startLook)
    const launch = gate && shots?.launch && shots.launch !== 'high-behind' ? shots.launch : null;
    if (gate && frame.t < 0) {
      // The countdown: the starting camera's path, ending at rest on the
      // starting-line shot at GO (the follow camera starts afresh after it),
      // or on the first-seconds shot a track has chosen.
      const shot = (launch && launchPose(launch, gate)) || startLineShot(gate, this.camera.aspect, this.camera.fov);
      const pose = countdownPose(frame.t, this.countdownMs ?? 3000, gate, shot, this.camera.aspect, { liftHill: this.scenery?.userData?.liftHill, shot: shots?.countdown ?? 'classic' });
      main.ready = false;
      this.camera.position.copy(pose.camera);
      this.camera.lookAt(pose.target);
    } else if (this.cameraMode === 'follow' && at) {
      // At the finish the big view settles on the finish shot (see finishShot) and,
      // following the leader or those coming home, stays there once anyone is home.
      main.atFinish = Boolean(this.channel?.runout);
      main.holdFinish = main.atFinish && (follow === 'leader' || follow === 'arriving') && frame.p.some((p) => p >= 1);
      this.updateFollowCamera(at, frame.p[index] ?? 0, dt, main);
      const w = gate ? (launch ? launchHandover(frame.t) : handover(frame.t)) : 1;
      if (launch && w < 1) {
        // The first seconds on the track's own shot, on the field's middle, then over to the follow camera.
        const shot = launchPose(launch, this.fieldFrame(frame));
        this.camera.position.lerpVectors(shot.camera, main.cam, w);
        this.camera.lookAt(shot.target.lerp(main.target, w));
      } else if (w < 1) {
        // Just after GO: from the starting-line shot over to the follow camera, eased in and out.
        const shot = startLineShot(gate, this.camera.aspect, this.camera.fov);
        this.camera.position.lerpVectors(shot.camera, main.cam, w);
        this.camera.lookAt(shot.target.lerp(main.target, w));
      } else {
        this.applyTvMoment(frame, index, at);
      }
    }
    // The corner view: the other marble, from its own follow camera (waiting
    // behind it at the gate during the countdown, then easing along after GO).
    this.insetOn = false;
    if (insetFollow !== null && insetFollow !== undefined && this.insetRect && this.cameraMode === 'follow') {
      const k = this.followedIndex(frame, insetFollow, this.inset);
      const there = this.marbles.positionOf(k);
      if (there) {
        if (frame.t < 0) this.inset.ready = false; // waiting at the gate: sit right behind it
        this.updateFollowCamera(there, frame.p[k] ?? 0, dt, this.inset);
        this.insetOn = true;
        this.insetIndex = k;
      }
    }
    this.render();
  }

  /**
   * TV moments (./tvMoments.js): as the followed marble comes up to one of the track's trackside
   * cameras, the big view cuts to it, the camera turning to keep the marble in view as it passes,
   * then eases back to the follow camera. Off with setTvMoments(false). Drawing only.
   */
  applyTvMoment(frame, index, at) {
    const pulse = (k) => { for (const p of this.marbles.pointers ?? []) if (p.index === index) p.mesh.scale.multiplyScalar(1 + 0.9 * k); };
    const lensBack = () => {
      this.tvShot = null;
      if (this.tvLens === undefined) return;
      this.camera.fov = this.tvLens;
      this.camera.updateProjectionMatrix();
      this.tvLens = undefined;
    };
    if (!this.arcLength) this.arcLength = this.measureArc();
    const arc = this.channel?.arc ?? this.arcLength;
    this.trailLeader(frame, arc);
    if (!this.tvOn || !this.tvCams?.length || !at) { lensBack(); return; }
    const finishAt = arc - 140;
    // The pack shot first (mid race, the biggest bunch), else the followed marble's own TV moment.
    const pack = this.packMoment(frame, arc, finishAt);
    // (A race without its pack shot: every camera follows the marble, as before.)
    const m = pack ?? tvMoment(this.tvPackRace ? this.tvFollowCams ?? this.tvCams : this.tvCams, (frame.p[index] ?? 0) * arc, frame.t, finishAt);
    if (!m) { lensBack(); return; }
    if (this.tvLens === undefined) this.tvLens = this.camera.fov;
    // The TV camera zooms in as a camera operator would: the marble (or the bunch) the same size in the shot however far off.
    const target = pack ? pack.centre : at.clone();
    const zoom = pack ? pack.fov : Math.min(TV.lens[1], Math.max(TV.lens[0], (2 * Math.atan(TV.frame / 2 / Math.max(1, m.cam.pos.distanceTo(target))) * 180) / Math.PI));
    this.camera.fov = this.tvLens + (zoom - this.tvLens) * m.w;
    this.camera.updateProjectionMatrix();
    // Aimed a little up the track behind the marble it follows, so more of the chasers are in the shot (the pack shot: the bunch's middle).
    const back = pack ? null : this.tangentAt(frame.p[index] ?? 0);
    if (back) target.addScaledVector(back, -TV.tilt);
    this.camera.position.lerpVectors(this.main.cam, m.cam.pos, m.w);
    this.camera.lookAt(this.main.target.clone().lerp(target, m.w));
    // The player's own marble: its pointer (the arrow over it) pulses as it comes past.
    if (!pack) pulse(m.w * (0.5 + 0.5 * Math.sin(frame.t / 120)));
    this.tvShot = { pack: Boolean(pack), w: m.w, label: pack && frame.t - this.tvPack.from < TV.pack.label ? this.tvPack.label : null };
  }

  /**
   * The pack shot (TV.pack; Moses, 30 Oct 2026): as the biggest bunch (at least TV.pack.members) comes up
   * to one of the mid-race cameras, that bunch is held for the shot and framed whole:
   * { cam, w, centre (Vector3), across (metres), metres } or null. Worked out from the race's frames only.
   */
  packMoment(frame, arc, finishAt) {
    if (!this.tvPackRace || !this.tvPackCams?.length || !(frame.t >= TV.startGuard)) { this.tvPack = null; return null; }
    if (this.tvPack && frame.t < this.tvPack.from) this.tvPack = null; // a replay scrubbed back
    const metresOf = (members) => {
      const live = members.filter((i) => frame.p[i] < 1);
      return live.length ? live.reduce((n, i) => n + frame.p[i] * arc, 0) / live.length : null;
    };
    if (!this.tvPack) {
      // The biggest bunch coming up to a mid-race camera not yet used, as soon as it is one (TV.pack.members).
      for (const cam of this.tvPackCams) {
        if (this.tvPackDone?.has(cam) || cam.s >= finishAt) continue;
        const bunch = biggestBunch(frame, arc, [cam.s - TV.pack.before, cam.s - TV.pack.hold]);
        if (!bunch || bunch.members.length < TV.pack.members) continue;
        this.tvPack = { cam, members: bunch.members, from: frame.t, label: this.standing(frame, arc, bunch.members) };
        break;
      }
      if (!this.tvPack) return null;
    }
    const metres = metresOf(this.tvPack.members);
    const w = metres === null ? null : packWeight(metres - this.tvPack.cam.s);
    if (w === null) {
      (this.tvPackDone ??= new Set()).add(this.tvPack.cam);
      this.tvPack = null;
      return null;
    }
    const pos = this.tvPack.members.map((i) => this.marbles.positions[i]).filter(Boolean);
    const centre = new Vector3();
    for (const v of pos) centre.add(v);
    centre.divideScalar(Math.max(1, pos.length));
    // The lens that keeps the whole bunch in the shot as the camera sees it (its widest angle off the middle, across
    // the picture's narrower side), with a margin, within TV.pack.lens.
    const eye = this.tvPack.cam.pos;
    const ahead = centre.clone().sub(eye).normalize();
    const off = pos.reduce((n, v) => Math.max(n, ahead.angleTo(v.clone().sub(eye))), 0) + Math.atan((2 * MARBLE_RADIUS * (this.marbles.scale ?? 1)) / Math.max(1, eye.distanceTo(centre)));
    const aspect = Math.min(1, this.camera.aspect || 1);
    const fov = (2 * Math.atan(Math.tan(Math.min(1.2, off * TV.pack.margin)) / aspect) * 180) / Math.PI;
    return { cam: this.tvPack.cam, w, centre, fov: Math.min(TV.pack.lens[1], Math.max(TV.pack.lens[0], fov)), metres };
  }

  /** The leader's trail ([{ t, m }]), for how far behind the leader a place on the track is in time. */
  trailLeader(frame, arc) {
    const lead = frame.s?.[0];
    if (lead === undefined || !Number.isFinite(frame.p[lead])) return;
    const trail = (this.leadTrail ??= []);
    if (trail.length && frame.t < trail[trail.length - 1].t) { trail.length = 0; this.tvPackDone = null; } // scrubbed back / a new race
    if (!trail.length || frame.t > trail[trail.length - 1].t) trail.push({ t: frame.t, m: frame.p[lead] * arc });
  }

  /** How long ago (ms) the leader was `metres` along; null if unknown. */
  leaderAgo(t, metres) {
    const trail = this.leadTrail ?? [];
    if (!trail.length || trail[0].m > metres) return null;
    let lo = 0;
    let hi = trail.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (trail[mid].m >= metres) hi = mid; else lo = mid + 1; }
    return trail[lo].m >= metres ? t - trail[lo].t : null;
  }

  /** The label for the player's own marble during a pack shot ("Leader +1.8 s", "7th, in the pack"…), or null without one. */
  standing(frame, arc, members) {
    const own = this.marbles.pointers?.[0]?.index;
    if (own === undefined || !(frame.p[own] < 1)) return null;
    const order = frame.s ?? [];
    const place = order.indexOf(own) + 1;
    if (place < 1) return null;
    const second = order[1];
    return standingLabel({
      place,
      inPack: members.includes(own),
      aheadMs: place === 1 && second !== undefined ? this.leaderAgo(frame.t, frame.p[second] * arc) : null,
      behindMs: place > 1 ? this.leaderAgo(frame.t, frame.p[own] * arc) : null,
    });
  }

  /** The way along the track (level unit vector) at progress p, or null. */
  tangentAt(p) {
    const { samples, segments } = this.centerline ?? {};
    const s = samples?.[Math.min(segments, Math.max(0, Math.round(p * segments)))];
    return s?.tangent ? new Vector3(s.tangent.x, 0, s.tangent.z).normalize() : null;
  }

  /** The TV shot now ({ pack, w, label }) or null: the viewer shows the label. */
  tvNow() {
    return this.tvOn ? this.tvShot ?? null : null;
  }

  /** Switches TV moments on or off (the viewer's setting). */
  setTvMoments(on) {
    this.tvOn = Boolean(on);
  }

  /**
   * The field's middle and the track's frame there (for the first-seconds shots):
   * { centre, down (along the slope), normal (the ice's up), side (level, across) }.
   */
  fieldFrame(frame) {
    const pos = this.marbles.positions.filter(Boolean);
    const centre = new Vector3();
    for (const v of pos) centre.add(v);
    centre.divideScalar(Math.max(1, pos.length));
    const ps = frame.p.filter((x) => Number.isFinite(x));
    const pm = Math.min(1, Math.max(0, ps.reduce((a, b) => a + b, 0) / Math.max(1, ps.length)));
    const { samples, segments } = this.centerline;
    const sm = samples[Math.round(pm * segments)];
    const down = new Vector3(sm.tangent.x, sm.tangent.y, sm.tangent.z).normalize();
    // Across: the way the gate's frame measures it (startGate.startFrame), so a side shot stays on its side at GO.
    const side = new Vector3().crossVectors(new Vector3(0, 1, 0), new Vector3(down.x, 0, down.z).normalize()).normalize();
    const normal = new Vector3().crossVectors(side, down).normalize();
    if (normal.y < 0) normal.negate();
    centre.addScaledVector(normal, -MARBLE_RADIUS); // (on the ice, as the gate's frame is)
    return { centre, down, normal, side };
  }

  /**
   * Swaps what the big view and the corner view show, instantly: each camera
   * takes over the other's place (and who it is keeping track of as leader).
   */
  swapViews() {
    const keys = ['cam', 'target', 'ready', 'leader', 'leaderT'];
    for (const k of keys) {
      const v = this.main[k];
      this.main[k] = this.inset[k];
      this.inset[k] = v;
    }
    if (this.main.ready) {
      this.camera.position.copy(this.main.cam);
      this.camera.lookAt(this.main.target);
    }
    if (this.inset.ready) {
      this.inset.camera.position.copy(this.inset.cam);
      this.inset.camera.lookAt(this.inset.target);
    }
    this.render();
  }

  /** Where the corner view sits ({ x, y, width, height }, CSS pixels from the canvas's top left), or null for none. */
  setInset(rect) {
    const same = rect && this.insetRect && ['x', 'y', 'width', 'height'].every((k) => rect[k] === this.insetRect[k]);
    if (same || (!rect && !this.insetRect)) return;
    this.insetRect = rect && rect.width > 0 && rect.height > 0 ? { ...rect } : null;
    if (this.insetRect) {
      const cam = this.inset.camera;
      cam.aspect = this.insetRect.width / this.insetRect.height;
      cam.far = this.trackMesh ? this.trackMesh.geometry.boundingSphere.radius * 10 : 3000;
      cam.updateProjectionMatrix();
    }
    this.render();
  }

  /**
   * Where the follow camera wants to be for a marble at `at` (progress along
   * the track): behind it and above, clear of the road behind, the scenery and
   * any other stretch of track. `closer` < 1 brings it in nearer (the small
   * corner view, where a far-off marble would be a speck).
   * `reach` (0.25–1) caps how far out the camera may sit when the marble is
   * hidden from where it wants to be (see keepInSight). `finish` (0–1) takes it
   * that share of the way over to the finish shot.
   * Returns { camera, target, roadTop, clearAbove, level, sight }.
   */
  followPose(at, progress, closer = 1, reach = 1, finish = 0) {
    // Look along the track (not the marble's wobble) so the view stays steady.
    const { samples, segments } = this.centerline;
    const ahead = samples[Math.min(segments, Math.round(Math.min(1, progress + 0.02) * segments))];
    const here = samples[Math.min(segments, Math.round(Math.min(1, progress) * segments))];
    const dir = new Vector3().subVectors(ahead.pos, here.pos).setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(here.tangent.x, 0, here.tangent.z);
    dir.normalize();
    if (!this.arcLength) this.arcLength = this.measureArc();
    // Track height at any progress; before the start it carries on up the first
    // slope, as if the ramp continued (the camera has to clear that too).
    const heightAt = (p) => {
      if (p < 0) return samples[0].pos.y + (samples[0].pos.y - samples[1].pos.y) * (-p * segments);
      const f = Math.min(1, p) * segments;
      const i = Math.min(segments - 1, Math.floor(f));
      return samples[i].pos.y + (samples[i + 1].pos.y - samples[i].pos.y) * (f - i);
    };
    const back = (10 + (Number(this.track?.lane_count) || 4) * 0.8) * closer;
    // Sit behind the marble but nearer the middle of the track: in a channel
    // a marble high up one side would otherwise put the camera outside the
    // wall, looking through it.
    const f = Math.min(1, Math.max(0, progress)) * segments;
    const i0 = Math.min(segments - 1, Math.floor(f));
    const middle = new Vector3().lerpVectors(samples[i0].pos, samples[i0 + 1].pos, f - i0);
    // In the wide, shallow funnel at the start there is no wall to get behind:
    // there the camera sits straight behind its marble and looks straight down
    // the track (pulled across towards the middle it would look diagonally over
    // the field, a lopsided view of a marble out at the edge).
    const widen = this.channel ? channelRadiusAt(this.channel, Math.min(1, Math.max(0, progress)) * this.channel.arc) / this.channel.radius : 1;
    const share = 0.65 - 0.55 * Math.min(1, Math.max(0, (widen - 1.2) / 1.3));
    const anchor = new Vector3(at.x + (middle.x - at.x) * share, at.y, at.z + (middle.z - at.z) * share);
    // Behind and above the marble as seen along the slope it is on, not the
    // horizon: on a steep drop (the bobsleigh's starting ramp) a level camera
    // would sit below the track behind and look up through the ice. The tilt
    // is capped so it never turns into a view from straight above.
    const behind = 8;
    const rise = (heightAt(progress - behind / this.arcLength) - heightAt(progress)) / behind;
    const tilt = Math.asin(Math.min(Math.sin(35 * (Math.PI / 180)), Math.max(0, rise)));
    const camera = new Vector3().copy(anchor)
      .addScaledVector(dir, -back * Math.cos(tilt) + back * 0.55 * Math.sin(tilt));
    camera.y = Math.max(at.y, here.pos.y) + back * Math.sin(tilt) + back * 0.55 * Math.cos(tilt);
    let target = new Vector3().lerpVectors(at, anchor, 0.5).addScaledVector(dir, 4);
    // Down the wide funnel at the start of an ice channel, the big view keeps
    // the whole width in the picture, centred and level like the shot at GO
    // (it carries straight on from it), closing in behind its marble as the
    // funnel narrows into the channel.
    const funnel = this.channel && closer === 1 ? this.funnelShare(progress) : 0;
    if (funnel > 0) {
      const shot = this.fieldShot(progress);
      camera.lerp(shot.camera, funnel);
      target = target.lerp(shot.target, funnel);
    }
    // On a steep street the road behind is higher than the marble: stay above
    // all of it between the camera and the marble, so the view never dips into
    // the hill. Heights between samples are interpolated, so the camera rises
    // and falls smoothly rather than in steps.
    // (Before the start of an ice channel there is nothing: only the track itself counts.)
    const fromP = this.channel ? Math.max(0, progress - (back * 1.5) / this.arcLength) : progress - (back * 1.5) / this.arcLength;
    const toP = Math.min(1, progress);
    let roadTop = Math.max(heightAt(fromP), heightAt(toP));
    for (let i = Math.max(0, Math.ceil(fromP * segments)); i <= Math.floor(toP * segments); i += 1) roadTop = Math.max(roadTop, samples[i].pos.y);
    camera.y = Math.max(camera.y, roadTop + 4);
    // …above the scenery (hills and house roofs), and above any other stretch
    // of track (and the wall holding it up) it swings out over on a hairpin.
    const sceneryTop = this.scenery?.userData?.clearance;
    // On an ice channel only stretches at the marble's own level or below
    // count: in the corkscrew the camera must stay under the level above, with
    // its marble, never climb on top of it.
    const level = this.channel ? { s: Math.min(1, Math.max(0, progress)) * this.channel.arc, y: at.y } : null;
    const clearAbove = (x, z) => Math.max(sceneryTop ? sceneryTop(x, z) : -Infinity, level ? this.channelBounds(x, z, level).floor : this.trackBelow(x, z));
    camera.y = Math.max(camera.y, clearAbove(camera.x, camera.z) + 4);
    const sight = level ? this.keepInSight(camera, at, level, reach) : 1;
    if (finish > 0) {
      // Coming home: over to the finish shot. Pushing in on the winner (closer < 1) moves it in towards them.
      const shot = finishPush(this.finishShot(), at, 1 - Math.min(1, closer));
      camera.lerp(shot.camera, finish);
      target.lerp(shot.target, finish);
    }
    return { camera, target, roadTop, clearAbove, level, sight };
  }

  /**
   * The finish shot (ice channels with a catch area): from above the street
   * just short of the line, looking down over it into the catch area, so the
   * marbles cross the line and roll in to settle right in front of the camera,
   * with the view beyond (San Francisco: the Golden Gate) behind them. Further
   * back on a narrow (phone) screen, so the street's width still fits.
   */
  finishShot() {
    return finishShotPose(this.centerline, this.channel, this.camera.aspect, { fov: this.tvLens ?? this.camera.fov });
  }

  /**
   * Resolves once the track's whole world is built (the scenery comes a moment after the track) and
   * every material in the scene is compiled for the graphics chip, so showing the race never stalls
   * on it (Moses, 22 Oct 2026: on phones the countdown was gone before the first picture). Call it
   * again after the race's marbles are added (setRace): it compiles theirs too. Looks only.
   */
  async whenReady() {
    await (this.builtPromise ?? Promise.resolve());
    if (this.disposed) return;
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await frame();
    try {
      // Compiled off the main thread where the browser can (KHR_parallel_shader_compile), else at once.
      if (typeof this.renderer.compileAsync === 'function') await this.renderer.compileAsync(this.scene, this.camera);
      else this.renderer.compile(this.scene, this.camera);
    } catch { /* (drawing compiles what's left) */ }
    this.render();
    await frame();
    await frame();
  }

  /**
   * No station roof on phones (Moses, 22 Oct 2026, option A): on a phone (the light scenery) or any
   * tall screen the canopy over a coaster's finish is cut away for the whole race, so it never pops
   * out of the picture when the finish shot begins, and the camera needn't stay under it. On computers
   * too while ROOF_ON_COMPUTERS is off: the finish check's last 5 seconds found the canopy covering
   * 5–8% of a computer's picture just before it was cut away (the same pop). Looks only.
   */
  roofless() {
    return !ROOF_ON_COMPUTERS || Boolean(this.lite) || (this.main?.camera?.aspect ?? 1) < ROOFLESS_ASPECT;
  }

  /** The finish shot's cutaway (a coaster station's canopy), or null: finishCutaway. */
  cutaway() {
    if (this.finishCut === undefined) {
      const st = this.scenery?.userData?.station;
      if (st && !this.stationRoof) this.stationRoof = stationRoof(st);
      this.finishCut = finishCutaway(st ? this.stationRoof : null);
    }
    return this.finishCut;
  }

  /** Gives everything drawn reaching into the cutaway (the canopy, the boards on it) its clipping planes, cutting nothing until the finish shot. */
  prepareFinishCut() {
    const cut = this.cutaway();
    if (!cut) return;
    cut.set(false);
    const box = new Box3();
    this.trackGroup.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      box.setFromObject(o);
      if (!cut.touches(box)) return;
      for (const m of [].concat(o.material)) {
        m.clippingPlanes = cut.planes;
        m.clipIntersection = true;
        m.needsUpdate = true;
      }
    });
  }

  /** Ice channels: how much of the way the track is still the wide starting funnel at progress p (1 at the top, 0 once it is the channel). */
  funnelShare(p) {
    const widen = channelRadiusAt(this.channel, Math.min(1, Math.max(0, p)) * this.channel.arc) / this.channel.radius;
    const k = Math.min(1, Math.max(0, (widen - 1.3) / 3.2));
    return k * k * (3 - 2 * k);
  }

  /** Ice channels: the starting-line view (see startLineShot) for the funnel's whole width at progress p. */
  fieldShot(p) {
    const { samples, segments } = this.centerline;
    const f = Math.min(1, Math.max(0, p)) * segments;
    const i = Math.min(segments - 1, Math.floor(f));
    const centre = new Vector3().lerpVectors(samples[i].pos, samples[i + 1].pos, f - i);
    // (The slope taken over the 16 m either side, so it eases from one slope to the next: taken
    // from one segment alone it turned in a step where the steep starting ramp meets a gentler
    // slope, and the shot dropped metres in a frame.)
    const posAt = (q) => {
      const g = Math.min(1, Math.max(0, q)) * segments;
      const k = Math.min(segments - 1, Math.floor(g));
      return new Vector3().lerpVectors(samples[k].pos, samples[k + 1].pos, g - k);
    };
    // (Tracks from the opening library and coasters; tracks built before them keep their camera exactly.)
    const kit = this.track?.physics?.kit;
    const down = kit?.opening || kit?.coaster
      ? new Vector3().subVectors(posAt(p + 16 / (this.arcLength || (this.arcLength = this.measureArc()))), posAt(p - 16 / this.arcLength)).normalize()
      : new Vector3().subVectors(samples[i + 1].pos, samples[i].pos).normalize();
    const normal = new Vector3(0, 1, 0).addScaledVector(down, -down.y).normalize();
    const forward = new Vector3(down.x, 0, down.z).normalize();
    const side = new Vector3().crossVectors(new Vector3(0, 1, 0), forward).normalize();
    const s = Math.min(1, Math.max(0, p)) * this.channel.arc;
    const halfWidth = channelRadiusAt(this.channel, s) * Math.sin(channelLipAt(this.channel, s)) + 0.55;
    return startLineShot({ centre, forward, side, halfWidth, down, normal }, this.camera.aspect, this.camera.fov);
  }

  /**
   * Ice channels: what bounds a camera above the ground-plan spot (x, z) for a
   * marble at `level` ({ s: metres along the track, y: height }). floor: the
   * top of the walls of its own stretch, and of any stretch at its level or
   * below; ceiling: the underside of the lowest stretch passing overhead
   * (another level of the corkscrew, a crossing).
   */
  channelBounds(x, z, level) {
    const ch = this.channel;
    const { samples } = this.centerline;
    const rimH = ch.radius * (1 - Math.cos(ch.maxAngle)) + 0.3;
    let floor = -Infinity;
    let ceiling = Infinity;
    for (let i = 0; i < samples.length; i += 1) {
      const p = samples[i].pos;
      const s = (i / (samples.length - 1)) * ch.arc;
      const R = channelRadiusAt(ch, s);
      const split = forkAt(ch, s)?.apart ?? 0;
      const reach = R * Math.sin(channelLipAt(ch, s)) + split + 0.45 + 2;
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz >= reach * reach) continue;
      const own = Math.abs(s - level.s) < OWN_STRETCH;
      if (own || p.y + rimH <= level.y + 2) floor = Math.max(floor, p.y + rimH);
      else ceiling = Math.min(ceiling, p.y - this.undersideAt(i));
    }
    return { floor, ceiling };
  }

  /**
   * Ice channels: is the view from `from` to `to` blocked by the channel's
   * walls, floor or skirt (another level of the corkscrew, or its own lip on
   * the inside of the hairpin)? The inside of the U is open air.
   */
  channelBlocks(from, to) {
    const ch = this.channel;
    const { samples } = this.centerline;
    const step = ch.arc / (samples.length - 1);
    // Only the cross-sections near the line of sight can be in its way.
    const pad = 30;
    const near = [];
    for (let i = 0; i < samples.length; i += 1) {
      const p = samples[i].pos;
      if (p.x < Math.min(from.x, to.x) - pad || p.x > Math.max(from.x, to.x) + pad) continue;
      if (p.z < Math.min(from.z, to.z) - pad || p.z > Math.max(from.z, to.z) + pad) continue;
      if (p.y < Math.min(from.y, to.y) - pad || p.y > Math.max(from.y, to.y) + pad) continue;
      near.push(i);
    }
    const q = new Vector3();
    const span = from.distanceTo(to);
    const n = Math.max(4, Math.ceil(span / 0.25)); // fine enough not to step over a lip
    for (let k = 1; k < n; k += 1) {
      if ((1 - k / n) * span < 1) break; // right by the marble: it sits in the channel's open inside
      q.lerpVectors(from, to, k / n);
      for (const i of near) {
        const a = samples[i];
        const dx = q.x - a.pos.x;
        const dz = q.z - a.pos.z;
        if (dx * dx + dz * dz > 900) continue; // nowhere near this cross-section
        const plan = Math.hypot(a.tangent.x, a.tangent.z) || 1;
        const along = (dx * a.tangent.x + dz * a.tangent.z) / plan;
        if (Math.abs(along) > step / 2 + 0.3) continue; // not this cross-section's slice (they overlap a little: on the outside of a tight bend they fan apart)
        const x = dx * a.side.x + dz * a.side.z;
        const y = q.y - a.pos.y - (along * a.tangent.y) / plan; // above the floor's line here
        if (this.channelSolid(i * step, x, y)) return true;
      }
    }
    return false;
  }


  /**
   * How far below its floor the channel (and what carries it) reaches at sample i: its skirt,
   * and on a kit track where it passes over itself, the viaduct deck under it too.
   */
  undersideAt(i) {
    return CHANNEL_SKIRT + (this.scenery?.userData?.ground?.over?.[i] ? VIADUCT_DECK : 0);
  }

  /** Ice channels: is the point x metres across and y up from the middle of the floor, s metres along, inside the ice? */
  channelSolid(s, x, y) {
    const ch = this.channel;
    const lip = channelLipAt(ch, s);
    const R = channelRadiusAt(ch, s);
    const fork = forkAt(ch, s);
    const tubes = fork
      ? [1, -1].map((side) => ({ off: side * forkOffset(fork, s), R: forkRadius(fork, ch.radius, s), lip: ch.maxAngle }))
      : [{ off: 0, R, lip }];
    let outer = 0;
    let rimTop = -Infinity;
    for (const t of tubes) {
      const top = t.R * (1 - Math.cos(t.lip));
      const edge = t.R * Math.sin(t.lip);
      const u = x - t.off;
      // Its rim, and just over it (a margin, so the camera gets a clear view over the lip, not a grazing one).
      if (y > top - 0.05 && y <= top + 0.3 && Math.abs(u) >= edge - 0.8 && Math.abs(u) <= edge + 0.65) return true;
      // Open air: inside this channel's U, below its rim.
      if (y <= top + 0.05 && Math.abs(u) <= edge && Math.hypot(u, y - t.R) < t.R - 0.02) return false;
      outer = Math.max(outer, Math.abs(t.off) + edge + 0.45);
      rimTop = Math.max(rimTop, top);
    }
    // The ice itself: the walls, floor and skirt below the rim.
    const i = Math.round((s / ch.arc) * this.centerline.segments);
    return Math.abs(x) <= outer + (this.undersideAt(i) > CHANNEL_SKIRT ? 0.35 : 0) && y <= rimTop + 0.05 && y >= -this.undersideAt(i);
  }

  /**
   * Ice channels: keeps a camera with its marble. It stays under any stretch
   * passing overhead (but above the marble), and if another stretch is still
   * in the way it comes in closer until the marble is in clear sight. It
   * comes no further out than `reach` of the way. Returns how far out it is.
   */
  keepInSight(camera, at, level, reach = 1) {
    const start = camera.clone();
    // A coaster's station canopy: the camera stays under it with its marble, and is never seen through it.
    const st = this.scenery?.userData?.station;
    if (st && !this.stationRoof) this.stationRoof = stationRoof(st);
    const roof = st && !this.roofless() ? this.stationRoof : null;
    // Scenery standing right by the track (a splitter's centrepiece, the start's landmark): never
    // inside it, nor seen through it (clearCheck.js checks the camera keeps CAMERA_CLEAR from it).
    const keepOut = this.scenery?.userData?.cameraKeepOut ?? null;
    // Where the camera would be k of the way out from its marble (1: where it wants to be).
    const place = (k) => {
      camera.lerpVectors(at, start, k);
      if (k < 1) camera.y = Math.max(camera.y, at.y + 1.2);
      const { floor, ceiling } = this.channelBounds(camera.x, camera.z, level);
      camera.y = Math.max(camera.y, floor + 1.5);
      if (camera.y > ceiling - 1) camera.y = Math.max(at.y + 1.2, ceiling - 1);
      if (roof && at.y < roof.bottom && roofBlocks(roof, camera, at)) camera.y = Math.max(at.y + 1.2, Math.min(camera.y, roof.bottom - 0.6));
      return !this.channelBlocks(camera, at) && !(roof && roofBlocks(roof, camera, at)) && !keepOutBlocks(keepOut, camera, at);
    };
    const most = Math.max(0.25, Math.min(1, reach));
    if (place(most)) return most;
    // Otherwise the furthest clear spot on the way in (found by halving, so it
    // moves smoothly from frame to frame rather than in jumps).
    let clear = 0.25;
    let blocked = most;
    for (let n = 0; n < 7; n += 1) {
      const k = (clear + blocked) / 2;
      if (place(k)) clear = k;
      else blocked = k;
    }
    place(clear);
    return clear;
  }


  /**
   * The winner's moment: { index, ms } (who won, and when they crossed), or
   * null. For a few seconds after `ms` (race time) the winner glows under a
   * golden spotlight, and a camera following them pushes in close.
   */
  setCelebration(c) {
    this.celebration = c;
  }

  /** The winner's spotlight and the push-in, for this frame. */
  celebrate(frame, index) {
    const c = this.celebration;
    const since = c ? frame.t - c.ms : -1;
    const smooth = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
    const strength = since >= 0 && since < WINNER_MS ? smooth(since / 350) * (1 - smooth((since - (WINNER_MS - 900)) / 900)) : 0;
    this.glow.set(strength > 0 ? this.marbles.positionOf(c.index) : null, strength, frame.t);
    // Pushing in on the winner over a second and a half, easing back out as the moment ends.
    this.main.push = strength > 0 && index === c.index && this.cameraMode === 'follow' ? 1 - 0.45 * smooth(since / 1500) * strength : 1;
  }

  updateFollowCamera(at, progress, dt, rig = this.main) {
    // When a wall hides the marble the camera comes in at once, but goes back
    // out only gradually: in a tight bend the marble keeps slipping in and out
    // of view, and following that every frame shook the picture.
    const reach = rig.ready && rig.sight !== undefined ? rig.sight + (1 - rig.sight) * (1 - Math.exp(-Math.min(0.25, dt) / SIGHT_EASE)) : 1;
    let finish = 0;
    if (rig.atFinish) {
      // From FINISH_FROM metres short of the line to FINISH_TO past it (the follow
      // camera, trailing behind, passes the finish shot's spot just as its marble
      // crosses), and on once anyone is home when following the leader or the arrivals.
      if (!this.arcLength) this.arcLength = this.measureArc();
      const { samples } = this.centerline;
      const end = samples[samples.length - 1];
      const past = progress < 1
        ? -(1 - progress) * this.arcLength
        : Math.max(0, (at.x - end.pos.x) * end.tangent.x + (at.z - end.pos.z) * end.tangent.z) / (Math.hypot(end.tangent.x, end.tangent.z) || 1);
      const k = Math.min(1, Math.max(0, (past + FINISH_FROM) / (FINISH_FROM + FINISH_TO)));
      finish = rig.holdFinish ? 1 : k * k * (3 - 2 * k);
    }
    const { camera: desired, target, roadTop, clearAbove, level, sight } = this.followPose(at, progress, (rig === this.inset ? INSET_CLOSER : 1) * (rig.push ?? 1), reach, finish);
    // The big view on the finish shot: a coaster station's canopy cut away (the corner view keeps it, see render).
    // (On phones and tall screens the canopy is never drawn: roofless.)
    const cutting = rig === this.main && (finish >= FINISH_CUT_FROM || this.roofless()) && Boolean(this.cutaway());
    if (rig === this.main) {
      this.finishCutOn = cutting;
      this.finishCut?.set(cutting);
    }
    rig.sight = sight;
    // Come in close, it looks down at its marble more (not ahead over it, with the
    // marble at the very bottom of the picture), easing between the two.
    rig.close = rig.ready && rig.close !== undefined ? rig.close + (1 - sight - rig.close) * (1 - Math.exp(-Math.min(0.25, dt) / 0.3)) : 1 - sight;
    target.lerp(at, rig.close * 0.6 * (1 - finish)); // (not on the finish shot: it keeps the finishers framed)
    if (!rig.ready) {
      rig.cam.copy(desired);
      rig.target.copy(target);
      rig.ready = true;
    } else {
      const k = 1 - Math.exp(-Math.min(0.25, dt) * 3.5);
      rig.cam.lerp(desired, k);
      rig.target.lerp(target, Math.min(1, k * 2));
      // Never lag down into the road or the hillside. (Not once over on the finish shot: there the road
      // and the stretches are those of a marble still coming home, maybe far up the hill, and the finish
      // shot's own spot is checked clear, scenery/clearCheck.js finishShotView.)
      const settling = finish < FINISH_HOLD;
      if (settling) rig.cam.y = Math.max(rig.cam.y, roadTop + 2.5, clearAbove(rig.cam.x, rig.cam.z) + 2.5);
      if (level && settling) {
        // Nor up into a stretch passing overhead (it eases towards a spot
        // already clear of every other stretch, see keepInSight).
        const { ceiling } = this.channelBounds(rig.cam.x, rig.cam.z, level);
        if (rig.cam.y > ceiling - 1) rig.cam.y = Math.max(at.y + 1.2, ceiling - 1);
      }
      // Nor, easing down to a spot under a coaster's station canopy, still up inside it (its front
      // beam would cut across the picture): straight down under it with its marble.
      const roof = cutting || !settling ? null : this.stationRoof;
      if (roof && at.y < roof.bottom) {
        const reach = { ...roof, halfLength: roof.halfLength + 0.6, bottom: roof.bottom - 0.6 };
        if (roofBlocks(reach, rig.cam, rig.cam)) rig.cam.y = Math.max(at.y + 1.2, reach.bottom);
      }
    }
    rig.camera.position.copy(rig.cam);
    rig.camera.lookAt(rig.target);
  }


  /** Highest point of the track (with its walls and embankment) near a spot on the ground plan. */
  trackBelow(x, z) {
    const { samples } = this.centerline;
    const half = ((Number(this.track?.lane_count) || 4) * TRACK_STYLE.laneWidth) / 2 + TRACK_STYLE.wallThickness;
    let top = -Infinity;
    for (let i = 0; i < samples.length; i += 1) {
      const p = samples[i].pos;
      if (p.y + TRACK_STYLE.wallHeight <= top) continue;
      const reach = half + TRACK_STYLE.embankmentSlope * Math.max(0, p.y - TRACK_STYLE.groundY) + 2;
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < reach * reach) top = p.y + TRACK_STYLE.wallHeight;
    }
    return top;
  }

  setSize(width, height) {
    this.size = { width, height };
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    if (!this.userMoved && this.cameraMode === 'overview') this.frameTrack(); // keep the whole track in view until the user takes over
    this.render();
  }

  /** Draws on the next animation frame (coalesces repeated requests). */
  render() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    const draw = (now) => {
      // (Phones: skip a screen refresh that comes before the next 60 Hz frame is due.)
      if (this.frameCap && now < (this.nextDue ?? 0) - 2) { requestAnimationFrame(draw); return; }
      if (this.frameCap) this.nextDue = Math.max((this.nextDue ?? now) + this.frameCap, now);
      this.renderQueued = false;
      this.keepPace();
      const r = this.renderer;
      r.info.reset();
      this.effects?.update(performance.now() / 1000, this.camera.position);
      this.holiday?.tick(performance.now() / 1000, this.camera.position);
      r.render(this.scene, this.camera);
      if (this.insetOn && this.insetRect && this.cameraMode === 'follow') {
        // The corner view, drawn over the big one's corner (no scenery: lighter on phones).
        const { x, y, width, height } = this.insetRect;
        const bottom = this.size.height - y - height;
        r.setScissorTest(true);
        r.setScissor(x, bottom, width, height);
        r.setViewport(x, bottom, width, height);
        // (No pointer over the marble the corner view follows: that close behind it, the pointer
        // would hide the marble itself.)
        const own = (this.marbles.pointers ?? []).filter((p) => p.index === this.insetIndex && p.mesh.visible);
        for (const p of own) p.mesh.visible = false;
        this.finishCut?.set(this.roofless());
        r.render(this.scene, this.inset.camera);
        this.finishCut?.set(Boolean(this.finishCutOn));
        for (const p of own) p.mesh.visible = true;
        r.setScissorTest(false);
        r.setViewport(0, 0, this.size.width, this.size.height);
      }
    };
    requestAnimationFrame(draw);
  }

  /**
   * Keeps the picture moving smoothly on a phone that can't keep up: while
   * frames come more than SLOW_FRAME_MS apart (a stutter, not a 30 Hz screen)
   * it draws at a slightly lower resolution, a step at a time, down to one
   * pixel per screen pixel (on phones a little further, PHONE_MIN_PIXEL_RATIO).
   * It never steps back up (no flicker between the two).
   */
  keepPace() {
    const now = performance.now();
    const gap = now - (this.lastDrawn ?? -Infinity);
    this.lastDrawn = now;
    // For the frame-rate counter: when each frame was drawn, and any long hold-ups.
    const drawn = (this.drawn ??= []);
    drawn.push(now);
    while (drawn.length && drawn[0] < now - 2000) drawn.shift();
    if (Number.isFinite(gap) && gap > HITCH_MS) this.hitches = (this.hitches ?? 0) + 1;
    if (gap > 250) return; // a pause (or the first frame), not a slow one
    this.pace = this.pace === undefined ? gap : this.pace + (gap - this.pace) * 0.05;
    this.paced = (this.paced ?? 0) + 1;
    const ratio = this.renderer.getPixelRatio();
    const floor = this.minPixelRatio ?? 1;
    if (this.paced < 60 || this.pace < SLOW_FRAME_MS || ratio <= floor || now - (this.lastStepDown ?? -Infinity) < 2000) return;
    this.lastStepDown = now;
    this.renderer.setPixelRatio(Math.max(floor, ratio - 0.25));
    this.renderer.setSize(this.size.width, this.size.height, false);
    this.pace = undefined;
    this.paced = 0;
  }

  /**
   * For the frame-rate counter: frames drawn in the last second, the longest
   * gap between frames in the last two, hold-ups (frames over HITCH_MS apart)
   * so far, and what each frame costs.
   */
  frameStats() {
    const now = performance.now();
    const drawn = (this.drawn ?? []).filter((t) => t > now - 2000);
    let worst = 0;
    for (let k = 1; k < drawn.length; k += 1) worst = Math.max(worst, drawn[k] - drawn[k - 1]);
    if (drawn.length) worst = Math.max(worst, now - drawn[drawn.length - 1]); // (a freeze going on right now)
    const { calls, triangles } = this.renderer.info.render;
    return {
      fps: drawn.filter((t) => t > now - 1000).length,
      worstMs: Math.round(worst),
      hitches: this.hitches ?? 0,
      pixelRatio: this.renderer.getPixelRatio(),
      calls,
      triangles,
      lite: this.lite,
      scenery: this.sceneryOn,
    };
  }

  /** Draw calls and triangles of the last frame, for the ?debug overlay. */
  stats() {
    const { calls, triangles } = this.renderer.info.render;
    return { calls, triangles, pixelRatio: this.renderer.getPixelRatio() };
  }

  clearTrack() {
    this.scenery = null;
    this.features = null; // (its meshes go with the track group below)
    this.structures = null; // (so do the tunnels, bridges and waterfalls)
    this.billboards?.dispose();
    this.billboards = null;
    this.effects?.dispose();
    this.holiday?.dispose();
    this.holiday = null;
    this.effects = null;
    for (const child of [...this.trackGroup.children]) {
      child.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.material !== this.trackMaterial) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      this.trackGroup.remove(child);
    }
  }

  dispose() {
    this.disposed = true;
    this.glow.dispose();
    this.clearRace();
    this.clearTrack();
    this.controls?.dispose();
    this.trackMaterial.dispose();
    this.ground.geometry.dispose();
    this.ground.material.dispose();
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.renderer.dispose();
  }
}
