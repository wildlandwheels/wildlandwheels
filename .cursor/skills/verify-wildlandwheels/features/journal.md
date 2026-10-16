# Journal

The journal page says new stories are on the way and links toward the photographs.

## Sub-features

- `journal-open` shows the journal heading and the waiting note.
- `journal-link` opens the photography archive from the journal.

## How to get to it (user POV)

- Choose `Journal` in the footer.
- Open `/journal` directly.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Drive with `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features journal`.

- **Open the journal.** Go to the journal page. Run `page.goto(base + "/journal")`. The heading reads `The journal.` The link `explore the photographs` has `href` `/photography`.
- **Record the journal.** Capture the page before following the link. Run `page.screenshot` to `artifacts/verify-wildlandwheels/journal-page.png`.
- **Open the archive.** Choose `explore the photographs`. Run `page.getByRole("link", { name: "explore the photographs" }).click()`. The URL path is `/photography`, the heading reads `People. Places. A closer look.`, and twelve photographs are visible.
- **Record the archive.** Capture the opened archive. Run `page.screenshot` to `artifacts/verify-wildlandwheels/journal-archive.png`.

## Gotchas

- A matching `href` without the archive on screen is not a pass. The journey has to land on the photography page and show the grid.
- The period after `explore the photographs` sits outside the link. The accessible name has no period.
