# Wildlandwheels

Austin Wheeler’s portfolio: photography, short-form content, and marketing.

The site is static HTML, CSS, and one gallery script. It does not need a backend.

## Run locally

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/

`npm run dev` runs the same command.

## Build

```bash
bash scripts/build.sh
```

`npm run build` runs that script. It copies the site into `dist/` for any static host.

Preview the build:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

`npm run preview` runs the same command. Build first so `dist/` exists.
