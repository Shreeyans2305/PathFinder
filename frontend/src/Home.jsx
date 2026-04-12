import React from "react";
import PillNav from "./components/PillNav";
import logo from "/PathFinder.png";
import "./Home.css";
import CircularGallery from "./components/CircularGallery";

const Home = () => {
  return (
    <div className="home-page">
      <PillNav
        logo={logo}
        logoAlt="PathFinder Logo"
        items={[
          { label: "Home", href: "/" },
          { label: "Pathfinder", href: "/pathfinder" },
        ]}
        activeHref="/"
        className="home-nav"
        ease="power2.easeOut"
        baseColor="#0f0f10"
        pillColor="#1a1a1c"
        hoveredPillTextColor="#ffffff"
        pillTextColor="#f5f5f5"
        theme="dark"
        initialLoadAnimation={true}
      />
      <main className="home-main">
        <section className="home-hero" aria-label="PathFinder introduction">
          <p className="home-kicker">Route Search Visualizer</p>
          <h1>Explore world cities with animated pathfinding</h1>
          <p className="home-subtitle">
            Swipe or scroll through map tiles, pick a city, then watch BFS, DFS,
            Dijkstra, A* and GBFS discover routes in real time.
          </p>
        </section>
        <CircularGallery />
      </main>
    </div>
  );
};

export default Home;
