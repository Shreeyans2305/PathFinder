import { CITY_CENTERS } from "../routeToGraph";

const GRAPH_CACHE = {};

self.onmessage = async (event) => {
  const { id, source, destination, algorithm, cityKey } = event.data || {};

  try {
    if (!source || !destination) {
      throw new Error("Please choose both source and destination points.");
    }

    if (cityKey === "world") {
      const result = await runWorldRouteSearch(source, destination, algorithm);
      self.postMessage({ id, ok: true, result });
      return;
    }

    const city = cityKey && cityKey !== "auto" ? cityKey : detectCity(source);

    if (!GRAPH_CACHE[city]) {
      const res = await fetch(`/graphs/${city}.json`);
      if (!res.ok) throw new Error("No pre-built graph for this area.");
      GRAPH_CACHE[city] = await res.json();
    }

    const { graph, nodes } = GRAPH_CACHE[city];
    const startKey = nearestNode(source.lat, source.lng, nodes);
    const endKey = nearestNode(destination.lat, destination.lng, nodes);

    if (!startKey || !endKey || Object.keys(graph).length === 0) {
      throw new Error("Could not build a road graph for this area.");
    }

    let result;
    if (algorithm === "dfs") result = dfs(graph, startKey, endKey);
    else if (algorithm === "bfs") result = bfs(graph, startKey, endKey);
    else if (algorithm === "astar") result = astar(graph, nodes, startKey, endKey);
    else if (algorithm === "gbfs") result = gbfs(graph, nodes, startKey, endKey);
    else result = dijkstra(graph, startKey, endKey);

    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message || "Pathfinding failed." });
  }
};

async function runWorldRouteSearch(source, destination, algorithm) {
  const distance = haversine(source.lat, source.lng, destination.lat, destination.lng);
  if (distance > 50000) {
    throw new Error(
      "World (Experimental) works best for smaller distances. Please pick points that are closer together.",
    );
  }

  const bounds = buildWorldBounds(source, destination);
  const cacheKey = `world:${bounds.south.toFixed(4)},${bounds.west.toFixed(4)},${bounds.north.toFixed(4)},${bounds.east.toFixed(4)}`;

  if (!GRAPH_CACHE[cacheKey]) {
    GRAPH_CACHE[cacheKey] = await fetchWorldGraph(bounds);
  }

  const { graph, nodes } = GRAPH_CACHE[cacheKey];
  const startKey = nearestNode(source.lat, source.lng, nodes);
  const endKey = nearestNode(destination.lat, destination.lng, nodes);

  if (!startKey || !endKey || Object.keys(graph).length === 0) {
    throw new Error("Could not build a live OpenStreetMap graph for this area.");
  }

  let result;
  if (algorithm === "dfs") result = dfs(graph, startKey, endKey);
  else if (algorithm === "bfs") result = bfs(graph, startKey, endKey);
  else if (algorithm === "astar") result = astar(graph, nodes, startKey, endKey);
  else if (algorithm === "gbfs") result = gbfs(graph, nodes, startKey, endKey);
  else result = dijkstra(graph, startKey, endKey);

  return normalizeWorldResult(result, nodes);
}

function buildWorldBounds(source, destination) {
  const latMid = (source.lat + destination.lat) / 2;
  const lngMid = (source.lng + destination.lng) / 2;
  const latDiff = Math.abs(source.lat - destination.lat);
  const lngDiff = Math.abs(source.lng - destination.lng);

  const latPad = clamp(latDiff * 0.75 + 0.015, 0.02, 0.15);
  const lngPad = clamp(lngDiff * 0.75 + 0.015, 0.02, 0.15);

  return {
    south: clamp(latMid - latPad, -85, 85),
    north: clamp(latMid + latPad, -85, 85),
    west: clamp(lngMid - lngPad, -180, 180),
    east: clamp(lngMid + lngPad, -180, 180),
  };
}

