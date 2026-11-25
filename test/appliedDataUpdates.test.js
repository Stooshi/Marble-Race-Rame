'use strict';

// Data updates already applied on the live server must never be renamed, edited or deleted (Moses, 12 Nov
// 2026, after 2027-06-13-voxel-peaks-to-blocks-2 was renamed once it had run). The server records each
// update by its file name (src/db/migrate.js, the data_updates table): a renamed file would run again, and
// an edited one would never run, so the live database and the file would differ.
//
// test/appliedDataUpdates.json lists every file applied up to Moses's last deploy, with its sha256. After
// each deploy, add the files it applied: `node test/appliedDataUpdates.test.js --print` prints the entries
// of the files not on the list yet (paste them in and set lastDeploy).

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'docs', 'data_updates');
const LIST = require('./appliedDataUpdates.json');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f))).digest('hex');

if (require.main === module && process.argv.includes('--print')) {
  const missing = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql') && !LIST.files[f]).sort();
  for (const f of missing) console.log(`    "${f}": "${sha(f)}",`);
  if (!missing.length) console.log('(every data update is on the list)');
} else {
  test('every data update applied on the live server is still there, under the same name, unchanged', () => {
    const names = Object.keys(LIST.files);
    assert.ok(names.length >= 379, 'the list holds at least the 379 files of the 12 Nov 2026 deploy');
    assert.ok(names.includes('2027-06-13-voxel-peaks-to-blocks-2.sql'));
    for (const [f, hash] of Object.entries(LIST.files)) {
      assert.ok(fs.existsSync(path.join(DIR, f)), `${f} was applied live: never rename or delete it (make a new data update instead)`);
      assert.equal(sha(f), hash, `${f} was applied live: never edit it (make a new data update instead)`);
    }
  });

  test('a new data update sorts after every applied one (so it runs after them)', () => {
    const applied = Object.keys(LIST.files).sort();
    const last = applied.at(-1);
    for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.sql') && !LIST.files[x])) {
      assert.ok(f > last, `${f} is new but sorts before ${last}, the last one applied live`);
    }
  });

  test('the list says which deploy it is up to date with', () => {
    assert.match(LIST.lastDeploy.fingerprint, /^[0-9a-f]{12}$/);
    assert.match(LIST.lastDeploy.date, /^\d{4}-\d{2}-\d{2}$/);
  });
}
