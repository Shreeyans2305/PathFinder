const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function queryOverpass(query) {
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, { method: "POST", body: query });
      if (!res.ok) continue;
      const text = await res.text();
      // Overpass returns XML on error even when asked for JSON
      if (text.trimStart().startsWith("<")) continue;
      return JSON.parse(text);
    } catch {
      continue;
    }
  }
  throw new Error("All Overpass mirrors failed or timed out.");
}

export async function fetchRouteGraph(source, destination) {
  // Tighter padding — 0.008 deg ≈ ~800m each side, enough for most city routes
  const pad    = 0.008;
  const minLat = Math.min(source.lat, destination.lat) - pad;
  const maxLat = Math.max(source.lat, destination.lat) + pad;
  const minLng = Math.min(source.lng, destination.lng) - pad;
  const maxLng = Math.max(source.lng, destination.lng) + pad;

  const query = `
    [out:json][timeout:20];
    way["highway"]["highway"!~"footway|cycleway|path|steps|pedestrian|service|track"]
      (${minLat},${minLng},${maxLat},${maxLng});
    (._;>;);
    out body;
  `;

  const data = await queryOverpass(query);

  const osmNodes = {};
  const ways = [];

  for (const el of data.elements) {
    if (el.type === "node") {
      osmNodes[el.id] = { lat: el.lat, lng: el.lon };
    } else if (el.type === "way") {
      ways.push(el);
    }
  }

  const graph = {};
  const nodes = {};
  const key   = (lat, lng) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

  for (const way of ways) {
    const nodeIds  = way.nodes;
    const isOneWay = way.tags?.oneway === "yes";

    for (let i = 0; i < nodeIds.length - 1; i++) {
      const nA = osmNodes[nodeIds[i]];
      const nB = osmNodes[nodeIds[i + 1]];
      if (!nA || !nB) continue;

      const kA   = key(nA.lat, nA.lng);
      const kB   = key(nB.lat, nB.lng);
      const dist = haversine(nA.lat, nA.lng, nB.lat, nB.lng);

      nodes[kA] = { lat: nA.lat, lng: nA.lng };
      nodes[kB] = { lat: nB.lat, lng: nB.lng };

      if (!graph[kA]) graph[kA] = [];
      if (!graph[kB]) graph[kB] = [];

      graph[kA].push({ neighbour: kB, distance: dist });
      if (!isOneWay) {
        graph[kB].push({ neighbour: kA, distance: dist });
      }
    }
  }

  const startKey = nearestNode(source.lat, source.lng, nodes);
  const endKey   = nearestNode(destination.lat, destination.lng, nodes);

  return { graph, nodes, startKey, endKey };
}

function nearestNode(lat, lng, nodes) {
  let best = null;
  let bestDist = Infinity;
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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}