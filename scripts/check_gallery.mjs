import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, startServer } from "./browser_helpers.mjs";

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, "photography/index.html"))) {
  console.error("usage: node scripts/check_gallery.mjs <built-site-dir>");
  process.exit(2);
}
const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../artifacts/gallery-check");
fs.mkdirSync(evidenceDir, { recursive: true });
const report = { siteDirectory: path.resolve(dir), assertions: [], screenshots: [], renderedImages: [], result: "running" };
const { server, origin } = await startServer(dir);
let browser;
let stage = "browser launch";
try {
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const readyVisibleImages = async () => {
    await page.waitForFunction(() => [...document.images].filter((image) => {
      const box = image.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth && getComputedStyle(image).visibility !== "hidden";
    }).every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0));
    await page.evaluate(async () => {
      await Promise.all([...document.images].filter((image) => {
        const box = image.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth && getComputedStyle(image).visibility !== "hidden";
      }).map((image) => image.decode()));
    });
  };
  const assertThumbnails = async (width) => {
    await readyVisibleImages();
    const boxes = await page.locator("#photo-grid > figure:visible .photo-button img").evaluateAll((images) => images.map((image) => {
      const box = image.getBoundingClientRect();
      return { photo: image.closest("figure").dataset.id, width: box.width, height: box.height, inViewport: box.bottom > 0 && box.top < innerHeight, currentSrc: image.currentSrc, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
    }));
    assert.ok(boxes.length > 0, "gallery must render thumbnail images");
    for (const box of boxes) {
      assert.ok(box.width > 0 && Math.abs(box.width - box.height) <= 1, `${width}px ${box.photo} thumbnail must render square; got ${box.width} x ${box.height}`);
      if (box.inViewport) {
        assert.ok(new URL(box.currentSrc).pathname.startsWith("/photos/derived/"), `${width}px ${box.photo} must select a responsive derivative`);
        assert.ok(box.naturalWidth > 0 && box.naturalHeight > 0, `${width}px ${box.photo} derivative must decode`);
      }
    }
    report.renderedImages.push({ viewport: width, page: "photography", images: boxes });
  };
  const shot = async (name, action, assertion) => {
    await readyVisibleImages();
    const file = path.join(evidenceDir, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    report.screenshots.push({ feature: new URL(page.url()).pathname.includes("farm-truck") ? "farm-truck" : new URL(page.url()).pathname.includes("about") ? "about" : new URL(page.url()).pathname.includes("photography") ? "photography" : "home", action, assertion, entryURL: new URL(page.url()).pathname === "/" ? `${origin}/` : `${origin}/photography/`, url: page.url(), path: file });
  };
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const figures = page.locator("#photo-grid > figure");
  const visible = page.locator("#photo-grid > figure:visible");
  const dialog = page.locator("#lightbox");
  const tab = (name) => page.getByRole("tab", { name, exact: true });
  const position = async (text) => {
    await page.waitForFunction((expected) => document.querySelector("#lightbox-position")?.textContent === expected, text);
  };
  const count = async (expected) => {
    await page.waitForFunction((value) => [...document.querySelectorAll("#photo-grid > figure")].filter((figure) => !figure.hidden).length === value, expected);
    assert.equal(await visible.count(), expected);
  };
  const urlParams = () => new URL(page.url()).searchParams;
  const modalClosed = () => page.locator("#lightbox[open]").waitFor({ state: "hidden" });

  stage = "archive and category filters";
  await page.goto(`${origin}/photography/`);
  await count(12);
  assert.equal(await figures.count(), 12);
  const ids = await figures.evaluateAll((items) => items.map((item) => item.dataset.id));
  assert.equal(new Set(ids).size, 12, "photo slugs must be unique");
  assert.ok(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)), "stable URL-safe photo slugs required");
  assert.equal(await page.locator(".photo-button[role=button][aria-haspopup=dialog]").count(), 12);
  for (const [name, expected] of [["Places", 5], ["Portraits", 6], ["Personal", 1], ["All photographs", 12]]) {
    await tab(name).click();
    await count(expected);
    assert.equal(await tab(name).getAttribute("aria-selected"), "true");
    assert.equal(await page.locator("#photo-grid").getAttribute("aria-labelledby"), await tab(name).getAttribute("id"));
    assert.equal(urlParams().get("category"), name === "All photographs" ? null : name.toLowerCase());
    if (name !== "All photographs") {
      assert.ok((await visible.evaluateAll((items) => items.map((item) => item.dataset.category))).every((category) => category === name));
    }
  }

  stage = "filter Back and Forward";
  await page.goBack();
  await count(1);
  assert.equal(urlParams().get("category"), "personal");
  await page.goForward();
  await count(12);
  await tab("Places").click();
  await count(5);

  stage = "modal navigation, focus containment and scroll lock";
  const opener = page.getByRole("button", { name: "View An alpine afternoon", exact: true });
  await opener.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const historyBefore = await page.evaluate(() => history.length);
  await shot("390-archive-before-view", "Choose An alpine afternoon", "Places filter shows five photographs before opening viewer");
  await opener.click();
  await dialog.waitFor({ state: "visible" });
  await position("1 of 5");
  await shot("390-viewer-open", "Opened An alpine afternoon", "Dialog shows first of five Places photographs");
  assert.equal(urlParams().get("photo"), "an-alpine-afternoon");
  assert.equal(await page.evaluate(() => history.length), historyBefore + 1);
  assert.equal(await page.getByRole("button", { name: "Previous photograph", exact: true }).isDisabled(), true);
  assert.equal(await page.locator("#lightbox-image").getAttribute("src").then((src) => new URL(src, origin).pathname), "/photos/archive-01.jpg");
  await page.waitForFunction(() => { const image = document.querySelector("#lightbox-image"); return image.complete && image.naturalWidth > 0; });
  assert.ok(await page.evaluate(() => [getComputedStyle(document.body).overflowY, getComputedStyle(document.documentElement).overflowY].some((value) => ["hidden", "clip"].includes(value))), "viewer must lock background scrolling");
  await page.mouse.wheel(0, 600);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(() => window.scrollY), scrollBefore, "background scroll must stay fixed");
  // Native modal inertness must keep keyboard focus away from the page behind it.
  await page.getByRole("button", { name: "Close", exact: true }).focus();
  for (const key of ["Shift+Tab", "Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    assert.ok(await page.evaluate(() => document.activeElement === document.body || document.querySelector("#lightbox").contains(document.activeElement)), `background control received focus after ${key}`);
  }
  await page.getByRole("button", { name: "Close", exact: true }).focus();
  await page.locator(".wordmark").focus();
  assert.ok(await page.evaluate(() => document.querySelector("#lightbox").contains(document.activeElement)), "native modal must make background controls inert");
  await page.keyboard.press("ArrowRight");
  await position("2 of 5");
  assert.equal(await page.evaluate(() => history.length), historyBefore + 1, "next must replace the owned modal entry");
  await page.keyboard.press("ArrowLeft");
  await position("1 of 5");
  await page.keyboard.press("ArrowLeft");
  await position("1 of 5");
  for (let index = 2; index <= 5; index++) {
    await page.getByRole("button", { name: "Next photograph", exact: true }).click();
    await position(`${index} of 5`);
  }
  assert.equal(await page.getByRole("button", { name: "Next photograph", exact: true }).isDisabled(), true);
  await page.keyboard.press("ArrowRight");
  await position("5 of 5");
  assert.equal(await page.evaluate(() => history.length), historyBefore + 1);
  await page.keyboard.press("Escape");
  await modalClosed();
  assert.equal(urlParams().get("photo"), null);
  assert.equal(urlParams().get("category"), "places");
  await shot("390-viewer-closed", "Pressed Escape", "Viewer closed and Places filter retained");
  assert.equal(await opener.evaluate((element) => document.activeElement === element), true, "Escape restores opener focus");
  assert.ok(await page.evaluate(() => !["hidden", "clip"].includes(getComputedStyle(document.body).overflowY)), "closing unlocks scroll");

  stage = "modal browser Back and Forward";
  await page.goForward();
  await dialog.waitFor({ state: "visible" });
  await position("5 of 5");
  await page.goBack();
  await modalClosed();
  await count(5);

  stage = "deep-link refresh and safe close of unowned history";
  await page.goto(`${origin}/photography/?category=portraits&photo=emily-in-studio`);
  await dialog.waitFor({ state: "visible" });
  await count(6);
  await position("1 of 6");
  await page.reload();
  await dialog.waitFor({ state: "visible" });
  assert.equal(await page.locator("#lightbox-title").textContent(), "Emily, in the studio");
  const directHistory = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await modalClosed();
  assert.equal(new URL(page.url()).pathname, "/photography/");
  assert.equal(urlParams().get("category"), "portraits");
  assert.equal(urlParams().get("photo"), null);
  assert.equal(await page.evaluate(() => history.length), directHistory, "direct-link close must replace rather than navigate away");

  stage = "cross-category and invalid URLs";
  await page.goto(`${origin}/photography/?category=places&photo=emily-in-studio`);
  await dialog.waitFor({ state: "visible" });
  await count(6);
  assert.equal(urlParams().get("category"), "portraits");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await modalClosed();
  await page.goto(`${origin}/photography/?category=invalid&photo=missing-photo`);
  await count(12);
  assert.equal(await dialog.isVisible(), false);
  assert.equal(urlParams().get("category"), null);
  assert.equal(urlParams().get("photo"), null);
  await page.goto(`${origin}/photography/?category=places&photo=missing-photo`);
  await count(5);
  assert.equal(urlParams().get("category"), "places");
  assert.equal(urlParams().get("photo"), null);
  await page.goto(`${origin}/photography/?category=personal&photo=around-the-fire`);
  await dialog.waitFor({ state: "visible" });
  await position("1 of 1");
  assert.equal(await page.getByRole("button", { name: "Previous photograph", exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: "Next photograph", exact: true }).isDisabled(), true);
  assert.deepEqual(errors, [], "gallery raised browser errors");

  stage = "native original-image links without JavaScript";
  const native = await browser.newContext({ javaScriptEnabled: false });
  try {
    const noJS = await native.newPage();
    await noJS.goto(`${origin}/photography/`);
    assert.equal(await noJS.locator("#photo-grid > figure:visible").count(), 12);
    assert.equal(await noJS.locator(".gallery-top").isVisible(), false);
    assert.equal(await noJS.locator(".photo-button[role=button]").count(), 0);
    const anchors = noJS.locator("#photo-grid a.photo-button");
    assert.equal(await anchors.count(), 12);
    const hrefs = await anchors.evaluateAll((items) => items.map((item) => item.getAttribute("href")));
    assert.deepEqual([...hrefs].sort(), Array.from({ length: 12 }, (_, index) => `/photos/archive-${String(index + 1).padStart(2, "0")}.jpg`).sort());
    await anchors.first().click();
    assert.equal(new URL(noJS.url()).pathname, "/photos/archive-01.jpg");
    assert.equal((await noJS.request.get(noJS.url())).status(), 200);
  } finally { await native.close(); }
  stage = "desktop and mobile screenshot journeys";
  for (const width of [1440, 320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await shot(`${width}-home`, "Open home", "Home heading is visible before opening archive");
    await page.locator("nav").getByRole("link", { name: "Photography", exact: true }).click();
    await count(12);
    await assertThumbnails(width);
    await shot(`${width}-archive`, "Choose Photography in navigation", "Archive shows all twelve photographs");
    await tab("Personal").click();
    await count(1);
    await assertThumbnails(width);
    await shot(`${width}-personal`, "Choose Personal", "Exactly one Personal photograph is visible");
    await page.getByRole("button", { name: "View Around the fire", exact: true }).click();
    await dialog.waitFor({ state: "visible" });
    await position("1 of 1");
    await page.waitForFunction(() => document.querySelector("#lightbox-image").complete);
    await shot(`${width}-personal-viewer`, "Open Around the fire", "Viewer shows 1 of 1 with both navigation ends disabled");
    await page.keyboard.press("Escape");
    await modalClosed();
    await page.locator("nav").getByRole("link", { name: "Marketing", exact: true }).click();
    await page.getByRole("heading", { level: 1, name: "Farm Truck Brewing." }).waitFor();
    await shot(`${width}-farm-truck`, "Choose Marketing", "Farm Truck case study heading is visible");
    if (width === 1440 || width === 390) {
      await page.locator("nav").getByRole("link", { name: "About", exact: true }).click();
      await page.getByRole("heading", { level: 1, name: "Austin Wheeler." }).waitFor();
      await readyVisibleImages();
      const image = await page.locator(".about-grid img").evaluate((element) => {
        const box = element.getBoundingClientRect();
        const parent = element.parentElement.getBoundingClientRect();
        return { width: box.width, height: box.height, left: box.left, right: box.right, parentWidth: parent.width, intrinsicRatio: Number(element.getAttribute("width")) / Number(element.getAttribute("height")), currentSrc: element.currentSrc, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight };
      });
      assert.ok(image.width > 0 && image.height > 0 && image.height <= 900, `About image must have bounded positive dimensions at ${width}px`);
      assert.ok(Math.abs(image.width / image.height - image.intrinsicRatio) < 0.02, `About photograph must preserve its original proportions at ${width}px`);
      assert.ok(image.left >= 0 && image.right <= width + 1 && Math.abs(image.width - image.parentWidth) <= 1, `About image must fit its picture container at ${width}px`);
      assert.ok(new URL(image.currentSrc).pathname.startsWith("/photos/derived/") && image.naturalWidth > 0 && image.naturalHeight > 0, "About responsive image must decode");
      report.renderedImages.push({ viewport: width, page: "about", image });
      await shot(`${width}-about`, "Choose About", "About photograph fits its picture container and loads a responsive source");
    }
  }
  report.result = "passed";
  report.assertions.push("12/5/6/1 filters", "category Back/Forward", "modal owned history and unowned direct-link close", "deep-link refresh", "cross-category resolution", "invalid URL fallback", "first/last bounds and counter", "Escape focus restoration", "native modal inertness", "background scroll lock", "no-JavaScript original anchors", "desktop and mobile entry journeys", "rendered square thumbnails at 320/390/1440", "visible responsive images decoded before screenshots", "About image dimensions at 390/1440");
  console.log("gallery: ok (filters, URLs/refresh, Back/Forward, bounds/counter, focus, scroll lock, no-JS originals, square thumbnails and decoded responsive images)");
} catch (error) {
  report.result = "failed";
  report.failedStage = stage;
  report.error = error.message;
  console.error(`gallery: FAIL during ${stage}: ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(evidenceDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