async function fetchWorldGraph(bounds) {
  const query = `[out:json][timeout:25];(way["highway"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});>;);out body;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error("OpenStreetMap road data is temporarily unavailable.");
  }

  const data = await res.json();
  const nodes = {};
  const graph = {};

  for (const element of data.elements ?? []) {
    if (element.type === "node" && typeof element.lat === "number" && typeof element.lon === "number") {
      nodes[String(element.id)] = { lat: element.lat, lng: element.lon };
    }
  }

  for (const element of data.elements ?? []) {
    if (element.type !== "way" || !Array.isArray(element.nodes) || !element.tags?.highway) continue;

    for (let index = 0; index < element.nodes.length - 1; index += 1) {
      const a = String(element.nodes[index]);
      const b = String(element.nodes[index + 1]);
      const nodeA = nodes[a];
      const nodeB = nodes[b];
      if (!nodeA || !nodeB) continue;

      const distance = haversine(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng);
      addEdge(graph, a, b, distance);
      addEdge(graph, b, a, distance);
    }
  }

  return { graph, nodes };
}

function addEdge(graph, from, to, distance) {
  if (!graph[from]) graph[from] = [];
  graph[from].push({ neighbour: to, distance });
}

function normalizeWorldResult(result, nodes) {
  const toCoordKey = (key) => {
    const node = nodes[key];
    return node ? `${node.lat},${node.lng}` : key;
  };

  return {
    ...result,
    path: (result.path ?? []).map(toCoordKey),
    visitedOrder: (result.visitedOrder ?? []).map(toCoordKey),
    parent: Object.fromEntries(
      Object.entries(result.parent ?? {}).map(([child, parent]) => [toCoordKey(child), toCoordKey(parent)]),
    ),
  };
}

function detectCity(point) {
  for (const [key, city] of Object.entries(CITY_CENTERS)) {
    if (city.experimental) continue;
    const dLat = Math.abs(point.lat - city.lat);
    const dLng = Math.abs(point.lng - city.lng);
    if (dLat < city.radius && dLng < city.radius) return key;
  }

  throw new Error("Please pick points within a supported city.");
}

function nearestNode(lat, lng, nodes) {
  let best = null;
  let bestDist = Infinity;
  for (const [k, n] of Object.entries(nodes)) {
    const d = haversine(lat, lng, n.lat, n.lng);
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  }
  return best;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const r = (x) => (x * Math.PI) / 180;
  const dLat = r(lat2 - lat1);
  const dLng = r(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dfs(graph, start, end) {
  const stack = [start];
  const visited = new Set();
  const parent = {};
  const visitedOrder = [];

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    visitedOrder.push(current);
    if (current === end) break;

    for (const { neighbour } of graph[current] ?? []) {
      if (!visited.has(neighbour)) {
        parent[neighbour] = current;
        stack.push(neighbour);
      }
    }
  }

  return { path: reconstructPath(parent, start, end), visitedOrder, parent };
}

function bfs(graph, start, end) {
  const queue = [start];
  const visited = new Set([start]);
  const parent = {};
  const visitedOrder = [];

  while (queue.length) {
    const current = queue.shift();
    visitedOrder.push(current);
    if (current === end) break;

    for (const { neighbour } of graph[current] ?? []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        parent[neighbour] = current;
        queue.push(neighbour);
      }
    }
  }

  return { path: reconstructPath(parent, start, end), visitedOrder, parent };
}

function dijkstra(graph, start, end) {
  const dist = {};
  const parent = {};
  const visited = new Set();
  const visitedOrder = [];

  for (const k of Object.keys(graph)) dist[k] = Infinity;
  dist[start] = 0;

  while (true) {
    let u = null;
    for (const k of Object.keys(dist)) {
      if (!visited.has(k) && (u === null || dist[k] < dist[u])) u = k;
    }

    if (!u || dist[u] === Infinity) break;
    visited.add(u);
    visitedOrder.push(u);
    if (u === end) break;

    for (const { neighbour, distance } of graph[u] ?? []) {
      const alt = dist[u] + distance;
      if (alt < dist[neighbour]) {
        dist[neighbour] = alt;
        parent[neighbour] = u;
      }
    }
  }

  return { path: reconstructPath(parent, start, end), visitedOrder, parent };
}

function astar(graph, nodes, start, end) {
  const endNode = nodes[end];
  const h = (key) => {
    const n = nodes[key];
    if (!n || !endNode) return 0;
    return haversine(n.lat, n.lng, endNode.lat, endNode.lng);
  };

  const gScore = { [start]: 0 };
  const fScore = { [start]: h(start) };
  const parent = {};
  const open = new Set([start]);
  const visited = new Set();
  const visitedOrder = [];

  while (open.size) {
    let u = [...open].reduce((a, b) =>
      (fScore[a] ?? Infinity) < (fScore[b] ?? Infinity) ? a : b,
    );

    if (u === end) break;
    open.delete(u);
    visited.add(u);
    visitedOrder.push(u);

    for (const { neighbour, distance } of graph[u] ?? []) {
      if (visited.has(neighbour)) continue;
      const tentative = (gScore[u] ?? Infinity) + distance;
      if (tentative < (gScore[neighbour] ?? Infinity)) {
        parent[neighbour] = u;
        gScore[neighbour] = tentative;
        fScore[neighbour] = tentative + h(neighbour);
        open.add(neighbour);
      }
    }
  }

  return { path: reconstructPath(parent, start, end), visitedOrder, parent };
}

function gbfs(graph, nodes, start, end) {
  const endNode = nodes[end];
  const h = (key) => {
    const n = nodes[key];
    if (!n || !endNode) return 0;
    return haversine(n.lat, n.lng, endNode.lat, endNode.lng);
  };

  const hScore = { [start]: h(start) };
  const parent = {};
  const open = new Set([start]);
  const visited = new Set();
  const visitedOrder = [];

  while (open.size) {
    let u = [...open].reduce((a, b) =>
      (hScore[a] ?? Infinity) < (hScore[b] ?? Infinity) ? a : b,
    );

    if (u === end) break;
    open.delete(u);
    visited.add(u);
    visitedOrder.push(u);

    for (const { neighbour } of graph[u] ?? []) {
      if (visited.has(neighbour) || open.has(neighbour)) continue;
      parent[neighbour] = u;
      hScore[neighbour] = h(neighbour);
      open.add(neighbour);
    }
  }

  return { path: reconstructPath(parent, start, end), visitedOrder, parent };
}

function reconstructPath(parent, start, end) {
  const path = [];
  let cur = end;
  while (cur && cur !== start) {
    path.unshift(cur);
    cur = parent[cur];
  }
  if (cur === start) path.unshift(start);
  return path;
}
