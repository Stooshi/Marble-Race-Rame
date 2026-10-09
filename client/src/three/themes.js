/**
 * The look of each track's world: sky, haze, light, ground and the colour of
 * the track's retaining walls. Tracks without a theme of their own use the
 * default bright meadow look. Scenery (hills, houses, landmarks) is built by
 * the theme's `scenery` key, see ./scenery.
 */
import { lightingOverride, withPreset } from './lighting';

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
  // Bobsleigh Run: a snowy mountainside in pine forest under a clear winter sky.
  'bobsleigh-run': {
    sky: { top: '#4f93d8', horizon: '#d9eaf8', glow: '#ffffff' },
    fog: '#d9eaf8',
    hemisphere: { sky: '#ffffff', ground: '#a9bccf', intensity: 1.6 },
    ambient: 0.4,
    sun: { color: '#fffaf0', intensity: 1.8, direction: [-0.5, 0.9, 0.3] },
    ground: { color: '#dde8f2', y: -2.05 },
    track: {},
    scenery: 'alpine',
  },
  // Table Mountain Run: a bright Cape summer day, the sea deep blue, a few clouds on the mountain.
  'table-mountain-run': {
    sky: { top: '#3f8fd6', horizon: '#cfe6f5', glow: '#ffffff' },
    fog: '#cfe6f5',
    hemisphere: { sky: '#ffffff', ground: '#8c8a62', intensity: 1.6 },
    ambient: 0.4,
    sun: { color: '#fff6e6', intensity: 1.9, direction: [-0.4, 0.95, 0.5] },
    ground: { color: '#2f7fb8', y: -1.2 }, // the bay and the harbour
    track: {},
    scenery: 'cape-town',
  },
};

// Kit tracks: the world's look by landscape (the track file's biome, or its surface),
// under the race's lighting and weather preset (./lighting.js).
const KIT_LOOKS = {
  alpine: { sky: { top: '#4f93d8', horizon: '#d9eaf8', glow: '#ffffff' }, fog: '#d9eaf8', ground: { color: '#dde8f2', y: -66.2 } },
  arctic: { sky: { top: '#5d8fc4', horizon: '#e6eef6', glow: '#fff4dc' }, fog: '#e6eef6', ground: { color: '#e2ebf3', y: -66.2 } },
  meadow: { sky: { top: '#5fb4ff', horizon: '#d6f0ff', glow: null }, fog: '#d6f0ff', ground: { color: '#86c66a', y: -66.2 } },
  desert: { sky: { top: '#4a98d8', horizon: '#f3dcb4', glow: '#fff3d6' }, fog: '#f0d9b5', ground: { color: '#e2a764', y: -66.2 } },
  jungle: { sky: { top: '#5aa8e0', horizon: '#d5ead2', glow: null }, fog: '#cfe3cc', ground: { color: '#3f8f3a', y: -66.2 } },
  city: { sky: { top: '#5fa8f0', horizon: '#dbe9f5', glow: null }, fog: '#dbe9f5', ground: { color: '#9cb768', y: -66.2 } },
};
const KIT_BIOME = { snow: 'alpine', ice: 'alpine', sand: 'desert', water: 'jungle', stone: 'city', street: 'city' };

export function themeFor(slug, track = null) {
  const kit = track?.physics?.kit;
  if (kit) {
    const biome = KIT_LOOKS[kit.biome] ? kit.biome : KIT_BIOME[kit.surface] ?? 'meadow';
    const lighting = lightingOverride(kit) ?? kit.lighting ?? 'day';
    return withPreset({ ...DEFAULT_THEME, ...KIT_LOOKS[biome], scenery: 'kit' }, lighting);
  }
  const own = THEMES[slug];
  if (!own) return DEFAULT_THEME;
  return { ...DEFAULT_THEME, ...own };
}
