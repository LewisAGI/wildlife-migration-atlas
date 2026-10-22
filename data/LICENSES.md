# Data licences

Checked 22 October 2026. The application code is MIT (see `LICENSE`) and is separate from these data terms. No species photographs are shipped in Phase 1.

## Basemap

- **NASA GIBS Blue Marble** (`BlueMarble_ShadedRelief_Bathymetry`). NASA imagery is not subject to copyright. The map attribution reads “NASA Blue Marble · Natural Earth”.
- **Natural Earth** 1:110m land (`public/ne_110m_land.geojson`). Public domain.

## Wildebeest — `data/species/wildebeest.json`

Representative monthly positions for the Serengeti–Mara circuit. They are a schematic of the seasonal round described in the literature (southern plains in the rains, western corridor, Mara in the dry season), not digitised tracks.

- Source: Thirgood, S. et al. 2004. *Can parks protect migratory ungulates? The case of the Serengeti wildebeest.* Animal Conservation 7:113–120. https://doi.org/10.1017/S1367943004001404
- The paper reports GPS collars from 1999–2000. Those tracks are **not** in this repository, and no Movebank study file is redistributed. A public Serengeti–Mara collar study with a verified open licence was not available for Phase 1.
- Every fix is `status: "representative"`. Positions between fixes are `interpolated`. Both are approximate and vary from year to year.
- The paper itself is © Cambridge University Press.

## Arctic tern — `data/species/arctic-tern.json`

Two representative routes (West Africa and Brazil) for the high-Arctic Greenland and Iceland birds, plus the Newfoundland Basin stopover and Weddell Sea wintering area. Drawn from the published description, not from copied geolocator rows.

- Source: Egevang, C. et al. 2010. *Tracking of Arctic terns Sterna paradisaea reveals longest animal migration.* PNAS 107:2078–2081. https://doi.org/10.1073/pnas.0909493107
- The paper’s geolocators were accurate to about 185 km. These schematics use a wider uncertainty because they are not those fixes.
- OBIS-SEAMAP “Tracking of Arctic tern migrations 2007-2008” (GBIF `767f57dd-…`) is CC BY-NC 4.0. **That dataset was not copied** into this repository. If a later file is derived from it, that file must carry CC BY-NC 4.0 on its own, separate from the MIT code.
- Every stored fix is `status: "representative"`. Nothing here is an observed location.
- One published bird reached about 106°E. These two lines stay in the Atlantic and do not draw that Indian Ocean leg.
- Cited figures from the paper, not measured off this schematic: mean annual distance 70,900 km (range 59,500–81,600 km).

## Not used

- **eBird Status and Trends.** Left out of Phase 1. The October 2023 terms require an access request, citation, a disclaimer, and non-commercial use, and they restrict redistribution of modified products.
- **Environmental overlays** (NDVI, sea temperature, sea ice, rainfall). Phase 2. No placeholder layers are drawn.
- **Monarch and humpback.** Phase 2. No invented routes.
