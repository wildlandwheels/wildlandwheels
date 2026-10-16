# About

The about page states who Austin Wheeler is and lists the email and Instagram links.

## Sub-features

- `about-open` opens the about page from the home page.
- `about-email` shows `contact@austinw.photo` as a mailto link.

## How to get to it (user POV)

- Choose `More about Austin` in the home about section.
- Open `/about` directly.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Drive with `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features about`.

- **Start at home.** Open the site root. Run `page.goto(base + "/")`.
- **Open about.** Choose `More about Austin`. Run `page.getByRole("link", { name: "More about Austin" }).click()`. The URL path is `/about` and the heading reads `Austin Wheeler.`
- **Read the email.** Do not activate the mailto link. The link named `contact@austinw.photo ↗` has `href` `mailto:contact@austinw.photo`.
- **Record the page.** Capture the about page. Run `page.screenshot` to `artifacts/verify-wildlandwheels/about-page.png`.

## Gotchas

- `About` in the main navigation jumps to `/#about` on the home page. It does not open `/about`. Use `More about Austin` for this page.
- The email link’s accessible name includes the arrow `↗`.
