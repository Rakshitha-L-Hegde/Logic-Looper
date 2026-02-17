import { useState, useEffect } from "react";

/* ========================= */
/*        GAME ROOT          */
/* ========================= */

const puzzleTypes = ["number", "sequence", "pattern", "binary", "deduction"];

export default function Game() {
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

  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const typeIndex = dayOfYear % puzzleTypes.length;
  const puzzleType = puzzleTypes[typeIndex];

  /* ---------------- LOAD PROGRESS ---------------- */

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("logic-progress")) || {
      completedDates: {},
      streak: 0,
      lastCompleted: null,
    };

    setStreak(saved.streak);

    if (saved.completedDates[todayString]) {
      setIsCompleted(true);
    } else {
      setIsCompleted(false);
    }
  }, [todayString]);

  /* ---------------- MARK COMPLETE ---------------- */

  const markCompleted = () => {
    const saved = JSON.parse(localStorage.getItem("logic-progress")) || {
      completedDates: {},
      streak: 0,
      lastCompleted: null,
    };

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

    localStorage.setItem("logic-progress", JSON.stringify(saved));

    setStreak(saved.streak);
    setIsCompleted(true);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-2">
        Logic Looper - Daily Puzzle
      </h1>

      <p className="mb-2">
        🔥 Streak: <span className="font-bold">{streak}</span>
      </p>

      <p className="mb-4 text-lg">
        Puzzle Type: <span className="font-bold">{puzzleType}</span>
      </p>

      {isCompleted ? (
        <div className="text-center">
          <p className="text-green-400 text-xl mb-4">
            ✅ Completed! Come back tomorrow.
          </p>
        </div>
      ) : (
        <>
          {puzzleType === "number" && (
            <NumberMatrix dayOfYear={dayOfYear} onComplete={markCompleted} />
          )}
          {puzzleType === "sequence" && (
            <SequenceSolver dayOfYear={dayOfYear} onComplete={markCompleted} />
          )}
          {puzzleType === "pattern" && (
            <PatternMatch dayOfYear={dayOfYear} onComplete={markCompleted} />
          )}
          {puzzleType === "binary" && (
            <BinaryLogic dayOfYear={dayOfYear} onComplete={markCompleted} />
          )}
          {puzzleType === "deduction" && (
            <DeductionGrid dayOfYear={dayOfYear} onComplete={markCompleted} />
          )}
        </>
      )}
      <Heatmap />
    </div>
  );
}


/* ========================= */
/*      1️⃣ NUMBER MATRIX    */
/* ========================= */

function NumberMatrix({ dayOfYear,onComplete }) {
  const storageKey = `logic-number-${dayOfYear}`;

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
    const block = seed % 2; // swap within block
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

  let solution = seededSwapRows(baseSolution, dayOfYear);
  solution = seededSwapCols(solution, dayOfYear);

  /* ---------------- DIFFICULTY SCALING ---------------- */

  // Increase blanks over year
  const blanks = 4 + Math.floor((dayOfYear / 365) * 8);
  // Early year = 4 blanks
  // End year = up to 12 blanks

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

  const puzzle = generatePuzzle(solution, dayOfYear);

  /* ---------------- STATE ---------------- */

  const [grid, setGrid] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    return puzzle.map((row) => [...row]);
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(grid));
  }, [grid, storageKey]);

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

    // Check 2x2 boxes
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
    <>
      <div className="grid grid-cols-4 gap-2">
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <input
              key={`${r}-${c}`}
              type="number"
              value={cell}
              min="1"
              max="4"
              disabled={puzzle[r][c] !== ""}
              onChange={(e) => handleChange(r, c, e.target.value)}
              className="w-14 h-14 text-center text-black rounded"
            />
          ))
        )}
      </div>

      <button
        onClick={check}
        className="mt-4 bg-blue-600 px-4 py-2 rounded"
      >
        Check
      </button>

      {message && <p className="mt-3">{message}</p>}
    </>
  );
}


/* ========================= */
/*     2️⃣ SEQUENCE SOLVER   */
/* ========================= */

