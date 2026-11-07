# Contact email

The main navigation reaches the home contact note, where a plain email link invites photography and project inquiries.

## Sub-features

- `contact-jump` scrolls from the navigation to the home contact note.
- `contact-mailto` exposes `mailto:contact@austinw.photo` through `Email Austin`.

## How to get to it (user POV)

- Choose `Contact` in the main navigation, including from another page.
- Open `/#contact` directly.
- Inspect `Email Austin` in the contact note.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Run `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features contact`.

- **Open home.** Run `page.goto(base + "/")` and save `contact-entry.png` plus `contact-contact-jump-before.png` before the navigation action.
- **Jump to contact.** Run `page.getByRole("link", { name: "Contact", exact: true }).click()`. Wait for three stable scroll samples with `#contact-title` fully inside the viewport below the fixed header. Near the document end, the heading may settle lower in the viewport.
- **Read the address.** Run `page.getByRole("link", { name: "Email Austin", exact: true }).getAttribute("href")`. Confirm `mailto:contact@austinw.photo`, the visible heading `Let’s make something worth noticing.`, and the full email link inside the viewport. Save `contact-contact-jump-after.png`.

## Gotchas

- Do not activate `Email Austin`; a mail client is outside this site.
- `Email Austin` also appears on the Farm Truck Brewing page. This journey starts at home and uses the navigation `Contact` link.
- The hero primary action is now `Explore photography`; the old `Start a conversation` hero entry no longer exists.
- Match the typographic apostrophe in `Let’s`.
