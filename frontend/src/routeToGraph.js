// No more Overpass or OSRM calls at runtime — just loads pre-built JSON

const GRAPH_CACHE = {}; // in-memory cache so the file is only fetched once per session

export async function fetchRouteGraph(source, destination) {
  const city = await detectCity(source);

  if (!GRAPH_CACHE[city]) {
    const res = await fetch(`/graphs/${city}.json`);
    if (!res.ok) throw new Error(`No pre-built graph for this area. Try a supported city.`);
    GRAPH_CACHE[city] = await res.json();
  }

  const { graph, nodes } = GRAPH_CACHE[city];

  // Snap the clicked points to the nearest node in the pre-built graph
  const startKey = nearestNode(source.lat, source.lng, nodes);
  const endKey   = nearestNode(destination.lat, destination.lng, nodes);

  if (!startKey || !endKey) throw new Error("Could not find nearby roads. Try clicking closer to a road.");

  return { graph, nodes, startKey, endKey };
}
// routeToGraph.js — add export
export const CITY_CENTERS = {
  london:  { lat: 51.505,  lng: -0.09,   radius: 0.09, label: "London" },
  newyork: { lat: 40.758,  lng: -73.985, radius: 0.09, label: "New York" },
  mumbai:  { lat: 19.076,  lng: 72.877,  radius: 0.09, label: "Mumbai" },
  paris:   { lat: 48.856,  lng: 2.352,   radius: 0.09, label: "Paris" },
  tokyo:      { lat: 35.676,  lng: 139.650,  radius: 0.09, label: "Tokyo" },
  rio:        { lat: -22.906, lng: -43.172,  radius: 0.09, label: "Rio de Janeiro" },
  delhi:      { lat: 28.613,  lng: 77.209,   radius: 0.09, label: "Delhi" },
  berlin:     { lat: 52.520,  lng: 13.405,   radius: 0.09, label: "Berlin" },
  sydney:     { lat: -33.868, lng: 151.209,  radius: 0.09, label: "Sydney" },
  world:      {
    lat: 20,
    lng: 0,
    radius: 0,
    label: "World (Experimental)",
    experimental: true,
  },
};
// Determine which city graph to load based on where the user clicked
async function detectCity(point) {
  const CITY_CENTERS = {
    london:  { lat: 51.505,  lng: -0.09,   radius: 0.09 },
    newyork: { lat: 40.758,  lng: -73.985, radius: 0.09 },
    mumbai:  { lat: 19.076,  lng: 72.877,  radius: 0.09 },
    paris:   { lat: 48.856,  lng: 2.352,   radius: 0.09 },
    tokyo:   { lat: 35.676,  lng: 139.650,  radius: 0.09 },
    rio:     { lat: -22.906, lng: -43.172, radius: 0.09},
    delhi:   { lat: 28.613,  lng: 77.209,   radius: 0.09},
    berlin:  { lat: 52.520,  lng: 13.405,   radius: 0.09},
    sydney:  { lat: -33.868, lng: 151.209,  radius: 0.09},
  };

  for (const [key, city] of Object.entries(CITY_CENTERS)) {
    if (city.experimental) continue;
    const dLat = Math.abs(point.lat - city.lat);
    const dLng = Math.abs(point.lng - city.lng);
    if (dLat < city.radius && dLng < city.radius) return key;
  }

  throw new Error("Please pick points within a supported city: London, New York, Mumbai, Paris, Rio, Delhi, Sydney or Tokyo.");
}

function nearestNode(lat, lng, nodes) {
  let best = null, bestDist = Infinity;
  for (const [k, n] of Object.entries(nodes)) {
    const d = haversine(lat, lng, n.lat, n.lng);
    if (d < bestDist) { bestDist = d; best = k; }
  }
  return best;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const r = x => (x * Math.PI) / 180;
  const dLat = r(lat2 - lat1);
  const dLng = r(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}