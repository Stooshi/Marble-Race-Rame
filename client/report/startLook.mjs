// The "first 3 seconds" on screen (src/report/startLook.js): four frames of the start with the
// scenery off, each shrunk to a small grey picture, from the kit view in a headless browser.
export const LOOK_SIZE = { width: 160, height: 90 };

/** The start's frames at `times` (ms after GO) as grey values; `shots`: also save each frame as a JPEG (paths). */
export async function grabStartLook(browser, port, { slug, race }, times, shots = []) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`http://localhost:${port}/dev/kit-view.html?${new URLSearchParams({ track: slug, race, scenery: '0' })}`);
    await page.waitForFunction(() => window.kitView, null, { timeout: 120_000 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
    const frames = [];
    for (const [k, t] of times.entries()) {
      // (Drawn and read back in one go: the picture is still in the canvas.)
      frames.push(await page.evaluate(({ t, size }) => {
        window.kitView.raceShot({ t, camera: 'follow' });
        const gl = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
        const c = document.createElement('canvas');
        c.width = size.width;
        c.height = size.height;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(gl, 0, 0, size.width, size.height);
        const { data } = ctx.getImageData(0, 0, size.width, size.height);
        const grey = new Array(size.width * size.height);
        for (let i = 0; i < grey.length; i += 1) grey[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
        return grey;
      }, { t, size: LOOK_SIZE }));
      if (shots[k]) await page.screenshot({ path: shots[k], type: shots[k].endsWith('.png') ? 'png' : 'jpeg' });
    }
    return frames;
  } finally {
    await page.close();
  }
}
