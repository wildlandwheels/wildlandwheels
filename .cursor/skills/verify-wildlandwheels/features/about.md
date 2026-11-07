# About

The about page introduces Austin Wheeler's photography practice and provides email and Instagram links.

## Sub-features

- `about-open` opens the about page from home.
- `about-email` exposes the email target without starting a mail client.

## How to get to it (user POV)

- Choose `More about Austin` in the home about section.
- Choose `About` in the shared main navigation.
- Open `/about/` directly.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Run `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features about`.

- **Start at home.** Run `page.goto(base + "/")` and save `about-entry.png`. Bring `More about Austin` into view and save `about-open-about-before.png`.
- **Open about.** Run `page.getByRole("link", { name: "More about Austin", exact: true }).click()`. The URL path is `/about/` and the H1 reads `Austin Wheeler.`
- **Read the introduction.** Confirm `I’m Austin Wheeler, a photographer, marketer and wildland firefighter based in South Jersey. My photography brings together portraits, places, food and drink.` is visible.
- **Read the email.** The link named `contact@austinw.photo ↗` has `href` `mailto:contact@austinw.photo`. Save `about-open-about-after.png` without activating the mail link.

## Gotchas

- The main navigation `About` now opens `/about`; it no longer jumps to the home about section.
- The visible email arrow remains part of this link's accessible name.
- The driver proves the `More about Austin` entry. Navigation and direct URL entries require their own recorded actions to claim separate proof.
