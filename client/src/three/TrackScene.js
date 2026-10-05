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
import { RaceMarbles, RUNOUT_LENGTH } from './marbles';
import { buildScenery } from './scenery';
import { DEFAULT_THEME, themeFor } from './themes';

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

    this.scene = new Scene();
    this.scene.background = new Color();
    this.sky = skyDome();
    this.scene.add(this.sky);
    this.scene.fog = new Fog(new Color(), 400, 2500);

    this.camera = new PerspectiveCamera(50, 1, 0.5, 6000);

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
    this.followTarget = new Vector3();
    this.followCam = new Vector3();
    this.followReady = false;
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
    const geometry = buildTrackGeometry(track, this.centerline, style);
    this.trackMesh = new Mesh(geometry, this.trackMaterial);
    this.trackGroup.add(this.trackMesh);
    this.trackGroup.add(this.buildFinishArch(track));
    // Scenery a moment later, so the track shows straight away even on slow phones.
    const token = (this.buildToken = (this.buildToken || 0) + 1);
    if (theme.scenery) {
      setTimeout(() => {
        if (token !== this.buildToken || this.disposed) return; // another track was chosen meanwhile
        this.scenery = buildScenery(theme, this.centerline, track);
        if (this.scenery) this.trackGroup.add(this.scenery);
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
    const half = (lanes * TRACK_STYLE.laneWidth) / 2 + TRACK_STYLE.wallThickness;
    const end = this.centerline.samples[this.centerline.samples.length - 1];
    const group = new Group();
    const post = new BoxGeometry(0.6, 6, 0.6);
    const white = new MeshLambertMaterial({ color: '#ffffff' });
    const red = new MeshLambertMaterial({ color: '#ef4444' });
    for (const s of [-1, 1]) {
      const m = new Mesh(post, red);
      m.position.set(end.pos.x + end.side.x * half * s, end.pos.y + 3, end.pos.z + end.side.z * half * s);
      group.add(m);
    }
    const banner = new Mesh(new BoxGeometry(half * 2 + 0.6, 1.4, 0.4), white);
    banner.position.set(end.pos.x, end.pos.y + 6, end.pos.z);
    banner.lookAt(end.pos.x + end.tangent.x, end.pos.y + 6, end.pos.z + end.tangent.z);
    group.add(banner);

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
  setRace(entries, highlight = [], results = []) {
    this.clearRace();
    this.marbles = new RaceMarbles(entries, Math.max(1, Number(this.track?.lane_count) || 4), highlight, results);
    this.scene.add(this.marbles.group);
    this.applyMarbleScale();
  }

  clearRace() {
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
    this.followReady = false;
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
   * Moves the marbles to a race frame and, when following, eases the camera
   * in behind the followed marble. dt = seconds since the last call.
   */
  updateRace(frame, followIndex = 0, dt = 1 / 60) {
    if (!this.marbles || !frame) return;
    this.marbles.update(this.centerline, frame);
    if (this.cameraMode === 'follow') {
      const at = this.marbles.positionOf(followIndex);
      if (at) this.updateFollowCamera(at, frame.p[followIndex] ?? 0, dt);
    }
    this.render();
  }

  updateFollowCamera(at, progress, dt) {
    // Look along the track (not the marble's wobble) so the view stays steady.
    const { samples, segments } = this.centerline;
    const ahead = samples[Math.min(segments, Math.round(Math.min(1, progress + 0.02) * segments))];
    const here = samples[Math.min(segments, Math.round(Math.min(1, progress) * segments))];
    const dir = new Vector3().subVectors(ahead.pos, here.pos).setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(here.tangent.x, 0, here.tangent.z);
    dir.normalize();
    const back = 10 + (Number(this.track?.lane_count) || 4) * 0.8;
    const desired = new Vector3().copy(at).addScaledVector(dir, -back);
    desired.y = Math.max(at.y, here.pos.y) + back * 0.55;
    // On a steep street the road behind is higher than the marble: stay above
    // all of it between the camera and the marble, so the view never dips into the hill.
    if (!this.arcLength) {
      this.arcLength = 0;
      for (let i = 1; i < samples.length; i += 1) this.arcLength += samples[i].pos.distanceTo(samples[i - 1].pos);
    }
    const from = Math.max(0, Math.floor((progress - (back * 1.5) / this.arcLength) * segments));
    const to = Math.min(segments, Math.round(Math.min(1, progress) * segments));
    let roadTop = -Infinity;
    for (let i = from; i <= to; i += 1) roadTop = Math.max(roadTop, samples[i].pos.y);
    desired.y = Math.max(desired.y, roadTop + 4);
    // …above the scenery (hills and house roofs), and above any other stretch
    // of track (and the wall holding it up) it swings out over on a hairpin.
    const sceneryTop = this.scenery?.userData?.clearance;
    const clearAbove = (x, z) => Math.max(sceneryTop ? sceneryTop(x, z) : -Infinity, this.trackBelow(x, z));
    desired.y = Math.max(desired.y, clearAbove(desired.x, desired.z) + 4);
    const target = new Vector3().copy(at).addScaledVector(dir, 4);
    if (!this.followReady) {
      this.followCam.copy(desired);
      this.followTarget.copy(target);
      this.followReady = true;
    } else {
      const k = 1 - Math.exp(-Math.min(0.25, dt) * 3.5);
      this.followCam.lerp(desired, k);
      this.followTarget.lerp(target, Math.min(1, k * 2));
      // Never lag down into the road or the hillside.
      this.followCam.y = Math.max(this.followCam.y, roadTop + 2.5, clearAbove(this.followCam.x, this.followCam.z) + 2.5);
    }
    this.camera.position.copy(this.followCam);
    this.camera.lookAt(this.followTarget);
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
      this.renderer.render(this.scene, this.camera);
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
