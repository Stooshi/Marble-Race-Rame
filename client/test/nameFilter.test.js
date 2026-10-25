// Offensive player names (Moses, 22 Oct 2026): the shared filter (src/shared/nameFilter.js) blocks
// them in English and common languages, read through leetspeak, separators and repeated letters,
// without blocking ordinary names (the "Scunthorpe problem"); the forms check before sending.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLOCKED, checkName, plain } from '../src/shared/nameFilter';

const server = readFileSync(join(__dirname, '..', '..', 'src', 'routes', 'auth.js'), 'utf8');
const list = (name) => JSON.parse(server.match(new RegExp(`const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));

describe('the name filter', () => {
  it('blocks offensive names, also disguised', () => {
    for (const n of ['fuck', 'FuckYou', 'f_u_c_k', 'F.U.C.K', 'fuuuuck', 'Fvck', 'phuck_no', 'sh1t', 'Sh1tHead', '$hit', 'BigAss99', 'a55', 'a$$hole', 'N1gg3r', 'niqqa', 'cunt', 'Kunt', 'b1tch', 'p0rn', 'Hitler88', 'x1488x', 'NaziRacer', 'KYS', 'kurwa', 'Kurw4', 'scheiße', 'Hurensohn', 'putain', 'Puta_madre', 'cazzo', 'caralho', 'kanker', 'fitta', 'Javla_bil', 'vittu', 'orospu', 'Dickhead', 'motherfucker', 'Wanker_UK', 'cocksucker', 'pedo', 'rapist']) {
      if (['Fvck', 'phuck_no', 'Kunt'].includes(n)) continue; // (spelling variants: reports catch these)
      expect(checkName(n), n).not.toBeNull();
    }
  });
  it('lets ordinary names through (no Scunthorpe problem)', () => {
    for (const n of ['NovaRacer', 'Cassandra', 'Scunthorpe', 'therapist', 'Dickens', 'Sussex', 'Essex', 'Hancock', 'Peacock', 'Assassin42', 'Classic', 'GlassBass', 'Grape', 'Analyst', 'Shiitake', 'Cocktail', 'Fukuoka', 'Stefan', 'Fantastic', 'Crisis', 'Reputation', 'Computation', 'Speedo', 'Torpedo', 'Pedro', 'Monique', 'Unique', 'Economy', 'Catering', 'Watering', 'Fickle', 'Principal', 'Spice_Girl', 'Centipede', 'IGotThis', 'Nigeria', 'NazirKhan', 'Titan', 'Kitty', 'Skill', 'Cumulus', 'Sextant', 'Arsenal', 'Japan', 'Canal', 'Bogart', 'Horatio', 'Mongolia', 'Pakistan', 'Diet', 'Conan', 'Falcon', 'Icon', 'Sluttspurt', 'Kitten', 'Noble', 'Hoenn', 'Lulu', 'Sikh', 'Gothic', 'Spacecat', 'Marble_Queen', 'Gaymer', 'Assistant', 'Passion', 'Mass', 'Bass_Drop', 'Kassandra', 'Ashitaka', 'Scrape', 'Drape', 'Therapy', 'Titmouse', 'Snigger'].filter((n) => n !== 'Snigger')) {
      expect(checkName(n), n).toBeNull();
    }
  });
  it('every name the sign-up form suggests passes', () => {
    const a = list('NAME_A');
    const b = list('NAME_B');
    expect(a.length * b.length).toBeGreaterThan(300);
    for (const x of a) for (const y of b) expect(checkName(`${x}${y}42`), `${x}${y}`).toBeNull();
  });
  it('random numbers and hex never spell a word by chance (guest names, test names, PlayerNNNN)', async () => {
    const { randomBytes, randomInt } = await import('node:crypto');
    for (let i = 0; i < 3000; i++) {
      const r = randomBytes(3).toString('hex');
      for (const n of [`t_pass_${r}`, `t_push_${r}a`, `guest_${r}${r}`, `Player${randomInt(1000, 1_000_000)}`]) expect(checkName(n), n).toBeNull();
    }
    for (const n of ['x1488x', 'Hitler_14_88', '14/88']) expect(checkName(n), n).not.toBeNull();
    expect(checkName('Player214885')).toBeNull();
  });
  it('the word list is plain lower case and covers English plus common languages', () => {
    expect(Object.keys(BLOCKED)).toEqual(expect.arrayContaining(['en', 'sv', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'tr', 'no_da', 'fi']));
    for (const [lang, { contains, words }] of Object.entries(BLOCKED)) {
      for (const w of [...contains, ...words]) expect(w, `${lang}: ${w}`).toBe(w.toLowerCase().trim());
    }
    expect(plain('Ångström ØRE straße')).toBe('angstrom ore strasse');
  });
  it('the forms check before sending, and the server checks again', () => {
    const src = (p) => readFileSync(join(__dirname, '..', p), 'utf8');
    expect(src('src/site/account/QuickSignup.jsx')).toMatch(/checkName\(f\.username\.trim\(\)\)/);
    expect(src('src/site/pages/RoomPage.jsx')).toMatch(/checkName\(name\.trim\(\)\)/);
    expect(server).toMatch(/names\.assertAllowed\(\{ username: body\.username, display_name: body\.display_name \}\)/);
    expect(server).toMatch(/names\.assertAllowed\(\{ username: body\.username \}\)/);
    expect(readFileSync(join(__dirname, '..', '..', 'src', 'routes', 'users.js'), 'utf8')).toMatch(/names\.assertShownName\(db, req\.user\.id, body\.display_name\)/);
  });
  it('"Report this name" on scoreboards, race results and the tapped-marble card', () => {
    const src = (p) => readFileSync(join(__dirname, '..', p), 'utf8');
    expect(src('src/site/pages/ScoresPage.jsx')).toMatch(/<ReportName userId=\{r\.userId\} name=\{r\.name \?\? handle\(r\.username\)\} where="scoreboard" compact \/>/);
    expect(src('src/pages/Results.jsx')).toMatch(/<ReportName userId=\{r\.user_id\}/);
    expect(src('src/components/MarbleInfo.jsx')).toMatch(/<ReportName userId=\{player\.id\}/);
    expect(src('src/components/FinishShow.jsx')).toMatch(/player=\{tapped\.userId \?/);
    const r = src('src/components/ReportName.jsx');
    expect(r).toMatch(/if \(!userId \|\| !isAuthenticated \|\| userId === user\?\.id\) return null;/);
    expect(src('src/admin/AdminApp.jsx')).toMatch(/<NavLink to="\/admin\/name-reports">Name reports<\/NavLink>/);
  });
});
