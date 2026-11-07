import { launchBrowser, pagesIn, startServer } from "./browser_helpers.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const widths = [320, 390, 768, 1024, 1440];
const tolerance = 1;

async function measure(page) {
  return page.evaluate((limit) => {
    const doc = document.documentElement;
    const delta = Math.max(
      doc.scrollWidth - doc.clientWidth,
      document.body.scrollWidth - document.body.clientWidth,
    );
    const view = doc.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 && rect.height < 1) continue;
      const over = Math.max(0, -rect.left, rect.right - view);
      if (over > limit) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === "string" ? el.className.slice(0, 60) : "",
          over: Math.round(over),
        });
      }
    }
    return { delta, offenders: offenders.slice(0, 6) };
  }, tolerance);
}

async function audit(dir) {
  const routes = pagesIn(dir);
  const { server, origin } = await startServer(dir);
  let browser;
  const findings = [];
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      for (const route of routes) {
        await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const result = await measure(page);
        if (result.delta > tolerance || result.offenders.length) {
          findings.push({ width, route, where: "page", ...result });
        }
        const inlineLinks = await page.evaluate(() => {
          return [...document.querySelectorAll("p a")].flatMap((el) => {
            const display = getComputedStyle(el).display;
            if (display === "inline") return [];
            return [{ display, text: (el.textContent || "").trim().slice(0, 40) }];
          });
        });
        if (inlineLinks.length) {
          findings.push({
            width,
            route,
            where: "inline-link",
            delta: 0,
            offenders: inlineLinks.map((entry) => ({ tag: "a", cls: `${entry.display} ${entry.text}`, over: 0 })),
          });
        }
        if (await page.locator(".photo-button").count()) {
          await page.locator(".photo-button").first().click();
          await page.locator("dialog[open]").waitFor();
          const open = await measure(page);
          if (open.delta > tolerance || open.offenders.length) {
            findings.push({ width, route, where: "lightbox", ...open });
          }
          await page.getByRole("button", { name: "Close" }).click();
          await page.locator("dialog[open]").waitFor({ state: "hidden" });
        }
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  return findings;
}

function report(findings) {
  for (const item of findings) {
    if (item.where === "inline-link") {
      const names = item.offenders.map((entry) => entry.cls).join(", ");
      console.error(`inline-link: ${item.width}px ${item.route} in-paragraph link is not inline (${names})`);
      continue;
    }
    const names = item.offenders.map((entry) => `${entry.tag}.${entry.cls} (+${entry.over}px)`).join(", ");
    console.error(
      `overflow: ${item.width}px ${item.route} ${item.where} scroll ${Math.round(item.delta)}px${names ? ` ${names}` : ""}`,
    );
  }
}

async function selfTest() {
  const brokenDir = path.join(root, "scripts/overflow/broken");
  const fittedDir = path.join(root, "scripts/overflow/fitted");
  const inlineFlexDir = path.join(root, "scripts/overflow/inline-flex");
  const broken = await audit(brokenDir);
  const fitted = await audit(fittedDir);
  const inlineFlex = await audit(inlineFlexDir);
  let failed = false;
  if (!broken.length) {
    console.error("overflow self-test: broken fixture did not overflow");
    failed = true;
  } else {
    console.log(
      `overflow self-test: broken fixture failed as expected (${broken[0].width}px ${broken[0].route} scroll ${Math.round(broken[0].delta)}px)`,
    );
  }
  if (fitted.length) {
    console.error("overflow self-test: fitted fixture failed");
    report(fitted);
    failed = true;
  } else {
    console.log("overflow self-test: fitted fixture passed");
  }
  if (!inlineFlex.some((item) => item.where === "inline-link")) {
    console.error("overflow self-test: in-paragraph inline-flex link was not detected");
    failed = true;
  } else if (inlineFlex.some((item) => item.where !== "inline-link")) {
    console.error("overflow self-test: inline-flex fixture failed for another reason");
    report(inlineFlex.filter((item) => item.where !== "inline-link"));
    failed = true;
  } else {
    console.log(
      `overflow self-test: in-paragraph inline-flex link failed as expected (${inlineFlex[0].width}px ${inlineFlex[0].route})`,
    );
  }
  if (failed) {
    console.error("overflow self-test: failed");
    return 1;
  }
  console.log("overflow self-test: ok");
  return 0;
}

const arg = process.argv[2];
if (!arg || arg === "-h" || arg === "--help") {
  console.error("usage: node scripts/check_overflow.mjs <site-dir|--self-test>");
  process.exit(2);
}

if (arg === "--self-test") {
  process.exit(await selfTest());
}

const dir = path.resolve(arg);
if (!fs.existsSync(dir)) {
  console.error(`overflow: ${dir} does not exist`);
  process.exit(2);
}
const findings = await audit(dir);
if (findings.length) {
  report(findings);
  process.exit(1);
}
const count = pagesIn(dir).length;
console.log(`overflow: ok (${count} pages at ${widths.join("px and ")}px)`);
