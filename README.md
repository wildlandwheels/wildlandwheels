# Wildlandwheels

Austin Wheeler’s portfolio: photography, short-form content, and marketing.

The site is static HTML, CSS, and one gallery script. It does not need a backend.

## Run locally

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/

`npm run dev` runs the same command.

## Build

```bash
bash scripts/build.sh
```

`npm run build` runs that script. It copies the site into `dist/` for any static host.

Preview the build:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

`npm run preview` runs the same command. Build first so `dist/` exists.

## Checks

Build the site, then check `dist/`.

```bash
bash scripts/build.sh
bash scripts/check.sh
```

`npm run check` runs the same check. The check fails when any of these are true:

- An internal link or fragment does not resolve.
- A page contains a form or a password field.
- A file in `fonts/` has no matching license.
- An `img` has no `alt` attribute.
- An `aria-controls` target is missing, or a tab does not point at a tabpanel.
- A positional `nav` selector hides a link.
- A page scrolls horizontally at 320 or 390 CSS pixels, including the photograph lightbox.
- An in-paragraph link is not `display: inline` at those widths.

The overflow check uses Playwright. Run `npm install` once so `playwright` is available. It launches Chrome when it is installed, and otherwise Playwright's Chromium.

`bash scripts/check.sh --self-test` runs the same checks against the fixtures in `scripts/fixtures/`. Those fixtures are broken on purpose, and the self-test expects each one to fail. It also proves the overflow check rejects `scripts/overflow/broken`, rejects an in-paragraph `inline-flex` link in `scripts/overflow/inline-flex`, and accepts `scripts/overflow/fitted`.

The check does not flag unused CSS selectors. `nav a:hover` and `[aria-selected="true"]` are real rules, and they do not appear as text in the HTML. `gallery.js` also shows and hides photographs without adding a class. A selector list would fail the current site.

## Deploy

A push to `main` builds the site and deploys `dist/` to the Cloudflare Pages project `wildlandwheels`, which serves wildlandwheels.com. The deploy runs only after the site checks pass. The same workflow can be started from the Actions tab.
