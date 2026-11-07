# Home hero

The home hero introduces Austin Wheeler through photography and offers a primary archive entry plus a jump to selected work.

## Sub-features

- `home-hero` shows the headline and night photograph.
- `home-work` moves to the selected-work heading below the fixed header.
- `home-photography` opens the full archive through the primary action.

## How to get to it (user POV)

- Open the site root or choose the wordmark, which returns to `/#top`.
- Choose `Explore photography` in the hero.
- Choose `View selected work` in the hero.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Run `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features home`.

- **Open home.** Run `page.goto(base + "/")`. The H1 reads `People. Places. A closer look.` and `.hero-photograph img` has alt `Stars above a dark forest and distant mountain`. Save `home-entry.png`.
- **Open selected work.** Run `page.getByRole("link", { name: "View selected work", exact: true }).click()`. Wait for three stable scroll samples and `#work-title` below the measured header bottom, within 280px of it. The heading reads `People, places and the moments between.` and the hash is `#work`. Save `home-selected-work-before.png` and `home-selected-work-after.png` around the action.
- **Open photography.** Bring `Explore photography` into view, record `home-explore-photography-before.png`, then run `page.getByRole("link", { name: "Explore photography", exact: true }).click()`. The archive H1 and twelve photographs appear at `/photography/`. Save `home-explore-photography-after.png`.

## Gotchas

- `View selected work` is an in-page jump; `Explore photography` opens the archive.
- The arrows are decorative and hidden from accessible names.
- Wait for the fixed-header clearance and settled scroll before capturing the section. The scroll offset is intentionally nonzero.
- Every assertion and screenshot in `report.json` includes the journey entry URL and current URL. Failure evidence is written even if the journey aborts.
