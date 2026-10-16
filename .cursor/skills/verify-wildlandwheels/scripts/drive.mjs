import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const outDir = path.join(root, "artifacts/verify-wildlandwheels");

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1];
}

const base = arg("--base", "http://127.0.0.1:4173").replace(/\/$/, "");
const features = arg("--features", "home,photography")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const shots = [];
const checks = [];

function check(feature, name, ok, detail) {
  checks.push({ feature, name, ok, detail });
  if (!ok) {
    throw new Error(`${feature}: ${name} failed (${detail})`);
  }
}

async function shot(page, feature, name) {
  const file = path.join(outDir, `${feature}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  shots.push({ feature, name, file: path.relative(root, file) });
}

const journeys = {
  async home(page) {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    const hero = page.getByRole("heading", { level: 1, name: "People. Places. A closer look." });
    await hero.waitFor();
    check("home", "hero visible", await hero.isVisible(), "heading");
    await shot(page, "home", "loaded");
    await page.getByRole("link", { name: "View selected work" }).click();
    const work = page.getByRole("heading", { level: 2, name: "Two sides of the same practice." });
    await work.waitFor();
    await page.waitForTimeout(200);
    const box = await work.boundingBox();
    check("home", "selected work in view", !!box && box.y >= 0 && box.y < 900, JSON.stringify(box));
    check("home", "url hash", page.url().includes("#work"), page.url());
    await shot(page, "home", "selected-work");
  },

  async photography(page) {
    await page.goto(`${base}/photography`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: "People. Places. A closer look." }).waitFor();
    const all = page.locator(".photo-grid figure:visible");
    check("photography", "all photographs", (await all.count()) === 12, String(await all.count()));
    await shot(page, "photography", "all");
    await page.getByRole("tab", { name: "Places" }).click();
    const places = page.locator(".photo-grid figure:visible");
    check("photography", "places count", (await places.count()) === 5, String(await places.count()));
    const captions = await places.locator("figcaption span:last-child").allTextContents();
    check("photography", "places labels", captions.every((label) => label === "Places"), captions.join(","));
    await shot(page, "photography", "places");
    await page.getByRole("button", { name: "View An alpine afternoon" }).click();
    const title = page.getByRole("heading", { level: 2, name: "An alpine afternoon" });
    await title.waitFor();
    const image = page.locator("#lightbox-image");
    check("photography", "lightbox image", (await image.getAttribute("src"))?.includes("/photos/archive-01.jpg") === true, await image.getAttribute("src"));
    check("photography", "lightbox category", (await page.locator("#lightbox-category").textContent()) === "Places", await page.locator("#lightbox-category").textContent());
    await shot(page, "photography", "lightbox");
    await page.getByRole("button", { name: "Close" }).click();
    check("photography", "lightbox closed", !(await title.isVisible()), "closed");
    await shot(page, "photography", "closed");
  },

  async "farm-truck"(page) {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await shot(page, "farm-truck", "home");
    await page.getByRole("link", { name: "Read the project" }).click();
    await page.waitForURL(/\/work\/farm-truck-brewing$/);
    const heading = page.getByRole("heading", { level: 1, name: "Farm Truck Brewing." });
    await heading.waitFor();
    check("farm-truck", "case heading", await heading.isVisible(), "heading");
    const visit = page.getByRole("link", { name: "Visit Farm Truck Brewing ↗" });
    check("farm-truck", "brewery link", (await visit.getAttribute("href")) === "https://farmtruckbrewing.com", await visit.getAttribute("href"));
    const email = page.getByRole("link", { name: "Email Austin" });
    check("farm-truck", "email link", (await email.getAttribute("href")) === "mailto:contact@austinw.photo", await email.getAttribute("href"));
    await shot(page, "farm-truck", "case");
  },

  async contact(page) {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Contact" }).click();
    const email = page.getByRole("link", { name: "Email Austin" });
    await email.waitFor();
    await page.waitForTimeout(200);
    const href = await email.getAttribute("href");
    check("contact", "mailto", href === "mailto:contact@austinw.photo", href);
    check("contact", "visible", await email.isVisible(), "visible");
    const box = await email.boundingBox();
    check("contact", "in view", !!box && box.y >= 0 && box.y < 900, JSON.stringify(box));
    await shot(page, "contact", "email");
  },

  async about(page) {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "More about Austin" }).click();
    await page.waitForURL(/\/about$/);
    const heading = page.getByRole("heading", { level: 1, name: "Austin Wheeler." });
    await heading.waitFor();
    const mail = page.getByRole("link", { name: "contact@austinw.photo ↗" });
    check("about", "heading", await heading.isVisible(), "heading");
    check("about", "email", (await mail.getAttribute("href")) === "mailto:contact@austinw.photo", await mail.getAttribute("href"));
    await shot(page, "about", "page");
  },

  async journal(page) {
    await page.goto(`${base}/journal`, { waitUntil: "networkidle" });
    const heading = page.getByRole("heading", { level: 1, name: "The journal." });
    await heading.waitFor();
    const link = page.getByRole("link", { name: "explore the photographs" });
    check("journal", "heading", await heading.isVisible(), "heading");
    check("journal", "archive link", (await link.getAttribute("href")) === "/#photographs", await link.getAttribute("href"));
    await shot(page, "journal", "page");
  },
};

const unknown = features.filter((feature) => !journeys[feature]);
if (unknown.length) {
  console.error(`Unknown features: ${unknown.join(", ")}`);
  process.exit(2);
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  for (const feature of features) {
    await journeys[feature](page);
  }
} finally {
  await browser.close();
}

const report = { base, features, checks, shots };
await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(`drive: ok ${features.join(", ")}`);
console.log(`drive: evidence ${path.relative(root, outDir)}`);
