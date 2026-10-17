---
name: verify-wildlandwheels
description: "Drive the Wildlandwheels static portfolio in a browser and prove the home page, photography archive, Farm Truck Brewing case study, and contact link. Use when changing this site or checking that a local preview matches user-facing behavior."
---

# Verify Wildlandwheels

The surface is a static website. There is no account, database, or CMS in this repo. Two previews can run at once on different ports because the site has no shared data. Do not drive a server this run did not start. If the default port is already taken by another process, pick a free port instead of killing it.

Read `features/README.md` before a proof, then follow the feature file for the behavior under test.

## Launch

From the repository root, build and start the preview on a free port. The default port is `4173`.

```bash
PORT=4173 bash .cursor/skills/verify-wildlandwheels/scripts/launch.sh
```

The helper runs `bash scripts/build.sh`, then starts this server and records its pid:

```bash
python3 -u -m http.server "$PORT" --bind 127.0.0.1 --directory dist \
  > artifacts/verify-wildlandwheels/server.log 2>&1
```

`python3 -u` is required. Without it the ready line stays buffered in the log.

Ready means the helper prints `launch: ready http://127.0.0.1:4173 pid <pid>` after both of these are true:

- `artifacts/verify-wildlandwheels/server.log` contains `Serving HTTP on 127.0.0.1 port 4173` (or the port you chose).
- `curl -fsS "http://127.0.0.1:$PORT/"` returns HTML that contains `People. Places. A closer look.`

A listening port alone is not ready. Wait until the hero heading is in the response. If the port is taken, the helper exits and names `PORT`; do not kill the other process. Teardown is the Cleanup section. There are no migrations or seed data.

Install the browser driver once per checkout before Drive. The script uses the Chrome already installed on the machine (`channel: "chrome"`), so skip Playwright's browser download:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
```

`playwright` is a dev dependency of this repo. `npm run build` does not need it.

## Doctor

Run this before driving whenever anything looks off. It is read-only.

```bash
PORT=4173 bash .cursor/skills/verify-wildlandwheels/scripts/doctor.sh
```

Doctor passes only when all of these are true:

- `artifacts/verify-wildlandwheels/server.pid` is the live process this run started.
- That process command line includes `http.server`, the chosen port, and `dist`, bound to `127.0.0.1`. Launch uses `python3 -u` so the ready line is written to the log immediately.
- `http://127.0.0.1:$PORT/` contains the home hero heading.
- `http://127.0.0.1:$PORT/photography` contains `An alpine afternoon` and `/photos/archive-01.jpg`.
- `http://127.0.0.1:$PORT/work/farm-truck-brewing` contains `Farm Truck`.

If doctor fails, do not drive that process.

## Drive

Use Playwright against the preview base URL. Stable handles are roles and accessible names already in the pages: `heading`, `link`, `tab`, and `button`. Do not click by coordinates.

```bash
node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs \
  --base "http://127.0.0.1:${PORT:-4173}" \
  --features home,photography
```

`--features` is a comma-separated list. Allowed ids: `home`, `photography`, `farm-truck`, `contact`, `about`, `journal`. The feature files have the full journeys. The script exercises the user path and writes evidence under `artifacts/verify-wildlandwheels/`.

Selectors the script uses:

- Home hero heading: `getByRole('heading', { level: 1, name: 'People. Places. A closer look.' })`
- Home hero image alt: `Turquoise lake surrounded by evergreens and distant mountains` on `.hero-photograph img`
- Selected work: `getByRole('link', { name: 'View selected work' })`, then wait until scroll has stopped and the heading `Two sides of the same practice.` is near the top of the viewport
- Journal archive: `getByRole('link', { name: 'explore the photographs' })` opens `/photography` and shows twelve photographs
- Photography tab: `getByRole('tab', { name: 'Places' })`
- Photograph: `getByRole('button', { name: 'View An alpine afternoon' })`
- Lightbox title: `getByRole('heading', { level: 2, name: 'An alpine afternoon' })`
- Lightbox close: `getByRole('button', { name: 'Close' })`
- Farm Truck heading: `getByRole('heading', { level: 1, name: 'Farm Truck Brewing.' })`
- Contact: `getByRole('link', { name: 'Email Austin' })` with `href` `mailto:contact@austinw.photo`

Do not follow `mailto:` or `https://farmtruckbrewing.com`. Those leave the site. Read the `href` and confirm the link is visible.

## Evidence

Write proof to `artifacts/verify-wildlandwheels/`. That directory is gitignored. Cleanup must leave it in place.

For each driven feature, capture the action and the resulting state, not only the final screen:

- A PNG screenshot before the action and after the resulting state, with the site wordmark or page heading visible.
- `report.json` listing the feature id, entry URL, assertions, and screenshot paths.

A screenshot of the last screen without the action that produced it is not proof. There is no test-only endpoint. Do not stub pages. External mail and the Farm Truck website are outside this site: prove the link target, and do not open them.

## Cleanup

Stop only the preview this run started. Never kill by process name.

```bash
bash .cursor/skills/verify-wildlandwheels/scripts/cleanup.sh
```

The script reads `artifacts/verify-wildlandwheels/server.pid`, sends `SIGTERM` to that pid, and removes the pid file. It does not delete `artifacts/verify-wildlandwheels/` screenshots, `report.json`, or `server.log`.

After cleanup, confirm the evidence files are still on disk and the pid is no longer running.

## Overflow

`bash scripts/check.sh` fails when any built page, or the photography lightbox, scrolls horizontally at 320 or 390 CSS pixels, and when an in-paragraph link is not `display: inline` at those widths. `bash scripts/check.sh --self-test` must show the broken overflow fixture failing, the in-paragraph `inline-flex` fixture failing, and the fitted fixture passing. Run that check after layout changes, in addition to the browser journeys below.

## Helpers

- `PORT=4173 bash .cursor/skills/verify-wildlandwheels/scripts/launch.sh` builds `dist/` and starts the preview.
- `bash scripts/build.sh` copies the site into `dist/`.
- `PORT=4173 bash .cursor/skills/verify-wildlandwheels/scripts/doctor.sh` runs the read-only health check.
- `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features home,photography` drives the named features.
- `bash .cursor/skills/verify-wildlandwheels/scripts/cleanup.sh` stops the preview this run started.

## Maintenance

When the pages change, update the feature files and re-prove the affected journeys. `/maintain-verification-skill` is the upkeep loop for this map.
