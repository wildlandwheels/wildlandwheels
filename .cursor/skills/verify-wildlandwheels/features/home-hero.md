# Home hero

The home hero introduces Austin Wheeler and offers a way into selected work and contact.

## Sub-features

- `home-hero` shows the headline, deck, and alpine photograph.
- `home-work` moves from the hero to the selected-work heading.

## How to get to it (user POV)

- Open the site root.
- Choose the wordmark, which returns to `/#top`.
- Choose `View selected work` in the hero.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Drive with `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features home`.

- **Open home.** Go to the site root. Run `page.goto(base + "/")`. The heading `People. Places. A closer look.` is visible and the hero image alt is `Turquoise lake surrounded by evergreens and distant mountains`.
- **Record the start.** Capture the hero. Run `page.screenshot` to `artifacts/verify-wildlandwheels/home-loaded.png`. The wordmark `Austin Wheeler` is in the shot.
- **Open selected work.** Choose `View selected work`. Run `page.getByRole("link", { name: "View selected work" }).click()`. The URL hash is `#work` and the heading `Two sides of the same practice.` is inside the viewport.
- **Record the result.** Capture the selected-work section. Run `page.screenshot` to `artifacts/verify-wildlandwheels/home-selected-work.png`.

## Gotchas

- `View selected work` is an in-page link. A full navigation to another URL means the hero action was not the one under test.
- The screenshot must show the heading after the click. A shot of the hero alone does not prove the jump.
- At a 1440×900 viewport the selected-work heading sits near the top after the jump. Do not assert a pixel offset from a different viewport.
