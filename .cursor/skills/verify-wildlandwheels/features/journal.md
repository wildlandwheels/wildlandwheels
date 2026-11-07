# Journal

The existing journal URL shows a waiting note and leads visitors to the photography archive.

## Sub-features

- `journal-open` keeps the journal page available through its direct URL.
- `journal-link` opens the full photography archive.

## How to get to it (user POV)

- Open `/journal/` directly or follow an existing saved link.
- Choose `explore the photographs` in the journal note.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Run `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features journal`.

- **Open the journal.** Run `page.goto(base + "/journal/")`. The H1 reads `The journal.` and the link named `explore the photographs` has `href` `/photography`. Save `journal-entry.png`.
- **Open the archive.** Save `journal-open-archive-before.png`, then run `page.getByRole("link", { name: "explore the photographs", exact: true }).click()`. The photography H1 reads `People. Places. A closer look.` and twelve figures are visible. Save `journal-open-archive-after.png`.

## Gotchas

- Journal is no longer in the shared footer. Do not invent a footer entry when proving this retained URL.
- A matching link target alone is insufficient; this journey follows it and verifies the archive.
- The sentence-ending period is outside the link and absent from its accessible name.
