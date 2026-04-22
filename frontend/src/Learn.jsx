import React from "react";
import { Link } from "react-router-dom";
import PillNav from "./components/PillNav";
import logo from "/PathFinder.png";
import "./Learn.css";

const ALGORITHMS = [
  {
    id: "bfs",
    name: "Breadth-First Search",
    badge: "Shortest on unweighted graphs",
    summary:
      "BFS explores the map in layers. It checks every road one step away before moving farther out.",
    usedFor: "Best when every road step has equal cost.",
    visualizer:
      "PathFinder shows BFS as a broad wave of exploration moving evenly outward from the source.",
    howItWorks: [
      "Uses a queue to process nodes in first-in, first-out order.",
      "Visits one layer of roads before moving to the next layer.",
      "Guarantees the fewest edges to the destination on an unweighted graph.",
    ],
    pros: [
      "Simple and easy to understand",
      "Finds the shortest path on unweighted graphs",
      "Great for visual demonstrations",
    ],
    cons: [
      "Explores many roads",
      "Does not account for road distance weights",
    ],
    complexity: "O(V + E)",
    shortest: "Yes, if all edges have equal weight",
  },
  {
    id: "dfs",
    name: "Depth-First Search",
    badge: "Deep exploration",
    summary:
      "DFS follows one road branch as far as possible before backtracking.",
    usedFor: "Useful for showing exploration, dead ends, and backtracking.",
    visualizer:
      "PathFinder will often move far along one route first, then unwind and try other options.",
    howItWorks: [
      "Uses a stack, either explicitly or through recursion.",
      "Expands deeply before trying sibling branches.",
      "Backtracks when it reaches a dead end.",
    ],
    pros: [
      "Very memory efficient",
      "Fast to begin",
      "Good for exploring all possible branches",
    ],
    cons: ["Can miss the shortest path", "May wander far away from the target"],
    complexity: "O(V + E)",
    shortest: "No",
  },
  {
    id: "dijkstra",
    name: "Dijkstra's Algorithm",
    badge: "Weighted shortest path",
    summary:
      "Dijkstra finds the least expensive route when road distances have different costs.",
    usedFor: "Best for weighted road networks where distance matters.",
    visualizer:
      "PathFinder uses Dijkstra to expand the currently cheapest known node until the destination is finalized.",
    howItWorks: [
      "Tracks the best known distance from the source to every node.",
      "Always expands the node with the smallest current distance.",
      "Once a node is selected, its best distance is final.",
    ],
    pros: [
      "Guaranteed optimal on weighted graphs",
      "Very accurate for roads",
      "Works without a heuristic",
    ],
    cons: [
      "Can be slower than A*",
      "May explore many nodes before reaching the goal",
    ],
    complexity: "O((V + E) log V) with a priority queue",
    shortest: "Yes",
  },
  {
    id: "astar",
    name: "A* Search",
    badge: "Fast optimal search",
    summary:
      "A* combines the cost so far with a heuristic estimate of the remaining distance.",
    usedFor: "Excellent when you want a shortest path while reducing unnecessary exploration.",
    visualizer:
      "PathFinder shows A* moving more directly toward the destination while still staying optimal.",
    howItWorks: [
      "Scores nodes with g(n) + h(n), where g is cost so far and h is the heuristic to the destination.",
      "Prefers roads that are cheap so far and likely to stay close to the goal.",
      "Usually explores fewer nodes than Dijkstra.",
    ],
    pros: [
      "Fast and optimal with a good heuristic",
      "Great balance of speed and quality",
      "Ideal for maps",
    ],
    cons: ["Needs a good heuristic", "Poor heuristics reduce performance"],
    complexity: "Worst-case similar to Dijkstra",
    shortest: "Yes, with an admissible heuristic",
  },
  {
    id: "gbfs",
    name: "Greedy Best-First Search",
    badge: "Heuristic chasing",
    summary:
      "GBFS always moves toward the node that looks closest to the destination.",
    usedFor: "Good for fast, intuitive movement toward the target, but not always optimal.",
    visualizer:
      "PathFinder uses GBFS to show a direct-looking chase toward the destination, even if the route is longer.",
    howItWorks: [
      "Ranks nodes only by their heuristic estimate to the destination.",
      "Ignores how expensive the path has been so far.",
      "Can be very fast, but may choose a longer route.",
    ],
    pros: ["Very fast", "Simple to understand", "Often visually direct"],
    cons: ["Not guaranteed shortest", "Can get trapped in poor choices"],
    complexity: "Often fast, but depends heavily on the heuristic",
    shortest: "No guaranteed",
  },
];

