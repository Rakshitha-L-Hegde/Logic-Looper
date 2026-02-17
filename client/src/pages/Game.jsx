function StatCard({ title, value, highlight }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
      <p className="text-gray-500 text-sm mb-2">{title}</p>
      <p className={`text-xl font-semibold ${highlight ? "text-[#7752FE]" : "text-[#222222]"}`}>
        {value}
      </p>
    </div>
  );
}

/* ========================= */
/*        GAME ROOT          */
/* ========================= */
import dayjs from "dayjs";
import { Clock } from "lucide-react";
import { CheckCircle, Lightbulb } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "@react-hook/window-size";
import { generateSeed } from "../utils/seed";
import { savePuzzle, getPuzzle } from "../lib/db";
import { getProgress, saveProgress, getMeta, saveMeta } from "../lib/db";

import { useState, useEffect } from "react";

const puzzleTypes = ["number", "sequence", "pattern", "binary", "deduction"];

export default function Game() {
  /* ---------------- TIMER + SCORE STATE ---------------- */

  const [startTime, setStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeTaken, setTimeTaken] = useState(null);
  const [score, setScore] = useState(null);

  /* ---------------- DATE + STREAK ---------------- */

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isCompleted, setIsCompleted] = useState(false);
  const [streak, setStreak] = useState(0);

  /* ---------------- DATE HANDLING ---------------- */

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(interval); 
  }, []);

  const today = currentDate;
  const todayString = today.toISOString().split("T")[0];

  const globalSeed = generateSeed(todayString);

  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const typeIndex = dayOfYear % puzzleTypes.length;
  const puzzleType = puzzleTypes[typeIndex];

  /* ---------------- HINT SYSTEM ---------------- */

  const hintKey = `logic-hints-${todayString}`;

  const [hintsRemaining, setHintsRemaining] = useState(2);
  const [hintsUsed, setHintsUsed] = useState(0);

  /* ---------------- LOAD PROGRESS ---------------- */

  useEffect(() => {
  async function loadProgress() {
    let saved = await getProgress("logic-progress");

    if (!saved) {
      saved = {
        completedDates: {},
        streak: 0,
        lastCompleted: null,
        dailyScores: {},
        dailyTimes: {},
      };
    }

    setStreak(saved.streak);

    const alreadyCompleted = !!saved.completedDates[todayString];
    setIsCompleted(alreadyCompleted);

    if (alreadyCompleted) {
      setScore(saved.dailyScores?.[todayString] || null);
      setTimeTaken(saved.dailyTimes?.[todayString] || null);
      setStartTime(null);
    } else {
      const storedStart = await getMeta(`logic-start-${todayString}`);

      if (storedStart) {
        setStartTime(storedStart);
      } else {
        const now = Date.now();
        await saveMeta(`logic-start-${todayString}`, now);
        setStartTime(now);
      }

      setTimeTaken(null);
      setScore(null);
    }

    const savedHints = await getMeta(`logic-hints-${todayString}`);

    if (savedHints) {
      setHintsRemaining(savedHints.remaining);
      setHintsUsed(savedHints.used);
    } else {
      await saveMeta(`logic-hints-${todayString}`, {
        remaining: 2,
        used: 0,
      });

      setHintsRemaining(2);
      setHintsUsed(0);
    }
  }

  loadProgress();
}, [todayString]);


  /* ---------------- LIVE TIMER ---------------- */

  useEffect(() => {
    if (!isCompleted && startTime) {
      const timer = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isCompleted, startTime]);

  /* ✅ FIXED HERE */
  const liveSeconds =
    !isCompleted && startTime
      ? Math.max(0, Math.floor((currentTime - startTime) / 1000))
      : timeTaken ?? 0;

  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) seconds = 0;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  /* ---------------- USE HINT ---------------- */

  const useHint = async () => {
  if (hintsRemaining <= 0 || isCompleted) return;

  const newRemaining = hintsRemaining - 1;
  const newUsed = hintsUsed + 1;

  setHintsRemaining(newRemaining);
  setHintsUsed(newUsed);

  await saveMeta(hintKey, {
    remaining: newRemaining,
    used: newUsed,
  });
};


  /* ---------------- MARK COMPLETE ---------------- */

 const markCompleted = async () => {
  let saved = await getProgress("logic-progress");

  if (!saved) {
    saved = {
      completedDates: {},
      streak: 0,
      lastCompleted: null,
      dailyScores: {},
      dailyTimes: {},
    };
  }

  if (saved.completedDates[todayString]) return;

  saved.completedDates[todayString] = true;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split("T")[0];

  if (saved.lastCompleted === yesterdayString) {
    saved.streak += 1;
  } else {
    saved.streak = 1;
  }

  saved.lastCompleted = todayString;

  const seconds = liveSeconds;
  setTimeTaken(seconds);
  await saveMeta(`logic-start-${todayString}`, null);

  const difficultyBonus = Math.floor((dayOfYear / 365) * 50);
  const streakBonus = saved.streak * 5;

  let finalScore = 100 + difficultyBonus + streakBonus - seconds;

  if (finalScore < 10) finalScore = 10;

  finalScore = Math.floor(
    finalScore * Math.pow(0.9, hintsUsed)
  );

  setScore(finalScore);

  saved.dailyScores[todayString] = finalScore;
  saved.dailyTimes[todayString] = seconds;

  try {
  await fetch("http://localhost:5000/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      date: todayString,
      score: finalScore,
      time: seconds,
      streak: saved.streak,
    }),
  });
} catch (error) {
  console.error("Sync failed:", error);
}

  await saveProgress("logic-progress", saved);

  setStreak(saved.streak);
  setIsCompleted(true);
};

  /* ---------------- UI ---------------- */

