import { useEffect, useState } from "react"
import { saveData, getData } from "../services/db"

function Home() {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    async function loadStreak() {
      const saved = await getData("streak")
      if (saved) {
        setStreak(saved)
      }
    }
    loadStreak()
  }, [])

  const increaseStreak = async () => {
    const newStreak = streak + 1
    setStreak(newStreak)
    await saveData("streak", newStreak)
  }

  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold">Home</h1>
      <p className="mt-2">Streak: {streak}</p>

      <button
        onClick={increaseStreak}
        className="mt-4 px-4 py-2 bg-blue-500 rounded"
      >
        Increase Streak
      </button>
    </div>
  )
}

export default Home
