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

- **Open home.** Go to the site root. Run `page.goto(base + "/")`. The heading `People. Places. A closer look.` is visible. The hero image alt is `Turquoise lake surrounded by evergreens and distant mountains`. Run `page.locator(".hero-photograph img").getAttribute("alt")`.
- **Record the start.** Capture the hero before the jump. Run `page.screenshot` to `artifacts/verify-wildlandwheels/home-loaded.png`. The wordmark `Austin Wheeler` is in the shot.
- **Open selected work.** Choose `View selected work`. Run `page.getByRole("link", { name: "View selected work" }).click()`. Wait until `window.scrollY` is unchanged between two checks and `#work-title` has `getBoundingClientRect().top` between `0` and `280`. The URL hash is `#work`.
- **Record the result.** Capture the settled selected-work section. Run `page.screenshot` to `artifacts/verify-wildlandwheels/home-selected-work.png`. The heading is near the top of the viewport, not still sliding through the lower half.

## Gotchas

- `View selected work` is an in-page link. A full navigation to another URL means the hero action was not the one under test.
- The screenshot must show the heading after smooth scroll has stopped. A frame where the heading has only just entered the bottom of the viewport is not the settled state.
- At a 1440×900 viewport the settled heading top is within 280px of the viewport top. Do not reuse that pixel bound at a different viewport height.
