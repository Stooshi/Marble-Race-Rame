/** Scenery builders by theme name (see ../themes.js). */
import { buildSanFrancisco } from './sanFrancisco';

const BUILDERS = {
  'san-francisco': buildSanFrancisco,
};

/** Returns a Group of scenery for the theme, or null for the plain default world. */
export function buildScenery(theme, centerline, track) {
  const build = theme?.scenery && BUILDERS[theme.scenery];
  return build ? build(centerline, track, theme) : null;
}
