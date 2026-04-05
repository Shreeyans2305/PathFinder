import React from 'react'
import Pathfinder from './Pathfinder'
import Home from './Home';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PillNav from './components/PillNav';
import logo from'/favicon.svg';

const App = () => {
  return (
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pathfinder" element={<Pathfinder />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App