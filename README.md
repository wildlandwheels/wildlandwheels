# Wildlandwheels

Austin Wheeler’s photography portfolio, alongside selected content and marketing work.
Static HTML, CSS and a small gallery script; no backend or framework.

## Run locally

Use Node 20.9 or later (CI uses Node 22), Python 3 and npm:

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:4173/. The development command builds the site and serves `dist/`.
Rebuild after editing source files. Serving the repository root directly skips generated image variants.

## Build and preview

```bash
npm run build
npm run preview
```

The build copies the static pages and original assets into `dist/`, verifies their preservation hashes,
and generates proportional WebP/JPEG display variants at 480, 960 and 1440 pixels where possible.
It requires the locked `sharp` dependency installed by `npm ci`.

Original photographs, favicon and fonts are unchanged. `scripts/image-sources.json` records their hashes
and dimensions; normal builds fail if a preserved asset changes. Derivatives live only in `dist/photos/derived/`.
The generated `/photos/image-manifest.json` records derivative dimensions, hashes and candidate transfer estimates.
Those estimates cover every archive image once; they are not page-load measurements.

For an intentional new asset, review the source addition, then regenerate the baseline with
`node scripts/generate-images.mjs --write-source-manifest`. Review the resulting manifest diff.
Build caches under `node_modules/.cache/`; `IMAGE_CACHE=0 npm run build` regenerates every derivative.

## Gallery links

The archive supports `?category=places`, `?category=portraits` and `?category=personal`.
A `photo` parameter opens an image, for example
`/photography/?category=portraits&photo=emily-in-studio`.
Back/Forward restores the selected collection and viewer. Previous/Next stays within that collection.
Without JavaScript, all photographs remain available as links to their original files.

## Checks

```bash
npm run build
npm run check
bash scripts/check.sh --self-test
```

Install a test browser with `npx playwright install chromium` when Chrome/Chromium is unavailable.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an existing browser executable explicitly.
The checks cover internal links/fragments, image sources and responsive candidates, font licenses,
alt attributes, ARIA references, unintended forms, hidden positional navigation, mobile overflow,
and gallery navigation/history/focus/fallback behavior. Overflow checks cover 320, 390, 768, 1024 and 1440 CSS pixels. Self-tests prove broken fixtures fail.

The maintained browser journeys and evidence conventions are in
[the verification skill](.cursor/skills/verify-wildlandwheels/SKILL.md).
They capture screenshots before and after actions and retain a JSON report under ignored `artifacts/`.
External email and brewery links are verified by their href; verification does not open them.

## Deployment

Pull requests run checks and do not deploy. A push to `main` builds and checks the site once,
then uploads `site-dist-<commit SHA>`. The production job downloads that same checked artifact
rather than rebuilding. It retains the existing `production` environment approval gate.

Manual dispatch is restricted to `main` and requires `approved_sha` to exactly match the selected commit.
Before approving production, confirm the run and artifact SHA match the reviewed commit;
do not approve an older waiting run by mistake. No workflow changes repository approval settings.

After a release, verify the homepage, photography deep links/viewer, case-study image and contact link.
For rollback, select the previous successful deployment in Cloudflare Pages rather than rewriting history.

## Photography-first review

The implemented direction keeps the night-sky hero and original imagery, makes photography the primary route,
and presents Farm Truck as selected supporting work. The 10,000-follower milestone is Austin-supplied shared credit:
“Helped Farm Truck Brewing’s Instagram account reach 10,000 followers.” No growth rate, timeframe or sole credit is implied.
The Journal remains reachable at `/journal` while its placeholder is omitted from footer navigation.
