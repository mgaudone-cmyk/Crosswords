const PUZZLE_PATH = "./data/";

let puzzle = null;
let solution = [];
let entries = [];
let userGrid = [];
let active = { row: 0, col: 0, direction: "across" };
let seconds = 0;
let timerId = null;
let completed = false;
let lastInputStamp = 0;

const homePanel = document.getElementById("homePanel");
const puzzlePanel = document.getElementById("puzzlePanel");
const backBtn = document.getElementById("backBtn");
const gridEl = document.getElementById("grid");
const mobileInput = document.getElementById("mobileInput");
const timerEl = document.getElementById("timer");
const bestTimeEl = document.getElementById("bestTime");
const puzzleTitleEl = document.getElementById("puzzleTitle");
const puzzleMetaEl = document.getElementById("puzzleMeta");
const acrossCluesEl = document.getElementById("acrossClues");
const downCluesEl = document.getElementById("downClues");
const activeClueEl = document.getElementById("activeClue");
const completeModal = document.getElementById("completeModal");
const completeText = document.getElementById("completeText");

document.querySelectorAll("[data-puzzle]").forEach(button => {
  button.addEventListener("click", () => loadPuzzle(button.dataset.puzzle));
});

backBtn.addEventListener("click", () => {
  stopTimer();
  puzzlePanel.classList.add("hidden");
  homePanel.classList.remove("hidden");
  backBtn.classList.add("hidden");
  timerEl.textContent = "00:00";
  bestTimeEl.textContent = "Best --";
});

document.getElementById("checkBtn").addEventListener("click", checkPuzzle);
document.getElementById("revealLetterBtn").addEventListener("click", revealLetter);
document.getElementById("revealWordBtn").addEventListener("click", revealWord);
document.getElementById("resetBtn").addEventListener("click", resetPuzzle);
document.getElementById("closeModalBtn").addEventListener("click", () => completeModal.classList.add("hidden"));
document.getElementById("prevClueBtn").addEventListener("click", () => moveClue(-1));
document.getElementById("nextClueBtn").addEventListener("click", () => moveClue(1));

document.addEventListener("keydown", handleKeydown);

mobileInput.addEventListener("beforeinput", e => {
  if (puzzlePanel.classList.contains("hidden")) return;
  const data = (e.data || "").toUpperCase();

  if (/^[A-Z]$/.test(data)) {
    e.preventDefault();
    inputLetter(data);
  } else if (e.inputType === "deleteContentBackward") {
    e.preventDefault();
    eraseLetter();
  }
});

mobileInput.addEventListener("input", () => {
  mobileInput.value = "";
});

async function loadPuzzle(filename) {
  try {
    const response = await fetch(PUZZLE_PATH + filename + "?v=2.1." + Date.now());
    if (!response.ok) throw new Error("Puzzle not found: " + filename);
    puzzle = await response.json();
    startPuzzle();
  } catch (error) {
    alert("Could not load puzzle. Make sure the JSON files are inside the /data folder.\n\n" + error.message);
  }
}

function startPuzzle() {
  completed = false;
  solution = puzzle.grid;
  userGrid = solution.map(row => row.map(cell => cell === "#" ? "#" : ""));
  entries = [
    ...puzzle.clues.across.map(e => ({ ...e, direction: "across" })),
    ...puzzle.clues.down.map(e => ({ ...e, direction: "down" }))
  ];

  puzzleTitleEl.textContent = puzzle.title;
  puzzleMetaEl.textContent = `${puzzle.theme} • ${puzzle.difficulty}`;
  homePanel.classList.add("hidden");
  puzzlePanel.classList.remove("hidden");
  backBtn.classList.remove("hidden");

  renderGrid();
  renderClues();
  setFirstActiveCell();

  seconds = 0;
  updateTimer();
  updateBest();
  startTimer();
  focusInput();
}

function renderGrid() {
  gridEl.innerHTML = "";
  const size = puzzle.gridSize || solution.length;
  gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;

  for (let r = 0; r < solution.length; r++) {
    for (let c = 0; c < solution[r].length; c++) {
      const cell = document.createElement("div");
      cell.className = solution[r][c] === "#" ? "cell black" : "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (solution[r][c] !== "#") {
        const number = getCellNumber(r, c);
        if (number) {
          const num = document.createElement("span");
          num.className = "num";
          num.textContent = number;
          cell.appendChild(num);
        }

        const letter = document.createElement("span");
        letter.className = "letter";
        letter.textContent = userGrid[r][c];
        cell.appendChild(letter);

        cell.addEventListener("click", () => selectCell(r, c));
      }

      gridEl.appendChild(cell);
    }
  }
}

