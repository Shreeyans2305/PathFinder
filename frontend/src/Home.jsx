import React from "react";
import PillNav from "./components/PillNav";
import logo from "/PathFinder.png";
import "./Home.css";
import CircularGallery from "./components/CircularGallery";

const Home = ({ theme, onToggleTheme }) => {
  const isDark = theme === "dark";

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
        baseColor={isDark ? "#0f0f10" : "#f6f7fb"}
        pillColor={isDark ? "#1a1a1c" : "#ffffff"}
        hoveredPillTextColor={isDark ? "#ffffff" : "#111827"}
        pillTextColor={isDark ? "#f5f5f5" : "#1f2937"}
        theme={theme}
        showThemeToggle={true}
        onThemeToggle={onToggleTheme}
        initialLoadAnimation={true}
      />
      <main className="home-main">
        <section className="home-hero" aria-label="PathFinder introduction">
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