function SequenceSolver({ dayOfYear,onComplete }) {
  const year = new Date().getFullYear();
  const seed = year * 1000 + dayOfYear;

  /* -------- SEEDED RANDOM GENERATOR -------- */

  function createSeededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  const rand = createSeededRandom(seed);

  /* -------- DIFFICULTY SCALING -------- */

  const difficultyLevel = Math.floor((dayOfYear / 365) * 3);
  // 0 = easy
  // 1 = medium
  // 2 = hard

  /* -------- PATTERN GENERATION -------- */

  const patternType = Math.floor(rand() * 4);
  let sequence = [];
  let answer;

  if (patternType === 0) {
    // Arithmetic progression
    const start = Math.floor(rand() * 10) + 1;
    const diff = Math.floor(rand() * 5) + 2 + difficultyLevel;

    sequence = [
      start,
      start + diff,
      start + 2 * diff,
      start + 3 * diff,
    ];

    answer = start + 4 * diff;

  } else if (patternType === 1) {
    // Geometric progression
    const start = Math.floor(rand() * 5) + 2;
    const ratio = 2 + difficultyLevel;

    sequence = [
      start,
      start * ratio,
      start * ratio ** 2,
      start * ratio ** 3,
    ];

    answer = start * ratio ** 4;

  } else if (patternType === 2) {
    // Fibonacci-like
    const a = Math.floor(rand() * 5) + 1;
    const b = Math.floor(rand() * 5) + 1;

    sequence = [a, b];
    for (let i = 2; i < 4; i++) {
      sequence.push(sequence[i - 1] + sequence[i - 2]);
    }

    answer = sequence[3] + sequence[2];

  } else {
    // Quadratic progression
    const base = Math.floor(rand() * 5) + 2;

    sequence = [
      base,
      base ** 2,
      base ** 3,
      base ** 4,
    ];

    answer = base ** 5;
  }

  /* -------- STATE -------- */

  const storageKey = `logic-sequence-${year}-${dayOfYear}`;

  const [input, setInput] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved || "";
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, input);
  }, [input, storageKey]);

  /* -------- STRICT VALIDATION -------- */

  const check = () => {
    if (Number(input) === answer) {
      setMessage("🎉 Correct!");
      onComplete();
    } else {
      setMessage("❌ Incorrect!");
    }
  };

  /* -------- UI -------- */

  return (
    <div className="text-center">
      <p className="mb-4 text-xl">
        {sequence.join(", ")}, ?
      </p>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="text-black p-2 rounded"
      />

      <button
        onClick={check}
        className="ml-3 bg-blue-600 px-4 py-2 rounded"
      >
        Check
      </button>

      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}

/* ========================= */
/*      3️⃣ PATTERN MATCH     */
/* ========================= */

function PatternMatch({ dayOfYear,onComplete }) {
  const year = new Date().getFullYear();
  const seed = year * 1000 + dayOfYear;

  /* -------- SEEDED RANDOM -------- */

  function createSeededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  const rand = createSeededRandom(seed);

  /* -------- SYMBOL SET -------- */

  const symbols = ["🔺", "🔵", "⬛", "⬜", "🟢", "🟡"];

  const difficulty = Math.floor((dayOfYear / 365) * 3);
  const patternLength = 4 + difficulty;

  const ruleType = Math.floor(rand() * 4);

  let pattern = [];
  let answer;

  /* -------- RULE 1: CYCLIC -------- */

  if (ruleType === 0) {
    const startIndex = Math.floor(rand() * symbols.length);
    for (let i = 0; i < patternLength; i++) {
      pattern.push(symbols[(startIndex + i) % symbols.length]);
    }
    answer = symbols[(startIndex + patternLength) % symbols.length];
  }

  /* -------- RULE 2: ALTERNATING -------- */

  else if (ruleType === 1) {
    const s1 = symbols[Math.floor(rand() * symbols.length)];
    const s2 = symbols[Math.floor(rand() * symbols.length)];

    for (let i = 0; i < patternLength; i++) {
      pattern.push(i % 2 === 0 ? s1 : s2);
    }
    answer = patternLength % 2 === 0 ? s1 : s2;
  }

  /* -------- RULE 3: SKIP PATTERN -------- */

  else if (ruleType === 2) {
    const step = Math.floor(rand() * 3) + 1;
    const startIndex = Math.floor(rand() * symbols.length);

    for (let i = 0; i < patternLength; i++) {
      pattern.push(
        symbols[(startIndex + i * step) % symbols.length]
      );
    }

    answer =
      symbols[(startIndex + patternLength * step) % symbols.length];
  }

  /* -------- RULE 4: MIRROR PATTERN -------- */

  else {
    const half = Math.floor(patternLength / 2);
    const firstHalf = [];

    for (let i = 0; i < half; i++) {
      firstHalf.push(symbols[Math.floor(rand() * symbols.length)]);
    }

    pattern = [...firstHalf, ...firstHalf.reverse()];
    answer = firstHalf[0];
  }

  /* -------- STATE -------- */

  const storageKey = `logic-pattern-${year}-${dayOfYear}`;

  const [choice, setChoice] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved || "";
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, choice);
  }, [choice, storageKey]);

  /* -------- STRICT VALIDATION -------- */

  const check = () => {
    if (choice === answer) {
      setMessage("🎉 Correct!");
      onComplete();
    } else {
      setMessage("❌ Incorrect!");
    }
  };

  /* -------- UI -------- */

  return (
    <div className="text-center">
      <p className="mb-4 text-xl">
        {pattern.join(" ")} ?
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {symbols.map((sym) => (
          <button
            key={sym}
            onClick={() => setChoice(sym)}
            className="text-3xl"
          >
            {sym}
          </button>
        ))}
      </div>

      <button
        onClick={check}
        className="mt-4 bg-blue-600 px-4 py-2 rounded"
      >
        Check
      </button>

      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}


