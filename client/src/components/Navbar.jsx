import { Link } from "react-router-dom"

function Navbar() {
  return (
    <nav className="bg-slate-800 px-6 py-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-white">
        Logic Looper 🎮
      </h1>

      <div className="flex gap-6 text-slate-300">
        <Link to="/" className="hover:text-white">Home</Link>
        <Link to="/game" className="hover:text-white">Game</Link>
        <Link to="/login" className="hover:text-white">Login</Link>
      </div>
    </nav>
  )
}

export default Navbar