function renderClues() {
  acrossCluesEl.innerHTML = "";
  downCluesEl.innerHTML = "";
  puzzle.clues.across.forEach(clue => acrossCluesEl.appendChild(clueItem(clue, "across")));
  puzzle.clues.down.forEach(clue => downCluesEl.appendChild(clueItem(clue, "down")));
}

function clueItem(clue, direction) {
  const li = document.createElement("li");
  li.dataset.number = clue.number;
  li.dataset.direction = direction;
  li.textContent = `${clue.number}. ${clue.clue}`;
  li.addEventListener("click", () => {
    active = { row: clue.row, col: clue.col, direction };
    updateHighlights();
    focusInput();
  });
  return li;
}

function selectCell(row, col) {
  if (active.row === row && active.col === col) {
    active.direction = active.direction === "across" ? "down" : "across";
  } else {
    active.row = row;
    active.col = col;
    if (!entryForCell(row, col, active.direction)) {
      active.direction = active.direction === "across" ? "down" : "across";
    }
  }
  updateHighlights();
  focusInput();
}

function setFirstActiveCell() {
  const first = puzzle.clues.across[0] || puzzle.clues.down[0];
  active = { row: first.row, col: first.col, direction: "across" };
  updateHighlights();
}

function getCellNumber(row, col) {
  const found = entries.find(e => e.row === row && e.col === col);
  return found ? found.number : "";
}

function entryForCell(row, col, direction) {
  return entries.find(e => {
    if (e.direction !== direction) return false;
    if (direction === "across") {
      return row === e.row && col >= e.col && col < e.col + e.answer.length;
    }
    return col === e.col && row >= e.row && row < e.row + e.answer.length;
  });
}

function currentEntry() {
  return entryForCell(active.row, active.col, active.direction);
}

function updateHighlights() {
  document.querySelectorAll(".cell").forEach(el => el.classList.remove("active", "word", "good", "bad"));
  document.querySelectorAll("li").forEach(el => el.classList.remove("active"));

  let entry = currentEntry();
  if (!entry) {
    const alt = active.direction === "across" ? "down" : "across";
    entry = entryForCell(active.row, active.col, alt);
    if (entry) active.direction = alt;
  }

  if (entry) {
    for (let i = 0; i < entry.answer.length; i++) {
      const r = entry.direction === "across" ? entry.row : entry.row + i;
      const c = entry.direction === "across" ? entry.col + i : entry.col;
      const el = cellEl(r, c);
      if (el) el.classList.add("word");
    }

    document.querySelectorAll(`li[data-number="${entry.number}"][data-direction="${entry.direction}"]`).forEach(el => el.classList.add("active"));
    activeClueEl.textContent = `${entry.number} ${capitalize(entry.direction)}: ${entry.clue}`;
  }

  const activeEl = cellEl(active.row, active.col);
  if (activeEl) activeEl.classList.add("active");
}

function handleKeydown(e) {
  if (puzzlePanel.classList.contains("hidden")) return;
  if (e.target === mobileInput) return;

  if (/^[a-zA-Z]$/.test(e.key)) {
    inputLetter(e.key.toUpperCase());
  } else if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();
    eraseLetter();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    move(0, 1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    move(0, -1);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    move(1, 0);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    move(-1, 0);
  } else if (e.key === " ") {
    e.preventDefault();
    toggleDirection();
  }
}

function inputLetter(letter) {
  const now = Date.now();
  if (now - lastInputStamp < 35) return;
  lastInputStamp = now;

  if (!puzzle || solution[active.row][active.col] === "#") return;
  userGrid[active.row][active.col] = letter;
  refreshLetters();
  advance();
  updateHighlights();
  checkCompletion();
}

function eraseLetter() {
  if (!puzzle) return;
  if (userGrid[active.row][active.col]) {
    userGrid[active.row][active.col] = "";
  } else {
    moveBack();
    userGrid[active.row][active.col] = "";
  }
  refreshLetters();
  updateHighlights();
}

