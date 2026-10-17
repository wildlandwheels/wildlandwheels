import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const widths = [320, 390];
const tolerance = 1;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function pagesIn(dir) {
  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) found.push(full);
    }
  };
  walk(dir);
  return found.map((file) => {
    const rel = path.relative(dir, file).split(path.sep).join("/");
    if (rel === "index.html") return "/";
    if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
    return `/${rel}`;
  });
}

function startServer(dir) {
  const base = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.resolve(base, `.${rel}`);
    if (file !== base && !file.startsWith(`${base}${path.sep}`)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let target = file;
    if (!fs.existsSync(target) && !path.extname(target)) {
      const index = path.join(target, "index.html");
      if (fs.existsSync(index)) target = index;
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(target)] || "application/octet-stream" });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

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
  const browser = await launchBrowser();
  const findings = [];
  try {
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
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  return findings;
}

function report(findings) {
  for (const item of findings) {
    const names = item.offenders.map((entry) => `${entry.tag}.${entry.cls} (+${entry.over}px)`).join(", ");
    console.error(
      `overflow: ${item.width}px ${item.route} ${item.where} scroll ${Math.round(item.delta)}px${names ? ` ${names}` : ""}`,
    );
  }
}

async function selfTest() {
  const brokenDir = path.join(root, "scripts/overflow/broken");
  const fittedDir = path.join(root, "scripts/overflow/fitted");
  const broken = await audit(brokenDir);
  const fitted = await audit(fittedDir);
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
    console.error("overflow self-test: fitted fixture overflowed");
    report(fitted);
    failed = true;
  } else {
    console.log("overflow self-test: fitted fixture passed");
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
