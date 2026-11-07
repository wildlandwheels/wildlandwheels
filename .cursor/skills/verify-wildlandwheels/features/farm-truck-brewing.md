# Farm Truck Brewing

The Farm Truck Brewing page presents a selected marketing case study alongside the photography portfolio.

## Sub-features

- `case-open` opens the case study from the home marketing card.
- `case-links` exposes the brewery site and email targets without leaving this site.
- `case-label` shows the recent-work can label and collaboration caption.

## How to get to it (user POV)

- Choose `Marketing` in the main navigation.
- Choose the Farm Truck Brewing card with `Read the project` in the home selected-work section.
- On the case study, inspect `Visit Farm Truck Brewing ↗` and `Email Austin`.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Run `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features farm-truck`.

- **Start at home.** Run `page.goto(base + "/")` and save `farm-truck-entry.png`. Bring the marketing card into view and save `farm-truck-open-project-before.png`.
- **Open the project.** Run `page.getByRole("link", { name: /Read the project/ }).click()`. The URL path is `/work/farm-truck-brewing/` and the H1 reads `Farm Truck Brewing.` Save `farm-truck-open-project-after.png`.
- **Read outbound targets.** Read the `href` of `Visit Farm Truck Brewing ↗` and `Email Austin` without clicking: `https://farmtruckbrewing.com` and `mailto:contact@austinw.photo`.
- **View the label.** Set the viewport to 1440×1200 and save `farm-truck-view-label-before.png`. Run `page.locator(".case-piece").evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }))`. Wait for three stable scroll samples, with the section top between the measured header bottom and 48px below it. Decode the image, confirm its full rectangle is visible below the header, and save `farm-truck-view-label-after.png`. Restore the normal viewport afterward.
- **Check the asset.** Its alt reads `Lift Me Up IPA can label, a Farm Truck Brewing collaboration with SensaMotion and Kings and Comrades`; its original source is `/photos/lift-me-up-can-label.jpg`. The caption contains `Lift Me Up IPA can label` and `SensaMotion × Kings and Comrades collab`.

## Gotchas

- The card is one link whose accessible name includes its image and copy. Use `/Read the project/`, rather than an exact match to the action text.
- The page uses CSS scroll padding for its fixed header. Expect a nonzero top offset; a `top <= 40` assertion incorrectly times out.
- The external brewery link and email are proved by their targets, without following them.
- The Marketing navigation entry is separate from the home card. A card journey does not claim proof of a navigation click.
