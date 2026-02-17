import { openDB } from "idb";

const DB_NAME = "logic-looper-db";
const DB_VERSION = 3;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress");
      }

      if (!db.objectStoreNames.contains("puzzles")) {
        db.createObjectStore("puzzles");
      }

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    },
  });
}

/* ---------------- PROGRESS ---------------- */

export async function saveProgress(key, value) {
  const db = await getDB();
  await db.put("progress", value, key);
}

export async function getProgress(key) {
  const db = await getDB();
  return db.get("progress", key);
}

/* ---------------- PUZZLE STATE ---------------- */

export async function savePuzzle(key, value) {
  const db = await getDB();
  await db.put("puzzles", value, key);
}

export async function getPuzzle(key) {
  const db = await getDB();
  return db.get("puzzles", key);
}

/* ---------------- META (HINTS, TIMER) ---------------- */

export async function saveMeta(key, value) {
  const db = await getDB();
  await db.put("meta", value, key);
}

export async function getMeta(key) {
  const db = await getDB();
  return db.get("meta", key);
}