const Learn = ({ theme, onToggleTheme }) => {
  const isDark = theme === "dark";
  const [selectedId, setSelectedId] = React.useState("astar");
  const selected = ALGORITHMS.find((algo) => algo.id === selectedId) ?? ALGORITHMS[0];

  return (
    <div
      className="learn-page"
      style={{
        "--home-overlay": isDark ? "rgba(6, 8, 18, 0.58)" : "rgba(245, 247, 252, 0.66)",
      }}
    >
      <PillNav
        logo={logo}
        logoAlt="PathFinder Logo"
        items={[
          { label: "Home", href: "/" },
          { label: "Learn", href: "/learn" },
          { label: "Pathfinder", href: "/pathfinder" },
        ]}
        activeHref="/learn"
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

      <main className="learn-main">
        <section className="learn-hero">
          <p className="learn-kicker">Algorithm Guide</p>
          <h1>Learn the algorithms by exploring them</h1>
          <p className="learn-subtitle">
            Tap an algorithm to see what it does, how it works, and how it behaves inside the map visualizer.
          </p>
          <div className="learn-actions">
            <Link to="/pathfinder" className="learn-primary-btn">Open Pathfinder</Link>
          </div>
        </section>

        <section className="learn-explorer" aria-label="Algorithm explorer">
          <div className="learn-selector" role="tablist" aria-label="Select an algorithm">
            {ALGORITHMS.map((algo) => (
              <button
                key={algo.id}
                type="button"
                role="tab"
                aria-selected={selectedId === algo.id}
                className={`learn-chip${selectedId === algo.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(algo.id)}
              >
                <span>{algo.name}</span>
                <small>{algo.badge}</small>
              </button>
            ))}
          </div>

          <article className="learn-focus-card">
            <div className="learn-focus-header">
              <div>
                <p className="learn-focus-kicker">Selected algorithm</p>
                <h2>{selected.name}</h2>
              </div>
              <div className="learn-focus-pill">{selected.badge}</div>
            </div>

            <p className="learn-short">{selected.summary}</p>

            <div className="learn-focus-grid">
              <div className="learn-focus-box">
                <h3>Where it shines</h3>
                <p>{selected.usedFor}</p>
              </div>
              <div className="learn-focus-box">
                <h3>In PathFinder</h3>
                <p>{selected.visualizer}</p>
              </div>
              <div className="learn-focus-box">
                <h3>Shortest path?</h3>
                <p>{selected.shortest}</p>
              </div>
              <div className="learn-focus-box">
                <h3>Complexity</h3>
                <p>{selected.complexity}</p>
              </div>
            </div>

            <div className="learn-detail-grid">
              <section>
                <h3>How it works</h3>
                <ol>
                  {selected.howItWorks.map((item) => <li key={item}>{item}</li>)}
                </ol>
              </section>

              <section>
                <h3>Pros</h3>
                <ul>
                  {selected.pros.map((item) => <li key={item}>{item}</li>)}
                </ul>

                <h3>Cons</h3>
                <ul>
                  {selected.cons.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            </div>
          </article>
        </section>

        <section className="learn-grid" aria-label="All pathfinding algorithms">
          {ALGORITHMS.map((algo) => (
            <article className="learn-card" key={algo.id}>
              <h2>{algo.name}</h2>
              <p className="learn-short">{algo.summary}</p>
              <div className="learn-meta">
                <strong>Best for</strong>
                <span>{algo.usedFor}</span>
              </div>
              <div className="learn-section">
                <h3>How it works</h3>
                <ul>
                  {algo.howItWorks.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="learn-columns">
                <div>
                  <h3>Pros</h3>
                  <ul>
                    {algo.pros.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3>Cons</h3>
                  <ul>
                    {algo.cons.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="learn-comparison">
          <h2>Quick comparison</h2>
          <div className="learn-table-wrap">
            <table className="learn-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Finds shortest path?</th>
                  <th>Uses weights?</th>
                  <th>Exploration style</th>
                </tr>
              </thead>
              <tbody>
                {ALGORITHMS.map((algo) => (
                  <tr key={algo.id}>
                    <td>{algo.id.toUpperCase()}</td>
                    <td>{algo.shortest}</td>
                    <td>{algo.id === "dfs" || algo.id === "bfs" || algo.id === "gbfs" ? "No" : "Yes"}</td>
                    <td>{algo.badge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Learn;
