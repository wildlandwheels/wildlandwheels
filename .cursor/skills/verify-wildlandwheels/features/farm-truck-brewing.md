# Farm Truck Brewing

The Farm Truck Brewing page is the marketing case study, reached from the home page and the main navigation.

## Sub-features

- `case-open` opens the case study from the home page.
- `case-links` exposes the brewery site and the email link without leaving this site.

## How to get to it (user POV)

- Choose `Marketing` in the main navigation.
- Choose `Read the project` in the home selected-work section.
- On the case study, choose `Visit Farm Truck Brewing ↗` or `Email Austin`.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Drive with `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features farm-truck`.

- **Start at home.** Open the site root. Run `page.goto(base + "/")`. Capture `artifacts/verify-wildlandwheels/farm-truck-home.png`.
- **Open the project.** Choose `Read the project`. Run `page.getByRole("link", { name: "Read the project" }).click()`. The URL path is `/work/farm-truck-brewing` and the heading reads `Farm Truck Brewing.`
- **Check the outbound links.** Read `Visit Farm Truck Brewing ↗` and `Email Austin` without clicking them. Their `href` values are `https://farmtruckbrewing.com` and `mailto:contact@austinw.photo`.
- **Record the case study.** Capture the loaded page. Run `page.screenshot` to `artifacts/verify-wildlandwheels/farm-truck-case.png`.

## Gotchas

- The heading accessible name is `Farm Truck Brewing.` including the period. A line break in the title does not add a space.
- Clicking `Visit Farm Truck Brewing ↗` leaves this site. Proof is the `href`, not a screenshot of farmtruckbrewing.com.
- `Marketing` in the navigation is a second entry point. A pass through `Read the project` does not by itself verify the navigation link.