/* ========================= */
/*      4️⃣ BINARY LOGIC      */
/* ========================= */

function BinaryLogic({ dayOfYear ,onComplete}) {
  const year = new Date().getFullYear();
  const seed = year * 1000 + dayOfYear;

  /* -------- SEEDED RANDOM -------- */

  function createSeededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  const rand = createSeededRandom(seed);

  /* -------- DIFFICULTY -------- */

  const difficulty = Math.floor((dayOfYear / 365) * 3);
  // 0 = simple
  // 1 = medium
  // 2 = hard

  /* -------- OPERATORS -------- */

  const operators = ["AND", "OR", "XOR", "NAND", "NOR"];

  function applyOp(a, b, op) {
    if (op === "AND") return a & b;
    if (op === "OR") return a | b;
    if (op === "XOR") return a ^ b;
    if (op === "NAND") return a & b ? 0 : 1;
    if (op === "NOR") return a | b ? 0 : 1;
  }

  /* -------- GENERATE EXPRESSION -------- */

  const a = Math.floor(rand() * 2);
  const b = Math.floor(rand() * 2);
  const c = Math.floor(rand() * 2);

  const op1 = operators[Math.floor(rand() * operators.length)];
  const op2 = operators[Math.floor(rand() * operators.length)];

  let expression;
  let result;

  if (difficulty === 0) {
    expression = `${a} ${op1} ${b}`;
    result = applyOp(a, b, op1);
  }

  else if (difficulty === 1) {
    expression = `(${a} ${op1} ${b}) ${op2} ${c}`;
    const first = applyOp(a, b, op1);
    result = applyOp(first, c, op2);
  }

  else {
    const d = Math.floor(rand() * 2);
    expression = `((${a} ${op1} ${b}) ${op2} ${c}) XOR ${d}`;
    const first = applyOp(a, b, op1);
    const second = applyOp(first, c, op2);
    result = second ^ d;
  }

  /* -------- STATE -------- */

  const storageKey = `logic-binary-${year}-${dayOfYear}`;

  const [input, setInput] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved || "";
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, input);
  }, [input, storageKey]);

  /* -------- STRICT VALIDATION -------- */

  const check = () => {
    if (Number(input) === result) {
      setMessage("🎉 Correct!");
      onComplete();
    } else {
      setMessage("❌ Incorrect!");
    }
  };

  /* -------- UI -------- */

  return (
    <div className="text-center">
      <p className="mb-4 text-xl">{expression}</p>

      <input
        type="number"
        min="0"
        max="1"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="text-black p-2 rounded"
      />

      <button
        onClick={check}
        className="ml-3 bg-blue-600 px-4 py-2 rounded"
      >
        Check
      </button>

      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}


