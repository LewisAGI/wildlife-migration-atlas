# Wildlife migration atlas

An interactive globe of animal migration through the year. Positions come from the day of the year, not from a constant speed along the line.

Phase 2 draws 58 populations from the v3 content pack: the Serengeti wildebeest and the Arctic tern, then the monarch, humpback routes, and the tracked and representative populations, including observed tracks for the Serengeti herd, the Arctic tern, leatherbacks, the whale shark, and the Himalayan griffon. Observed months, citizen-science sightings, estimated months, and months with no data are drawn differently. A MODIS vegetation overlay can be switched on. The Serengeti tracking file also carries a monthly NDVI median at the animals. Two populations can be compared side by side. Distances computed between monthly medians are labelled as minimums.

Estimated months are representative sketches from the literature. They are not tracked animals. Points between monthly fixes are interpolated, and the panel marks them approximate. Observed months are pooled medians from public tracking datasets, not one animal's path.

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

Populations come from `data/pack/content.json`, with citations in `data/pack/sources.json`. Licences, and what was deliberately left out, are in [`data/LICENSES.md`](data/LICENSES.md).

Each stored month is `observed`, `observed-sightings` (citizen-science medians), `representative` (shown as estimated), or `no-data`. A fix between months is `interpolated`. `simulated` is reserved for a later model. Nothing here is simulated. Entries whose source sets `nonCommercial`, or whose licence short form contains NC, show CC BY-NC and are not for a paid version; see `data/LICENSES.md`.

## Controls

The controls are icons. A name shows on hover, and on a long press. The species list, comparison, months, layers, playback speed, and loop sit in pop-outs. Arrow keys step one day.

## Deploy

Cloudflare Pages, project `wildlife-migration-atlas`. The workflow in `.github/workflows/pages.yml` runs the tests and the production build. Pushes to `main` deploy production. Pushes to any other branch deploy a preview and do not publish production. The deploy steps read `CF_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. If either secret is missing, that deploy is skipped and the workflow still passes.

If Cloudflare secrets are ever added to this repo, the atlas `pages.yml` and the HOHM bridge would both deploy `wildlife-migration-atlas`. Pick the bridge and remove the deploy jobs here.

## Licence

Code: MIT, © Lewis Godfrey. The globe and the time bar are adapted from [history-of-humanity-map](https://github.com/LewisAGI/history-of-humanity-map), which is the same author's MIT code. Data terms are separate — see `data/LICENSES.md`.
