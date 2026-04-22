# PathFinder Frontend

## Overview

PathFinder is a React and Vite web application for visualizing pathfinding algorithms on real-world road networks. The frontend provides an interactive map UI where users choose a source and destination, select an algorithm, and watch exploration and final route rendering.

The project supports:

- Prebuilt city road graphs for fast, repeatable demos.
- A world experimental mode that fetches road data live from OpenStreetMap through Overpass.
- Multiple search algorithms (DFS, BFS, Dijkstra, A*, GBFS).
- A learn page with detailed algorithm explanations.
- Light and dark themes with a persistent user preference.

The frontend codebase is located in the [frontend](frontend) directory.

## Tech Stack

- React 19
- Vite 8
- React Router DOM
- React Leaflet and Leaflet
- GSAP for navigation animation
- Web Worker for background path computation

## Key Capabilities

### 1. Interactive Pathfinding Map

The map experience is implemented in [frontend/src/Pathfinder.jsx](frontend/src/Pathfinder.jsx).

- Users click once to set source and once to set destination.
- A selected algorithm runs on the road graph.
- Exploration edges are animated first.
- Final shortest path is drawn after exploration completes.
- Reset functionality clears markers, animations, and errors.

### 2. Algorithm Support

Implemented algorithms:

- Depth-First Search (`dfs`)
- Breadth-First Search (`bfs`)
- Dijkstra (`dijkstra`)
- A* (`astar`)
- Greedy Best-First Search (`gbfs`)

Core implementations exist in [frontend/src/algorithms.js](frontend/src/algorithms.js), and worker-side implementations are in [frontend/src/workers/pathfindingWorker.js](frontend/src/workers/pathfindingWorker.js).

### 3. Web Worker Offload

To prevent UI freezing, heavy graph loading and pathfinding run in a worker:

- Worker entry: [frontend/src/workers/pathfindingWorker.js](frontend/src/workers/pathfindingWorker.js)
- Main thread coordination: [frontend/src/Pathfinder.jsx](frontend/src/Pathfinder.jsx)

This keeps interactions smooth while fetching live roads or processing large graphs.

### 4. City Graph Mode

Prebuilt graph JSON files are loaded from:

- [frontend/public/graphs](frontend/public/graphs)

City metadata and graph selection are defined in:

- [frontend/src/routeToGraph.js](frontend/src/routeToGraph.js)

Supported city keys include London, New York, Mumbai, Paris, Tokyo, Rio de Janeiro, Delhi, Berlin, and Sydney.

### 5. World Experimental Mode

When `World (Experimental)` is selected:

- The UI warns users to prefer small distances.
- The worker fetches live road data from Overpass API.
- The same algorithm pipeline is applied to live graph data.

This mode is useful for broad experimentation but intentionally constrained for performance and API reliability.

### 6. Home and Gallery Experience

Home page:

- [frontend/src/Home.jsx](frontend/src/Home.jsx)
- [frontend/src/Home.css](frontend/src/Home.css)

City gallery:

- [frontend/src/components/CircularGallery.jsx](frontend/src/components/CircularGallery.jsx)
- [frontend/src/components/CircularGallery.css](frontend/src/components/CircularGallery.css)

The gallery supports circular and list views and links each city card directly into Pathfinder using query parameters.

### 7. Learn Section

Learn page:

- [frontend/src/Learn.jsx](frontend/src/Learn.jsx)
- [frontend/src/Learn.css](frontend/src/Learn.css)

This section explains each algorithm, tradeoffs, complexity, and behavior in the PathFinder visualizer.

### 8. Navigation and Theming

Navigation and theme controls:

- [frontend/src/components/PillNav.jsx](frontend/src/components/PillNav.jsx)
- [frontend/src/components/PillNav.css](frontend/src/components/PillNav.css)

App-level routing and theme state:

- [frontend/src/App.jsx](frontend/src/App.jsx)

Global styling and theme variables:

- [frontend/src/index.css](frontend/src/index.css)

Theme preference is stored in `localStorage` under `pf-theme`.

## Frontend Project Structure

```text
frontend/
	public/
		graphs/
			berlin.json
			delhi.json
			london.json
			mumbai.json
			newyork.json
			paris.json
			rio.json
			tokyo.json
	src/
		App.jsx
		Home.jsx
		Home.css
		Learn.jsx
		Learn.css
		Pathfinder.jsx
		Pathfinder.css
		algorithms.js
		routeToGraph.js
		index.css
		main.jsx
		components/
			CircularGallery.jsx
			CircularGallery.css
			PillNav.jsx
			PillNav.css
		workers/
			pathfindingWorker.js
```

## How to Run

From the repository root:

1. Change into frontend directory.
2. Install dependencies.
3. Start development server.

```bash
cd frontend
npm install
npm run dev
```

Build and preview production bundle:

```bash
npm run build
npm run preview
```

Lint frontend:

```bash
npm run lint
```

## Routing

Configured in [frontend/src/App.jsx](frontend/src/App.jsx):

- `/` for Home
- `/pathfinder` for interactive map
- `/learn` for algorithm guide

## Data and Graph Processing Flow

High-level flow:

1. User picks source and destination on map.
2. Main thread posts request to worker with coordinates and selected algorithm.
3. Worker either:
	 - Loads cached prebuilt city graph, or
	 - Fetches live world graph from Overpass.
4. Worker snaps points to nearest graph nodes.
5. Worker executes selected algorithm and returns:
	 - `visitedOrder`
	 - `parent`
	 - `path`
6. UI animates exploration and then renders final route polyline.

## Performance Notes

- Worker-based processing avoids blocking React rendering.
- City graph JSON is cached in-memory for session reuse.
- World mode includes distance constraints to keep response time practical.
- Exploration animation uses timed edge rendering to keep behavior understandable.

## Troubleshooting

- If no route appears, verify both points are near connected roads.
- If world mode fails, try a shorter source-destination distance.
- If map visuals break, confirm Leaflet CSS is loaded in the application.
- If city selection does not move map, check query parameter format (`?city=<key>`).

## Notes for Contributors

- Keep algorithm result shape consistent across main-thread and worker implementations.
- Avoid moving heavy graph logic back onto the main UI thread.
- Preserve current route and theme behavior when adding new routes or controls.
- When adding new cities, update both city metadata and graph assets.

## License

No license file is currently defined in this repository.
