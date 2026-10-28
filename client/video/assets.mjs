// What the videos use: the texts (texts.json, the one file to change words in) and the sounds
// (the game's own files in public/audio, and the originals in music-inbox; licences: music-inbox/LICENCES.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const audio = (n) => path.join(here, '..', 'public', 'audio', `${n}.m4a`);
const inbox = (start) => {
  const dir = path.join(here, '..', '..', 'music-inbox');
  return path.join(dir, fs.readdirSync(dir).find((f) => f.startsWith(start)));
};

export const TEXTS = JSON.parse(fs.readFileSync(path.join(here, 'texts.json'), 'utf8'));
export const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

export const SOUNDS = {
  // The logo sting: soundreality's whoosh (Pixabay 383023, the game's old overtaking sound), loudest about 1.2 s in.
  whoosh: { file: inbox('MARBLES OVERTAKING'), peak: 1.2, gain: 0.55 },
  beeps: { file: audio('start-beeps') },   // its fourth beep 3.023 s in (engine.js BEEPS_GO_S)
  launch: { file: audio('launch') },
  ceremony: { file: audio('ceremony') },
  crowd: { file: audio('crowd-grand-prix') },
  tune: (n) => ({ file: audio(`tune-${n}`) }),
};
