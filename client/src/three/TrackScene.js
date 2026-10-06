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
import { buildIceChannelGeometry, channelLipAt, channelOf, channelRadiusAt, ICE_COLORS } from './iceChannel';
import { DEFAULT_THEME, themeFor } from './themes';
import { gatePlaces, StartGate } from './startGate';
import { countdownPose } from './startCamera';

const LEADER_MARGIN = 3; // metres: the follow camera only switches to a new leader that is clearly ahead
const SCENERY_LAYER = 1;  // scenery is drawn in the big view only (the small corner view skips it, for speed)
const INSET_CLOSER = 0.6; // the corner view's follow camera sits this much nearer its marble

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
    const archH = pen ? 10 : 6; // taller over a catch area, so the follow camera sees the finishers under it
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
    const floorMat = new MeshLambertMaterial({ color: ICE_COLORS.iceB });
    const wallMat = new MeshLambertMaterial({ color: ICE_COLORS.outer });
    const rimMat = new MeshLambertMaterial({ color: ICE_COLORS.rim });
    const cushionMat = new MeshLambertMaterial({ color: ICE_COLORS.nose });
    // The floor, tipped down towards the cushion (local z runs down the pen).
    const floor = new Mesh(new BoxGeometry(pen.halfWidth * 2, 0.4, floorLen), floorMat);
    floor.position.set(0, -0.2 - drop / 2, pen.length / 2);
    floor.rotation.x = tilt;
    area.add(floor);
    // Brush strips across the floor, every few metres.
    const brushMat = new MeshLambertMaterial({ color: ICE_COLORS.outerDark });
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
   * Which marble a camera follows: an entry index, 'leader', or 'second'
   * (whoever is in second place). The leader (or second) only changes when
   * another marble is clearly ahead or behind (a few metres), so a field
   * running level at the start doesn't swing the camera from marble to marble
   * across the track.
   */
  followedIndex(frame, follow, rig = this.main) {
    const rank = follow === 'leader' ? 0 : follow === 'second' ? 1 : -1;
    if (rank < 0) {
      rig.leader = null;
      return follow;
    }
    const want = frame.s?.[rank] ?? frame.s?.[0] ?? 0;
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
    const index = this.followedIndex(frame, follow, this.main);
    const at = this.marbles.positionOf(index);
    const main = this.main;
    if (this.cameraMode === 'follow' && this.gate && frame.t < 0 && at) {
      // The countdown: the starting camera's path, ending exactly where the follow camera starts at GO.
      const end = this.followPose(at, frame.p[index] ?? 0);
      const pose = countdownPose(frame.t, this.countdownMs ?? 3000, this.gate.startFrame(), end, this.camera.aspect);
      main.cam.copy(pose.camera);
      main.target.copy(pose.target);
      main.ready = true;
      this.camera.position.copy(main.cam);
      this.camera.lookAt(main.target);
    } else if (this.cameraMode === 'follow' && at) {
      this.updateFollowCamera(at, frame.p[index] ?? 0, dt, main);
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
   * Returns { camera, target, roadTop, clearAbove }.
   */
  followPose(at, progress, closer = 1) {
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
    // Sit behind the marble but nearer the middle of the track: on a wide
    // channel (the bobsleigh funnel) a marble high up one side would otherwise
    // put the camera outside the wall, looking through it.
    const f = Math.min(1, Math.max(0, progress)) * segments;
    const i0 = Math.min(segments - 1, Math.floor(f));
    const middle = new Vector3().lerpVectors(samples[i0].pos, samples[i0 + 1].pos, f - i0);
    const anchor = new Vector3(at.x + (middle.x - at.x) * 0.65, at.y, at.z + (middle.z - at.z) * 0.65);
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
    // On a steep street the road behind is higher than the marble: stay above
    // all of it between the camera and the marble, so the view never dips into
    // the hill. Heights between samples are interpolated, so the camera rises
    // and falls smoothly rather than in steps.
    const fromP = progress - (back * 1.5) / this.arcLength;
    const toP = Math.min(1, progress);
    let roadTop = Math.max(heightAt(fromP), heightAt(toP));
    for (let i = Math.max(0, Math.ceil(fromP * segments)); i <= Math.floor(toP * segments); i += 1) roadTop = Math.max(roadTop, samples[i].pos.y);
    camera.y = Math.max(camera.y, roadTop + 4);
    // …above the scenery (hills and house roofs), and above any other stretch
    // of track (and the wall holding it up) it swings out over on a hairpin.
    const sceneryTop = this.scenery?.userData?.clearance;
    const clearAbove = (x, z) => Math.max(sceneryTop ? sceneryTop(x, z) : -Infinity, this.trackBelow(x, z));
    camera.y = Math.max(camera.y, clearAbove(camera.x, camera.z) + 4);
    const target = new Vector3().lerpVectors(at, anchor, 0.5).addScaledVector(dir, 4);
    return { camera, target, roadTop, clearAbove };
  }

  updateFollowCamera(at, progress, dt, rig = this.main) {
    const { camera: desired, target, roadTop, clearAbove } = this.followPose(at, progress, rig === this.inset ? INSET_CLOSER : 1);
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
    }
    rig.camera.position.copy(rig.cam);
    rig.camera.lookAt(rig.target);
  }


  /** Highest point of the track (with its walls and embankment) near a spot on the ground plan. */
  trackBelow(x, z) {
    const { samples } = this.centerline;
    if (this.channel) {
      // An ice channel stands on nothing but a short skirt (no earth bank, unlike
      // a road): clear its walls where it really is, however high up it runs.
      const ch = this.channel;
      const rimH = ch.radius * (1 - Math.cos(ch.maxAngle)) + 0.3;
      let top = -Infinity;
      for (let i = 0; i < samples.length; i += 1) {
        const p = samples[i].pos;
        if (p.y + rimH <= top) continue;
        const s = (i / (samples.length - 1)) * ch.arc;
        const R = channelRadiusAt(ch, s);
        const split = ch.fork && s > ch.fork.s0 && s < ch.fork.s1 ? ch.fork.apart : 0;
        const reach = R * Math.sin(channelLipAt(ch, s)) + split + 0.45 + 2;
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz < reach * reach) top = p.y + rimH;
      }
      return top;
    }
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

  /** Draw calls and triangles of the last frame, for the ?debug overlay. */
  stats() {
    const { calls, triangles } = this.renderer.info.render;
    return { calls, triangles, pixelRatio: this.renderer.getPixelRatio() };
  }

  clearTrack() {
    this.scenery = null;
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
