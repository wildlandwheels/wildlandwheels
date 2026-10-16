# Wildlandwheels verification map

This directory is the maintained source for verifying the user-facing behavior of the Wildlandwheels portfolio. Read the index before driving the site, then use the matching feature file as the recipe.

## Baseline preconditions

- Build with `bash scripts/build.sh` and launch the preview from `dist/` at `http://127.0.0.1:4173`.
- Set `PORT` when `4173` is already taken. Do not share a port with another server.
- Run `PORT=4173 bash .cursor/skills/verify-wildlandwheels/scripts/doctor.sh` and require the expected URL and the preview pid.
- Never drive an instance that was not started by this verification run.
- The site has no login and no saved data. Each drive starts from the public pages.

## Driving conventions

- Start every recipe from the public home page unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs`.
- Do not open `mailto:` links or the Farm Truck Brewing website. Read the `href`.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes a screenshot with the wordmark or page heading visible, plus the assertion recorded in `artifacts/verify-wildlandwheels/report.json`.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with Playwright` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Home hero](./home-hero.md) covers the opening photograph, headline, and the jump to selected work.
- [Photography archive](./photography-archive.md) covers subject collections and the photograph viewer.
- [Farm Truck Brewing](./farm-truck-brewing.md) covers the marketing case study.
- [Contact email](./contact-email.md) covers the email link on the home page.
- [About](./about.md) covers the about page and its email link.
- [Journal](./journal.md) covers the journal placeholder.
