const puzzleFiles = {
  daily: 'data/mixed-001.json',
  movies: 'data/movies-001.json',
  music: 'data/music-001.json',
  geography: 'data/geography-001.json',
  mixed: 'data/mixed-001.json'
};

let currentPuzzle = null;
let userGrid = [];
let active = { row: 0, col: 0 };
let direction = 'across';
let timerId = null;
let seconds = 0;

const screens = {
  home: document.getElementById('homeScreen'),
  puzzle: document.getElementById('puzzleScreen'),
  result: document.getElementById('resultScreen')
};

const gridEl = document.getElementById('crosswordGrid');
const acrossCluesEl = document.getElementById('acrossClues');
const downCluesEl = document.getElementById('downClues');
const mobileInput = document.getElementById('mobileInput');

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[name].classList.add('active');
  document.getElementById('homeBtn').classList.toggle('hidden', name === 'home');
}

function formatTime(value) {
  const mins = Math.floor(value / 60).toString().padStart(2, '0');
  const secs = (value % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function startTimer() {
  clearInterval(timerId);
  seconds = 0;
  document.getElementById('timer').textContent = '00:00';
  timerId = setInterval(() => {
    seconds += 1;
    document.getElementById('timer').textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

async function loadPuzzle(theme) {
  try {
    const response = await fetch(puzzleFiles[theme]);
    if (!response.ok) throw new Error('Puzzle file not found.');
    currentPuzzle = await response.json();
    initializePuzzle();
  } catch (error) {
    showMessage('Could not load puzzle. Make sure the data files are deployed with the app.', 'bad');
    console.error(error);
  }
}

function initializePuzzle() {
  userGrid = currentPuzzle.grid.map(row => row.map(cell => cell === '#' ? '#' : ''));
  active = findFirstPlayableCell();
  direction = 'across';
  document.getElementById('puzzleTitle').textContent = currentPuzzle.title;
  document.getElementById('puzzleMeta').textContent = `${currentPuzzle.theme} • ${currentPuzzle.difficulty}`;
  const best = localStorage.getItem(`best-${currentPuzzle.id}`);
  document.getElementById('bestTime').textContent = best ? `Best: ${formatTime(Number(best))}` : 'Best: --';
  renderGrid();
  renderClues();
  updateHighlights();
  showScreen('puzzle');
  startTimer();
  mobileInput.focus();
}

function findFirstPlayableCell() {
  for (let r = 0; r < currentPuzzle.grid.length; r++) {
    for (let c = 0; c < currentPuzzle.grid[r].length; c++) {
      if (currentPuzzle.grid[r][c] !== '#') return { row: r, col: c };
    }
  }
  return { row: 0, col: 0 };
}

function clueNumberForCell(row, col) {
  const all = [...currentPuzzle.clues.across, ...currentPuzzle.clues.down];
  const clue = all.find(item => item.row === row && item.col === col);
  return clue ? clue.number : '';
}

function renderGrid() {
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${currentPuzzle.gridSize}, 1fr)`;
  currentPuzzle.grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const div = document.createElement('div');
      div.className = cell === '#' ? 'cell block' : 'cell';
      div.dataset.row = r;
      div.dataset.col = c;
      if (cell !== '#') {
        const number = clueNumberForCell(r, c);
        if (number) {
          const num = document.createElement('span');
          num.className = 'num';
          num.textContent = number;
          div.appendChild(num);
        }
        const letter = document.createElement('span');
        letter.className = 'letter';
        letter.textContent = userGrid[r][c];
        div.appendChild(letter);
        div.addEventListener('click', () => selectCell(r, c));
      }
      gridEl.appendChild(div);
    });
  });
}

function renderClues() {
  renderClueList(acrossCluesEl, currentPuzzle.clues.across, 'across');
  renderClueList(downCluesEl, currentPuzzle.clues.down, 'down');
}

function renderClueList(container, clues, dir) {
  container.innerHTML = '';
  clues.forEach(clue => {
    const li = document.createElement('li');
    li.dataset.number = clue.number;
    li.dataset.direction = dir;
    li.innerHTML = `<span class="clue-number">${clue.number}.</span>${clue.clue}`;
    li.addEventListener('click', () => {
      direction = dir;
      selectCell(clue.row, clue.col, false);
    });
    container.appendChild(li);
  });
}

function selectCell(row, col, toggle = true) {
  if (currentPuzzle.grid[row][col] === '#') return;
  if (toggle && active.row === row && active.col === col) {
    direction = direction === 'across' ? 'down' : 'across';
  }
  active = { row, col };
  updateHighlights();
  mobileInput.focus();
}

function getActiveClue() {
  const clues = currentPuzzle.clues[direction];
  return clues.find(clue => cellBelongsToClue(active.row, active.col, clue, direction));
}

function cellBelongsToClue(row, col, clue, dir) {
  const len = clue.answer.length;
  if (dir === 'across') return row === clue.row && col >= clue.col && col < clue.col + len;
  return col === clue.col && row >= clue.row && row < clue.row + len;
}

function activeWordCells() {
  const clue = getActiveClue();
  if (!clue) return [{ ...active }];
  return clue.answer.split('').map((_, i) => direction === 'across'
    ? { row: clue.row, col: clue.col + i }
    : { row: clue.row + i, col: clue.col }
  );
}

function updateHighlights() {
  document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('active', 'word'));
  document.querySelectorAll('.clue-section li').forEach(li => li.classList.remove('active'));

  activeWordCells().forEach(({ row, col }) => {
    const cell = getCellEl(row, col);
    if (cell) cell.classList.add('word');
  });
  const selected = getCellEl(active.row, active.col);
  if (selected) selected.classList.add('active');

  const clue = getActiveClue();
  if (clue) {
    const clueEl = document.querySelector(`li[data-direction="${direction}"][data-number="${clue.number}"]`);
    if (clueEl) clueEl.classList.add('active');
  }
}

function getCellEl(row, col) {
  return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function inputLetter(letter) {
  if (!/^[a-zA-Z]$/.test(letter)) return;
  userGrid[active.row][active.col] = letter.toUpperCase();
  renderGrid();
  moveNext();
  updateHighlights();
  checkCompletion();
}

function moveNext() {
  const cells = activeWordCells();
  const index = cells.findIndex(cell => cell.row === active.row && cell.col === active.col);
  if (index >= 0 && index < cells.length - 1) active = cells[index + 1];
}

function movePrevious() {
  const cells = activeWordCells();
  const index = cells.findIndex(cell => cell.row === active.row && cell.col === active.col);
  if (index > 0) active = cells[index - 1];
}

function handleBackspace() {
  if (userGrid[active.row][active.col]) {
    userGrid[active.row][active.col] = '';
  } else {
    movePrevious();
    userGrid[active.row][active.col] = '';
  }
  renderGrid();
  updateHighlights();
}

function moveByArrow(key) {
  const delta = {
    ArrowUp: [-1, 0, 'down'],
    ArrowDown: [1, 0, 'down'],
    ArrowLeft: [0, -1, 'across'],
    ArrowRight: [0, 1, 'across']
  }[key];
  if (!delta) return;
  direction = delta[2];
  let row = active.row + delta[0];
  let col = active.col + delta[1];
  if (row >= 0 && col >= 0 && row < currentPuzzle.gridSize && col < currentPuzzle.gridSize && currentPuzzle.grid[row][col] !== '#') {
    active = { row, col };
    updateHighlights();
  }
}

function checkPuzzle() {
  let wrong = 0;
  let empty = 0;
  document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('correct', 'incorrect'));
  currentPuzzle.grid.forEach((row, r) => row.forEach((answer, c) => {
    if (answer === '#') return;
    const cell = getCellEl(r, c);
    if (!userGrid[r][c]) {
      empty += 1;
    } else if (userGrid[r][c] === answer) {
      cell.classList.add('correct');
    } else {
      wrong += 1;
      cell.classList.add('incorrect');
    }
  }));
  if (wrong === 0 && empty === 0) {
    completePuzzle();
  } else if (wrong === 0) {
    showMessage(`${empty} empty squares left. No mistakes found.`, 'good');
  } else {
    showMessage(`${wrong} incorrect square${wrong > 1 ? 's' : ''}.`, 'bad');
  }
}

function revealLetter() {
  userGrid[active.row][active.col] = currentPuzzle.grid[active.row][active.col];
  renderGrid();
  moveNext();
  updateHighlights();
  checkCompletion();
}

function revealWord() {
  activeWordCells().forEach(({ row, col }) => {
    userGrid[row][col] = currentPuzzle.grid[row][col];
  });
  renderGrid();
  updateHighlights();
  checkCompletion();
}

function resetPuzzle() {
  if (!confirm('Reset this puzzle?')) return;
  initializePuzzle();
}

function checkCompletion() {
  const complete = currentPuzzle.grid.every((row, r) => row.every((answer, c) => answer === '#' || userGrid[r][c] === answer));
  if (complete) completePuzzle();
}

function completePuzzle() {
  stopTimer();
  const key = `best-${currentPuzzle.id}`;
  const best = Number(localStorage.getItem(key));
  if (!best || seconds < best) localStorage.setItem(key, String(seconds));
  document.getElementById('resultSummary').textContent = `${currentPuzzle.title} solved in ${formatTime(seconds)}.`;
  showScreen('result');
}

function showMessage(text, type) {
  const box = document.getElementById('messageBox');
  box.textContent = text;
  box.className = `message-box ${type}`;
}

function clearMessage() {
  const box = document.getElementById('messageBox');
  box.className = 'message-box hidden';
  box.textContent = '';
}

window.addEventListener('keydown', event => {
  if (!currentPuzzle || !screens.puzzle.classList.contains('active')) return;
  clearMessage();
  if (/^[a-zA-Z]$/.test(event.key)) inputLetter(event.key);
  else if (event.key === 'Backspace') handleBackspace();
  else if (event.key === ' ') { direction = direction === 'across' ? 'down' : 'across'; updateHighlights(); }
  else if (event.key.startsWith('Arrow')) moveByArrow(event.key);
});

mobileInput.addEventListener('input', event => {
  const value = event.target.value;
  if (value) inputLetter(value.slice(-1));
  event.target.value = '';
});

mobileInput.addEventListener('keydown', event => {
  if (event.key === 'Backspace') handleBackspace();
});

document.querySelectorAll('.theme-card').forEach(button => {
  button.addEventListener('click', () => loadPuzzle(button.dataset.theme));
});

document.getElementById('homeBtn').addEventListener('click', () => { stopTimer(); showScreen('home'); });
document.getElementById('checkBtn').addEventListener('click', checkPuzzle);
document.getElementById('revealLetterBtn').addEventListener('click', revealLetter);
document.getElementById('revealWordBtn').addEventListener('click', revealWord);
document.getElementById('resetBtn').addEventListener('click', resetPuzzle);
document.getElementById('playAgainBtn').addEventListener('click', () => showScreen('home'));
