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
import "leaflet/dist/leaflet.css";
import "./Pathfinder.css";
import { CITY_CENTERS } from "./routeToGraph";
import { useLocation } from "react-router-dom";
import PillNav from "./components/PillNav";
import logo from "/PathFinder.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PAD = 0.15;
const allLats = Object.values(CITY_CENTERS).map((c) => c.lat);
const allLngs = Object.values(CITY_CENTERS).map((c) => c.lng);
const MAP_BOUNDS = [
  [Math.min(...allLats) - PAD, Math.min(...allLngs) - PAD],
  [Math.max(...allLats) + PAD, Math.max(...allLngs) + PAD],
];

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
const destIcon = glowDot("#ff4400");

function ShortestPathLayer({ path }) {
  if (!path || path.length < 2) return null;

  const coordinates = path.map((key) => {
    const [lat, lng] = key.split(",").map(Number);
    return [lat, lng];
  });

  return (
    <Polyline
      positions={coordinates}
      pathOptions={{
        color: "#ffaa00",
        weight: 6,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
}

function ExplorationLayer({ commandRef }) {
  const map = useMap();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    layerGroupRef.current = L.layerGroup().addTo(map);

    commandRef.current = {
      addEdge(latA, lngA, latB, lngB) {
        L.polyline(
          [
            [latA, lngA],
            [latB, lngB],
          ],
          {
            color: "#c45c00",
            weight: 2,
            opacity: 0.55,
          },
        ).addTo(layerGroupRef.current);
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

function MapRef({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    const id = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(id);
  }, [map, mapRef]);
  return null;
}

function CityQuerySync({ onCityPicked }) {
  const map = useMap();
  const location = useLocation();
  const lastHandledSearchRef = useRef(null);

  useEffect(() => {
    if (!location.search || lastHandledSearchRef.current === location.search) return;

    const params = new URLSearchParams(location.search);
    const cityKey = params.get("city");
    if (!cityKey) return;

    const city = CITY_CENTERS[cityKey.toLowerCase()];
    if (!city) return;

    lastHandledSearchRef.current = location.search;
    map.flyTo([city.lat, city.lng], 14, {
      animate: true,
      duration: 1.3,
    });
    onCityPicked?.();
  }, [location.search, map, onCityPicked]);

  return null;
}

const Pathfinder = ({ theme, onToggleTheme }) => {
  const isDark = theme === "dark";

  const [source, setSource] = React.useState(null);
  const [destination, setDestination] = React.useState(null);
  const [mode, setMode] = React.useState("source");
  const [pathFound, setPathFound] = React.useState(false);
  const [shortestPath, setShortestPath] = React.useState([]);
  const [algorithm, setAlgorithm] = React.useState("dijkstra");
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const mapRef = React.useRef(null);

  const animationRef = React.useRef([]);
  const explorationRef = React.useRef(null);
  const workerRef = React.useRef(null);
  const requestSeqRef = React.useRef(0);
  const pendingRequestsRef = React.useRef(new Map());

  const clearAllTimers = React.useCallback(() => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  }, []);

  useEffect(() => {
    const worker = new Worker(
      new URL("./workers/pathfindingWorker.js", import.meta.url),
      { type: "module" },
    );

    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { id, ok, result, error } = event.data || {};
      const pending = pendingRequestsRef.current.get(id);
      if (!pending) return;

      pendingRequestsRef.current.delete(id);
      if (ok) pending.resolve(result);
      else pending.reject(new Error(error || "Pathfinding failed."));
    };

    worker.onerror = () => {
      pendingRequestsRef.current.forEach(({ reject }) => {
        reject(new Error("Path worker crashed."));
      });
      pendingRequestsRef.current.clear();
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRequestsRef.current.forEach(({ reject }) => {
        reject(new Error("Path worker terminated."));
      });
      pendingRequestsRef.current.clear();
    };
  }, []);

  const runPathSearch = React.useCallback((payload) => {
    if (!workerRef.current) {
      return Promise.reject(new Error("Path worker unavailable."));
    }

    const id = `req-${++requestSeqRef.current}`;
    return new Promise((resolve, reject) => {
      pendingRequestsRef.current.set(id, { resolve, reject });
      workerRef.current.postMessage({ id, ...payload });
    });
  }, []);

  const runAlgorithm = React.useCallback(async () => {
    if (loading || isAnimating || !source || !destination) return;

    clearAllTimers();
    explorationRef.current?.clear();
    setPathFound(false);
    setShortestPath([]);
    setError(null);
    setLoading(true);
    setIsAnimating(false);

    try {
      const { visitedOrder, parent, path } = await runPathSearch({
        source,
        destination,
        algorithm,
      });

      if (!path || path.length < 2) {
        throw new Error("Could not find a shortest path for this area.");
      }

      setShortestPath(path);
      setLoading(false);
      setIsAnimating(true);

      const DELAY = 20;
      animationRef.current = visitedOrder.map((key, i) =>
        setTimeout(() => {
          const parentKey = parent[key];
          if (!parentKey) return;
          const [latA, lngA] = parentKey.split(",").map(Number);
          const [latB, lngB] = key.split(",").map(Number);
          explorationRef.current?.addEdge(latA, lngA, latB, lngB);
        }, i * DELAY),
      );

      const completionTimer = setTimeout(() => {
        setPathFound(true);
        setIsAnimating(false);
      }, visitedOrder.length * DELAY + 300);

      animationRef.current.push(completionTimer);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setIsAnimating(false);
    }
  }, [algorithm, clearAllTimers, destination, isAnimating, loading, runPathSearch, source]);

  const reset = React.useCallback(() => {
    clearAllTimers();
    explorationRef.current?.clear();
    setSource(null);
    setDestination(null);
    setMode("source");
    setPathFound(false);
    setShortestPath([]);
    setLoading(false);
    setIsAnimating(false);
    setError(null);
  }, [clearAllTimers]);

  const handleSourceSet = (latlng) => {
    setSource(latlng);
    setMode("destination");
  };

  const handleDestinationSet = (latlng) => {
    setDestination(latlng);
    setMode("done");
  };

  return (
    <div className="app-wrapper">
      <PillNav
        logo={logo}
        logoAlt="PathFinder Logo"
        items={[
          { label: "Home", href: "/" },
          { label: "Pathfinder", href: "/pathfinder" },
          { label: "Learn", href: "/learn" },
        ]}
        activeHref="/pathfinder"
        className="home-nav"
        ease="power2.easeOut"
        baseColor={isDark ? "#0f0f10" : "#f6f7fb"}
        pillColor={isDark ? "#1a1a1c" : "#ffffff"}
        hoveredPillTextColor={isDark ? "#ffffff" : "#111827"}
        pillTextColor={isDark ? "#f5f5f5" : "#1f2937"}
        theme={theme}
        showThemeToggle={true}
        onThemeToggle={onToggleTheme}
        initialLoadAnimation={false}
      />

      <div className="city-buttons">
        {Object.entries(CITY_CENTERS).map(([key, city]) => (
          <button
            key={key}
            onClick={() => {
              mapRef.current?.flyTo([city.lat, city.lng], 14, {
                animate: true,
                duration: 1.8,
              });
              reset();
            }}
          >
            {city.label}
          </button>
        ))}
      </div>

      <div className="controls">
        {mode === "source" && (
          <p>
            📍 Click the map to set <strong>source</strong>
          </p>
        )}
        {mode === "destination" && (
          <p>
            🏁 Click the map to set <strong>destination</strong>
          </p>
        )}
        {mode === "done" && (
          <>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              disabled={loading || isAnimating}
            >
              <option value="dfs">DFS</option>
              <option value="bfs">BFS</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="astar">A*</option>
              <option value="gbfs">GBFS</option>
            </select>
            <button onClick={runAlgorithm} disabled={loading || isAnimating}>
              {loading
                ? "⏳ Fetching roads..."
                : isAnimating
                  ? "🎞 Tracing..."
                  : "▶ Run"}
            </button>
            <button onClick={reset} disabled={loading || isAnimating}>
              ↺ Reset
            </button>
            {error && (
              <span style={{ color: "#ff4444", fontSize: "13px" }}>
                {error}
              </span>
            )}
          </>
        )}
      </div>

      <MapContainer
        center={[40.758, -73.9855]}
        zoom={13}
        scrollWheelZoom={true}
        className="mapc"
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={4}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={
            isDark
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
        />
        <MapRef mapRef={mapRef} />
        <CityQuerySync onCityPicked={reset} />
        <ClickHandler
          onSourceSet={handleSourceSet}
          onDestinationSet={handleDestinationSet}
          mode={mode}
        />
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
        {pathFound && <ShortestPathLayer path={shortestPath} />}
      </MapContainer>
    </div>
  );
};

export default Pathfinder;
/*
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
import "leaflet/dist/leaflet.css";
import "./Pathfinder.css";
import { fetchRouteGraph, CITY_CENTERS } from "./routeToGraph";
import { dfs, bfs, dijkstra, astar, gbfs } from "./algorithms";
import { useLocation } from "react-router-dom";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PAD = 0.15;
const allLats = Object.values(CITY_CENTERS).map((c) => c.lat);
const allLngs = Object.values(CITY_CENTERS).map((c) => c.lng);
const MAP_BOUNDS = [
  [Math.min(...allLats) - PAD, Math.min(...allLngs) - PAD],
  [Math.max(...allLats) + PAD, Math.max(...allLngs) + PAD],
];

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
const destIcon = glowDot("#ff4400");

function ShortestPathLayer({ path }) {
  if (!path || path.length < 2) return null;

  const coordinates = path.map((key) => {
    const [lat, lng] = key.split(",").map(Number);
    return [lat, lng];
  });

  return (
    <Polyline
      positions={coordinates}
      pathOptions={{
        color: "#ffaa00",
        weight: 6,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
}

function ExplorationLayer({ commandRef }) {
  const map = useMap();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    layerGroupRef.current = L.layerGroup().addTo(map);

    commandRef.current = {
      addEdge(latA, lngA, latB, lngB) {
        L.polyline(
          [
            [latA, lngA],
            [latB, lngB],
          ],
          {
            color: "#c45c00",
            weight: 2,
            opacity: 0.55,
          },
        ).addTo(layerGroupRef.current);
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

function MapRef({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    const id = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(id);
  }, [map, mapRef]);
  return null;
}

function CityQuerySync({ onCityPicked }) {
  const map = useMap();
  const location = useLocation();
  const lastHandledSearchRef = useRef(null);

  useEffect(() => {
    if (!location.search || lastHandledSearchRef.current === location.search) return;

    const params = new URLSearchParams(location.search);
    const cityKey = params.get("city");
    if (!cityKey) return;

    const city = CITY_CENTERS[cityKey.toLowerCase()];
    if (!city) return;

    lastHandledSearchRef.current = location.search;
    map.flyTo([city.lat, city.lng], 14, {
      animate: true,
      duration: 1.3,
    });
    onCityPicked?.();
  }, [location.search, map, onCityPicked]);

  return null;
}

const Pathfinder = () => {
  const [source, setSource] = React.useState(null);
  const [destination, setDestination] = React.useState(null);
  const [mode, setMode] = React.useState("source");
  const [pathFound, setPathFound] = React.useState(false);
  const [shortestPath, setShortestPath] = React.useState([]);
  const [algorithm, setAlgorithm] = React.useState("dijkstra");
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const mapRef = React.useRef(null);

  const animationRef = React.useRef([]);
  const graphCache = React.useRef(null);
  const explorationRef = React.useRef(null);

  const clearAllTimers = React.useCallback(() => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  }, []);

  const runAlgorithm = async () => {
    if (loading || isAnimating || !source || !destination) return;

    clearAllTimers();
    explorationRef.current?.clear();
    setPathFound(false);
    setShortestPath([]);
    setError(null);
    setLoading(true);
    setIsAnimating(false);

    try {
      if (!graphCache.current) {
        graphCache.current = await fetchRouteGraph(source, destination);
      }

      const { graph, nodes, startKey, endKey } = graphCache.current;

      if (!startKey || !endKey || Object.keys(graph).length === 0) {
        throw new Error("Could not build a road graph for this area.");
      }

      let result;
      if (algorithm === "dfs") result = dfs(graph, startKey, endKey);
      else if (algorithm === "bfs") result = bfs(graph, startKey, endKey);
      else if (algorithm === "astar") result = astar(graph, nodes, startKey, endKey);
      else if (algorithm === "gbfs") result = gbfs(graph, nodes, startKey, endKey);
      else result = dijkstra(graph, startKey, endKey);

      const { visitedOrder, parent, path } = result;

      if (!path || path.length < 2) {
        throw new Error("Could not find a shortest path for this area.");
      }

      setShortestPath(path);
      setLoading(false);
      setIsAnimating(true);

      const DELAY = 20;
      animationRef.current = visitedOrder.map((key, i) =>
        setTimeout(() => {
          const parentKey = parent[key];
          if (!parentKey) return;
          const [latA, lngA] = parentKey.split(",").map(Number);
          const [latB, lngB] = key.split(",").map(Number);
          explorationRef.current?.addEdge(latA, lngA, latB, lngB);
        }, i * DELAY),
      );

      const completionTimer = setTimeout(() => {
        setPathFound(true);
        setIsAnimating(false);
      }, visitedOrder.length * DELAY + 300);

      animationRef.current.push(completionTimer);
    } catch (err) {
      setError(err.message);
      graphCache.current = null;
      setLoading(false);
      setIsAnimating(false);
    }
  };

  const reset = React.useCallback(() => {
    clearAllTimers();
    graphCache.current = null;
    explorationRef.current?.clear();
    setSource(null);
    setDestination(null);
    setMode("source");
    setPathFound(false);
    setShortestPath([]);
    setLoading(false);
    setIsAnimating(false);
    setError(null);
  }, [clearAllTimers]);

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
      <div className="city-buttons">
        {Object.entries(CITY_CENTERS).map(([key, city]) => (
          <button
            key={key}
            onClick={() => {
              mapRef.current?.flyTo([city.lat, city.lng], 14, {
                animate: true,
                duration: 1.8,
              });
              reset();
            }}
          >
            {city.label}
          </button>
        ))}
      </div>

      <div className="controls">
        {mode === "source" && (
          <p>
            📍 Click the map to set <strong>source</strong>
          </p>
        )}
        {mode === "destination" && (
          <p>
            🏁 Click the map to set <strong>destination</strong>
          </p>
        )}
        {mode === "done" && (
          <>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              disabled={loading || isAnimating}
            >
              <option value="dfs">DFS</option>
              <option value="bfs">BFS</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="astar">A*</option>
              <option value="gbfs">GBFS</option>
            </select>
            <button onClick={runAlgorithm} disabled={loading || isAnimating}>
              {loading
                ? "⏳ Fetching roads..."
                : isAnimating
                  ? "🎞 Tracing..."
                  : "▶ Run"}
            </button>
            <button onClick={reset} disabled={loading || isAnimating}>
              ↺ Reset
            </button>
            {error && (
              <span style={{ color: "#ff4444", fontSize: "13px" }}>
                {error}
              </span>
            )}
          </>
        )}
      </div>

      <MapContainer
        center={[40.758, -73.9855]}
        zoom={13}
        scrollWheelZoom={true}
        className="mapc"
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={4}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapRef mapRef={mapRef} />
        <CityQuerySync onCityPicked={reset} />
        <ClickHandler
          onSourceSet={handleSourceSet}
          onDestinationSet={handleDestinationSet}
          mode={mode}
        />
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
        {pathFound && <ShortestPathLayer path={shortestPath} />}
      </MapContainer>
    </div>
  );
};

export default Pathfinder;
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
import "leaflet/dist/leaflet.css";
import "./Pathfinder.css";
import { fetchRouteGraph, CITY_CENTERS } from "./routeToGraph";
import { dfs, bfs, dijkstra, astar, gbfs } from "./algorithms";
import { useLocation } from "react-router-dom";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PAD = 0.15;
const allLats = Object.values(CITY_CENTERS).map((c) => c.lat);
const allLngs = Object.values(CITY_CENTERS).map((c) => c.lng);
const MAP_BOUNDS = [
  [Math.min(...allLats) - PAD, Math.min(...allLngs) - PAD],
  [Math.max(...allLats) + PAD, Math.max(...allLngs) + PAD],
];
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
    import "leaflet/dist/leaflet.css";
    import "./Pathfinder.css";
    import { fetchRouteGraph, CITY_CENTERS } from "./routeToGraph";
    import { dfs, bfs, dijkstra, astar, gbfs } from "./algorithms";
    import { useLocation } from "react-router-dom";

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const PAD = 0.15;
    const allLats = Object.values(CITY_CENTERS).map((c) => c.lat);
    const allLngs = Object.values(CITY_CENTERS).map((c) => c.lng);
    const MAP_BOUNDS = [
      [Math.min(...allLats) - PAD, Math.min(...allLngs) - PAD],
      [Math.max(...allLats) + PAD, Math.max(...allLngs) + PAD],
    ];

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
    const destIcon = glowDot("#ff4400");

    function ShortestPathLayer({ path }) {
      if (!path || path.length < 2) return null;

      const coordinates = path.map((key) => {
        const [lat, lng] = key.split(",").map(Number);
        return [lat, lng];
      });

      return (
        <Polyline
          positions={coordinates}
          pathOptions={{
            color: "#ffaa00",
            weight: 6,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      );
    }

    function ExplorationLayer({ commandRef }) {
      const map = useMap();
      const layerGroupRef = useRef(null);

      useEffect(() => {
        layerGroupRef.current = L.layerGroup().addTo(map);

        commandRef.current = {
          addEdge(latA, lngA, latB, lngB) {
            L.polyline(
              [
                [latA, lngA],
                [latB, lngB],
              ],
              {
                color: "#c45c00",
                weight: 2,
                opacity: 0.55,
              },
            ).addTo(layerGroupRef.current);
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

    function MapRef({ mapRef }) {
      const map = useMap();
      useEffect(() => {
        mapRef.current = map;
        const id = setTimeout(() => map.invalidateSize(), 0);
        return () => clearTimeout(id);
      }, [map, mapRef]);
      return null;
    }

    function CityQuerySync({ onCityPicked }) {
      const map = useMap();
      const location = useLocation();
      const lastHandledSearchRef = useRef(null);

      useEffect(() => {
        if (!location.search || lastHandledSearchRef.current === location.search) return;

        const params = new URLSearchParams(location.search);
        const cityKey = params.get("city");
        if (!cityKey) return;

        const city = CITY_CENTERS[cityKey.toLowerCase()];
        if (!city) return;

        lastHandledSearchRef.current = location.search;
        map.flyTo([city.lat, city.lng], 14, {
          animate: true,
          duration: 1.3,
        });
        onCityPicked?.();
      }, [location.search, map, onCityPicked]);

      return null;
    }

    const Pathfinder = () => {
      const [source, setSource] = React.useState(null);
      const [destination, setDestination] = React.useState(null);
      const [mode, setMode] = React.useState("source");
      const [pathFound, setPathFound] = React.useState(false);
      const [shortestPath, setShortestPath] = React.useState([]);
      const [algorithm, setAlgorithm] = React.useState("dijkstra");
      const [error, setError] = React.useState(null);
      const [loading, setLoading] = React.useState(false);
      const [isAnimating, setIsAnimating] = React.useState(false);
      const mapRef = React.useRef(null);

      const animationRef = React.useRef([]);
      const graphCache = React.useRef(null);
      const explorationRef = React.useRef(null);

      const clearAllTimers = React.useCallback(() => {
        animationRef.current.forEach(clearTimeout);
        animationRef.current = [];
      }, []);

      const runAlgorithm = async () => {
        if (loading || isAnimating || !source || !destination) return;

        clearAllTimers();
        explorationRef.current?.clear();
        setPathFound(false);
        setShortestPath([]);
        setError(null);
        setLoading(true);
        setIsAnimating(false);

        try {
          if (!graphCache.current) {
            graphCache.current = await fetchRouteGraph(source, destination);
          }

          const { graph, nodes, startKey, endKey } = graphCache.current;

          if (!startKey || !endKey || Object.keys(graph).length === 0) {
            throw new Error("Could not build a road graph for this area.");
          }

          let result;
          if (algorithm === "dfs") result = dfs(graph, startKey, endKey);
          else if (algorithm === "bfs") result = bfs(graph, startKey, endKey);
          else if (algorithm === "astar") result = astar(graph, nodes, startKey, endKey);
          else if (algorithm === "gbfs") result = gbfs(graph, nodes, startKey, endKey);
          else result = dijkstra(graph, startKey, endKey);

          const { visitedOrder, parent, path } = result;
          if (!path || path.length < 2) {
            throw new Error("Could not find a shortest path for this area.");
          }

          setShortestPath(path);
          setLoading(false);
          setIsAnimating(true);

          const DELAY = 20;
          animationRef.current = visitedOrder.map((key, i) =>
            setTimeout(() => {
              const parentKey = parent[key];
              if (!parentKey) return;
              const [latA, lngA] = parentKey.split(",").map(Number);
              const [latB, lngB] = key.split(",").map(Number);
              explorationRef.current?.addEdge(latA, lngA, latB, lngB);
            }, i * DELAY),
          );

          const completionTimer = setTimeout(() => {
            setPathFound(true);
            setIsAnimating(false);
          }, visitedOrder.length * DELAY + 300);

          animationRef.current.push(completionTimer);
        } catch (err) {
          setError(err.message);
          graphCache.current = null;
          setLoading(false);
          setIsAnimating(false);
        }
      };

      const reset = React.useCallback(() => {
        clearAllTimers();
        graphCache.current = null;
        explorationRef.current?.clear();
        setSource(null);
        setDestination(null);
        setMode("source");
        setPathFound(false);
        setShortestPath([]);
        setLoading(false);
        setIsAnimating(false);
        setError(null);
      }, [clearAllTimers]);

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
          <div className="city-buttons">
            {Object.entries(CITY_CENTERS).map(([key, city]) => (
              <button
                key={key}
                onClick={() => {
                  mapRef.current?.flyTo([city.lat, city.lng], 14, {
                    animate: true,
                    duration: 1.8,
                  });
                  reset();
                }}
              >
                {city.label}
              </button>
            ))}
          </div>

          <div className="controls">
            {mode === "source" && (
              <p>
                📍 Click the map to set <strong>source</strong>
              </p>
            )}
            {mode === "destination" && (
              <p>
                🏁 Click the map to set <strong>destination</strong>
              </p>
            )}
            {mode === "done" && (
              <>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  disabled={loading || isAnimating}
                >
                  <option value="dfs">DFS</option>
                  <option value="bfs">BFS</option>
                  <option value="dijkstra">Dijkstra</option>
                  <option value="astar">A*</option>
                  <option value="gbfs">GBFS</option>
                </select>
                <button onClick={runAlgorithm} disabled={loading || isAnimating}>
                  {loading
                    ? "⏳ Fetching roads..."
                    : isAnimating
                      ? "🎞 Tracing..."
                      : "▶ Run"}
                </button>
                <button onClick={reset} disabled={loading || isAnimating}>
                  ↺ Reset
                </button>
                {error && (
                  <span style={{ color: "#ff4444", fontSize: "13px" }}>
                    {error}
                  </span>
                )}
              </>
            )}
          </div>

          <MapContainer
            center={[40.758, -73.9855]}
            zoom={13}
            scrollWheelZoom={true}
            className="mapc"
            maxBounds={MAP_BOUNDS}
            maxBoundsViscosity={1.0}
            minZoom={4}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapRef mapRef={mapRef} />
            <CityQuerySync onCityPicked={reset} />
            <ClickHandler
              onSourceSet={handleSourceSet}
              onDestinationSet={handleDestinationSet}
              mode={mode}
            />
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
            {pathFound && <ShortestPathLayer path={shortestPath} />}
          </MapContainer>
        </div>
      );
    };

    export default Pathfinder;
  */