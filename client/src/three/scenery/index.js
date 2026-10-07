/** Scenery builders by theme name (see ../themes.js). */
import { buildSanFrancisco } from './sanFrancisco';

const BUILDERS = {
  'san-francisco': buildSanFrancisco,
};

/** Returns a Group of scenery for the theme, or null for the plain default world. options.lite: the lighter version for phones. */
export function buildScenery(theme, centerline, track, options = {}) {
  const build = theme?.scenery && BUILDERS[theme.scenery];
  return build ? build(centerline, track, theme, options) : null;
}
