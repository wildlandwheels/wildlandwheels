# Journal

The journal page says new stories are on the way and links toward the photographs.

## Sub-features

- `journal-open` shows the journal heading and the waiting note.
- `journal-link` points at `/#photographs`.

## How to get to it (user POV)

- Choose `Journal` in the footer.
- Open `/journal` directly.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Drive with `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features journal`.

- **Open the journal.** Go to the journal page. Run `page.goto(base + "/journal")`. The heading reads `The journal.`
- **Read the photograph link.** The link `explore the photographs` has `href` `/#photographs`.
- **Record the page.** Capture the journal. Run `page.screenshot` to `artifacts/verify-wildlandwheels/journal-page.png`.

## Gotchas

- `/#photographs` is the live site’s href. The home page has no element with that id. Following the link and expecting the photography grid is a different page from the one this site publishes.
- The period after `explore the photographs` sits outside the link. The accessible name has no period.
