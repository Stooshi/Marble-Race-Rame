# Working on Marble Spins

- **Keep the technical documentation current.** It is in `docs/` (`docs/README.md` is the index) and mirrored in the claude.ai project "Marble Race" under `cto/`.
  - Any change that alters architecture, routes, files, tables or columns, game or economy rules, deploy steps or a decision updates the matching document, in the same commit.
  - Then re-upload the changed files to the project mirror.
  - Never write secret values in docs; variable names only.
- **Every new track has a big feature** (Moses, 27 Oct 2026): a jump/hop over a gap, a splitter, a loop, a funnel, a drop or a dramatic banked turn; varied across a series and placed where the flyover and TV cameras show it; tune it if a check fails, never remove it; a new series' plan lists each track's feature for Moses's approval first. Details: `src/tracks/README.md`.
- **Race results must never change.** Looks never affect results. Run the fingerprint tests (`test/raceFingerprints.test.js`) when touching `src/game/`.
- **Database:** `docs/database_schema.sql` only adds. Changes to existing rows go in a new `docs/data_updates/<name>.sql` (sorting after the last file). Never edit one that has run.
- **Coins only move through `economy.change()`**, which writes the coin ledger.
- **Deploys:** the server is deployed by hand by Moses. Vercel builds the website from `Main`.
- **Every Sunday: a docs review** (Moses, 25 Oct 2026; a scheduled task runs it): every doc in `docs/` and the project (`cto/*`, `claude/*`) checked against the code and fixed; the week's changelog `claude/changelog/<year>-W<week>.md`; `claude/open-decisions.md` and `claude/known-issues.md` kept current; `docs/README.md` (= `cto/README.md`) a one-page status; a PDF of the technical documentation, `Marble-Spins-Tech-Docs-<date>.pdf`, sent to Moses (the Projects tool can't store PDFs; Moses uploads it to `cto/pdf/`).
- **Commits:** push with `git fetch -q origin Main && git rebase -q origin/Main; git push -q origin HEAD:Main`.
