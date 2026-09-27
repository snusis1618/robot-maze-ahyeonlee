"use strict";

/* ================================================================
   ESCAPE_100
   Programming class assignment: functions / if-else / for / while
   ----------------------------------------------------------------
   IMPORTANT:
   - The maze is stored with an Array/Set-like state structure.
   - Functions separate robot responsibilities.
   - if / else decides whether to move or turn.
   - while repeats the robot simulation until success/failure.
   - for loops build the board and audit all 100 × 4 start states.
   ================================================================ */

const GRID_SIZE = 10;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const MAX_ACTIONS = 100;

// Fixed maze chosen after exhaustively testing 100 cells × 4 directions.
// Cell numbers shown to the player are 1~100.
const WALL_CELLS = new Set([
  3, 11, 19, 26, 29, 42, 43, 45, 49,
  57, 66, 71, 74, 77, 79, 94, 99, 100
]);
const EXIT_CELL = 81;

// Direction data is stored as an OBJECT so direction changes can be handled clearly.
const DIRECTIONS = {
  N: { row: -1, col: 0, arrow: "↑", label: "NORTH" },
  E: { row: 0, col: 1, arrow: "→", label: "EAST" },
  S: { row: 1, col: 0, arrow: "↓", label: "SOUTH" },
  W: { row: 0, col: -1, arrow: "←", label: "WEST" }
};
const DIRECTION_ORDER = ["N", "E", "S", "W"];

// ------------------------- DOM references -------------------------
const introScreen = document.querySelector("#intro-screen");
const gameScreen = document.querySelector("#game-screen");
const startGameButton = document.querySelector("#start-game-btn");
const mazeGrid = document.querySelector("#maze-grid");
const cellNumberInput = document.querySelector("#cell-number-input");
const selectNumberButton = document.querySelector("#select-number-btn");
const selectionMessage = document.querySelector("#selection-message");
const directionButtons = [...document.querySelectorAll(".direction-key")];
const runButton = document.querySelector("#run-btn");
const resetButton = document.querySelector("#reset-btn");
const speedButtons = [...document.querySelectorAll(".speed-btn")];
const stepReadout = document.querySelector("#step-readout");
const roomReadout = document.querySelector("#room-readout");
const facingReadout = document.querySelector("#facing-readout");
const directionReadout = document.querySelector("#direction-readout");
const eventLog = document.querySelector("#event-log");
const auditReadout = document.querySelector("#audit-readout");
const statusDot = document.querySelector("#status-dot");
const statusText = document.querySelector("#status-text");
const resultOverlay = document.querySelector("#result-overlay");
const successCard = document.querySelector("#success-card");
const failureCard = document.querySelector("#failure-card");
const successSteps = document.querySelector("#success-steps");
const failureReason = document.querySelector("#failure-reason");
const resultCloseButtons = [...document.querySelectorAll(".result-close-btn")];

// --------------------------- App state ----------------------------
let selectedCell = null;
let selectedDirection = null;
let simulationRunning = false;
let speedMultiplier = 1;
let runId = 0; // Incrementing this lets RESET cancel a running async simulation safely.

// =================================================================
// 1) SMALL USER-DEFINED FUNCTIONS
//    Each function has one job. This makes the algorithm easy to explain.
// =================================================================

function cellToPosition(cellNumber) {
  const zeroBased = cellNumber - 1;
  return {
    row: Math.floor(zeroBased / GRID_SIZE),
    col: zeroBased % GRID_SIZE
  };
}

function positionToCell(row, col) {
  return row * GRID_SIZE + col + 1;
}

