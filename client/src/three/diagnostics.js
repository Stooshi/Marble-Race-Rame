/**
 * What the browser offers for 3D, gathered without Three.js so it works even
 * when the 3D code itself fails. Shown on screen and logged when the 3D view
 * can't start, so problems can be diagnosed from a description or screenshot.
 */
function probe(kind) {
  const out = { ok: false };
  try {
    const canvas = document.createElement('canvas');
    // The browser explains refusals (blocklisted GPU, blocked after crashes...) through this event.
    canvas.addEventListener('webglcontextcreationerror', (e) => { out.reason = e.statusMessage || 'no reason given'; }, { once: true });
    const gl = canvas.getContext(kind);
    if (gl) {
      out.ok = true;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      out.renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      out.version = gl.getParameter(gl.VERSION);
      gl.getExtension('WEBGL_lose_context')?.loseContext(); // free it straight away
    }
  } catch (err) {
    out.reason = `${err.name}: ${err.message}`;
  }
  return out;
}

export function graphicsReport() {
  const webgl2 = probe('webgl2');
  const webgl1 = probe('webgl');
  return {
    webgl2,
    webgl1,
    browser: navigator.userAgent,
    screen: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
    cores: navigator.hardwareConcurrency ?? 'unknown',
    memoryGB: navigator.deviceMemory ?? 'unknown',
  };
}

/** The report as plain text lines, for the screen and for copying. */
export function describeReport(r) {
  const gl = (name, g) => `${name}: ${g.ok ? `yes (${g.version}; ${g.renderer})` : `NO${g.reason ? ` (${g.reason})` : ''}`}`;
  return [gl('WebGL 2', r.webgl2), gl('WebGL 1', r.webgl1), `Screen: ${r.screen}`, `CPU cores: ${r.cores} · memory: ${r.memoryGB} GB`, `Browser: ${r.browser}`];
}
