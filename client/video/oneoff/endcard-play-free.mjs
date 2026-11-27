import { TEXTS } from '../assets.mjs';
import { renderLogo } from '../render-logo.mjs';
TEXTS.endCard = ['Play free at marblespins.com', ''];
const [file, tall] = process.argv.slice(2);
await renderLogo({ version: 'A', file, tall: tall === 'tall', endCard: true, secs: 4 });
process.exit(0);
