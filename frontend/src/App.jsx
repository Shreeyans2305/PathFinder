import React from "react";
import Pathfinder from "./Pathfinder";
import Home from "./Home";
import Learn from "./Learn";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const App = () => {
  const [theme, setTheme] = React.useState(() => {
    const stored = localStorage.getItem("pf-theme");
    return stored === "light" ? "light" : "dark";
  });

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pf-theme", theme);
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home theme={theme} onToggleTheme={toggleTheme} />}
        />
        <Route
          path="/pathfinder"
          element={<Pathfinder theme={theme} onToggleTheme={toggleTheme} />}
        />
        <Route
          path="/learn"
          element={<Learn theme={theme} onToggleTheme={toggleTheme} />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;