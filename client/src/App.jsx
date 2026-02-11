import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import Game from "./pages/Game"
import Login from "./pages/Login"

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  )
}

export default App
