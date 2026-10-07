/**
 * The 3D race scene: a bright cartoon world with one track in it.
 *
 * Built for ordinary phones: one draw call for the whole track, cheap Lambert
 * lighting with no shadows, a capped pixel ratio, and drawing only when
 * something changes (a race replay drives frames while marbles move).
 */
import {
  AmbientLight, BackSide, BoxGeometry, Color, DirectionalLight, DoubleSide, Float32BufferAttribute, Fog,
  Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, PlaneGeometry,
  Scene, SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildCenterline, buildTrackGeometry, TRACK_STYLE } from './trackModel';
import { PEN_DROP, RaceMarbles, RUNOUT_LENGTH } from './marbles';
import { buildScenery } from './scenery';
import { buildIceChannelGeometry, channelLipAt, channelOf, channelRadiusAt, forkOffset, forkRadius, ICE_COLORS, STREET_COLORS } from './iceChannel';
import { DEFAULT_THEME, themeFor } from './themes';
import { gatePlaces, StartGate } from './startGate';
import { countdownPose, handover, startLineShot } from './startCamera';
import { buildTrackFeatures } from './trackFeatures';
import { WinnerGlow } from './winnerGlow';
import { WINNER_MS } from '../utils/finishShow';

const LEADER_MARGIN = 3; // metres: the follow camera only switches to a new leader that is clearly ahead
const SCENERY_LAYER = 1;  // scenery is drawn in the big view only (the small corner view skips it, for speed)
const SLOW_FRAME_MS = 40; // frames further apart than this on average (under 25 a second): draw at a lower resolution
const FINISH_FROM = 12; // metres short of the line where the big view starts over to the finish shot…
const FINISH_TO = 6; // …and past it where it is there
const SIGHT_EASE = 0.6; // seconds: how gently the follow camera moves back out after coming in to keep its marble in sight
const INSET_CLOSER = 0.6; // the corner view's follow camera sits this much nearer its marble
const OWN_STRETCH = 60;   // metres along the track either side of a marble that count as its own stretch (ice channels; the corkscrew's levels are 155 m apart)
const CHANNEL_SKIRT = 1.6; // metres the ice channel's outer skirt hangs below its floor (iceChannel.js)

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