return (
  <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-900 p-8">
    <div className="max-w-6xl mx-auto text-white">

      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold drop-shadow-lg">
          Daily Challenge
        </h1>
        <p className="text-purple-200 mt-3">
          Solve today’s logic puzzle and maintain your streak.
        </p>
      </div>

      {/* STATS BAR */}
      <div className="flex justify-between items-center mb-10 p-6 rounded-2xl bg-white/10 backdrop-blur-lg">
        
      <div className="flex items-center gap-4">
  <div className="bg-white/20 p-3 rounded-xl">
    <Clock size={22} />
  </div>

  <div>
    <p className="text-sm opacity-70">Timer</p>
    <p className="text-2xl font-bold tracking-wide">
      {formatTime(liveSeconds)}
    </p>
  </div>
</div>


        <div>
          <p className="text-sm opacity-70">Hints Remaining</p>
          <p className="text-2xl font-bold text-orange-400">
            {hintsRemaining}
          </p>
        </div>

        <div>
          <p className="text-sm opacity-70">Puzzle Type</p>
          <p className="text-2xl font-bold capitalize">
            {puzzleType}
          </p>
        </div>

        
      </div>

      {/* MAIN GAME AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* PUZZLE CARD */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-10 text-indigo-900 shadow-2xl">

          {isCompleted ? (

  <div
    className="mt-6 p-6 rounded-xl"
    style={{
      backgroundColor: '#DDF2FD',
      border: '3px solid #525CEB'
    }}
  >
    <div className="text-center mb-4">
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
        🎉
      </div>

      <h4
        style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#190482'
        }}
      >
        Puzzle Complete! Great job!
      </h4>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div
        className="p-4 rounded-lg text-center"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            color: '#7752FE',
            fontWeight: '600'
          }}
        >
          Time Taken
        </div>

        <div
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#190482'
          }}
        >
          {formatTime(timeTaken)}
        </div>
      </div>

      <div
        className="p-4 rounded-lg text-center"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            color: '#F05537',
            fontWeight: '600'
          }}
        >
          Final Score
        </div>

        <div
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#190482'
          }}
        >
          {score}
        </div>
      </div>
    </div>
  </div>

) : (

  <>
    {puzzleType === "number" && (
      <NumberMatrix
        seed={globalSeed}
        onComplete={markCompleted}
        onHint={useHint}
        hintsRemaining={hintsRemaining}
      />
    )}
    {puzzleType === "sequence" && (
      <SequenceSolver
        seed={globalSeed}
        onComplete={markCompleted}
        onHint={useHint}
        hintsRemaining={hintsRemaining}
      />
    )}
    {puzzleType === "pattern" && (
      <PatternMatch
        seed={globalSeed}
        onComplete={markCompleted}
        onHint={useHint}
        hintsRemaining={hintsRemaining}
      />
    )}
    {puzzleType === "binary" && (
      <BinaryLogic
        seed={globalSeed}
        onComplete={markCompleted}
        onHint={useHint}
        hintsRemaining={hintsRemaining}
      />
    )}
    {puzzleType === "deduction" && (
      <DeductionGrid
        seed={globalSeed}
        onComplete={markCompleted}
        onHint={useHint}
        hintsRemaining={hintsRemaining}
      />
    )}
  </>
)}
        </div>

        {/* SIDE PANEL */}
        <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-lg">
          <h3 className="text-xl font-bold mb-4">
            How to Play
          </h3>

          <ul className="space-y-2 text-purple-200 text-sm">
            <li>• Solve today’s logic challenge</li>
            <li>• Use hints carefully (score penalty!)</li>
            <li>• Maintain your streak</li>
            <li>• Come back tomorrow for new puzzle</li>
          </ul>

          <div className="mt-6 p-4 rounded-xl bg-orange-500/20">
            <p className="text-sm font-semibold">
              💡 Current Streak
            </p>
            <p className="text-3xl font-bold mt-1">
              {streak} Days
            </p>
          </div>
        </div>

      </div>

      {/* YEAR ACTIVITY */}
      <div className="mt-12 bg-white rounded-2xl p-8 text-indigo-900 shadow-xl">
        <h3 className="text-xl font-bold mb-6">
          Yearly Contributions
        </h3>
        <Heatmap />
      </div>

    </div>
  </div>
);
}


