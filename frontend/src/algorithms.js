export function dfs(graph,start,end){
    const stack = [start];
    const visited = new Set();
    const parent = {};
    const visitedOrder = [];
    while (stack.length){
        const current = stack.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        visitedOrder.push(current);
        if (current==end) break;
        for (const {neighbour} of graph[current] ?? []){
            if (!visited.has(neighbour)){
                parent[neighbour] = current;
                stack.push(neighbour);
            }
        }
    }
    return { path: reconstructPath(parent,start,end),visitedOrder,parent}
}

export function bfs(graph,start,end){
    const queue = [start];
    const visited = new Set([start]);
    const parent = {};
    const visitedOrder = [];
    while (queue.length){
        const current = queue.shift();
        visitedOrder.push(current);
        if (current===end) break;

        for (const {neighbour} of graph[current] ?? []){
            if (!visited.has(neighbour)){
                visited.add(neighbour);
                parent[neighbour] = current;
                queue.push(neighbour);
            }
        }
    }
    return { path: reconstructPath(parent,start,end),visitedOrder,parent};
}

export function dijkstra(graph,start,end){
    const dist = {};
    const parent = {};
    const visited = new Set();
    const visitedOrder = [];
    for (const k of Object.keys(graph)) dist[k] = Infinity;
    dist[start] = 0;
    while (true){
        let u = null;
        for (const k of Object.keys(dist)){
            if (!visited.has(k) && (u===null || dist[k]<dist[u])) u=k;
        }
        if (!u || dist[u] === Infinity) break;

        visited.add(u);
        visitedOrder.push(u);
        if (u===end) break;

        for (const {neighbour,distance} of graph[u]??[]){
            const alt = dist[u] + distance;
            if (alt<dist[neighbour]){
                dist[neighbour] = alt;
                parent[neighbour] = u;
            }
        }
    }
  return { path: reconstructPath(parent, start, end), visitedOrder, parent };
}

export function astar(graph, nodes, start, end) {
  // Heuristic: straight-line distance to end (haversine)
  const endNode = nodes[end];
  const h = (key) => {
    const n = nodes[key];
    if (!n) return 0;
    const R = 6371000;
    const r = x => (x * Math.PI) / 180;
    const dLat = r(endNode.lat - n.lat);
    const dLng = r(endNode.lng - n.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(r(n.lat)) * Math.cos(r(endNode.lat)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const gScore = { [start]: 0 };
  const fScore = { [start]: h(start) };
  const parent = {};
  const open = new Set([start]);
  const visited = new Set();
  const visitedOrder = [];

  while (open.size) {
    let u = [...open].reduce((a, b) => (fScore[a] ?? Infinity) < (fScore[b] ?? Infinity) ? a : b);

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

// ── Shared path reconstruction ────────────────────────────────────────────────
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