const CITY_CENTERS = {
  london: { lat: 51.505, lng: -0.09, radius: 0.09 },
  newyork: { lat: 40.758, lng: -73.985, radius: 0.09 },
  mumbai: { lat: 19.076, lng: 72.877, radius: 0.09 },
  paris: { lat: 48.856, lng: 2.352, radius: 0.09 },
  tokyo: { lat: 35.676, lng: 139.65, radius: 0.09 },
  rio: { lat: -22.906, lng: -43.172, radius: 0.09 },
  delhi: { lat: 28.613, lng: 77.209, radius: 0.09 },
  berlin: { lat: 52.52, lng: 13.405, radius: 0.09 },
  sydney: { lat: -33.868, lng: 151.209, radius: 0.09 },
};

const GRAPH_CACHE = {};

self.onmessage = async (event) => {
  const { id, source, destination, algorithm } = event.data || {};

  try {
    const city = detectCity(source);

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

function detectCity(point) {
  for (const [key, city] of Object.entries(CITY_CENTERS)) {
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
