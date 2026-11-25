// One Demo league segment (Moses, 25 Nov 2026): the race's broadcast video with a small "DEMO LEAGUE"
// label in the bottom-right corner, then the standings card and (if given) the next race's card, under the
// game's music, 1920×1080 at 30 fps.
//   node video/league/compose.mjs <race.mp4> <standings.png> [<next.png>] --out <segment.mp4> [--tune 7]
// The cards come from video/league/cards.mjs. Looks only: nothing here touches a race.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args.splice(i, 2)[1]; };
const out = opt('--out');
const tune = opt('--tune', '7');
const trim = Number(opt('--trim', '0')); // (s: cut the race video there, e.g. before its logo and end card)
const [race, standings, next] = args;
if (!race || !standings || !out) { console.error('Use: compose.mjs <race.mp4> <standings.png> [<next.png>] --out <file>'); process.exit(1); }

const TTF = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'; // (a small label; drawtext needs a font file)
const music = join(here, '..', '..', 'public', 'audio', `tune-${tune}.m4a`);
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }));
const D = trim || dur(race);
const ST = 8; // the standings card, s
const NX = next ? 5 : 0; // the next race's card, s
const XF = 0.6; // crossfades, s
const total = D + ST + NX - XF * (next ? 2 : 1);

const label = `drawbox=x=iw-262:y=ih-76:w=236:h=50:color=0x0E1320@0.55:t=fill,drawbox=x=iw-262:y=ih-76:w=236:h=50:color=0xFFD21F@0.9:t=3,` +
  `drawtext=fontfile=${TTF}:text='DEMO LEAGUE':fontcolor=0xFFD21F:fontsize=24:x=w-144-tw/2:y=h-51-th/2`;
const card = (i, secs) => `[${i}:v]scale=1920:1080,zoompan=z='1+0.0006*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(secs * 30)}:s=1920x1080:fps=30,format=yuv420p,setsar=1`;
const v = [
  `[0:v]trim=0:${D},setpts=PTS-STARTPTS,scale=1920:1080,fps=30,format=yuv420p,setsar=1,${label}[r]`,
  `${card(1, ST)}[s]`,
  ...(next ? [`${card(2, NX)}[n]`] : []),
  `[r][s]xfade=transition=fade:duration=${XF}:offset=${(D - XF).toFixed(3)}[rs]`,
  ...(next ? [`[rs][n]xfade=transition=slideleft:duration=${XF}:offset=${(D + ST - 2 * XF).toFixed(3)}[v]`] : []),
];
const vOut = next ? '[v]' : '[rs]';
// The race's own sound, then the music in under the cards (fading in over the crossfade).
const m = next ? 3 : 2;
const a = [
  `[0:a]atrim=0:${D},asetpts=PTS-STARTPTS,afade=t=out:st=${(D - 1.5).toFixed(3)}:d=1.5,apad=whole_dur=${total.toFixed(3)}[ra]`,
  `[${m}:a]atrim=0:${(total - D + XF + 1).toFixed(3)},afade=t=in:d=1,afade=t=out:st=${(total - D + XF - 1).toFixed(3)}:d=1.4,volume=0.5,adelay=${Math.round((D - XF) * 1000)}|${Math.round((D - XF) * 1000)}[ma]`,
  `[ra][ma]amix=inputs=2:normalize=0:duration=first,atrim=0:${total.toFixed(3)}[a]`,
];
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', race, '-i', standings,
  ...(next ? ['-i', next] : []), '-i', music,
  '-filter_complex', [...v, ...a].join(';'), '-map', vOut, '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log(`${out}: ${total.toFixed(1)} s (race ${D.toFixed(1)} s, standings ${ST} s${next ? `, next ${NX} s` : ''})`);
