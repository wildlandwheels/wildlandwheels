import { launchBrowser } from "../../../../scripts/browser_helpers.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const outDir = path.join(root, "artifacts/verify-wildlandwheels");
function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}
const base = arg("--base", "http://127.0.0.1:4173").replace(/\/$/, "");
const features = arg("--features", "home,photography").split(",").map((item) => item.trim()).filter(Boolean);
const report = { base, features, checks: [], shots: [], actions: [], ok: false };
let entryURL = "";
let page;

function check(feature, name, ok, detail) {
  ok = Boolean(ok);
  report.checks.push({ feature, entryURL, url: page.url(), name, ok, detail });
  if (!ok) throw new Error(`${feature}: ${name} failed (${detail})`);
}
async function shot(feature, name) {
  const file = path.join(outDir, `${feature}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.shots.push({ feature, entryURL, url: page.url(), name, file: path.relative(root, file) });
}
async function open(feature, pathname) {
  entryURL = `${base}${pathname}`;
  await page.goto(entryURL, { waitUntil: "networkidle" });
  await shot(feature, "entry");
}
async function action(feature, name, perform, target) {
  if (target) await target.scrollIntoViewIfNeeded();
  await shot(feature, `${name}-before`);
  const record = { feature, entryURL, name, beforeURL: page.url(), ok: false };
  report.actions.push(record);
  let actionFailed = false;
  try {
    await perform();
    record.ok = true;
  } catch (error) {
    actionFailed = true;
    record.error = error.message;
    throw error;
  } finally {
    record.afterURL = page.url();
    try {
      await shot(feature, `${name}-after`);
    } catch (error) {
      record.screenshotError = error.message;
      record.ok = false;
      if (!actionFailed) throw error;
    }
  }
}
async function waitForSettledScroll(selector, maxOffset) {
  await page.evaluate(() => { delete window.__verifyScroll; });
  await page.waitForFunction(({ selector, maxOffset }) => {
    const element = document.querySelector(selector);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const headerBottom = document.querySelector(".site-header")?.getBoundingClientRect().bottom || 0;
    const previous = window.__verifyScroll;
    const stable = previous && Math.abs(previous.y - window.scrollY) <= 0.5 ? previous.stable + 1 : 0;
    window.__verifyScroll = { y: window.scrollY, stable };
    return stable >= 3 && rect.top >= headerBottom - 2 && rect.bottom <= window.innerHeight &&
      (maxOffset === undefined || rect.top <= headerBottom + maxOffset);
  }, { selector, maxOffset });
}
const archiveHeading = () => page.getByRole("heading", { level: 1, name: "People. Places. A closer look." });
const visiblePhotos = () => page.locator("#photo-grid > figure:visible");
async function expectPhoto(title, counter) {
  await page.getByRole("heading", { level: 2, name: title, exact: true }).waitFor();
  check("photography", "photo title", await page.locator("#lightbox-title").textContent() === title, title);
  check("photography", "photo position", await page.locator("#lightbox-position").textContent() === counter, counter);
}

const journeys = {
  async home() {
    await open("home", "/");
    check("home", "hero visible", await archiveHeading().isVisible(), "hero heading");
    const alt = await page.locator(".hero-photograph img").getAttribute("alt");
    check("home", "hero alt", alt === "Stars above a dark forest and distant mountain", alt);
    const workLink = page.getByRole("link", { name: "View selected work", exact: true });
    await action("home", "selected-work", async () => {
      await workLink.click();
      await waitForSettledScroll("#work-title", 280);
      const work = page.getByRole("heading", { level: 2, name: "People, places and the moments between." });
      check("home", "selected work visible", await work.isVisible(), "heading below fixed header");
      check("home", "selected work hash", new URL(page.url()).hash === "#work", page.url());
    }, workLink);
    const explore = page.getByRole("link", { name: "Explore photography", exact: true });
    await action("home", "explore-photography", async () => {
      await explore.click();
      await page.waitForURL(/\/photography\/?$/);
      await archiveHeading().waitFor();
      check("home", "primary archive entry", await visiblePhotos().count() === 12, "12 photographs");
    }, explore);
  },

  async photography() {
    await open("photography", "/photography/");
    await archiveHeading().waitFor();
    check("photography", "all photographs", await visiblePhotos().count() === 12, "12 photographs");
    const placesTab = page.getByRole("tab", { name: "Places", exact: true });
    const panel = page.locator("#" + await placesTab.getAttribute("aria-controls"));
    check("photography", "tabpanel", await panel.getAttribute("role") === "tabpanel", "photo-grid");
    await action("photography", "places", async () => {
      await placesTab.click();
      check("photography", "tabpanel label", await panel.getAttribute("aria-labelledby") === "tab-places", "tab-places");
      check("photography", "places count", await visiblePhotos().count() === 5, "5 photographs");
      const captions = await visiblePhotos().locator("figcaption span:last-child").allTextContents();
      check("photography", "places labels", captions.every((label) => label === "Places"), captions.join(","));
      check("photography", "filter URL", new URL(page.url()).searchParams.get("category") === "places", page.url());
    }, placesTab);
    const alpine = page.getByRole("button", { name: "View An alpine afternoon", exact: true });
    await action("photography", "open-photo", async () => {
      await alpine.click();
      await expectPhoto("An alpine afternoon", "1 of 5");
      const src = await page.locator("#lightbox-image").getAttribute("src");
      check("photography", "original full-size image", src?.endsWith("/photos/archive-01.jpg"), src);
      check("photography", "lightbox category", await page.locator("#lightbox-category").textContent() === "Places", "Places");
      check("photography", "previous disabled at start", await page.getByRole("button", { name: "Previous photograph" }).isDisabled(), "first of five");
    }, alpine);
    await action("photography", "next-photo", async () => {
      await page.getByRole("button", { name: "Next photograph" }).click();
      await expectPhoto("Among the trees", "2 of 5");
      check("photography", "next URL", new URL(page.url()).searchParams.get("photo") === "among-the-trees", page.url());
    });
    await action("photography", "previous-photo", async () => {
      await page.getByRole("button", { name: "Previous photograph" }).click();
      await expectPhoto("An alpine afternoon", "1 of 5");
    });
    await action("photography", "close-photo", async () => {
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.locator("#lightbox").waitFor({ state: "hidden" });
      check("photography", "source focus restored", await alpine.evaluate((element) => element === document.activeElement), "alpine source");
      check("photography", "close preserves filter", new URL(page.url()).searchParams.get("category") === "places" && !new URL(page.url()).searchParams.has("photo"), page.url());
    });
    await action("photography", "history-back", async () => {
      await page.goBack();
      await page.waitForFunction(() => document.getElementById("tab-all").getAttribute("aria-selected") === "true");
      check("photography", "back restores all", await visiblePhotos().count() === 12, page.url());
    });
    await action("photography", "history-forward", async () => {
      await page.goForward();
      await page.waitForFunction(() => document.getElementById("tab-places").getAttribute("aria-selected") === "true");
      check("photography", "forward restores Places", await visiblePhotos().count() === 5, page.url());
    });
    await action("photography", "direct-emily", async () => {
      await page.goto(`${base}/photography/?category=portraits&photo=emily-in-studio`, { waitUntil: "networkidle" });
      await expectPhoto("Emily, in the studio", "1 of 6");
      check("photography", "direct portrait collection", await page.getByRole("tab", { name: "Portraits", exact: true }).getAttribute("aria-selected") === "true", "Portraits");
    });
    await action("photography", "close-direct", async () => {
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.locator("#lightbox").waitFor({ state: "hidden" });
      const url = new URL(page.url());
      check("photography", "direct close stays in archive", /^\/photography\/?$/.test(url.pathname) && url.searchParams.get("category") === "portraits" && !url.searchParams.has("photo"), page.url());
    });
    await action("photography", "direct-personal", async () => {
      await page.goto(`${base}/photography/?category=personal&photo=around-the-fire`, { waitUntil: "networkidle" });
      await expectPhoto("Around the fire", "1 of 1");
      check("photography", "one-photo boundaries", await page.getByRole("button", { name: "Previous photograph" }).isDisabled() && await page.getByRole("button", { name: "Next photograph" }).isDisabled(), "both disabled");
    });
    await action("photography", "escape-direct", async () => {
      await page.keyboard.press("Escape");
      await page.locator("#lightbox").waitFor({ state: "hidden" });
      check("photography", "Escape keeps Personal", new URL(page.url()).searchParams.get("category") === "personal" && await visiblePhotos().count() === 1, page.url());
    });
  },

  async "farm-truck"() {
    await open("farm-truck", "/");
    const project = page.getByRole("link", { name: /Read the project/ });
    await action("farm-truck", "open-project", async () => {
      await project.click();
      await page.waitForURL(/\/work\/farm-truck-brewing\/?$/);
      const heading = page.getByRole("heading", { level: 1, name: "Farm Truck Brewing." });
      await heading.waitFor();
      check("farm-truck", "case heading", await heading.isVisible(), "Farm Truck Brewing.");
      const visit = page.getByRole("link", { name: "Visit Farm Truck Brewing ↗" });
      check("farm-truck", "brewery link", await visit.getAttribute("href") === "https://farmtruckbrewing.com", await visit.getAttribute("href"));
      const email = page.getByRole("link", { name: "Email Austin", exact: true });
      check("farm-truck", "email link", await email.getAttribute("href") === "mailto:contact@austinw.photo", await email.getAttribute("href"));
    }, project);
    const label = page.getByRole("img", { name: "Lift Me Up IPA can label, a Farm Truck Brewing collaboration with SensaMotion and Kings and Comrades" });
    check("farm-truck", "label original source", await label.getAttribute("src") === "/photos/lift-me-up-can-label.jpg", await label.getAttribute("src"));
    const caption = await page.locator(".case-piece figcaption").innerText();
    check("farm-truck", "label caption", caption.includes("Lift Me Up IPA can label") && caption.includes("SensaMotion × Kings and Comrades collab"), caption);
    await page.setViewportSize({ width: 1440, height: 1200 });
    await action("farm-truck", "view-label", async () => {
      await page.locator(".case-piece").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
      await waitForSettledScroll(".case-piece", 48);
      await label.evaluate((image) => image.decode());
      const box = await label.boundingBox();
      const bounds = await page.evaluate(() => ({ header: document.querySelector(".site-header").getBoundingClientRect().bottom, height: window.innerHeight }));
      check("farm-truck", "label fully in view", !!box && box.y >= bounds.header - 2 && box.y + box.height <= bounds.height, JSON.stringify({ box, bounds }));
    });
    await page.setViewportSize({ width: 1440, height: 900 });
  },

  async contact() {
    await open("contact", "/");
    const contact = page.getByRole("link", { name: "Contact", exact: true });
    await action("contact", "contact-jump", async () => {
      await contact.click();
      await waitForSettledScroll("#contact-title");
      const email = page.getByRole("link", { name: "Email Austin", exact: true });
      check("contact", "mailto", await email.getAttribute("href") === "mailto:contact@austinw.photo", await email.getAttribute("href"));
      check("contact", "heading", await page.getByRole("heading", { level: 2, name: "Let’s make something worth noticing." }).isVisible(), "contact heading");
      const box = await email.boundingBox();
      check("contact", "email in viewport", !!box && box.y >= 0 && box.y + box.height <= 900, JSON.stringify(box));
    }, contact);
  },

  async about() {
    await open("about", "/");
    const about = page.getByRole("link", { name: "More about Austin", exact: true });
    await action("about", "open-about", async () => {
      await about.click();
      await page.waitForURL(/\/about\/?$/);
      const heading = page.getByRole("heading", { level: 1, name: "Austin Wheeler." });
      await heading.waitFor();
      check("about", "heading", await heading.isVisible(), "Austin Wheeler.");
      const lead = page.getByText("I’m Austin Wheeler, a photographer, marketer and wildland firefighter based in South Jersey. My photography brings together portraits, places, food and drink.", { exact: true });
      check("about", "lead", await lead.isVisible(), "photography introduction");
      const mail = page.getByRole("link", { name: "contact@austinw.photo ↗", exact: true });
      check("about", "email", await mail.getAttribute("href") === "mailto:contact@austinw.photo", await mail.getAttribute("href"));
    }, about);
  },

  async journal() {
    await open("journal", "/journal/");
    const heading = page.getByRole("heading", { level: 1, name: "The journal." });
    await heading.waitFor();
    check("journal", "heading", await heading.isVisible(), "The journal.");
    const link = page.getByRole("link", { name: "explore the photographs", exact: true });
    check("journal", "archive link", await link.getAttribute("href") === "/photography", await link.getAttribute("href"));
    await action("journal", "open-archive", async () => {
      await link.click();
      await page.waitForURL(/\/photography\/?$/);
      await archiveHeading().waitFor();
      check("journal", "archive heading", await archiveHeading().isVisible(), "archive heading");
      check("journal", "archive photos", await visiblePhotos().count() === 12, "12 photographs");
    }, link);
  },
};

const unknown = features.filter((feature) => !journeys[feature]);
if (unknown.length) {
  console.error(`Unknown features: ${unknown.join(", ")}`);
  process.exit(2);
}
await mkdir(outDir, { recursive: true });
let browser;
let currentFeature;
let failure;
try {
  browser = await launchBrowser();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const feature of features) {
    currentFeature = feature;
    await journeys[feature]();
  }
  report.ok = true;
} catch (error) {
  failure = error;
  report.failure = { feature: currentFeature, entryURL, url: page?.url(), message: error.message, stack: error.stack };
  if (page) {
    try { await shot(currentFeature || "driver", "failure"); } catch (shotError) { report.failure.screenshotError = shotError.message; }
  }
} finally {
  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  if (browser) await browser.close();
}
console.log(`drive: evidence ${path.relative(root, outDir)}`);
if (failure) {
  console.error(`drive: failed ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log(`drive: ok ${features.join(", ")}`);
}