/* ========================= */
/*      1️⃣ NUMBER MATRIX    */
/* ========================= */

function NumberMatrix({ seed, onComplete, onHint, hintsRemaining }) {
  const storageKey = `logic-number-${seed}`;

  /* ---------------- BASE VALID SOLUTION ---------------- */

  const baseSolution = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];

  /* ---------------- SEEDED SHUFFLE ---------------- */

  function seededSwapRows(grid, seed) {
    const copy = grid.map((row) => [...row]);
    const block = seed % 2;
    const row1 = block * 2;
    const row2 = row1 + 1;

    [copy[row1], copy[row2]] = [copy[row2], copy[row1]];
    return copy;
  }

  function seededSwapCols(grid, seed) {
    const copy = grid.map((row) => [...row]);
    const block = seed % 2;
    const col1 = block * 2;
    const col2 = col1 + 1;

    for (let i = 0; i < 4; i++) {
      [copy[i][col1], copy[i][col2]] = [copy[i][col2], copy[i][col1]];
    }
    return copy;
  }

  /* ---------------- GENERATE SOLUTION ---------------- */

  let solution = seededSwapRows(baseSolution, seed);
  solution = seededSwapCols(solution, seed);

  /* ---------------- DIFFICULTY SCALING ---------------- */

  const blanks = 4 + (seed % 6);


  function generatePuzzle(sol, seed) {
    const puzzle = sol.map((row) => [...row]);
    let removed = 0;
    let r = seed % 4;
    let c = (seed * 3) % 4;

    while (removed < blanks) {
      if (puzzle[r][c] !== "") {
        puzzle[r][c] = "";
        removed++;
      }
      r = (r + 1) % 4;
      c = (c + 2) % 4;
    }

    return puzzle;
  }

  const puzzle = generatePuzzle(solution, seed);

  /* ---------------- STATE ---------------- */

  const [grid, setGrid] = useState(null);


  const [message, setMessage] = useState("");
  const [hintedCells, setHintedCells] = useState([]);

  useEffect(() => {
  async function loadPuzzle() {
    const saved = await getPuzzle(storageKey);

    if (saved) {
      setGrid(saved);
    } else {
      setGrid(puzzle.map((row) => [...row]));
    }
  }

  loadPuzzle();
}, [storageKey]);

