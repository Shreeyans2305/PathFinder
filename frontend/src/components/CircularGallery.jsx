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
  const cities = Object.entries(CITY_CENTERS).map(([key, city]) => ({
    key,
    ...city,
    ...(CITY_STYLES[key] ?? { emoji: "📍", subtitle: "City Network", zoom: 13 }),
  }));

  return (
    <section className="cg-shell" aria-label="City map gallery">
      <div className="cg-frame">
        <div className="cg-track" role="list" aria-label="Supported city previews">
          {cities.map((city, index) => {
            const mid = (cities.length - 1) / 2;
            const normalized = (index - mid) / (mid || 1);
            const tilt = normalized * 11;
            const drop = Math.abs(normalized) * 28;

            return (
              <article
                key={city.key}
                className="cg-city-card"
                style={{ "--tilt": `${tilt}deg`, "--drop": `${drop}px` }}
                aria-label={`${city.label} map preview`}
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
              </article>
            );
          })}
        </div>
      </div>

      <div className="cg-actions">
        <Link to="/pathfinder" className="cg-open-map-btn">
          Open Interactive Map
        </Link>
      </div>
    </section>
  );
}
