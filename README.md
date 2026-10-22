# Wildlife migration atlas

An interactive globe of animal migration through the year. Phase 1 draws the Serengeti–Mara wildebeest and the Arctic tern. Positions come from the day of the year, not from a constant speed along the line.

The wildebeest round and both tern routes are **representative** sketches from the literature. They are not tracked animals. Points between the monthly or seasonal fixes are interpolated, and the panel marks them approximate.

## Develop

```bash
npm install
npm run dev
```

## Test

```bash
npm test
npm run build
npm run test:e2e
```

## Data

Species files live in `data/species/` and are listed in `data/index.json`. Adding a species is a new JSON file plus an index entry. Licences, and what was deliberately left out, are in [`data/LICENSES.md`](data/LICENSES.md).

Each fix has a status (`observed`, `representative`, `interpolated`, or `simulated`) and a source id. `simulated` is reserved for a later model. Nothing in Phase 1 is simulated, and the literature routes are `representative`.

## Controls

The controls are icons. A name shows on hover, and on a long press. The species list, playback speed, and loop sit in pop-outs. Arrow keys step one day.

## Deploy

Cloudflare Pages, project `wildlife-migration-atlas`. The workflow in `.github/workflows/pages.yml` runs the tests and the production build. Pushes to `main` deploy production. Pushes to any other branch deploy a preview and do not publish production. The deploy steps read `CF_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. If either secret is missing, that deploy is skipped and the workflow still passes.

## Licence

Code: MIT, © Lewis Godfrey. The globe and the time bar are adapted from [history-of-humanity-map](https://github.com/LewisAGI/history-of-humanity-map), which is the same author's MIT code. Data terms are separate — see `data/LICENSES.md`.
