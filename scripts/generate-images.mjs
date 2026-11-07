#!/usr/bin/env node
// Build derivatives only; never write to a source photograph or brand asset.
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceManifestPath = path.join(root, 'scripts/image-sources.json');
const dist = path.resolve(root, process.env.IMAGE_DIST || 'dist');
const output = path.join(dist, 'photos/derived');
const config = {
  widths: [480, 960, 1440],
  resize: { withoutEnlargement: true, kernel: 'lanczos3' },
  webp: { quality: 86, effort: 6 },
  jpeg: { quality: 88, progressive: true, mozjpeg: true, chromaSubsampling: '4:4:4' },
  colour: 'srgb',
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const cacheKey = sha256(JSON.stringify({ config, versions: sharp.versions }));
const cache = path.join(root, 'node_modules/.cache/wildlandwheels-images', cacheKey);
const useCache = process.env.IMAGE_CACHE !== '0';

async function inventory() {
  const photoFiles = (await readdir(path.join(root, 'photos'))).sort();
  if (photoFiles.some((file) => !/\.jpg$/.test(file))) {
    throw new Error('Unexpected source in photos/: review the preservation baseline before building.');
  }
  const preservedFiles = [
    ...photoFiles.map((file) => `photos/${file}`),
    'favicon.svg',
    ...(await readdir(path.join(root, 'fonts'))).sort().map((file) => `fonts/${file}`),
  ];
  const preserved = {};
  for (const file of preservedFiles) {
    const bytes = await readFile(path.join(root, file));
    preserved[file] = { bytes: bytes.length, sha256: sha256(bytes) };
  }
  const images = {};
  for (const file of photoFiles) {
    const metadata = await sharp(path.join(root, 'photos', file)).metadata();
    const swapsDimensions = metadata.orientation >= 5;
    images[`/photos/${file}`] = {
      width: swapsDimensions ? metadata.height : metadata.width,
      height: swapsDimensions ? metadata.width : metadata.height,
      orientation: metadata.orientation || 1,
      derivatives: /^archive-\d{2}\.jpg$/.test(file),
    };
  }
  return { schemaVersion: 1, preserved, images };
}

// Intentional maintenance command. Normal builds only read this committed baseline.
if (process.argv.includes('--write-source-manifest')) {
  await writeFile(sourceManifestPath, json(await inventory()));
  console.log('Recorded source hashes and dimensions in scripts/image-sources.json');
  process.exit(0);
}

const baseline = JSON.parse(await readFile(sourceManifestPath, 'utf8'));
const actual = await inventory();
if (JSON.stringify(actual) !== JSON.stringify(baseline)) {
  throw new Error('Source photo or brand asset differs from scripts/image-sources.json. Original bytes and names must be preserved.');
}
for (const [file, expected] of Object.entries(baseline.preserved)) {
  const builtBytes = await readFile(path.join(dist, file));
  if (sha256(builtBytes) !== expected.sha256) {
    throw new Error(`Built asset differs from preserved source: ${file}`);
  }
}
await mkdir(output, { recursive: true });
if (useCache) await mkdir(cache, { recursive: true });
const manifest = {
  schemaVersion: 1,
  generator: { sharp: sharp.versions.sharp, vips: sharp.versions.vips, config },
  sizesCandidates: {
    gallery: '(max-width: 500px) calc(100vw - 40px), (max-width: 640px) 92vw, (max-width: 980px) calc((92vw - 18px) / 2), (max-width: 1400px) calc((92vw - 36px) / 3), (max-width: 1552px) calc((100vw - 148px) / 3), 468px',
    fullWidth: '100vw',
  },
  preserved: baseline.preserved,
  images: {},
};
let cacheHits = 0;
for (const [src, source] of Object.entries(baseline.images)) {
  const file = src.slice(1);
  const original = { src, ...baseline.preserved[file], width: source.width, height: source.height };
  const entry = { original, variants: { webp: [], jpeg: [] }, srcset: {}, fallback: original };
  if (source.derivatives) {
    const widths = [...new Set(config.widths.map((width) => Math.min(width, source.width)))];
    for (const width of widths) {
      for (const format of ['webp', 'jpeg']) {
        const extension = format === 'jpeg' ? 'jpg' : 'webp';
        const name = `${path.basename(file, '.jpg')}-${width}.${extension}`;
        const cachedFile = path.join(cache, `${original.sha256}-${name}`);
        const cachedMetadata = `${cachedFile}.json`;
        const destination = path.join(output, name);
        let buffer;
        let info;
        if (useCache) {
          try {
            buffer = await readFile(cachedFile);
            info = JSON.parse(await readFile(cachedMetadata, 'utf8'));
            if (sha256(buffer) !== info.sha256) throw new Error('Invalid cache digest');
            cacheHits++;
          } catch {
            buffer = undefined;
          }
        }
        if (!buffer) {
          const result = await sharp(path.join(root, file))
            .autoOrient()
            .resize({ width, ...config.resize })
            .withIccProfile(config.colour)
            [format](config[format])
            .toBuffer({ resolveWithObject: true });
          buffer = result.data;
          info = { width: result.info.width, height: result.info.height, sha256: sha256(buffer) };
          if (useCache) {
            await writeFile(cachedFile, buffer);
            await writeFile(cachedMetadata, json(info));
          }
        }
        await writeFile(destination, buffer);
        entry.variants[format].push({
          src: `/photos/derived/${name}`,
          width: info.width,
          height: info.height,
          bytes: buffer.length,
          sha256: info.sha256,
        });
      }
    }
    for (const format of ['webp', 'jpeg']) {
      entry.srcset[format] = entry.variants[format].map((variant) => `${variant.src} ${variant.width}w`).join(', ');
    }
    entry.fallback = entry.variants.jpeg.find((variant) => variant.width >= 960) || entry.variants.jpeg.at(-1);
  }
  manifest.images[src] = entry;
}
// These scenarios measure every archive image once, with candidate selection at the
// stated CSS width and DPR. Actual lazy-load/network behavior is verified in the browser.
const archive = Object.values(manifest.images).filter((entry) => entry.variants.webp.length);
const originalBytes = archive.reduce((sum, entry) => sum + entry.original.bytes, 0);
manifest.transferScenarios = [];
for (const [cssWidth, dpr] of [[375, 1], [375, 2], [420, 2]]) {
  for (const format of ['webp', 'jpeg']) {
    const bytes = archive.reduce((sum, entry) => {
      const variants = entry.variants[format];
      const candidate = variants.find((variant) => variant.width >= cssWidth * dpr) || variants.at(-1);
      return sum + candidate.bytes;
    }, 0);
    manifest.transferScenarios.push({ cssWidth, dpr, format, originalBytes, bytes, savingPercent: Number(((1 - bytes / originalBytes) * 100).toFixed(2)) });
  }
}
await writeFile(path.join(dist, 'photos/image-manifest.json'), json(manifest));
console.log(`Images: verified ${Object.keys(baseline.preserved).length} originals/brand assets; built ${archive.length * config.widths.length * 2} derivatives (${cacheHits} cache hits).`);
for (const scenario of manifest.transferScenarios) {
  console.log(`Archive ${scenario.cssWidth}px @${scenario.dpr}x ${scenario.format}: ${scenario.bytes.toLocaleString('en-US')} bytes (${scenario.savingPercent}% below originals).`);
}
