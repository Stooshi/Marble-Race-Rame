/**
 * Water that reads as water on a phone (Moses, 23 Oct 2026, the Rivers preview review: "Amazon looks
 * like a tar road; Thames pale grey"). A Rivers track's river is drawn as its own mesh with this
 * material instead of with the banks:
 *   - colour: the palette's, kept (the vertex colours: deep in the middle, white water at the rapids);
 *   - shine: the sky mirrored towards the horizon (a Fresnel term towards the sky's colour), and the
 *     sun's glitter on moving ripples;
 *   - movement: the ripples drift downstream with time (`uTime`, set as the mesh is drawn), so the
 *     water moves even while the camera stands still (the countdown).
 * One extra draw call on a phone. Looks only: the race never reads it.
 */
import { Color, DoubleSide, MeshPhongMaterial } from 'three';

/** The water's material. `sky`: the colour mirrored at a grazing angle; `lite`: a phone (simpler ripples). */
export function waterMaterial({ sky = '#cfe3ef', lite = false, night = false } = {}) {
  // (The surface lit as the palette's colour: no Phong highlight of its own, the glitter is added below.)
  const mat = new MeshPhongMaterial({ vertexColors: true, side: DoubleSide, shininess: 1, specular: new Color('#000000') });
  const uniforms = { uTime: { value: 0 }, uSky: { value: new Color(sky) }, uMirror: { value: night ? 0.2 : 0.38 }, uGlitter: { value: night ? 0.15 : 0.3 } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    // Ripples: a few waves in different directions drifting with time (fewer on a phone).
    const waves = lite
      ? `float w1 = sin(dot(p, vec2(1.7, 0.9)) + uTime * 1.6);
         float w2 = sin(dot(p, vec2(-0.8, 2.1)) + uTime * 1.2);
         float w3 = sin(dot(p, vec2(2.9, -2.3)) + uTime * 2.1);
         vec2 slope = vec2(w1 * 0.6 - w2 * 0.3 + w3 * 0.4, w2 * 0.6 + w3 * 0.35 - w1 * 0.2);`
      : `float w1 = sin(dot(p, vec2(1.7, 0.9)) + uTime * 1.6);
         float w2 = sin(dot(p, vec2(-0.8, 2.1)) + uTime * 1.2);
         float w3 = sin(dot(p, vec2(2.9, -2.3)) + uTime * 2.1);
         float w4 = sin(dot(p, vec2(-4.3, -1.9)) + uTime * 2.9);
         float w5 = sin(dot(p, vec2(5.1, 3.7)) + uTime * 3.4);
         vec2 slope = vec2(w1 * 0.5 - w2 * 0.25 + w3 * 0.35 + w4 * 0.2, w2 * 0.5 + w3 * 0.3 - w1 * 0.2 + w5 * 0.2);`;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorld;\nuniform float uTime;\nuniform vec3 uSky;\nuniform float uMirror;\nuniform float uGlitter;')
      .replace('#include <opaque_fragment>', `
        {
          vec2 p = vWaterWorld.xz * 0.55;
          ${waves}
          vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          vec3 rippled = normalize(up + (viewMatrix * vec4(slope.x * 0.18, 0.0, slope.y * 0.18, 0.0)).xyz);
          vec3 toEye = normalize(vViewPosition);
          // The sky mirrored, only towards the horizon (Fresnel), a little bluer than the haze.
          float fresnel = pow(1.0 - clamp(dot(rippled, toEye), 0.0, 1.0), 4.0);
          vec3 mirror = mix(uSky, vec3(0.62, 0.78, 0.88), 0.35);
          outgoingLight = mix(outgoingLight, mirror, clamp(uMirror * fresnel, 0.0, 0.6));
          // Gentle light and dark swells moving across it…
          outgoingLight *= 1.0 + 0.05 * (slope.x + slope.y) * 0.5;
          // …and the sun's glitter on the ripples.
          #if NUM_DIR_LIGHTS > 0
            vec3 sunDir = directionalLights[0].direction;
            float spec = pow(max(dot(reflect(-sunDir, rippled), toEye), 0.0), 140.0);
            outgoingLight += directionalLights[0].color * spec * uGlitter;
          #endif
        }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => `river-water-2-${lite ? 'lite' : 'full'}`;
  mat.userData.water = uniforms;
  return mat;
}

/** Keeps a water mesh's ripples moving: its time set each time it's drawn. */
export function animateWater(mesh) {
  const u = mesh.material.userData.water;
  mesh.onBeforeRender = (_renderer, scene) => {
    u.uTime.value = (performance.now() / 1000) % 3600;
    // (The sky it mirrors: the scene's own haze, so a sunset, a dawn or a night track's water matches its sky.)
    const sky = scene?.fog?.color ?? (scene?.background?.isColor ? scene.background : null);
    if (sky) u.uSky.value.copy(sky);
  };
  return mesh;
}
