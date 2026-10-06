/**
 * The look of each track's world: sky, haze, light, ground and the colour of
 * the track's retaining walls. Tracks without a theme of their own use the
 * default bright meadow look. Scenery (hills, houses, landmarks) is built by
 * the theme's `scenery` key, see ./scenery.
 */
export const DEFAULT_THEME = {
  sky: { top: '#5fb4ff', horizon: '#d6f0ff', glow: null },
  fog: '#d6f0ff',
  hemisphere: { sky: '#ffffff', ground: '#5a8f3f', intensity: 1.6 },
  ambient: 0.35,
  sun: { color: '#fff4e0', intensity: 1.8, direction: [-0.6, 1, 0.4] },
  ground: { color: '#86c66a', y: -2.05 },
  track: {},
  scenery: null,
};

export const THEMES = {
  // Golden hour over the city: a low warm sun in the west behind the Golden
  // Gate, amber haze, the bay all around.
  'san-francisco': {
    sky: { top: '#6f86c9', horizon: '#ffc98e', glow: '#fff1c9' },
    fog: '#f1c8a0',
    hemisphere: { sky: '#ffe6c4', ground: '#7d8a6a', intensity: 1.7 },
    ambient: 0.45,
    sun: { color: '#ffc285', intensity: 2.0, direction: [-1, 0.32, 0.35] },
    ground: { color: '#3f7fb3', y: -1.2 }, // the bay
    track: { embankment: '#cdb996', embankmentDark: '#c2ac86' }, // stone retaining walls
    scenery: 'san-francisco',
  },
  // Bobsleigh Run: plain snow for now; the alpine dressing comes later.
  'bobsleigh-run': {
    sky: { top: '#4f93d8', horizon: '#d9eaf8', glow: '#ffffff' },
    fog: '#d9eaf8',
    hemisphere: { sky: '#ffffff', ground: '#a9bccf', intensity: 1.6 },
    ambient: 0.4,
    sun: { color: '#fffaf0', intensity: 1.8, direction: [-0.5, 0.9, 0.3] },
    ground: { color: '#dde8f2', y: -2.05 },
    track: {},
    scenery: null,
  },
};

export function themeFor(slug) {
  const own = THEMES[slug];
  if (!own) return DEFAULT_THEME;
  return { ...DEFAULT_THEME, ...own };
}