function isInsideMaze(row, col) {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

// isWall() uses IF / ELSE to decide whether a target position is blocked.
function isWall(row, col) {
  if (!isInsideMaze(row, col)) {
    return true; // The outside edge behaves like a wall.
  } else {
    const cellNumber = positionToCell(row, col);
    return WALL_CELLS.has(cellNumber);
  }
}

// turnRight() is a separate function so turning logic is not mixed with movement logic.
function turnRight(direction) {
  const currentIndex = DIRECTION_ORDER.indexOf(direction);
  const nextIndex = (currentIndex + 1) % DIRECTION_ORDER.length;
  return DIRECTION_ORDER[nextIndex];
}

function getForwardPosition(cellNumber, direction) {
  const current = cellToPosition(cellNumber);
  const delta = DIRECTIONS[direction];
  return {
    row: current.row + delta.row,
    col: current.col + delta.col
  };
}

function canMoveForward(cellNumber, direction) {
  const next = getForwardPosition(cellNumber, direction);
  return !isWall(next.row, next.col);
}

// moveRobot() only moves one cell. It does not decide WHETHER it should move.
function moveRobot(robot) {
  const next = getForwardPosition(robot.cell, robot.direction);
  robot.cell = positionToCell(next.row, next.col);
  return robot;
}

function stateKey(robot) {
  return `${robot.cell}-${robot.direction}`;
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function currentDelay(kind = "move") {
  const base = kind === "turn" ? 620 : 430;
  return base / speedMultiplier;
}

function formatStep(step) {
  return String(step).padStart(3, "0");
}

// =================================================================
// 2) BOARD CREATION — FOR LOOP
//    A for loop is ideal because we know exactly how many cells (100) exist.
// =================================================================

function createMazeGrid() {
  mazeGrid.innerHTML = "";

  for (let cellNumber = 1; cellNumber <= TOTAL_CELLS; cellNumber += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "maze-cell";
    cell.dataset.cell = cellNumber;
    cell.setAttribute("role", "gridcell");

    const number = document.createElement("span");
    number.className = "cell-number";
    number.textContent = cellNumber;
    cell.appendChild(number);

    if (WALL_CELLS.has(cellNumber)) {
      cell.classList.add("maze-cell--wall");
      cell.disabled = true;
      cell.setAttribute("aria-label", `Room ${cellNumber}, wall`);
    } else {
      cell.addEventListener("click", () => selectStartCell(cellNumber));
      cell.setAttribute("aria-label", `Room ${cellNumber}`);
    }

    if (cellNumber === EXIT_CELL) {
      cell.classList.add("maze-cell--exit");
      const exit = document.createElement("span");
      exit.className = "exit-label";
      exit.textContent = "EXIT";
      cell.appendChild(exit);
    }

    mazeGrid.appendChild(cell);
  }
}

function getCellElement(cellNumber) {
  return mazeGrid.querySelector(`[data-cell="${cellNumber}"]`);
}

// =================================================================
// 3) INPUT HANDLING — IF / ELSE
// =================================================================

function selectStartCell(cellNumber) {
  if (simulationRunning) return;

  if (!Number.isInteger(cellNumber) || cellNumber < 1 || cellNumber > 100) {
    showSelectionMessage("ENTER A NUMBER FROM 1 TO 100", true);
    return;
  } else if (WALL_CELLS.has(cellNumber)) {
    showSelectionMessage(`ROOM ${cellNumber} IS A WALL`, true);
    return;
  } else {
    selectedCell = cellNumber;
  }

  document.querySelectorAll(".maze-cell--selected").forEach(el => {
    el.classList.remove("maze-cell--selected");
  });

  const cell = getCellElement(selectedCell);
  if (cell) cell.classList.add("maze-cell--selected");

  cellNumberInput.value = selectedCell;
  showSelectionMessage(`ROOM ${selectedCell} SELECTED`, false);
  updateRunButton();
}

function selectDirection(direction) {
  if (simulationRunning || !DIRECTIONS[direction]) return;

  selectedDirection = direction;

  directionButtons.forEach(button => {
    button.classList.toggle(
      "direction-key--selected",
      button.dataset.direction === selectedDirection
    );
  });

  directionReadout.textContent = `DIRECTION: ${DIRECTIONS[selectedDirection].label} ${DIRECTIONS[selectedDirection].arrow}`;
  updateRunButton();
}

function updateRunButton() {
  // The run button is enabled only when BOTH required inputs exist.
  if (selectedCell !== null && selectedDirection !== null && !simulationRunning) {
    runButton.disabled = false;
  } else {
    runButton.disabled = true;
  }
}

function showSelectionMessage(message, isError) {
  selectionMessage.textContent = message;
  selectionMessage.classList.toggle("inline-message--error", isError);
}

// =================================================================
// 4) ANIMATED SIMULATION — WHILE LOOP + IF / ELSE
//    The while loop keeps repeating actions until one stopping condition is met.
// =================================================================

async function simulateRobot() {
  if (selectedCell === null || selectedDirection === null || simulationRunning) return;

  simulationRunning = true;
  updateRunButton();
  const thisRun = ++runId;

  const robot = {
    cell: selectedCell,
    direction: selectedDirection,
    actions: 0
  };

  const visitedStates = new Set();
  clearSimulationVisuals();
  setSystemStatus("RUNNING", "running");
  renderRobot(robot);
  logEvent(`START // ROOM ${robot.cell} // ${DIRECTIONS[robot.direction].label}`);

  // WHILE: repeat until success, loop, cancellation, or 100 actions.
  while (robot.actions < MAX_ACTIONS) {
    if (thisRun !== runId) return; // RESET cancelled this run.

    if (robot.cell === EXIT_CELL) {
      finishSuccess(robot.actions);
      return;
    }

    const key = stateKey(robot);

    if (visitedStates.has(key)) {
      finishFailure("LOOP DETECTED.", robot.actions);
      return;
    } else {
      visitedStates.add(key);
    }

    // IF / ELSE is the robot's core decision:
    // IF the front is open -> move. ELSE -> turn right.
    if (canMoveForward(robot.cell, robot.direction)) {
      const previousCell = robot.cell;
      robot.actions += 1;
      moveRobot(robot);
      markTrail(previousCell, robot.cell, robot.actions);
      renderRobot(robot);
      logEvent(`MOVE → ROOM ${robot.cell}`);
      await sleep(currentDelay("move"));
    } else {
      robot.actions += 1;
      flashCurrentCell(robot.cell);
      logEvent(`WALL AHEAD // TURN RIGHT`);
      await sleep(currentDelay("turn") * 0.55);
      robot.direction = turnRight(robot.direction);
      renderRobot(robot);
      await sleep(currentDelay("turn") * 0.45);
    }
  }

  // If the while loop ends naturally, the 100-action limit was reached.
  if (robot.cell === EXIT_CELL) {
    finishSuccess(robot.actions);
  } else {
    finishFailure("100 STEPS EXHAUSTED.", robot.actions);
  }
}

// =================================================================
// 5) FAST SIMULATION + 400-STATE AUDIT — FOR LOOP
//    This version has no animation, so it can test every possible start quickly.
// =================================================================

function simulateRobotFast(startCell, startDirection) {
  if (WALL_CELLS.has(startCell)) {
    return { playable: false, success: false, reason: "WALL", actions: 0 };
  }

  const robot = { cell: startCell, direction: startDirection, actions: 0 };
  const visitedStates = new Set();

  while (robot.actions < MAX_ACTIONS) {
    if (robot.cell === EXIT_CELL) {
      return { playable: true, success: true, reason: "EXIT", actions: robot.actions };
    }

    const key = stateKey(robot);
    if (visitedStates.has(key)) {
      return { playable: true, success: false, reason: "LOOP", actions: robot.actions };
    }
    visitedStates.add(key);

    if (canMoveForward(robot.cell, robot.direction)) {
      robot.actions += 1;
      moveRobot(robot);
    } else {
      robot.actions += 1;
      robot.direction = turnRight(robot.direction);
    }
  }

  return {
    playable: true,
    success: robot.cell === EXIT_CELL,
    reason: robot.cell === EXIT_CELL ? "EXIT" : "LIMIT",
    actions: robot.actions
  };
}

function analyzeAllStartStates() {
  let theoreticalStates = 0;
  let blockedStates = 0;
  let playableStates = 0;
  let successStates = 0;
  let failureStates = 0;
  let mixedRooms = 0;

  // OUTER FOR: visit each of the 100 rooms.
  for (let cell = 1; cell <= TOTAL_CELLS; cell += 1) {
    let roomSuccesses = 0;
    let roomFailures = 0;

    // INNER FOR: test N, E, S, W from that same room.
    for (let d = 0; d < DIRECTION_ORDER.length; d += 1) {
      theoreticalStates += 1;
      const result = simulateRobotFast(cell, DIRECTION_ORDER[d]);

      if (!result.playable) {
        blockedStates += 1;
      } else {
        playableStates += 1;

        if (result.success) {
          successStates += 1;
          roomSuccesses += 1;
        } else {
          failureStates += 1;
          roomFailures += 1;
        }
      }
    }

    if (roomSuccesses > 0 && roomFailures > 0) {
      mixedRooms += 1;
    }
  }

  return {
    theoreticalStates,
    blockedStates,
    playableStates,
    successStates,
    failureStates,
    mixedRooms
  };
}

function showMazeAudit() {
  const audit = analyzeAllStartStates();
  auditReadout.textContent =
    `${audit.theoreticalStates} TOTAL = ${audit.blockedStates} WALL + ${audit.playableStates} PLAYABLE // ` +
    `${audit.successStates} SUCCESS / ${audit.failureStates} FAIL // ${audit.mixedRooms} MIXED ROOMS`;
}

// =================================================================
// 6) RENDERING / UI HELPER FUNCTIONS
// =================================================================

function clearRobotTokens() {
  document.querySelectorAll(".robot-token, .robot-direction").forEach(el => el.remove());
  document.querySelectorAll(".maze-cell--current").forEach(el => el.classList.remove("maze-cell--current"));
}

function renderRobot(robot) {
  clearRobotTokens();

  const cell = getCellElement(robot.cell);
  if (!cell) return;

  cell.classList.add("maze-cell--current");

  const robotToken = document.createElement("span");
  robotToken.className = "robot-token";
  robotToken.textContent = "";
  robotToken.setAttribute("aria-label", "robot");

  const directionToken = document.createElement("span");
  directionToken.className = "robot-direction";
  directionToken.textContent = DIRECTIONS[robot.direction].arrow;

  cell.append(robotToken, directionToken);

  stepReadout.textContent = `${formatStep(robot.actions)} / 100`;
  roomReadout.textContent = String(robot.cell).padStart(2, "0");
  facingReadout.textContent = `${robot.direction} ${DIRECTIONS[robot.direction].arrow}`;
}

// Leave a subtle trail between consecutive rooms.
// data-trail-age lets CSS make older footprints slightly fainter.
function markTrail(fromCell, toCell, stepNumber) {
  const from = getCellElement(fromCell);
  const to = getCellElement(toCell);
  if (!from || !to) return;

  from.classList.add("maze-cell--visited");
  to.classList.add("maze-cell--visited");
  from.dataset.trailAge = stepNumber;
  to.dataset.trailAge = stepNumber;

  const diff = toCell - fromCell;
  if (diff === 1) {
    from.classList.add("trail-right");
    to.classList.add("trail-left");
  } else if (diff === -1) {
    from.classList.add("trail-left");
    to.classList.add("trail-right");
  } else if (diff === 10) {
    from.classList.add("trail-down");
    to.classList.add("trail-up");
  } else if (diff === -10) {
    from.classList.add("trail-up");
    to.classList.add("trail-down");
  }
}

function flashCurrentCell(cellNumber) {
  const cell = getCellElement(cellNumber);
  if (!cell) return;
  cell.classList.remove("maze-cell--turning");
  void cell.offsetWidth;
  cell.classList.add("maze-cell--turning");
}

function clearSimulationVisuals() {
  document.querySelectorAll(".maze-cell--visited, .maze-cell--current, .maze-cell--turning, .trail-up, .trail-down, .trail-left, .trail-right").forEach(el => {
    el.classList.remove("maze-cell--visited", "maze-cell--current", "maze-cell--turning", "trail-up", "trail-down", "trail-left", "trail-right");
    delete el.dataset.trailAge;
  });
  clearRobotTokens();
  stepReadout.textContent = "000 / 100";
  roomReadout.textContent = "--";
  facingReadout.textContent = "--";
  eventLog.textContent = "SIMULATION INITIALIZED...";
}

function logEvent(message) {
  eventLog.textContent = `> ${message}`;
}

function setSystemStatus(label, state = "") {
  statusText.textContent = label;
  statusDot.className = "status-dot";
  if (state) statusDot.classList.add(`status-dot--${state}`);
}

function finishSuccess(actions) {
  simulationRunning = false;
  updateRunButton();
  setSystemStatus("ESCAPED", "success");
  logEvent(`EXIT REACHED // ${actions} ACTIONS`);
  successSteps.textContent = `ESCAPED IN ${actions} STEPS`;
  openResultOverlay("success");
}

function finishFailure(reason, actions) {
  simulationRunning = false;
  updateRunButton();
  setSystemStatus("FAILED", "failure");
  logEvent(`${reason} // ${actions} ACTIONS`);
  failureReason.textContent = reason === "LOOP DETECTED."
    ? `LOOP DETECTED AFTER ${actions} STEPS.`
    : "100 STEPS EXHAUSTED.";
  openResultOverlay("failure");
}

function openResultOverlay(type) {
  successCard.hidden = type !== "success";
  failureCard.hidden = type !== "failure";
  resultOverlay.classList.add("result-overlay--visible");
  resultOverlay.setAttribute("aria-hidden", "false");
}

function closeResultOverlay() {
  resultOverlay.classList.remove("result-overlay--visible");
  resultOverlay.setAttribute("aria-hidden", "true");
  successCard.hidden = true;
  failureCard.hidden = true;
  resetForNewAttempt();
}

function resetForNewAttempt() {
  runId += 1;
  simulationRunning = false;
  selectedCell = null;
  selectedDirection = null;
  cellNumberInput.value = "";
  showSelectionMessage("NO ROOM SELECTED", false);
  directionReadout.textContent = "DIRECTION: --";
  directionButtons.forEach(button => button.classList.remove("direction-key--selected"));
  document.querySelectorAll(".maze-cell--selected").forEach(el => el.classList.remove("maze-cell--selected"));
  clearSimulationVisuals();
  setSystemStatus("READY");
  updateRunButton();
}

// =================================================================
// 7) EVENTS
// =================================================================

startGameButton.addEventListener("click", () => {
  introScreen.classList.remove("screen--active");
  gameScreen.classList.add("screen--active");
  cellNumberInput.focus();
});

selectNumberButton.addEventListener("click", () => {
  selectStartCell(Number(cellNumberInput.value));
});

cellNumberInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    selectStartCell(Number(cellNumberInput.value));
  }
});

directionButtons.forEach(button => {
  button.addEventListener("click", () => selectDirection(button.dataset.direction));
});

// Real keyboard arrow keys also choose the robot's starting direction.
document.addEventListener("keydown", event => {
  if (!gameScreen.classList.contains("screen--active") || simulationRunning) return;

  const keyToDirection = {
    ArrowUp: "N",
    ArrowRight: "E",
    ArrowDown: "S",
    ArrowLeft: "W"
  };

  if (keyToDirection[event.key]) {
    event.preventDefault();
    selectDirection(keyToDirection[event.key]);
  }
});

runButton.addEventListener("click", simulateRobot);
resetButton.addEventListener("click", resetForNewAttempt);

speedButtons.forEach(button => {
  button.addEventListener("click", () => {
    speedMultiplier = Number(button.dataset.speed);
    speedButtons.forEach(item => item.classList.toggle("speed-btn--active", item === button));
  });
});

resultCloseButtons.forEach(button => {
  button.addEventListener("click", closeResultOverlay);
});

// =================================================================
// 8) STARTUP
// =================================================================

createMazeGrid();
showMazeAudit();
updateRunButton();
