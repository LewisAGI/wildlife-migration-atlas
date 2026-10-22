# Data licences

Checked 22 October 2026. The application code is MIT (see `LICENSE`) and is separate from these data terms. No species photographs are shipped.

The catalog is Shisui's v2 pack: `data/pack/content.json` and `data/pack/sources.json`. It holds 47 populations. Monthly positions are either observed medians, representative (estimated) regions, or no-data gaps. Raw tracking rows are not in this repository.

## Basemap

- **NASA GIBS Blue Marble** (`BlueMarble_ShadedRelief_Bathymetry`). NASA imagery is not subject to copyright. The map attribution reads “NASA Blue Marble · Natural Earth”.
- **Natural Earth** 1:110m land (`public/ne_110m_land.geojson`). Public domain.

## Vegetation overlay

MODIS Terra L3 NDVI monthly composites for 2023, streamed from NASA GIBS (`MODIS_Terra_L3_NDVI_Monthly`). They are observed monthly composites, not a climatology, and they are not stored in this repository. NASA imagery is not subject to copyright. The attribution names the layer while it is on.

## Movebank datasets

Observed months are median latitude and median longitude of publicly downloadable Movebank Data Repository fixes, pooled across individuals and years, with an interquartile range. The medians are derived data. The CSV files are not redistributed.

Licences, from DataCite, are carried on each dataset's provenance entry:

- Most datasets are CC0.
- Some are CC BY 4.0. Those entries name the dataset.
- **European honey buzzard (Finland), DOI `10.5441/001/1.335`, is Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).** The monthly medians for `honey-buzzard-finland` are under that licence. Non-commercial use only. The sheet and the map attribution show `CC BY-NC 4.0` while that population is selected.

Months flagged dispersed are medians that fall between groups. Months with no fixes are `no-data` and are not filled in.

Tag `external-temperature` readings exist for the tracked white stork, the Ya Ha Tinda elk, and the Egyptian vulture. They are tag or near-body temperature, not air or water temperature, and the sheet says so.

## Representative populations

Where the pack has no anonymous Movebank download, months are estimated regions from the cited seasonal cycle. Coordinates are named places, not copied tracks. Every such fix is `representative`. The Arctic tern paper (Egevang et al. 2010, PNAS) is free to read and is not under an open licence. OBIS-SEAMAP “Tracking of Arctic tern migrations 2007-2008” is CC BY-NC 4.0 and was **not** copied. The cited annual mean used for the tern distance clock is 70,900 km from that paper.

The Serengeti wildebeest circuit is given as 800–1,000 km. It is a representative seasonal round, not the 1999–2000 GPS tracks.

## Not used

- **eBird Status and Trends.** Still left out. The terms require an access request and restrict redistribution.
- **CHIRPS rainfall, a sea-surface temperature grid, and a sea-ice grid** are not drawn. The one environmental overlay is the MODIS NDVI layer above.
- Nothing in the catalog is `simulated`.
