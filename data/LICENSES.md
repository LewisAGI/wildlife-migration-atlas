# Data licences

Checked 22 October 2026. The application code is MIT (see `LICENSE`) and is separate from these data terms. No species photographs are shipped.

The catalog is Shisui's v3 pack: `data/pack/content.json` and `data/pack/sources.json`. It holds 58 populations. Monthly positions are observed medians, citizen-science `observed-sightings`, representative (estimated) regions, or no-data gaps. Raw tracking rows are not in this repository. Distances computed as the sum of haversine legs between monthly medians are minimums: the animal's path between those points is longer.

## Basemap

- **NASA GIBS Blue Marble** (`BlueMarble_ShadedRelief_Bathymetry`). NASA imagery is not subject to copyright. The map attribution reads “NASA Blue Marble · Natural Earth”.
- **Natural Earth** 1:110m land (`public/ne_110m_land.geojson`). Public domain.

## Vegetation overlay

MODIS Terra L3 NDVI monthly composites for 2023, streamed from NASA GIBS (`MODIS_Terra_L3_NDVI_Monthly`). They are observed monthly composites, not a climatology, and they are not stored in this repository. NASA imagery is not subject to copyright. The attribution names the layer while it is on.

The Serengeti GPS entry `wildebeest-serengeti-obs` (Dryad `10.5061/dryad.5tb2rbp76`, CC0) includes a monthly NDVI median and a grass-nitrogen median at the collared animals. Those numbers come from the tracking file. They are not the MODIS map composite. While the vegetation overlay is on and that population is selected, the attribution also shows the herd's NDVI median for the current month.

## Movebank datasets

Observed months are median latitude and median longitude of publicly downloadable Movebank Data Repository fixes, pooled across individuals and years, with an interquartile range. The medians are derived data. The CSV files are not redistributed.

Licences, from DataCite, are carried on each dataset's provenance entry:

- Most datasets are CC0.
- Some are CC BY 4.0. Those entries name the dataset.
- **European honey buzzard (Finland), DOI `10.5441/001/1.335`, is Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).** The monthly medians for `honey-buzzard-finland` are under that licence. The sheet and the map attribution show `CC BY-NC 4.0` while that population is selected.

## Entries with `nonCommercial: true`

A source with `nonCommercial: true` is CC BY-NC. The populations below use one of those sources. **These entries cannot be used in a paid version** of this atlas. The sheet and the map attribution say `CC BY-NC 4.0. Not for a paid version.` while one of them is selected.

- `arctic-tern-obs` — OBIS-SEAMAP geolocators, `dataset-10-82144-f1e7b55e`
- `leatherback-south-africa-nc` — `dataset-10-82144-cf4235bc`
- `humpback-wap` — Palmer LTER, `dataset-10-82144-a67782d6`
- `white-stork-birdmap` and `osprey-europe-birdmap` — BirdMap, `dataset-10-15468-vnwmrx`
- `monarch-sightings` — iNaturalist via GBIF `10.15468/ab3s5x`, `dataset-10-15468-ab3s5x`

`observed-sightings` months on the monarch entry are citizen-science medians, not tagged butterflies. They are drawn separately from tracked `observed` months.

Months flagged dispersed are medians that fall between groups. Months with no fixes are `no-data` and are not filled in.

Tag `external-temperature` readings exist for the tracked white stork, the Ya Ha Tinda elk, and the Egyptian vulture. They are tag or near-body temperature, not air or water temperature, and the sheet says so.

## Representative populations

Where the pack has no anonymous Movebank download, months are estimated regions from the cited seasonal cycle. Coordinates are named places, not copied tracks. Every such fix is `representative`. The Arctic tern paper (Egevang et al. 2010, PNAS) is free to read and is not under an open licence. OBIS-SEAMAP “Tracking of Arctic tern migrations 2007-2008” is CC BY-NC 4.0 and was **not** copied. The cited annual mean used for the tern distance clock is 70,900 km from that paper.

The Serengeti wildebeest circuit is given as 800–1,000 km. It is a representative seasonal round, not the 1999–2000 GPS tracks.

## Not used

- **eBird Status and Trends.** Still left out. The terms require an access request and restrict redistribution.
- **CHIRPS rainfall, a sea-surface temperature grid, and a sea-ice grid** are not drawn. The one environmental overlay is the MODIS NDVI layer above.
- Nothing in the catalog is `simulated`.
