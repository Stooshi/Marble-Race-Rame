/**
 * The winner's spotlight: as the winner crosses the line, a golden beam of
 * light from above, a warm glow around the marble and a pool of gold on the
 * ice under it, plus a gold light that warms the marble itself. Cheap for
 * phones: four small meshes and one light, all built once and hidden (the
 * light at zero) when not in use, so nothing is compiled mid-race.
 */
import {
  AdditiveBlending, CanvasTexture, CircleGeometry, Color, ConeGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh,
  MeshBasicMaterial, PointLight, Sprite, SpriteMaterial, SRGBColorSpace,
} from 'three';

const GOLD = new Color('#ffc83a');

/** A soft round glow: bright in the middle, fading to nothing at the edge. */
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,240,190,1)');
  grad.addColorStop(0.35, 'rgba(255,205,80,0.7)');
  grad.addColorStop(1, 'rgba(255,190,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export class WinnerGlow {
  constructor() {
    this.group = new Group();
    this.texture = glowTexture();
    this.light = new PointLight(GOLD, 0, 10, 1.6);
    this.halo = new Sprite(new SpriteMaterial({ map: this.texture, color: '#ffb81f', transparent: true, depthWrite: false, opacity: 0 }));
    this.halo.renderOrder = 6;
    this.sparkle = new Sprite(new SpriteMaterial({ map: this.texture, color: '#fff3c4', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0 }));
    this.sparkle.renderOrder = 7;
    // The beam: an open cone, narrow up high and wide on the ice, fading towards its top.
    const beam = new ConeGeometry(1.7, 10, 24, 1, true);
    beam.translate(0, 5, 0); // wide end on the ice (y = 0), tip 10 m up
    const pos = beam.getAttribute('position');
    const colors = [];
    for (let k = 0; k < pos.count; k += 1) colors.push(1, 0.74, 0.16, pos.getY(k) < 1 ? 1 : 0);
    beam.setAttribute('color', new Float32BufferAttribute(colors, 4));
    this.beam = new Mesh(beam, new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide, opacity: 0 }));
    this.beam.renderOrder = 5;
    this.pool = new Mesh(new CircleGeometry(2.2, 32), new MeshBasicMaterial({ map: this.texture, color: '#ffa800', transparent: true, depthWrite: false, opacity: 0 }));
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.renderOrder = 4;
    this.group.add(this.light, this.halo, this.sparkle, this.beam, this.pool);
    this.set(null, 0, 0);
  }

  /**
   * Shines on a marble at `at` (its centre) with strength 0–1; `t` (ms) makes
   * the glow breathe a little. Strength 0 hides it all.
   */
  set(at, strength, t) {
    const on = Boolean(at) && strength > 0.001;
    this.halo.visible = this.sparkle.visible = this.beam.visible = this.pool.visible = on;
    this.light.intensity = on ? 4 * strength : 0; // a warm touch, keeping the marble's own colour
    if (!on) return;
    const breathe = 1 + 0.08 * Math.sin(t / 180);
    this.light.position.set(at.x, at.y + 2.2, at.z);
    this.halo.position.copy(at);
    this.halo.scale.setScalar(3.6 * breathe);
    this.halo.material.opacity = 0.8 * strength;
    this.sparkle.position.copy(at);
    this.sparkle.scale.setScalar(1.6 * (1 + 0.25 * Math.sin(t / 90)));
    this.sparkle.material.opacity = 0.7 * strength;
    this.beam.position.set(at.x, at.y - 0.5, at.z);
    this.beam.material.opacity = 0.5 * strength;
    this.pool.position.set(at.x, at.y - 0.5, at.z);
    this.pool.scale.setScalar(breathe);
    this.pool.material.opacity = strength;
  }

  dispose() {
    this.texture.dispose();
    for (const o of [this.halo, this.sparkle, this.beam, this.pool]) o.material.dispose();
    this.beam.geometry.dispose();
    this.pool.geometry.dispose();
  }
}
