# Photography archive

The photography archive lists edited photographs and filters them into Places, Portraits, and Personal. Choosing a photograph opens it at its original proportions.

## Sub-features

- `archive-all` lists all twelve photographs.
- `archive-places` shows only the Places collection.
- `archive-view` opens and closes one photograph.

## How to get to it (user POV)

- Choose `Photography` in the main navigation.
- Choose `Open the photography archive` on the home page.
- On the archive, choose `All photographs`, `Places`, `Portraits`, or `Personal`.
- Choose a photograph button such as `View An alpine afternoon`.

## Driving it with Playwright

Preconditions:

- Doctor reports a healthy preview at `http://127.0.0.1:4173`.
- Drive with `node .cursor/skills/verify-wildlandwheels/scripts/drive.mjs --base http://127.0.0.1:4173 --features photography`.

- **Open the archive.** Go to the photography page. Run `page.goto(base + "/photography")`. The heading `People. Places. A closer look.` is visible and twelve photographs are shown.
- **Record the full archive.** Capture the grid. Run `page.screenshot` to `artifacts/verify-wildlandwheels/photography-all.png`.
- **Filter to Places.** Choose the `Places` tab. Run `page.getByRole("tab", { name: "Places" }).click()`. Five photographs remain visible and each caption category reads `Places`.
- **Record the collection.** Capture the filtered grid. Run `page.screenshot` to `artifacts/verify-wildlandwheels/photography-places.png`.
- **Open a photograph.** Choose `View An alpine afternoon`. Run `page.getByRole("button", { name: "View An alpine afternoon" }).click()`. A dialog heading reads `An alpine afternoon`, the image source contains `/photos/archive-01.jpg`, and the category reads `Places`.
- **Record the viewer.** Capture the open dialog. Run `page.screenshot` to `artifacts/verify-wildlandwheels/photography-lightbox.png`.
- **Close the viewer.** Choose `Close`. Run `page.getByRole("button", { name: "Close" }).click()`. The dialog heading is no longer visible.
- **Record the closed grid.** Capture the archive again. Run `page.screenshot` to `artifacts/verify-wildlandwheels/photography-closed.png`.

## Gotchas

- `Places` is both a tab and a caption. Use the tab role. A caption click does not filter the grid.
- The Places collection still includes `An alpine afternoon`. Filtering must not hide the photograph the viewer step opens.
- Count visible figures. Hidden figures stay in the page, so a count of all `figure` elements stays twelve after filtering.
- Do not treat the empty line `More photographs soon.` as success. Every shipped collection has photographs.
