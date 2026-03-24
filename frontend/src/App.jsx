import React, { use, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet/dist/leaflet.css";
import "./App.css";


delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function RoutingControl({ source, destination }) {
  const map = useMapEvents({});
  const routingRef = useRef(null);

  useEffect(() => {
    if (!source || !destination) return;

    if (routingRef.current) {
      map.removeControl(routingRef.current);
      routingRef.current = null;
    }

    import("leaflet-routing-machine").then((LRM) => {
      routingRef.current = LRM.default.control({
        waypoints: [
          L.latLng(source.lat, source.lng),
          L.latLng(destination.lat, destination.lng)
        ],
        routeWhileDragging: true,
        addWaypoints: false,
        createMarker: () => null,
        lineOptions: {
          styles: [{ color: "blue", opacity: 0.6, weight: 4 }]
        }
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

  const [source, setSource] = React.useState(null);
  const [destination, setDestination] = React.useState(null);
  const [mode, setMode] = React.useState("source");

  const reset = () => {
    setSource(null);
    setDestination(null);
    setMode("source");
  };

  const handleSourceSet = (latlng) => {
    setSource(latlng);
    setMode("destination");
  };

  const handleDestinationSet = (latlng) => {
    setDestination(latlng);
    setMode("done");
  };

  return (
    <>
    <div className="app-wrapper">
      <div className="controls">
        {mode === "source" && <p>📍 Click on the map to set your <strong>source</strong></p>}
        {mode === "destination" && <p>🏁 Now click to set your <strong>destination</strong></p>}
        {mode === "done" && <p>✅ Route calculated! <button onClick={reset}>Reset</button></p>}  
      </div>
    <MapContainer
      center={[51.505, -0.09]}
      zoom={13}
      scrollWheelZoom={true}
      className="mapc"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <ClickHandler onSourceSet={handleSourceSet} onDestinationSet={handleDestinationSet} mode={mode} />
      {source && <Marker position={[source.lat, source.lng]} icon={greenIcon}>
        <Popup>Source</Popup>
        </Marker>}
      {destination && <Marker position={[destination.lat, destination.lng]} icon={redIcon}>
        <Popup>Destination</Popup>
      </Marker>}
      {source && destination && (<RoutingControl source={source} destination={destination} />)}
      {/* <Marker position={[51.505, -0.09]}>
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </Marker> */}
    </MapContainer>
    </div>
    </>
  );
};

export default App;
