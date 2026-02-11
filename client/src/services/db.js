import { openDB } from "idb"

const DB_NAME = "logic-looper-db"
const STORE_NAME = "game-data"

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export async function saveData(key, value) {
  const db = await initDB()
  await db.put(STORE_NAME, value, key)
}

export async function getData(key) {
  const db = await initDB()
  return db.get(STORE_NAME, key)
}
