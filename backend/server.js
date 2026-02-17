const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});


// Test route
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully!",
      time: result.rows[0],
    });
  } catch (error) {
  console.error("FULL ERROR:", error);
  res.status(500).json({ error: error.message });
}
});

app.post("/api/sync", async (req, res) => {
  try {
    const { date, score, time, streak } = req.body;

    // Basic validation
    if (!date || score < 0 || time < 0) {
      return res.status(400).json({ error: "Invalid data" });
    }

    // Prevent future date cheating
    const today = new Date().toISOString().split("T")[0];
    if (date > today) {
      return res.status(400).json({ error: "Future date not allowed" });
    }

    // Insert into DB
    await pool.query(
      `INSERT INTO daily_scores (date, score, time_taken)
       VALUES ($1, $2, $3)
       ON CONFLICT (date)
       DO UPDATE SET
         score = EXCLUDED.score,
         time_taken = EXCLUDED.time_taken`,
      [date, score, time]
    );

    res.json({ success: true });

  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
