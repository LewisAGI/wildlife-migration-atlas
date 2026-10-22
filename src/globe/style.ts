import type { StyleSpecification } from 'maplibre-gl';

/** Night globe. NASA Blue Marble over Natural Earth land, darkened for a documentary sea. */
export function mapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      land: { type: 'geojson', data: '/ne_110m_land.geojson' },
      marble: {
        type: 'raster',
        tiles: [
          'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
        ],
        tileSize: 256,
        maxzoom: 8,
      },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#050910' } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#101814' } },
      {
        id: 'coast',
        type: 'line',
        source: 'land',
        paint: { 'line-color': '#1c2c26', 'line-width': 0.6 },
      },
      {
        id: 'marble',
        type: 'raster',
        source: 'marble',
        paint: {
          'raster-saturation': -0.05,
          'raster-contrast': 0.15,
          'raster-brightness-min': 0,
          'raster-brightness-max': 0.74,
        },
      },
    ],
  };
}
