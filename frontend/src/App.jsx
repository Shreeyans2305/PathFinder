import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet/dist/leaflet.css";
import "./App.css";
import { fetchRouteGraph } from "./routeToGraph";
import { dfs, bfs, dijkstra, astar } from "./algorithms";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Glowing dot markers — no external image needed
const glowDot = (color) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;
      background:${color};
      border-radius:50%;
      box-shadow:0 0 8px 4px ${color};
      border:2px solid rgba(255,255,255,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const sourceIcon = glowDot("#00ff88");
const destIcon   = glowDot("#ff4400");

// Draws exploration edges directly onto the Leaflet map as native polylines.
// Bypasses React rendering entirely — each edge is added once and never touched again.
// This is the key fix: React state updates on every setTimeout caused dropped frames
// and edges being batched/merged. Native L.polyline has none of that overhead.
function ExplorationLayer({ commandRef }) {
  const map = useMap();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    // One LayerGroup to hold all exploration edges — easy to clear on reset
    layerGroupRef.current = L.layerGroup().addTo(map);

    // Expose imperative API to the parent via commandRef
    commandRef.current = {
      addEdge(latA, lngA, latB, lngB) {
        L.polyline([[latA, lngA], [latB, lngB]], {
          color: "#c45c00",
          weight: 2,
          opacity: 0.55,
        }).addTo(layerGroupRef.current);
      },
      clear() {
        layerGroupRef.current.clearLayers();
      },
    };

    return () => {
      map.removeLayer(layerGroupRef.current);
    };
  }, [map, commandRef]);

  return null;
}

function RoutingControl({ source, destination }) {
  const map = useMapEvents({});
  const routingRef = useRef(null);

  useEffect(() => {
    if (!source || !destination) return;
    if (routingRef.current) {
      map.removeControl(routingRef.current);
      routingRef.current = null;
    }
    import("leaflet-routing-machine").then(() => {
      routingRef.current = L.Routing.control({
        waypoints: [
          L.latLng(source.lat, source.lng),
          L.latLng(destination.lat, destination.lng),
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: () => null,
        lineOptions: {
          // Bright glowing orange for the final found path
          styles: [{ color: "#ffaa00", opacity: 1, weight: 5 }],
        },
      }).addTo(map);
    });
    return () => {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
        routingRef.current = null;
      }
    };
  }, [source, destination, map]);

  return null;
}

function ClickHandler({ onSourceSet, onDestinationSet, mode }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (mode === "source") onSourceSet({ lat, lng });
      else if (mode === "destination") onDestinationSet({ lat, lng });
    },
  });
  return null;
}

const App = () => {
  const [source, setSource]           = React.useState(null);
  const [destination, setDestination] = React.useState(null);
  const [mode, setMode]               = React.useState("source");
  const [pathFound, setPathFound]     = React.useState(false);
  const [algorithm, setAlgorithm]     = React.useState("dijkstra");

  const animationRef  = React.useRef([]);   // holds setTimeout IDs
  const graphCache    = React.useRef(null); // cached OSRM graph
  const explorationRef = React.useRef(null); // imperative API from ExplorationLayer

  const runAlgorithm = async () => {
    // Cancel any in-progress animation
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];

    // Clear previous exploration edges via the imperative layer API
    explorationRef.current?.clear();
    setPathFound(false);

    if (!graphCache.current) {
      graphCache.current = await fetchRouteGraph(source, destination);
    }

    const { graph, nodes, startKey, endKey } = graphCache.current;

    let result;
    if      (algorithm === "dfs")   result = dfs(graph, startKey, endKey);
    else if (algorithm === "bfs")   result = bfs(graph, startKey, endKey);
    else if (algorithm === "astar") result = astar(graph, nodes, startKey, endKey);
    else                            result = dijkstra(graph, startKey, endKey);

    const { visitedOrder, parent } = result;
    const DELAY = 20; // ms between each edge — lower = faster sweep

    // Schedule each edge as a direct Leaflet draw — no React state involved
    animationRef.current = visitedOrder.map((key, i) =>
      setTimeout(() => {
        const parentKey = parent[key];
        if (!parentKey) return;

        const [latA, lngA] = parentKey.split(",").map(Number);
        const [latB, lngB] = key.split(",").map(Number);

        explorationRef.current?.addEdge(latA, lngA, latB, lngB);
      }, i * DELAY)
    );

    // Show final route once all edges are drawn
    setTimeout(
      () => setPathFound(true),
      visitedOrder.length * DELAY + 300,
    );
  };

  const reset = () => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
    graphCache.current = null;
    explorationRef.current?.clear();
    setSource(null);
    setDestination(null);
    setMode("source");
    setPathFound(false);
  };

  const handleSourceSet = (latlng) => {
    setSource(latlng);
    setMode("destination");
  };

  const handleDestinationSet = (latlng) => {
    graphCache.current = null;
    setDestination(latlng);
    setMode("done");
  };

  return (
    <div className="app-wrapper">
      <div className="controls">
        {mode === "source" && (
          <p>📍 Click the map to set <strong>source</strong></p>
        )}
        {mode === "destination" && (
          <p>🏁 Click the map to set <strong>destination</strong></p>
        )}
        {mode === "done" && (
          <>
            <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
              <option value="dfs">DFS</option>
              <option value="bfs">BFS</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="astar">A*</option>
            </select>
            <button onClick={runAlgorithm}>▶ Run</button>
            <button onClick={reset}>↺ Reset</button>
          </>
        )}
      </div>

      <MapContainer
        center={[40.7580, -73.9855]}
        zoom={13}
        scrollWheelZoom={true}
        className="mapc"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <ClickHandler
          onSourceSet={handleSourceSet}
          onDestinationSet={handleDestinationSet}
          mode={mode}
        />

        {/* Native Leaflet layer for exploration edges — no React re-renders */}
        <ExplorationLayer commandRef={explorationRef} />

        {source && (
          <Marker position={[source.lat, source.lng]} icon={sourceIcon}>
            <Popup>Source</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {/* Final route — only appears after full animation completes */}
        {pathFound && source && destination && (
          <RoutingControl source={source} destination={destination} />
        )}
      </MapContainer>
    </div>
  );
};

export default App;