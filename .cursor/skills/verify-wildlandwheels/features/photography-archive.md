# Photography archive

The photography archive preserves twelve photographs, filters them into Places, Portraits, and Personal, and provides a shareable full-size viewer with navigation within the selected collection.

## Sub-features

- `archive-all` lists twelve photographs; Places has five, Portraits six, and Personal one.
- `archive-filter` exposes URL-backed collections and a live photograph count.
- `archive-view` opens originals with a title, category, and `x of y` status.
- `archive-navigation` supports bounded previous/next controls and viewer-only arrow keys.
- `archive-history` restores filters and photographs through refresh and Back/Forward.
- `archive-fallback` keeps full-size image links usable without JavaScript.

## How to get to it (user POV)

- Choose `Photography` in the main navigation or `Explore photography` in the home hero.
- Choose a home selected-work card: Places opens `/photography/?category=places`; Emily opens `/photography/?category=portraits&photo=emily-in-studio`; Around the fire opens `/photography/?category=personal&photo=around-the-fire`.
- Follow `explore the photographs` from `/journal/`, or open `/photography/` directly.
- Choose a subject tab or a photograph, then use Previous, Next, Close, or Escape.
- Share or refresh a gallery URL; use browser Back/Forward to restore its state.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Run `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features photography`.
- The smoke driver pairs `photography-<action>-before.png` and `photography-<action>-after.png` for every interaction, and records `entryURL` plus current `url` for each check and screenshot. Run `bash scripts/check.sh` for the exhaustive gallery checks in `scripts/check_gallery.mjs`.

- **Open the archive.** Run `page.goto(base + "/photography/")`. The H1 reads `People. Places. A closer look.` and `#photo-grid > figure:visible` counts twelve. Save `photography-entry.png`.
- **Filter to Places.** Run `page.getByRole("tab", { name: "Places", exact: true }).click()`. The tab controls `#photo-grid`, the panel is labelled by `tab-places`, five figures remain visible, all category captions read `Places`, and the URL contains `category=places`. Record the `places` action pair.
- **Open a photograph.** Run `page.getByRole("button", { name: "View An alpine afternoon", exact: true }).click()`. The native dialog title is `An alpine afternoon`, `#lightbox-image` uses the original `/photos/archive-01.jpg`, and `#lightbox-position` reads `1 of 5`. Previous is disabled. Record `open-photo`.
- **Navigate the collection.** Run `page.getByRole("button", { name: "Next photograph" }).click()`. The title becomes `Among the trees`, the counter reads `2 of 5`, and the photo parameter is `among-the-trees`. Previous returns to `An alpine afternoon`. Record `next-photo` and `previous-photo` separately.
- **Close and restore history.** Choose `Close`, wait for `#lightbox` to become hidden, and confirm focus returns to the source image anchor. The URL retains Places and removes `photo`. Browser Back restores all twelve; Forward restores Places. Record `close-photo`, `history-back`, and `history-forward`.
- **Open Emily directly.** Run `page.goto(base + "/photography/?category=portraits&photo=emily-in-studio")`. The title is `Emily, in the studio`, Portraits is selected, and the counter reads `1 of 6`. Close keeps the archive and Portraits selected. Record `direct-emily` and `close-direct`.
- **Open Personal directly.** Run `page.goto(base + "/photography/?category=personal&photo=around-the-fire")`. The title is `Around the fire`, status is `1 of 1`, and both navigation controls are disabled. Escape closes the viewer and leaves Personal selected. Record `direct-personal` and `escape-direct`.

## Gotchas

- Hidden figures remain in the DOM. Count visible figures when checking filters.
- Slugs are stored on `figure[data-id]`; Emily's stable ID is `emily-in-studio`. Titles, alt text, categories, and order remain unchanged.
- Thumbnail `srcset` may use derivatives; the viewer follows the original image anchor `href`, never the thumbnail `currentSrc`.
- Category values are the lowercase allowlist `places`, `portraits`, and `personal`. Missing or invalid categories fall back to all. A valid photo outside an explicit category selects its own category; an invalid photo is ignored safely.
- Next/Previous replace the current photo entry, so closing an owned modal entry returns to its collection. Closing a direct-linked modal removes `photo` without leaving the site.
- Tabs support ArrowLeft/ArrowRight/Home/End. Viewer arrow keys work only inside the dialog; Escape closes it. Native modal focus stays inside the dialog and returns to the source, or the selected tab when the source is hidden. Background scrolling is locked while open.
- Without JavaScript, filter controls stay hidden and image anchors open the original files. Button semantics are added only when the dialog is supported.
