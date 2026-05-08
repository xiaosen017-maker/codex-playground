const passages = [
  "The sunrise painted the quiet lake with gold, and every bird seemed to sing a different melody.",
  "Learning a new skill takes patience, but small daily practice can produce remarkable progress over time.",
  "A good conversation is like a bridge, built from curiosity, respect, and a willingness to truly listen.",
  "Technology changes quickly, yet clear thinking and kind teamwork remain timeless tools for solving problems.",
  "Even on a busy day, a short walk outside can refresh your mind and help you return with better focus."
];

const targetTextEl = document.getElementById("targetText");
const inputAreaEl = document.getElementById("inputArea");
const timeLeftEl = document.getElementById("timeLeft");
const accuracyEl = document.getElementById("accuracy");
const wpmEl = document.getElementById("wpm");
const restartBtn = document.getElementById("restartBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const resultEl = document.getElementById("result");
const finalAccuracyEl = document.getElementById("finalAccuracy");
const finalWpmEl = document.getElementById("finalWpm");
const correctCharsEl = document.getElementById("correctChars");

const TEST_DURATION = 60;
let timer = null;
let timeLeft = TEST_DURATION;
let startedAt = null;
let activePassage = "";
let finished = false;

function escapeHtml(char) {
  if (char === "&") return "&amp;";
  if (char === "<") return "&lt;";
  if (char === ">") return "&gt;";
  if (char === '"') return "&quot;";
  if (char === "'") return "&#39;";
  return char;
}

function pickRandomPassage() {
  const idx = Math.floor(Math.random() * passages.length);
  return passages[idx];
}

function renderTarget(userInput = "") {
  let html = "";
  for (let i = 0; i < activePassage.length; i += 1) {
    const expected = activePassage[i];
    const typed = userInput[i];

    if (typed == null) {
      const cls = i === userInput.length ? "current" : "";
      html += `<span class="${cls}">${escapeHtml(expected)}</span>`;
    } else if (typed === expected) {
      html += `<span class="correct">${escapeHtml(expected)}</span>`;
    } else {
      html += `<span class="wrong">${escapeHtml(expected)}</span>`;
    }
  }

  targetTextEl.innerHTML = html;
}

function calculateStats(userInput) {
  const typedLen = userInput.length;
  let correctCount = 0;

  for (let i = 0; i < typedLen; i += 1) {
    if (userInput[i] === activePassage[i]) {
      correctCount += 1;
    }
  }

  const accuracy = typedLen === 0 ? 100 : (correctCount / typedLen) * 100;
  const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const minutes = Math.max(elapsed / 60, 1 / 60);
  const wpm = Math.round((correctCount / 5) / minutes);

  return { accuracy, wpm, correctCount };
}

function updateStats() {
  const input = inputAreaEl.value;
  const { accuracy, wpm } = calculateStats(input);
  accuracyEl.textContent = `${accuracy.toFixed(2)}%`;
  wpmEl.textContent = String(wpm);
}

function endTest() {
  if (finished) return;
  finished = true;

  clearInterval(timer);
  inputAreaEl.disabled = true;

  const input = inputAreaEl.value;
  const { accuracy, wpm, correctCount } = calculateStats(input);

  finalAccuracyEl.textContent = `${accuracy.toFixed(2)}%`;
  finalWpmEl.textContent = String(wpm);
  correctCharsEl.textContent = String(correctCount);
  resultEl.classList.remove("hidden");
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft -= 1;
    timeLeftEl.textContent = `${timeLeft}s`;

    if (timeLeft <= 0) {
      timeLeft = 0;
      timeLeftEl.textContent = "0s";
      endTest();
    }
  }, 1000);
}

function resetTest() {
  clearInterval(timer);
  timeLeft = TEST_DURATION;
  startedAt = null;
  finished = false;
  activePassage = pickRandomPassage();

  inputAreaEl.value = "";
  inputAreaEl.disabled = false;
  timeLeftEl.textContent = `${TEST_DURATION}s`;
  accuracyEl.textContent = "100.00%";
  wpmEl.textContent = "0";
  resultEl.classList.add("hidden");

  renderTarget("");
  inputAreaEl.focus();
}

inputAreaEl.addEventListener("input", () => {
  if (finished) return;

  if (!startedAt) {
    startedAt = Date.now();
    startTimer();
  }

  const input = inputAreaEl.value;
  renderTarget(input);
  updateStats();

  if (input.length >= activePassage.length) {
    endTest();
  }
});

restartBtn.addEventListener("click", resetTest);
playAgainBtn.addEventListener("click", resetTest);

resetTest();
