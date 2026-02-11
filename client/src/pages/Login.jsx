import { auth } from "../firebase/config"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { useState, useEffect } from "react"

function Login() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser)
    })

    return () => unsubscribe()
  }, [])

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Login Error:", error)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Login</h1>

      {user ? (
        <>
          <p className="mb-4">Welcome, {user.displayName}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 rounded"
          >
            Logout
          </button>
        </>
      ) : (
        <button
          onClick={handleGoogleLogin}
          className="px-4 py-2 bg-blue-500 rounded"
        >
          Sign in with Google
        </button>
      )}
    </div>
  )
}

export default Login