useEffect(() => {
  if (grid) {
    savePuzzle(storageKey, grid);
  }
}, [grid, storageKey]);


  /* ---------------- HINT LOGIC ---------------- */

  const giveHint = () => {
  if (!grid || hintsRemaining <= 0) return;

  if (hintsRemaining === 2) {
    setMessage("💡 Hint 1: Check row and column uniqueness.");
    onHint();
    return;
  }


    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === "") {
          const copy = grid.map((row) => [...row]);
          copy[r][c] = solution[r][c];
          setGrid(copy);

          setHintedCells((prev) => [...prev, `${r}-${c}`]);

          onHint(); // inform Game to reduce hint count
          return;
        }
      }
    }
  };

  /* ---------------- VALIDATION ENGINE ---------------- */

  function isValidSudoku(board) {
    for (let i = 0; i < 4; i++) {
      const rowSet = new Set();
      const colSet = new Set();

      for (let j = 0; j < 4; j++) {
        const rowVal = board[i][j];
        const colVal = board[j][i];

        if (!rowVal || !colVal) return false;

        if (rowSet.has(rowVal) || colSet.has(colVal)) return false;

        rowSet.add(rowVal);
        colSet.add(colVal);
      }
    }

    for (let boxRow = 0; boxRow < 4; boxRow += 2) {
      for (let boxCol = 0; boxCol < 4; boxCol += 2) {
        const boxSet = new Set();
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            const val = board[boxRow + r][boxCol + c];
            if (!val || boxSet.has(val)) return false;
            boxSet.add(val);
          }
        }
      }
    }

    return true;
  }

  const handleChange = (r, c, val) => {
    if (val > 4 || val < 1) return;
    if (!grid) return;
    const copy = grid.map((row) => [...row]);
    copy[r][c] = Number(val);
    setGrid(copy);
  };

  const check = () => {
    if (!isValidSudoku(grid)) {
      setMessage("❌ Invalid Sudoku Rules!");
      return;
    }

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (grid[i][j] !== solution[i][j]) {
          setMessage("❌ Incorrect Solution!");
          return;
        }
      }
    }

    setMessage("🎉 Correct Sudoku!");
    onComplete();
  };

  /* ---------------- UI ---------------- */

  return (
  <div className="text-center">

    {/* GRID */}
    {grid && (
    <div className="grid grid-cols-4 gap-3 justify-center mb-6">
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const isLocked = puzzle[r][c] !== "";
          const isHinted = hintedCells.includes(`${r}-${c}`);

          return (
            <input
              key={`${r}-${c}`}
              type="number"
              value={cell}
              min="1"
              max="4"
              disabled={isLocked || isHinted}
              onChange={(e) => handleChange(r, c, e.target.value)}
              className={`w-16 h-16 text-center text-black rounded-lg border border-gray-300 
                focus:outline-none focus:ring-2 focus:ring-indigo-400
                ${isHinted ? "bg-yellow-200" : "bg-white"}
              `}
            />
          );
        })
      )}
    </div>
    )}

    {/* BUTTONS */}
    <div className="flex justify-center gap-4 mt-4">

      {/* CLEAN CHECK BUTTON */}
      <button
        onClick={check}
        className="flex items-center gap-2 
                   bg-indigo-500 hover:bg-indigo-600
                   text-white font-medium
                   px-8 py-3 rounded-xl
                   transition-all duration-200 shadow-sm"
      >
        <CheckCircle size={18} />
        Check
      </button>

      {/* CLEAN HINT BUTTON */}
      <button
        onClick={giveHint}
        disabled={hintsRemaining <= 0}
        className={`flex items-center gap-2 
          px-8 py-3 rounded-xl font-medium
          transition-all duration-200 shadow-sm
          ${
            hintsRemaining > 0
              ? "bg-[#F05537] hover:bg-[#d94a2f] text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        <Lightbulb size={18} />
        Hint
      </button>

    </div>

    {message && (
      <p className="mt-4 font-medium">
        {message}
      </p>
    )}

  </div>
);
}
/* ========================= */
/*     2️⃣ SEQUENCE SOLVER   */
/* ========================= */

function SequenceSolver({ seed, onComplete, onHint, hintsRemaining }) {
  

  function createSeededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  const rand = createSeededRandom(seed);

  const difficultyLevel = Math.floor(rand() * 3);
  const patternType = Math.floor(rand() * 4);

  let sequence = [];
  let answer;
  let ruleDescription = "";

  if (patternType === 0) {
    const start = Math.floor(rand() * 10) + 1;
    const diff = Math.floor(rand() * 5) + 2 + difficultyLevel;

    sequence = [start, start + diff, start + 2 * diff, start + 3 * diff];
    answer = start + 4 * diff;
    ruleDescription = `Arithmetic progression (Common difference = ${diff})`;
  }

  else if (patternType === 1) {
    const start = Math.floor(rand() * 5) + 2;
    const ratio = 2 + difficultyLevel;

    sequence = [
      start,
      start * ratio,
      start * ratio ** 2,
      start * ratio ** 3,
    ];
    answer = start * ratio ** 4;
    ruleDescription = `Geometric progression (Common ratio = ${ratio})`;
  }

  else if (patternType === 2) {
    const a = Math.floor(rand() * 5) + 1;
    const b = Math.floor(rand() * 5) + 1;

    sequence = [a, b];
    for (let i = 2; i < 4; i++) {
      sequence.push(sequence[i - 1] + sequence[i - 2]);
    }

    answer = sequence[3] + sequence[2];
    ruleDescription = "Fibonacci-like sequence (Each term = sum of previous two)";
  }

  else {
    const base = Math.floor(rand() * 5) + 2;

    sequence = [base, base ** 2, base ** 3, base ** 4];
    answer = base ** 5;
    ruleDescription = `Power sequence (Powers of ${base})`;
  }

  const storageKey = `logic-sequence-${seed}`;

 const [input, setInput] = useState(null);


  const [message, setMessage] = useState("");
  const [hintMessage, setHintMessage] = useState("");

  useEffect(() => {
  async function loadSequence() {
    const saved = await getPuzzle(storageKey);

    if (saved !== undefined && saved !== null) {
      setInput(saved);
    } else {
      setInput("");
    }
  }

  loadSequence();
}, [storageKey]);

  useEffect(() => {
  if (input !== null) {
    savePuzzle(storageKey, input);
  }
}, [input, storageKey]);

  const check = () => {
    if (Number(input) === answer) {
      setMessage("🎉 Correct!");
      onComplete();
    } else {
      setMessage("❌ Incorrect!");
    }
  };

  /* ✅ UPDATED HINT SYSTEM */
  const giveHint = () => {
    if (hintsRemaining <= 0) return;

    if (hintsRemaining === 2) {
      setHintMessage("💡 Hint 1: Observe how each term relates to the previous one.");
    } 
    else if (hintsRemaining === 1) {
      setHintMessage(`💡 Hint 2: ${ruleDescription}`);
    }

    onHint();
  };

  /* ================= UI ================= */

  return (
    <div className="text-center">

      <p className="mb-6 text-2xl font-semibold">
        {sequence.join(", ")}, ?
      </p>

      {/* ✅ INPUT IMPROVED */}
      <input
        value={input ?? ""}
        onChange={(e) => setInput(e.target.value)}
        className="text-black px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {/* ✅ BUTTONS WRAPPED + CENTERED */}
      <div className="flex justify-center gap-4 mt-6">

        {/* ✅ CLEAN CHECK BUTTON */}
        <button
          onClick={check}
          className="flex items-center gap-2 
                     bg-indigo-500 hover:bg-indigo-600
                     text-white font-medium
                     px-8 py-3 rounded-xl
                     transition-all duration-200 shadow-sm"
        >
          <CheckCircle size={18} />
          Check
        </button>

        {/* ✅ CLEAN HINT BUTTON */}
        <button
          onClick={giveHint}
          disabled={hintsRemaining <= 0}
          className={`flex items-center gap-2 
            px-8 py-3 rounded-xl font-medium
            transition-all duration-200 shadow-sm
            ${
              hintsRemaining > 0
                ? "bg-[#F05537] hover:bg-[#d94a2f] text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          <Lightbulb size={18} />
          Hint
        </button>

      </div>

      {message && <p className="mt-4 font-medium">{message}</p>}

      {hintMessage && (
        <p className="mt-3 text-orange-400 font-medium">
          {hintMessage}
        </p>
      )}

    </div>
  );
}