export class TrackScene {
  constructor(canvas, { interactive = true, maxPixelRatio = 2 } = {}) {
    const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 && window.devicePixelRatio >= 2;
    this.renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : maxPixelRatio));
    this.renderer.outputColorSpace = SRGBColorSpace;
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
  }

  /** Builds the given track (from the API: slug, waypoints, length_m, lane_count) in its world. */
  setTrack(track) {
    this.clearRace();
    this.clearTrack();
    this.arcLength = 0;
    this.centerline = buildCenterline(track);
    this.track = track;
    const theme = themeFor(track?.slug);
    this.applyTheme(theme);
    const style = { ...TRACK_STYLE, colors: { ...TRACK_STYLE.colors, ...theme.track } };
    this.channel = channelOf(track, this.centerline); // ice channel (bobsleigh) instead of a road
    const geometry = this.channel ? buildIceChannelGeometry(this.centerline, this.channel) : buildTrackGeometry(track, this.centerline, style);
    this.trackMesh = new Mesh(geometry, this.trackMaterial);
    this.trackGroup.add(this.trackMesh);
    this.trackGroup.add(this.buildFinishArch(track));
    // Boost pads, speed bumps and obstacles (ice channels with physics.features).
    this.features = this.channel ? buildTrackFeatures(this.centerline, this.channel, track?.physics?.features) : null;
    if (this.features) this.trackGroup.add(this.features.group);
    // Scenery a moment later, so the track shows straight away even on slow phones.
    const token = (this.buildToken = (this.buildToken || 0) + 1);
    if (theme.scenery) {
      setTimeout(() => {
        if (token !== this.buildToken || this.disposed) return; // another track was chosen meanwhile
        this.scenery = buildScenery(theme, this.centerline, track);
        if (this.scenery) {
          this.scenery.traverse((o) => o.layers.set(SCENERY_LAYER));
          this.trackGroup.add(this.scenery);
        }
        this.render();
      }, 30);
    }

    // Ground far bigger than the view, fading into the haze so no edge shows.
    const sphere = geometry.boundingSphere;
    const size = Math.max(2000, sphere.radius * 40);
    this.ground.scale.set(size, size, 1);
    this.ground.position.x = sphere.center.x;
    this.ground.position.z = sphere.center.z;
    this.scene.fog.near = sphere.radius * 2;
    this.scene.fog.far = sphere.radius * 7;
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
    const archH = pen ? 14 : 6; // tall over a catch area, so the finish shot looks under it at the finishers and the view beyond
    const post = new BoxGeometry(0.6, archH, 0.6);
    const white = new MeshLambertMaterial({ color: '#ffffff' });
    const red = new MeshLambertMaterial({ color: '#ef4444' });
    for (const s of [-1, 1]) {
      const m = new Mesh(post, red);
      m.position.set(end.pos.x + end.side.x * half * s, end.pos.y + archH / 2, end.pos.z + end.side.z * half * s);
      group.add(m);
    }
    const banner = new Mesh(new BoxGeometry(half * 2 + 0.6, 1.4, 0.4), white);
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
    const drop = pen.length * PEN_DROP;
    const tilt = Math.atan(PEN_DROP);
    const floorLen = Math.hypot(pen.length, drop);
    const wallH = 1.6;
    const wallT = TRACK_STYLE.wallThickness;
    const street = this.channel?.look === 'street';
    const floorMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.floorB : ICE_COLORS.iceB });
    const wallMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.wallA : ICE_COLORS.outer });
    const rimMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.rim : ICE_COLORS.rim });
    const cushionMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.nose : ICE_COLORS.nose });
    // The floor, tipped down towards the cushion (local z runs down the pen).
    const floor = new Mesh(new BoxGeometry(pen.halfWidth * 2, 0.4, floorLen), floorMat);
    floor.position.set(0, -0.2 - drop / 2, pen.length / 2);
    floor.rotation.x = tilt;
    area.add(floor);
    // Brush strips across the floor, every few metres.
    const brushMat = new MeshLambertMaterial({ color: street ? STREET_COLORS.kerbB : ICE_COLORS.outerDark });
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
    this.inset.leader = null;
    this.inset.ready = false;
    this.countdownMs = start?.countdownMs;
    const lanes = Math.max(1, Number(this.track?.lane_count) || 4);
    this.marbles = new RaceMarbles(entries, lanes, highlight, results);
    this.marbles.channel = this.channel;
    this.marbles.solidsAt = this.features?.solidsAt ?? null; // drawn round the obstacles, as the physics has them
    this.scene.add(this.marbles.group);
    if (start?.frame && start.releaseMs) {
      this.gate = new StartGate(gatePlaces(this.centerline, start.frame, lanes, this.channel), start.releaseMs);
      this.scene.add(this.gate.group);
    }
    this.applyMarbleScale();
  }

  clearRace() {
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
   * Moves the marbles to a race frame and eases the cameras along.
   * follow: who the big view follows (an entry index, 'leader' or 'second');
   * insetFollow: who the small corner view follows, or null for no corner view.
   * dt = seconds since the last call.
   */
  updateRace(frame, follow = 'leader', dt = 1 / 60, insetFollow = null) {
    if (!this.marbles || !frame) return;
    this.gate?.update(frame.t);
    this.marbles.update(this.centerline, frame);
    // The track's features: the bear's swipe, puffs where marbles hit obstacles, boost streaks.
    this.features?.update(frame.t, { frame, positions: this.marbles.positions, contacts: this.marbles.contacts });
    const index = this.followedIndex(frame, follow, this.main);
    this.celebrate(frame, index);
    const at = this.marbles.positionOf(index);
    const main = this.main;
    const gate = this.cameraMode === 'follow' && this.gate && at ? this.gate.startFrame() : null;
    if (gate && frame.t < 0) {
      // The countdown: the starting camera's path, ending at rest on the
      // starting-line shot at GO (the follow camera starts afresh after it).
      const shot = startLineShot(gate, this.camera.aspect, this.camera.fov);
      const pose = countdownPose(frame.t, this.countdownMs ?? 3000, gate, shot, this.camera.aspect);
      main.ready = false;
      this.camera.position.copy(pose.camera);
      this.camera.lookAt(pose.target);
    } else if (this.cameraMode === 'follow' && at) {
      // At the finish the big view settles on the finish shot (see finishShot) and,
      // following the leader or those coming home, stays there once anyone is home.
      main.atFinish = Boolean(this.channel?.runout);
      main.holdFinish = main.atFinish && (follow === 'leader' || follow === 'arriving') && frame.p.some((p) => p >= 1);
      this.updateFollowCamera(at, frame.p[index] ?? 0, dt, main);
      const w = gate ? handover(frame.t) : 1;
      if (w < 1) {
        // Just after GO: from the starting-line shot over to the follow camera, eased in and out.
        const shot = startLineShot(gate, this.camera.aspect, this.camera.fov);
        this.camera.position.lerpVectors(shot.camera, main.cam, w);
        this.camera.lookAt(shot.target.lerp(main.target, w));
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
      }
    }
    this.render();
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
      const shot = this.finishShot();
      const zoom = 1 - Math.min(1, closer);
      shot.camera.lerp(at, zoom * 0.9);
      shot.target.lerp(at, Math.min(1, zoom * 2.2));
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
    const { samples } = this.centerline;
    const end = samples[samples.length - 1];
    const forward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
    const narrow = 1 - Math.min(1, Math.max(0, (this.camera.aspect - 0.5) / 0.9)); // 0 on a wide screen, 1 on a tall phone
    const back = 14 + 7 * narrow;
    const camera = end.pos.clone().addScaledVector(forward, -back);
    camera.y = end.pos.y + 7.5 + narrow; // well under the finish banner (14 m up)
    const ahead = (this.channel.runout.length ?? 30) * 0.75; // looking level enough to show the view beyond
    const target = end.pos.clone().addScaledVector(forward, ahead);
    target.y = end.pos.y - ahead * PEN_DROP;
    return { camera, target };
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
    const down = new Vector3().subVectors(samples[i + 1].pos, samples[i].pos).normalize();
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
      const split = ch.fork && s > ch.fork.s0 && s < ch.fork.s1 ? ch.fork.apart : 0;
      const reach = R * Math.sin(channelLipAt(ch, s)) + split + 0.45 + 2;
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz >= reach * reach) continue;
      const own = Math.abs(s - level.s) < OWN_STRETCH;
      if (own || p.y + rimH <= level.y + 2) floor = Math.max(floor, p.y + rimH);
      else ceiling = Math.min(ceiling, p.y - CHANNEL_SKIRT);
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


  /** Ice channels: is the point x metres across and y up from the middle of the floor, s metres along, inside the ice? */
  channelSolid(s, x, y) {
    const ch = this.channel;
    const lip = channelLipAt(ch, s);
    const R = channelRadiusAt(ch, s);
    const tubes = ch.fork && s > ch.fork.s0 && s < ch.fork.s1
      ? [1, -1].map((side) => ({ off: side * forkOffset(ch.fork, s), R: forkRadius(ch.fork, ch.radius, s), lip: ch.maxAngle }))
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
    return Math.abs(x) <= outer && y <= rimTop + 0.05 && y >= -CHANNEL_SKIRT;
  }

  /**
   * Ice channels: keeps a camera with its marble. It stays under any stretch
   * passing overhead (but above the marble), and if another stretch is still
   * in the way it comes in closer until the marble is in clear sight. It
   * comes no further out than `reach` of the way. Returns how far out it is.
   */
  keepInSight(camera, at, level, reach = 1) {
    const start = camera.clone();
    // Where the camera would be k of the way out from its marble (1: where it wants to be).
    const place = (k) => {
      camera.lerpVectors(at, start, k);
      if (k < 1) camera.y = Math.max(camera.y, at.y + 1.2);
      const { floor, ceiling } = this.channelBounds(camera.x, camera.z, level);
      camera.y = Math.max(camera.y, floor + 1.5);
      if (camera.y > ceiling - 1) camera.y = Math.max(at.y + 1.2, ceiling - 1);
      return !this.channelBlocks(camera, at);
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
    rig.sight = sight;
    // Come in close, it looks down at its marble more (not ahead over it, with the
    // marble at the very bottom of the picture), easing between the two.
    rig.close = rig.ready && rig.close !== undefined ? rig.close + (1 - sight - rig.close) * (1 - Math.exp(-Math.min(0.25, dt) / 0.3)) : 1 - sight;
    target.lerp(at, rig.close * 0.6);
    if (!rig.ready) {
      rig.cam.copy(desired);
      rig.target.copy(target);
      rig.ready = true;
    } else {
      const k = 1 - Math.exp(-Math.min(0.25, dt) * 3.5);
      rig.cam.lerp(desired, k);
      rig.target.lerp(target, Math.min(1, k * 2));
      // Never lag down into the road or the hillside.
      rig.cam.y = Math.max(rig.cam.y, roadTop + 2.5, clearAbove(rig.cam.x, rig.cam.z) + 2.5);
      if (level) {
        // Nor up into a stretch passing overhead (it eases towards a spot
        // already clear of every other stretch, see keepInSight).
        const { ceiling } = this.channelBounds(rig.cam.x, rig.cam.z, level);
        if (rig.cam.y > ceiling - 1) rig.cam.y = Math.max(at.y + 1.2, ceiling - 1);
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
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.keepPace();
      const r = this.renderer;
      r.info.reset();
      r.render(this.scene, this.camera);
      if (this.insetOn && this.insetRect && this.cameraMode === 'follow') {
        // The corner view, drawn over the big one's corner (no scenery: lighter on phones).
        const { x, y, width, height } = this.insetRect;
        const bottom = this.size.height - y - height;
        r.setScissorTest(true);
        r.setScissor(x, bottom, width, height);
        r.setViewport(x, bottom, width, height);
        r.render(this.scene, this.inset.camera);
        r.setScissorTest(false);
        r.setViewport(0, 0, this.size.width, this.size.height);
      }
    });
  }

  /**
   * Keeps the picture moving smoothly on a phone that can't keep up: while
   * frames come more than SLOW_FRAME_MS apart (a stutter, not a 30 Hz screen)
   * it draws at a slightly lower resolution, a step at a time, down to one
   * pixel per screen pixel. It never steps back up (no flicker between the two).
   */
  keepPace() {
    const now = performance.now();
    const gap = now - (this.lastDrawn ?? -Infinity);
    this.lastDrawn = now;
    if (gap > 250) return; // a pause (or the first frame), not a slow one
    this.pace = this.pace === undefined ? gap : this.pace + (gap - this.pace) * 0.05;
    this.paced = (this.paced ?? 0) + 1;
    const ratio = this.renderer.getPixelRatio();
    if (this.paced < 60 || this.pace < SLOW_FRAME_MS || ratio <= 1 || now - (this.lastStepDown ?? -Infinity) < 2000) return;
    this.lastStepDown = now;
    this.renderer.setPixelRatio(Math.max(1, ratio - 0.25));
    this.renderer.setSize(this.size.width, this.size.height, false);
    this.pace = undefined;
    this.paced = 0;
  }

  /** Draw calls and triangles of the last frame, for the ?debug overlay. */
  stats() {
    const { calls, triangles } = this.renderer.info.render;
    return { calls, triangles, pixelRatio: this.renderer.getPixelRatio() };
  }

  clearTrack() {
    this.scenery = null;
    this.features = null; // (its meshes go with the track group below)
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
