import React from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CITY_CENTERS } from "../routeToGraph";
import "./CircularGallery.css";

const CITY_STYLES = {
  london: { emoji: "☕", subtitle: "Historic Streets", zoom: 13 },
  newyork: { emoji: "🗽", subtitle: "Grid Network", zoom: 13 },
  mumbai: { emoji: "🌴", subtitle: "Coastal Routes", zoom: 13 },
  paris: { emoji: "🗼", subtitle: "Boulevard Paths", zoom: 13 },
  tokyo: { emoji: "🗾", subtitle: "Dense Web", zoom: 13 },
  rio:  { emoji: "🌴", subtitle: "Tropical City", zoom: 13 },
  delhi: { emoji: "🌴", subtitle: "Historic City", zoom: 13 },
  berlin: { emoji: "🏰", subtitle: "City of History", zoom: 13 },
};

function MiniMapResizeFix() {
  const map = useMap();

  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => map.invalidateSize());
    return () => window.cancelAnimationFrame(id);
  }, [map]);

  return null;
}

function CityMiniMap({ lat, lng, zoom }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      className="cg-mini-map"
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      touchZoom={false}
    >
      <MiniMapResizeFix />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker
        center={[lat, lng]}
        radius={4}
        pathOptions={{ color: "#ffffff", fillColor: "#ff7a00", fillOpacity: 1 }}
      />
    </MapContainer>
  );
}

export default function CircularGallery() {
  const trackRef = React.useRef(null);

  const cities = Object.entries(CITY_CENTERS).map(([key, city]) => ({
    key,
    ...city,
    ...(CITY_STYLES[key] ?? { emoji: "📍", subtitle: "City Network", zoom: 13 }),
  }));

  const scrollTrack = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(280, Math.round(track.clientWidth * 0.72));
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <section className="cg-shell" aria-label="City map gallery">
      <div className="cg-frame">
        <button
          type="button"
          className="cg-nav cg-nav-left"
          aria-label="Scroll city maps left"
          onClick={() => scrollTrack(-1)}
        >
          ←
        </button>

        <div
          ref={trackRef}
          className="cg-track"
          role="list"
          aria-label="Supported city previews"
        >
          {cities.map((city, index) => {
            const tilt = -4;
            const dropPattern = [14, 10, 6, 2, 6, 10, 14, 8];
            const drop = dropPattern[index % dropPattern.length];

            return (
              <Link
                key={city.key}
                to={`/pathfinder?city=${encodeURIComponent(city.key)}`}
                className="cg-city-card"
                style={{ "--tilt": `${tilt}deg`, "--drop": `${drop}px` }}
                aria-label={`Open ${city.label} in Pathfinder`}
                role="listitem"
              >
                <div className="cg-map-wrap">
                  <CityMiniMap lat={city.lat} lng={city.lng} zoom={city.zoom} />
                </div>
                <h3>
                  <span className="cg-emoji" aria-hidden="true">
                    {city.emoji}
                  </span>
                  {city.label}
                </h3>
                <p>{city.subtitle}</p>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className="cg-nav cg-nav-right"
          aria-label="Scroll city maps right"
          onClick={() => scrollTrack(1)}
        >
          →
        </button>
      </div>

      <div className="cg-actions">
        <Link to="/pathfinder" className="cg-open-map-btn">
          Open Interactive Map
        </Link>
      </div>
    </section>
  );
}