/* ========================= */
/*      3️⃣ PATTERN MATCH     */
/* ========================= */

function PatternMatch({ seed, onComplete, onHint, hintsRemaining }) {
  function createSeededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  const rand = createSeededRandom(seed);

  const symbols = ["🔺", "🔵", "⬛", "⬜", "🟢", "🟡"];

  const difficulty = Math.floor(rand() * 3);
  const patternLength = 4 + difficulty;
  const ruleType = Math.floor(rand() * 4);

  let pattern = [];
  let answer;
  let ruleDescription = "";

  if (ruleType === 0) {
    const startIndex = Math.floor(rand() * symbols.length);
    for (let i = 0; i < patternLength; i++) {
      pattern.push(symbols[(startIndex + i) % symbols.length]);
    }
    answer = symbols[(startIndex + patternLength) % symbols.length];
    ruleDescription = "Cyclic pattern (Symbols repeat in fixed order)";
  }

  else if (ruleType === 1) {
    const s1 = symbols[Math.floor(rand() * symbols.length)];
    const s2 = symbols[Math.floor(rand() * symbols.length)];

    for (let i = 0; i < patternLength; i++) {
      pattern.push(i % 2 === 0 ? s1 : s2);
    }

    answer = patternLength % 2 === 0 ? s1 : s2;
    ruleDescription = "Alternating pattern (Two symbols repeat alternately)";
  }

  else if (ruleType === 2) {
    const step = Math.floor(rand() * 3) + 1;
    const startIndex = Math.floor(rand() * symbols.length);

    for (let i = 0; i < patternLength; i++) {
      pattern.push(symbols[(startIndex + i * step) % symbols.length]);
    }

    answer = symbols[(startIndex + patternLength * step) % symbols.length];
    ruleDescription = `Skip pattern (Every ${step} symbol is selected)`;
  }

  else {
    const half = Math.floor(patternLength / 2);
    const firstHalf = [];

    for (let i = 0; i < half; i++) {
      firstHalf.push(symbols[Math.floor(rand() * symbols.length)]);
    }

    pattern = [...firstHalf, ...firstHalf.slice().reverse()];
    answer = firstHalf[0];
    ruleDescription = "Mirror pattern (Second half mirrors first half)";
  }

  const storageKey = `logic-pattern-${seed}`;


  const [choice, setChoice] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved || "";
  });

  const [message, setMessage] = useState("");
  const [hintMessage, setHintMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, choice);
  }, [choice, storageKey]);

  const check = () => {
    if (choice === answer) {
      setMessage("🎉 Correct!");
      onComplete();
    } else {
      setMessage("❌ Incorrect!");
    }
  };

  /* ✅ PROGRESSIVE HINT SYSTEM */
  const giveHint = () => {
    if (hintsRemaining <= 0) return;

    if (hintsRemaining === 2) {
      setHintMessage("💡 Hint 1: Look at how symbols repeat or shift.");
    } else {
      setHintMessage(`💡 Hint 2: ${ruleDescription}`);
    }

    onHint();
  };

  /* ================= UI ================= */

  return (
    <div className="text-center">

      <p className="mb-6 text-2xl font-semibold">
        {pattern.join(" ")} ?
      </p>

      {/* ✅ SYMBOL OPTIONS */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {symbols.map((sym) => (
          <button
            key={sym}
            onClick={() => setChoice(sym)}
            className={`text-3xl px-4 py-3 rounded-xl border transition-all duration-200
              ${
                choice === sym
                  ? "bg-indigo-500 text-white border-indigo-500"
                  : "bg-white text-black border-gray-300 hover:bg-gray-100"
              }
            `}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* ✅ BUTTONS CENTERED */}
      <div className="flex justify-center gap-4">

        {/* CLEAN CHECK BUTTON */}
        <button
          onClick={check}
          className="flex items-center gap-2 
                     bg-indigo-500 hover:bg-indigo-600
                     text-white font-medium
                     px-8 py-3 rounded-xl
                     transition-all duration-200 shadow-sm"
        >
          <CheckCircle size={18} />
          Check
        </button>

        {/* CLEAN HINT BUTTON */}
        <button
          onClick={giveHint}
          disabled={hintsRemaining <= 0}
          className={`flex items-center gap-2 
            px-8 py-3 rounded-xl font-medium
            transition-all duration-200 shadow-sm
            ${
              hintsRemaining > 0
                ? "bg-[#F05537] hover:bg-[#d94a2f] text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          <Lightbulb size={18} />
          Hint
        </button>

      </div>

      {message && (
        <p className="mt-4 font-medium">{message}</p>
      )}

      {hintMessage && (
        <p className="mt-3 text-orange-400 font-medium">
          {hintMessage}
        </p>
      )}

    </div>
  );
}

/* ========================= */
/*      4️⃣ BINARY LOGIC      */
/* ========================= */

function BinaryLogic({ seed, onComplete, onHint, hintsRemaining }) {

  function createSeededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  const rand = createSeededRandom(seed);

  const difficulty = Math.floor(rand() * 3);
  const operators = ["AND", "OR", "XOR", "NAND", "NOR"];

  function applyOp(a, b, op) {
    if (op === "AND") return a & b;
    if (op === "OR") return a | b;
    if (op === "XOR") return a ^ b;
    if (op === "NAND") return a & b ? 0 : 1;
    if (op === "NOR") return a | b ? 0 : 1;
  }

  const a = Math.floor(rand() * 2);
  const b = Math.floor(rand() * 2);
  const c = Math.floor(rand() * 2);

  const op1 = operators[Math.floor(rand() * operators.length)];
  const op2 = operators[Math.floor(rand() * operators.length)];

  let expression;
  let result;
  let hintExplanation = "";

  if (difficulty === 0) {
    expression = `${a} ${op1} ${b}`;
    result = applyOp(a, b, op1);
    hintExplanation = `Evaluate: ${a} ${op1} ${b} = ${result}`;
  }

  else if (difficulty === 1) {
    expression = `(${a} ${op1} ${b}) ${op2} ${c}`;
    const first = applyOp(a, b, op1);
    result = applyOp(first, c, op2);
    hintExplanation = `Step 1: (${a} ${op1} ${b}) = ${first}`;
  }

  else {
    const d = Math.floor(rand() * 2);
    expression = `((${a} ${op1} ${b}) ${op2} ${c}) XOR ${d}`;
    const first = applyOp(a, b, op1);
    const second = applyOp(first, c, op2);
    result = second ^ d;
    hintExplanation = `Step 1: (${a} ${op1} ${b}) = ${first}`;
  }


  const storageKey = `logic-binary-${seed}`;


  const [input, setInput] = useState(null);

  const [message, setMessage] = useState("");
  const [hintMessage, setHintMessage] = useState("");

  useEffect(() => {
  async function loadBinary() {
    const saved = await getPuzzle(storageKey);

    if (saved !== undefined && saved !== null) {
      setInput(saved);
    } else {
      setInput("");
    }
  }

  loadBinary();
}, [storageKey]);

useEffect(() => {
  if (input !== null) {
    savePuzzle(storageKey, input);
  }
}, [input, storageKey]);

  const check = () => {
    if (Number(input) === result) {
      setMessage("🎉 Correct!");
      onComplete();
    } else {
      setMessage("❌ Incorrect!");
    }
  };

  /* ---------- 2 LEVEL HINT SYSTEM ---------- */

  const giveHint = () => {
    if (hintsRemaining <= 0) return;

    if (hintsRemaining === 2) {
      setHintMessage("💡 Hint 1: Evaluate expressions inside brackets first.");
    } 
    else if (hintsRemaining === 1) {
      setHintMessage(`💡 Hint 2: ${hintExplanation}`);
    }

    onHint();
  };

  /* ---------- UI ---------- */

  return (
    <div className="text-center space-y-6">

      <p className="text-xl font-semibold">{expression}</p>

      <input
        type="number"
        min="0"
        max="1"
        value={input ?? ""}
        onChange={(e) => setInput(e.target.value)}
        className="text-black p-3 rounded-lg border border-gray-300"
      />

      {/* BUTTONS */}
      <div className="flex justify-center gap-4 mt-4">

        <button
          onClick={check}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 
                     hover:from-indigo-600 hover:to-purple-700 
                     text-white font-semibold px-6 py-3 rounded-xl 
                     shadow-md transition-all duration-200 hover:scale-105"
        >
          <CheckCircle size={18} />
          Check
        </button>

        <button
          onClick={giveHint}
          disabled={hintsRemaining <= 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold
            transition-all duration-200
            ${
              hintsRemaining > 0
                ? "bg-[#F05537] hover:bg-[#d94a2f] text-white shadow-md hover:scale-105"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          <Lightbulb size={18} />
          Hint ({hintsRemaining})
        </button>

      </div>

      {message && <p className="mt-3">{message}</p>}

      {hintMessage && (
        <p className="mt-3 text-yellow-400">{hintMessage}</p>
      )}

    </div>
  );
}


/* ========================= */
/*     5️⃣ DEDUCTION GRID     */
/* ========================= */

function DeductionGrid({ seed, onComplete, onHint, hintsRemaining }) {

  /* ---------------- SEEDED RANDOM ---------------- */

  function createSeededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  const rand = createSeededRandom(seed);

  /* ---------------- ENTITIES ---------------- */

  const people = ["Anna", "Tom", "Leo"];
  const colors = ["Red", "Blue", "Green"];
  const pets = ["Dog", "Cat", "Bird"];

  /* ---------------- PERMUTATION HELPER ---------------- */

  function permute(arr) {
    if (arr.length === 1) return [arr];
    const result = [];
    arr.forEach((item, index) => {
      const rest = [...arr.slice(0, index), ...arr.slice(index + 1)];
      permute(rest).forEach((p) => {
        result.push([item, ...p]);
      });
    });
    return result;
  }

  const colorPerms = permute(colors);
  const petPerms = permute(pets);

  const allWorlds = [];

  colorPerms.forEach((cp) => {
    petPerms.forEach((pp) => {
      allWorlds.push({
        Anna: { color: cp[0], pet: pp[0] },
        Tom: { color: cp[1], pet: pp[1] },
        Leo: { color: cp[2], pet: pp[2] },
      });
    });
  });

  /* ---------------- TRUE WORLD ---------------- */

  const trueWorld =
    allWorlds[Math.floor(rand() * allWorlds.length)];

  /* ---------------- GENERATE CLUES ---------------- */

  function generateClues(world) {
    const clues = [];

    const person1 = people[Math.floor(rand() * 3)];
    clues.push({
      type: "likes",
      person: person1,
      value: world[person1].color,
    });

    const person2 = people[Math.floor(rand() * 3)];
    const wrongPet =
      pets.find((p) => p !== world[person2].pet);
    clues.push({
      type: "notPet",
      person: person2,
      value: wrongPet,
    });

    const person3 = people[Math.floor(rand() * 3)];
    clues.push({
      type: "petColor",
      pet: world[person3].pet,
      color: world[person3].color,
    });

    return clues;
  }

  function satisfies(world, clues) {
    return clues.every((clue) => {
      if (clue.type === "likes")
        return world[clue.person].color === clue.value;
      if (clue.type === "notPet")
        return world[clue.person].pet !== clue.value;
      if (clue.type === "petColor")
        return Object.values(world).some(
          (p) => p.pet === clue.pet && p.color === clue.color
        );
      return true;
    });
  }

  let clues;
  let validWorlds = [];

  let attempts = 0;
  while (attempts < 50) {
    clues = generateClues(trueWorld);
    validWorlds = allWorlds.filter((w) =>
      satisfies(w, clues)
    );

    if (validWorlds.length === 1) break;

    attempts++;
  }

  const finalWorld =
    validWorlds.length === 1 ? validWorlds[0] : trueWorld;

  const questionPet =
    pets[Math.floor(rand() * pets.length)];

  const correctAnswer = Object.keys(finalWorld).find(
    (person) => finalWorld[person].pet === questionPet
  );

  /* ---------------- STATE ---------------- */

  const storageKey = `logic-deduction-${seed}`;


 const [input, setInput] = useState(null);

  const [message, setMessage] = useState("");
  const [hintMessage, setHintMessage] = useState("");
  //const [hintUsedLocally, setHintUsedLocally] = useState(false);

  useEffect(() => {
  async function loadDeduction() {
    const saved = await getPuzzle(storageKey);

    if (saved !== undefined && saved !== null) {
      setInput(saved);
    } else {
      setInput("");
    }
  }

  loadDeduction();
}, [storageKey]);

useEffect(() => {
  if (input !== null) {
    savePuzzle(storageKey, input);
  }
}, [input, storageKey]);

  /* ---------------- CHECK ---------------- */

  const check = () => {
  if (!input) {
    setMessage("❌ Enter an answer first.");
    return;
  }

  const normalizedInput = input.trim().toLowerCase();
  const normalizedAnswer = correctAnswer.toLowerCase();

  if (normalizedInput === normalizedAnswer) {
    setMessage("🎉 Correct!");
    onComplete();
  } else {
    setMessage("❌ Incorrect!");
  }
};

  /* ---------------- HINT LOGIC ---------------- */

  const giveHint = () => {
  if (hintsRemaining <= 0) return;

  // Hint 1: General strategy
  if (hintsRemaining === 2) {
    setHintMessage(
      "💡 Hint 1: Use elimination. Start with definite clues and remove impossible combinations."
    );
  }

  // Hint 2: Specific elimination clue
  else if (hintsRemaining === 1) {
    const wrongPerson = people.find(
      (p) => p !== correctAnswer
    );

    setHintMessage(
      `💡 Hint 2: ${wrongPerson} does NOT own the ${questionPet}.`
    );
  }

  onHint(); // reduce global hints
};

  /* ---------------- FORMAT CLUES ---------------- */

  const formattedClues = clues.map((clue, i) => {
    if (clue.type === "likes")
      return `• ${clue.person} likes ${clue.value}.`;
    if (clue.type === "notPet")
      return `• ${clue.person} does not own the ${clue.value}.`;
    if (clue.type === "petColor")
      return `• The person who owns the ${clue.pet} likes ${clue.color}.`;
    return "";
  });

  /* ---------------- UI ---------------- */

  return (
  <div className="text-center">

    {/* CLUES */}
    <div className="mb-6 text-left inline-block bg-white/5 p-4 rounded-xl">
      {formattedClues.map((c, i) => (
        <p key={i} className="text-sm text-purple-200">{c}</p>
      ))}
    </div>

    {/* QUESTION */}
    <p className="mt-2 font-semibold text-lg">
      Who owns the {questionPet}?
    </p>

    {/* INPUT */}
    <input
      value={input ?? ""}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Enter name"
      className="text-black px-4 py-2 rounded-lg mt-4 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    />

    {/* BUTTONS */}
    <div className="flex justify-center gap-4 mt-6">

      {/* CHECK BUTTON */}
      <button
        onClick={check}
        className="flex items-center gap-2 
                   bg-indigo-500 hover:bg-indigo-600
                   text-white font-medium
                   px-8 py-3 rounded-xl
                   transition-all duration-200 shadow-sm"
      >
        <CheckCircle size={18} />
        Check
      </button>

      {/* HINT BUTTON */}
      <button
        onClick={giveHint}
        disabled={hintsRemaining <= 0}
        className={`flex items-center gap-2 
          px-8 py-3 rounded-xl font-medium
          transition-all duration-200 shadow-sm
          ${
            hintsRemaining > 0
              ? "bg-[#F05537] hover:bg-[#d94a2f] text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        <Lightbulb size={18} />
        Hint
      </button>

    </div>

    {/* MESSAGES */}
    {message && <p className="mt-4">{message}</p>}

    {hintMessage && (
      <p className="mt-4 text-yellow-400">{hintMessage}</p>
    )}

  </div>
);
}
function Heatmap() {
  const today = dayjs();
  const year = today.year();

  const startOfYear = dayjs(`${year}-01-01`);
  const endOfYear = dayjs(`${year}-12-31`);

  const startDate = startOfYear.startOf("week");
  const endDate = endOfYear.endOf("week");

  const progress = JSON.parse(localStorage.getItem("logic-progress")) || {
    completedDates: {},
    dailyScores: {},
  };

  const days = [];
  let current = startDate;

  while (current.isBefore(endDate) || current.isSame(endDate)) {
    const dateString = current.format("YYYY-MM-DD");

    days.push({
      date: dateString,
      score: progress.dailyScores?.[dateString] || 0,
      completed: progress.completedDates?.[dateString] || false,
      month: current.month(),
      isCurrentYear: current.year() === year,
      isFuture: current.isAfter(today),
    });

    current = current.add(1, "day");
  }

  // Group into weeks (columns)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getColor = (day) => {
  if (!day.isCurrentYear) return "bg-transparent";

  if (!day.completed) return "bg-gray-200";

  if (day.score < 300) return "bg-emerald-400 shadow-sm";
  if (day.score < 500) return "bg-emerald-500 shadow-md";
  if (day.score < 800) return "bg-emerald-600 shadow-md";
  return "bg-emerald-700 shadow-lg";
};


  const monthNames = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  return (
    <div className="mt-10">

      
      <div className="overflow-x-auto">
        <div className="inline-block">

          {/* MONTH LABELS */}
          <div className="flex gap-1.5 ml-[34px] mb-2 text-xs text-gray-500">
            {weeks.map((week, i) => {
              const firstOfMonth = week.find(
                (day) =>
                  day &&
                  day.isCurrentYear &&
                  dayjs(day.date).date() === 1
              );

              return (
                <div key={i} className="w-4 text-center">
                  {firstOfMonth ? monthNames[firstOfMonth.month] : ""}
                </div>
              );
            })}
          </div>


          <div className="flex">

            {/* WEEKDAY LABELS */}
            <div className="flex flex-col gap-1 text-xs text-gray-500 pr-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* GRID */}
            <div className="flex gap-1.5">
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={day.date}
                      className={`
                        w-4 h-4 rounded-sm transition-transform hover:scale-125
                        ${day.isFuture ? "bg-gray-100 opacity-30" : getColor(day)}
                      `}
                    />
                  ))}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1.5">
          <div className="w-4 h-4 bg-gray-200 rounded-sm" />
          <div className="w-4 h-4 bg-green-200 rounded-sm" />
          <div className="w-4 h-4 bg-green-400 rounded-sm" />
          <div className="w-4 h-4 bg-green-600 rounded-sm" />
          <div className="w-4 h-4 bg-green-800 rounded-sm" />
        </div>
        <span>More</span>
      </div>

    </div>
  );
}


