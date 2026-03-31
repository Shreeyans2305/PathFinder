// scripts/fetchGraph.mjs
// Run with: node scripts/fetchGraph.mjs
// Saves the road graph to public/graphs/{city}.json

const CITIES = {
  london:   { lat: 51.505,  lng: -0.09,   name: "London"   },
  newyork:  { lat: 40.758,  lng: -73.985, name: "New York"  },
  mumbai:   { lat: 19.076,  lng: 72.877,  name: "Mumbai"    },
  paris:    { lat: 48.856,  lng: 2.352,   name: "Paris"     },
};

// Bounding box — covers a walkable/drivable city area (~5km radius)
const PAD = 0.045;

async function fetchGraph(cityKey) {
  const city   = CITIES[cityKey];
  const minLat = city.lat - PAD;
  const maxLat = city.lat + PAD;
  const minLng = city.lng - PAD;
  const maxLng = city.lng + PAD;

  console.log(`Fetching ${city.name} road network...`);

  const query = `
    [out:json][timeout:60];
    way["highway"]["highway"!~"footway|cycleway|path|steps|pedestrian|service|track"]
      (${minLat},${minLng},${maxLat},${maxLng});
    (._;>;);
    out body;
  `;

  const res  = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
  const text = await res.text();
  if (text.trimStart().startsWith("<")) throw new Error("Overpass error");
  const data = JSON.parse(text);

  console.log(`Got ${data.elements.length} elements, building graph...`);

  const osmNodes = {};
  const ways     = [];
  for (const el of data.elements) {
    if (el.type === "node") osmNodes[el.id] = { lat: el.lat, lng: el.lon };
    else if (el.type === "way") ways.push(el);
  }

  const graph = {};
  const nodes = {};
  const key   = (lat, lng) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const r = x => (x * Math.PI) / 180;
    const dLat = r(lat2 - lat1);
    const dLng = r(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  for (const way of ways) {
    const isOneWay = way.tags?.oneway === "yes";
    for (let i = 0; i < way.nodes.length - 1; i++) {
      const nA = osmNodes[way.nodes[i]];
      const nB = osmNodes[way.nodes[i + 1]];
      if (!nA || !nB) continue;
      const kA   = key(nA.lat, nA.lng);
      const kB   = key(nB.lat, nB.lng);
      const dist = haversine(nA.lat, nA.lng, nB.lat, nB.lng);
      nodes[kA] = { lat: nA.lat, lng: nA.lng };
      nodes[kB] = { lat: nB.lat, lng: nB.lng };
      if (!graph[kA]) graph[kA] = [];
      if (!graph[kB]) graph[kB] = [];
      graph[kA].push({ neighbour: kB, distance: Math.round(dist) });
      if (!isOneWay) graph[kB].push({ neighbour: kA, distance: Math.round(dist) });
    }
  }

  const output = { city: city.name, center: { lat: city.lat, lng: city.lng }, graph, nodes };

  // Write to public/graphs/ so Vite serves it statically
  const fs   = await import("fs");
  const path = await import("path");
  const dir  = path.resolve("public/graphs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/${cityKey}.json`, JSON.stringify(output));

  console.log(`✓ Saved public/graphs/${cityKey}.json`);
  console.log(`  ${Object.keys(nodes).length} nodes, ${Object.keys(graph).length} graph entries`);
}

// Run for all cities — or pass a specific one as an argument
const target = process.argv[2];
if (target) {
  fetchGraph(target);
} else {
  for (const city of Object.keys(CITIES)) await fetchGraph(city);
}