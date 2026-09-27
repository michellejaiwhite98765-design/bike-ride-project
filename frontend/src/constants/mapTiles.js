// Esri's Dark/Light Gray Canvas basemaps (services.arcgisonline.com) are
// unreachable from some networks/ISPs - the TCP connection itself times out,
// leaving the map blank with no console error. OpenStreetMap's tile host is
// reliably reachable, so we use it everywhere and fake a dark basemap with a
// CSS filter on the tile pane instead of depending on a second tile host.
export const COLOR_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const COLOR_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const DARK_TILE_FILTER = "invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(0.75)";
