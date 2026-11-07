import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

export function pagesIn(dir) {
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

export function startServer(dir) {
  const base = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let rel;
    try { rel = decodeURIComponent(url.pathname); }
    catch { res.writeHead(400); res.end(); return; }
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.resolve(base, `.${rel}`);
    if (file !== base && !file.startsWith(`${base}${path.sep}`)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let target = file;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory() && !url.pathname.endsWith("/")) {
      res.writeHead(301, { location: `${url.pathname}/${url.search}` });
      res.end();
      return;
    }
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
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

export async function launchBrowser() {
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROMIUM_PATH;
  if (configured) return chromium.launch({ executablePath: configured, headless: true });
  const attempts = [];
  for (const executablePath of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) {
    if (fs.existsSync(executablePath)) attempts.push({ executablePath });
  }
  attempts.push({ channel: "chrome" }, {});
  const errors = [];
  for (const options of attempts) {
    try { return await chromium.launch({ ...options, headless: true }); }
    catch (error) { errors.push(`${options.executablePath || options.channel || "Playwright Chromium"}: ${error.message.split("\n")[0]}`); }
  }
  throw new Error(`No usable Chromium browser. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or install Playwright Chromium.\n${errors.join("\n")}`);
}
