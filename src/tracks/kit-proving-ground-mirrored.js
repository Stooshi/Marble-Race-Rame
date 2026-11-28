'use strict';

// Kit Proving Ground, mirrored: the mirror tool's test track (preview only, like
// the original). Every bend the other way, every obstacle on the other side,
// the splitter's channels swapped.
const { mirror } = require('../trackKit');

module.exports = mirror(require('./kit-proving-ground'), {
  slug: 'kit-proving-ground-mirrored',
  name: 'Kit Proving Ground Mirrored',
});