function advance() {
  const entry = currentEntry();
  if (!entry) return;
  if (active.direction === "across" && active.col < entry.col + entry.answer.length - 1) active.col++;
  else if (active.direction === "down" && active.row < entry.row + entry.answer.length - 1) active.row++;
}

function moveBack() {
  const entry = currentEntry();
  if (!entry) return;
  if (active.direction === "across" && active.col > entry.col) active.col--;
  else if (active.direction === "down" && active.row > entry.row) active.row--;
}

function move(dr, dc) {
  const r = active.row + dr;
  const c = active.col + dc;
  if (r >= 0 && r < solution.length && c >= 0 && c < solution[0].length && solution[r][c] !== "#") {
    active.row = r;
    active.col = c;
    updateHighlights();
    focusInput();
  }
}

function moveClue(step) {
  const list = entries.filter(e => e.direction === active.direction);
  const entry = currentEntry();
  let index = list.findIndex(e => entry && e.number === entry.number);
  if (index < 0) index = 0;
  index = (index + step + list.length) % list.length;
  const next = list[index];
  active.row = next.row;
  active.col = next.col;
  updateHighlights();
  focusInput();
}

function toggleDirection() {
  active.direction = active.direction === "across" ? "down" : "across";
  updateHighlights();
}

function refreshLetters() {
  document.querySelectorAll(".cell:not(.black)").forEach(el => {
    const r = Number(el.dataset.row);
    const c = Number(el.dataset.col);
    el.querySelector(".letter").textContent = userGrid[r][c];
  });
}

function checkPuzzle() {
  document.querySelectorAll(".cell").forEach(el => el.classList.remove("good", "bad"));
  for (let r = 0; r < solution.length; r++) {
    for (let c = 0; c < solution[r].length; c++) {
      if (solution[r][c] === "#") continue;
      const el = cellEl(r, c);
      if (!userGrid[r][c]) continue;
      el.classList.add(userGrid[r][c] === solution[r][c] ? "good" : "bad");
    }
  }
}

function revealLetter() {
  if (!puzzle) return;
  userGrid[active.row][active.col] = solution[active.row][active.col];
  refreshLetters();
  updateHighlights();
  checkCompletion();
}

function revealWord() {
  const entry = currentEntry();
  if (!entry) return;
  for (let i = 0; i < entry.answer.length; i++) {
    const r = entry.direction === "across" ? entry.row : entry.row + i;
    const c = entry.direction === "across" ? entry.col + i : entry.col;
    userGrid[r][c] = solution[r][c];
  }
  refreshLetters();
  updateHighlights();
  checkCompletion();
}

function resetPuzzle() {
  if (!confirm("Reset this puzzle?")) return;
  userGrid = solution.map(row => row.map(cell => cell === "#" ? "#" : ""));
  seconds = 0;
  completed = false;
  refreshLetters();
  updateHighlights();
  updateTimer();
  focusInput();
}

function checkCompletion() {
  if (completed) return;
  for (let r = 0; r < solution.length; r++) {
    for (let c = 0; c < solution[r].length; c++) {
      if (solution[r][c] !== "#" && userGrid[r][c] !== solution[r][c]) return;
    }
  }
  completed = true;
  stopTimer();
  saveBest();
  completeText.textContent = `You finished ${puzzle.title} in ${formatTime(seconds)}.`;
  completeModal.classList.remove("hidden");
  updateBest();
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    seconds++;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function updateTimer() {
  timerEl.textContent = formatTime(seconds);
}

function formatTime(total) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function bestKey() {
  return `crosspop_best_${puzzle.id}`;
}

function saveBest() {
  const key = bestKey();
  const previous = Number(localStorage.getItem(key));
  if (!previous || seconds < previous) localStorage.setItem(key, String(seconds));
}

function updateBest() {
  if (!puzzle) return;
  const best = Number(localStorage.getItem(bestKey()));
  bestTimeEl.textContent = best ? `Best ${formatTime(best)}` : "Best --";
}

function cellEl(row, col) {
  return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function focusInput() {
  setTimeout(() => mobileInput.focus({ preventScroll: true }), 0);
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
