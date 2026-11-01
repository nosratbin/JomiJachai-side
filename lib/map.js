import { MOUZAS } from "./seed";

export const MAP_COLOR = { safe: "#22c55e", careful: "#f5b014", risky: "#ef4444", river: "#38bdf8" };

function toLatLng([lat, lng], east, north) {
  return [lat + north / 111320, lng + east / (111320 * Math.cos((lat * Math.PI) / 180))];
}

export function outline(plot) {
  const m = MOUZAS[plot?.mouza.en];
  if (!m || !plot.map) return null;
  const [x, y, w, h] = plot.map;
  return [toLatLng(m.at, x, y), toLatLng(m.at, x + w, y), toLatLng(m.at, x + w, y + h), toLatLng(m.at, x, y + h)];
}

export function centre(pts) {
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

export const allOutlines = (state) => Object.values(state.plots).map(outline).filter(Boolean);

export const latLngText = ([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

export const closeZoom = (plot) => (plot.map[2] < 15 ? 19 : 18);
