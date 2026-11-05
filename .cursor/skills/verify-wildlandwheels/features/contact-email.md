# Contact email

The home page keeps a contact note and a header stamp that emails Austin.

## Sub-features

- `contact-jump` scrolls from the navigation to the contact note.
- `contact-mailto` exposes `mailto:contact@austinw.photo` on the header stamp `Email Austin`.

## How to get to it (user POV)

- Choose `Contact` in the main navigation.
- Choose `Start a conversation` in the hero.
- Choose the `Email Austin` stamp in the header.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Drive with `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features contact`.

- **Open home.** Go to the site root. Run `page.goto(base + "/")`. Capture the start. Run `page.screenshot` to `artifacts/verify-wildlandwheels/contact-home.png`.
- **Jump to contact.** Choose `Contact`. Run `page.getByRole("link", { name: "Contact", exact: true }).click()`. Wait until `window.scrollY` is unchanged between two checks and `#contact-title` is fully inside the viewport. The note sits near the end of the page, so the heading may rest in the lower half once scrolling stops.
- **Read the address.** Do not activate the mailto link. Run `page.getByRole("link", { name: "Email Austin" }).getAttribute("href")`. The value is `mailto:contact@austinw.photo`. The heading `Let’s make something worth noticing.` is visible. The stamp stays in the header.
- **Record the contact section.** Capture the settled section. Run `page.screenshot` to `artifacts/verify-wildlandwheels/contact-email.png`.

## Gotchas

- Activating `Email Austin` asks the browser to open a mail client. That is outside this site. A navigation error from a click is not a failed address.
- The same label `Email Austin` also appears in the Farm Truck Brewing header. This journey starts on the home page after choosing `Contact`.
- `Contact` in the navigation and `Email Austin` on the stamp are different links. Use the exact name `Contact` for the jump.
- The apostrophe in `Let’s` is a typographic apostrophe. Match the rendered heading, not a straight quote.
