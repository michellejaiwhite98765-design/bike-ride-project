// CARTO's free anonymous basemap tiles now require an API key (every tile
// returns an "API KEY REQUIRED" watermark without one). Esri's Dark Gray
// Canvas tiles need no key/signup and give an equivalent dark look, so we
// use those as two stacked layers: a base (land/water) and a reference
// overlay (roads, labels).
export const DARK_TILE_BASE_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const DARK_TILE_REFERENCE_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
export const DARK_TILE_ATTRIBUTION = '&copy; <a href="https://www.esri.com">Esri</a>';