/* ========================= */
/*     5️⃣ DEDUCTION GRID     */
/* ========================= */

function DeductionGrid({ dayOfYear,onComplete }) {
  const year = new Date().getFullYear();
  const seed = year * 1000 + dayOfYear;

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

  /* ---------------- ALL POSSIBLE WORLDS (36) ---------------- */

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

  /* ---------------- TRUE DAILY SOLUTION ---------------- */

  const trueWorld =
    allWorlds[Math.floor(rand() * allWorlds.length)];

  /* ---------------- GENERATE UNIQUE CLUES ---------------- */

  function generateClues(world) {
    const clues = [];

    // Positive clue
    const person1 = people[Math.floor(rand() * 3)];
    clues.push({
      type: "likes",
      person: person1,
      value: world[person1].color,
    });

    // Negative clue
    const person2 = people[Math.floor(rand() * 3)];
    const wrongPet =
      pets.find((p) => p !== world[person2].pet);
    clues.push({
      type: "notPet",
      person: person2,
      value: wrongPet,
    });

    // Cross clue
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
      if (clue.type === "likes") {
        return world[clue.person].color === clue.value;
      }
      if (clue.type === "notPet") {
        return world[clue.person].pet !== clue.value;
      }
      if (clue.type === "petColor") {
        return Object.values(world).some(
          (p) => p.pet === clue.pet && p.color === clue.color
        );
      }
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

  const finalWorld = validWorlds.length === 1
    ? validWorlds[0]
    : trueWorld; // fallback safety


  /* ---------------- QUESTION ---------------- */

  const questionPet =
    pets[Math.floor(rand() * pets.length)];

  const correctAnswer = Object.keys(finalWorld).find(
    (person) => finalWorld[person].pet === questionPet
  );

  /* ---------------- STATE ---------------- */

  const storageKey = `logic-deduction-${year}-${dayOfYear}`;

  const [input, setInput] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved || "";
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, input);
  }, [input, storageKey]);

  const check = () => {
  const normalizedInput = input.trim().toLowerCase();
  const normalizedAnswer = correctAnswer.toLowerCase();

  if (normalizedInput === normalizedAnswer) {
    setMessage("🎉 Correct!");
    onComplete();
  } else {
    setMessage("❌ Incorrect!");
  }
};


  /* ---------------- RENDER CLUES ---------------- */

  const formattedClues = clues.map((clue, i) => {
    if (clue.type === "likes")
      return `• ${clue.person} likes ${clue.value}.`;
    if (clue.type === "notPet")
      return `• ${clue.person} does not own the ${clue.value}.`;
    if (clue.type === "petColor")
      return `• The person who owns the ${clue.pet} likes ${clue.color}.`;
    return "";
  });

  return (
    <div className="text-center">
      <div className="mb-4 text-left inline-block">
        {formattedClues.map((c, i) => (
          <p key={i}>{c}</p>
        ))}
      </div>

      <p className="mt-4 font-bold">
        Who owns the {questionPet}?
      </p>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter name"
        className="text-black p-2 rounded mt-2"
      />

      <button
        onClick={check}
        className="ml-3 bg-blue-600 px-4 py-2 rounded mt-2"
      >
        Check
      </button>

      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}

function Heatmap() {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const today = new Date();

  const progress = JSON.parse(localStorage.getItem("logic-progress")) || {
    completedDates: {},
  };

  const days = [];

  for (let i = 0; i < 365; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const dateString = date.toISOString().split("T")[0];

    days.push({
      dateString,
      isFuture: date > today,
      completed: progress.completedDates[dateString],
    });
  }

  return (
    <div className="mt-10 text-center">
      <h2 className="text-xl mb-4">📅 Year Activity</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(53, 12px)",
          gap: "4px",
          justifyContent: "center",
        }}
      >
        {days.map((day, index) => {
          let color = "#d1d5db"; // default gray

          if (day.isFuture) color = "#f3f4f6";
          else if (day.completed) color = "#22c55e";

          return (
            <div
              key={index}
              title={day.dateString}
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: color,
                borderRadius: "2px",
              }}
            ></div>
          );
        })}
      </div>
    </div>
  );
}
