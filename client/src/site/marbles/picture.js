// The CSS background for a marble's flat picture (badge.js badgeOf / plainBadge). Most
// pictures are plain CSS gradients; one with the ball's own pattern on it (a spiral, patches
// all round, a faint band) is painted once by the same painter as the 3D marble and used as
// an image.
import { rasterize, toBytes } from '../../shared/marbles/paint';

const SIZE = 160;
const cache = new Map();

export function pictureBackground(badge, key) {
  if (badge.background) return badge.background;
  if (cache.has(key)) return cache.get(key);
  let css = '#888';
  try {
    const px = toBytes(rasterize(badge.layers, SIZE));
    const canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px.buffer), SIZE, SIZE), 0, 0);
    css = `center / 100% 100% no-repeat url(${canvas.toDataURL('image/png')})`;
  } catch {
    // (No canvas here, as in tests: the grey stand-in colour.)
  }
  cache.set(key, css);
  return css;
}
