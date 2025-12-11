// ----------------- CONSTANTS -----------------

const NUM_PITS_PER_PLAYER = 9;
const TOTAL_PITS = NUM_PITS_PER_PLAYER * 2; // 18
const INITIAL_STONES = 9;
const TARGET_SCORE = 82;
const SOW_DELAY = 200; // ms per stone for animation

// ----------------- STATE -----------------

let pits = new Array(TOTAL_PITS).fill(INITIAL_STONES);
let storeA = 0; // Player A (bottom)
let storeB = 0; // Player B (top)

// A's tuz is on B side (indices 9..17)
// B's tuz is on A side (indices 0..8)
let tuzA = -1; // A's tuz (index in pits)
let tuzB = -1; // B's tuz (index in pits)

let currentPlayer = 'A';
let isAnimating = false;
let isGameOver = false;
let soundEnabled = true;
let aiEnabled = true; // ALWAYS vs computer now

let moveHistory = [];
let moveCounter = 0;

// DOM references
const rowTop = document.getElementById('row-top');
const rowBottom = document.getElementById('row-bottom');

const storeAStonesEl = document.getElementById('storeAStones');
const storeBStonesEl = document.getElementById('storeBStones');
const storeACountEl = document.getElementById('storeACount');
const storeBCountEl = document.getElementById('storeBCount');

const scoreAEl = document.getElementById('scoreA');
const scoreBEl = document.getElementById('scoreB');

const statusEl = document.getElementById('status');
const aiBtn = document.getElementById('aiBtn');
const settingsBtn = document.getElementById('settingsBtn');

const historyListEl = document.getElementById('historyList');

const splashEl = document.getElementById('splash');
const splashStartBtn = document.getElementById('splashStartBtn');

const settingsOverlayEl = document.getElementById('settingsOverlay');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const soundToggleEl = document.getElementById('soundToggle');

// pit DOM caches
const pitEls = new Array(TOTAL_PITS);
const pitStoneContainers = new Array(TOTAL_PITS);
const pitCountEls = new Array(TOTAL_PITS);
const pitNumberEls = new Array(TOTAL_PITS);

// simple WebAudio beeps
let audioCtx = null;
function ensureAudioCtx() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
    }
}

function playBeep(freq = 800, duration = 0.05, volume = 0.04) {
    if (!soundEnabled) return;
    ensureAudioCtx();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playSowSound() {
    playBeep(900, 0.04, 0.03);
}

function playCaptureSound() {
    playBeep(400, 0.09, 0.05);
}

// ----------------- UTILS -----------------

function ownerOfPit(index) {
    return index < NUM_PITS_PER_PLAYER ? 'A' : 'B';
}

// Bottom row = 1..9 left to right.
// Top row   = 9..1 left to right (real board style).
function pitNumberForIndex(index) {
    if (index < NUM_PITS_PER_PLAYER) {
        // Bottom row (Player A): 1..9 left → right
        return index + 1;
    } else {
        // Top row (Player B): 1..9 right → left
        // indices 9..17 -> pits 1..9
        return index - NUM_PITS_PER_PLAYER + 1;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setStatus(text) {
    statusEl.textContent = text;
}

// ----------------- TUZ HELPERS -----------------

function isOpponentsPit(player, index) {
    return ownerOfPit(index) !== player;
}

// Check if this pit is the opponent's tuz
function isOpponentTuz(player, index) {
    if (player === 'A') return index === tuzB;
    return index === tuzA;
}

// Is this index the opponent's 9th pit?
function isOpponentNinthPit(opponent, index) {
    if (opponent === 'A') {
        return index === NUM_PITS_PER_PLAYER - 1; // A's 9th pit -> index 8
    }
    return index === TOTAL_PITS - 1; // B's 9th pit -> index 17
}

// Check if we are trying to make a tuz opposite to the opponent's tuz
function isOppositeToOpponentTuz(player, index) {
    // For player A, candidate tuz is on B side (9..17).
    // Opponent B's tuz (tuzB) is on A side (0..8).
    // Opposite pits: A:i <-> B:9+i
    if (player === 'A' && tuzB !== -1) {
        const opposite = tuzB + NUM_PITS_PER_PLAYER;
        return index === opposite;
    }

    // For player B, candidate tuz is on A side (0..8).
    // Opponent A's tuz (tuzA) is on B side (9..17).
    // Opposite pits: A:i <-> B:9+i
    if (player === 'B' && tuzA !== -1) {
        const opposite = tuzA - NUM_PITS_PER_PLAYER;
        return index === opposite;
    }

    return false;
}

function playerHasTuz(player) {
    return player === 'A' ? tuzA !== -1 : tuzB !== -1;
}

function giveToKazan(player, stones) {
    if (player === 'A') storeA += stones;
    else storeB += stones;
}

// ----------------- BOARD CREATION -----------------

function createPitElement(index, owner) {
    const pit = document.createElement('div');
    pit.classList.add('pit');
    pit.dataset.index = index;

    if (owner === 'A') {
        pit.classList.add('pit-bottom');
    } else {
        pit.classList.add('pit-top');
    }

    const stonesContainer = document.createElement('div');
    stonesContainer.classList.add('stones-container');

    const countSpan = document.createElement('div');
    countSpan.classList.add('stone-count');

    const numSpan = document.createElement('div');
    numSpan.classList.add('pit-number');
    numSpan.textContent = pitNumberForIndex(index);

    pit.appendChild(stonesContainer);
    pit.appendChild(countSpan);
    pit.appendChild(numSpan);

    pit.addEventListener('click', () => {
        handlePitClick(index);
    });

    pitEls[index] = pit;
    pitStoneContainers[index] = stonesContainer;
    pitCountEls[index] = countSpan;
    pitNumberEls[index] = numSpan;

    return pit;
}

function buildBoard() {
    // Top row: Player B pits (indices 9..17) – shown RIGHT → LEFT
    rowTop.innerHTML = '';
    for (let i = NUM_PITS_PER_PLAYER - 1; i >= 0; i--) {
        const index = NUM_PITS_PER_PLAYER + i;  // 17,16,...,9
        const pit = createPitElement(index, 'B');
        rowTop.appendChild(pit);
    }

    // Bottom row: Player A pits (indices 0..8) – shown LEFT → RIGHT
    rowBottom.innerHTML = '';
    for (let i = 0; i < NUM_PITS_PER_PLAYER; i++) {
        const index = i;  // 0..8
        const pit = createPitElement(index, 'A');
        rowBottom.appendChild(pit);
    }
}

// ----------------- RENDERING -----------------

function renderPits() {
    for (let i = 0; i < TOTAL_PITS; i++) {
        const stones = pits[i];
        const container = pitStoneContainers[i];
        const countEl = pitCountEls[i];
        const pitEl = pitEls[i];

        // Stones (cap visual at, say, 40)
        const maxVisual = Math.min(stones, 40);
        container.innerHTML = '';
        for (let s = 0; s < maxVisual; s++) {
            const stone = document.createElement('div');
            stone.classList.add('stone');
            container.appendChild(stone);
        }

        countEl.textContent = stones;

        pitEl.classList.toggle('tuz', i === tuzA || i === tuzB);
        pitEl.classList.remove('sowing');
    }
}

function renderStores() {
    storeAStonesEl.innerHTML = '';
    storeBStonesEl.innerHTML = '';

    // small stones visually (also capped)
    const maxVisualA = Math.min(storeA, 80);
    const maxVisualB = Math.min(storeB, 80);

    for (let i = 0; i < maxVisualA; i++) {
        const stone = document.createElement('div');
        stone.classList.add('stone');
        storeAStonesEl.appendChild(stone);
    }

    for (let i = 0; i < maxVisualB; i++) {
        const stone = document.createElement('div');
        stone.classList.add('stone');
        storeBStonesEl.appendChild(stone);
    }

    storeACountEl.textContent = storeA;
    storeBCountEl.textContent = storeB;

    scoreAEl.textContent = `Player A : ${storeA}`;
    scoreBEl.textContent = `Player B : ${storeB}`;
}

function renderHistory() {
    historyListEl.innerHTML = '';
    for (const entry of moveHistory) {
        const div = document.createElement('div');
        div.classList.add('history-entry');
        div.textContent =
            `${entry.num}. Player ${entry.player} – pit ${entry.pit} ` +
            `(stones ${entry.stonesMoved} → moved ${entry.steps}, ` +
            `last: ${entry.lastPit}, captured ${entry.captured}, ` +
            `A:${entry.storeA}, B:${entry.storeB})`;
        historyListEl.appendChild(div);
    }
    historyListEl.scrollTop = historyListEl.scrollHeight;
}

function renderAll() {
    renderPits();
    renderStores();
    renderHistory();
}

// ----------------- GAME LOGIC -----------------

function resetGame() {
    pits = new Array(TOTAL_PITS).fill(INITIAL_STONES);
    storeA = 0;
    storeB = 0;
    tuzA = -1;
    tuzB = -1;
    currentPlayer = 'A';
    isAnimating = false;
    isGameOver = false;
    moveHistory = [];
    moveCounter = 0;

    setStatus('Player A vs Computer – Player A starts');
    renderAll();
}

function handlePitClick(index) {
    if (isGameOver || isAnimating) return;

    // Human is always Player A (bottom row)
    if (currentPlayer !== 'A') return;

    // Must be A's pit and non-empty
    if (ownerOfPit(index) !== 'A') return;
    if (pits[index] === 0) return;

    performMove(index, 'A', true);
}

async function performMove(startIndex, player, addToHistory) {
    if (isGameOver || isAnimating) return;

    isAnimating = true;

    let stones = pits[startIndex];
    if (stones === 0) {
        isAnimating = false;
        return;
    }

    let leavingOne = stones > 1;
    let stonesToSow = leavingOne ? stones - 1 : stones;

    pits[startIndex] = leavingOne ? 1 : 0;
    renderPits();

    let pos = startIndex;
    let steps = 0;
    let captured = 0;

    while (stonesToSow > 0) {
        pos = (pos + 1) % TOTAL_PITS;

        // If landing in any tuz, stone goes directly to that owner's kazan
        if (pos === tuzA) {
            storeA++;
            playSowSound();
        } else if (pos === tuzB) {
            storeB++;
            playSowSound();
        } else {
            pits[pos]++;
            playSowSound();
        }

        // sowing visual highlight
        pitEls[pos].classList.add('sowing');
        renderPits();
        renderStores();
        await delay(SOW_DELAY);
        pitEls[pos].classList.remove('sowing');

        stonesToSow--;
        steps++;
    }

    const lastPit = pos;

    // capture / tuz rules only if lastPit belongs to opponent and is not opponent's tuz
    if (!isGameOver && isOpponentsPit(player, lastPit) && !isOpponentTuz(player, lastPit)) {
        const opponent = player === 'A' ? 'B' : 'A';
        const stonesInLast = pits[lastPit];

        if (stonesInLast > 0) {
            const canMakeTuz =
                !playerHasTuz(player) &&
                stonesInLast === 3 &&
                !isOpponentNinthPit(opponent, lastPit) &&
                !isOppositeToOpponentTuz(player, lastPit);

            if (canMakeTuz) {
                // create tuz: move stones to player's kazan and clear pit
                if (player === 'A') tuzA = lastPit;
                else tuzB = lastPit;

                giveToKazan(player, stonesInLast);
                captured += stonesInLast;
                pits[lastPit] = 0;
                playCaptureSound();
            } else if (stonesInLast % 2 === 0) {
                // normal even capture (not a tuz)
                giveToKazan(player, stonesInLast);
                captured += stonesInLast;
                pits[lastPit] = 0;
                playCaptureSound();
            }
        }
    }

    renderAll();

    // log move
    if (addToHistory) {
        moveCounter++;
        moveHistory.push({
            num: moveCounter,
            player,
            pit: pitNumberForIndex(startIndex),
            stonesMoved: stones,
            steps,
            lastPit: `${ownerOfPit(lastPit)}${pitNumberForIndex(lastPit)}`,
            captured,
            storeA,
            storeB
        });
        renderHistory();
    }

    // check end of game
    if (storeA >= TARGET_SCORE || storeB >= TARGET_SCORE || boardEmpty()) {
        finalizeGame();
        isAnimating = false;
        return;
    }

    // next player
    currentPlayer = player === 'A' ? 'B' : 'A';
    setStatus(
        currentPlayer === 'A'
            ? "Player A's turn"
            : "Computer's turn"
    );
    isAnimating = false;

    // trigger AI if needed
    if (!isGameOver && currentPlayer === 'B' && aiEnabled) {
        setTimeout(aiMove, 500);
    }
}

function boardEmpty() {
    let sumA = 0, sumB = 0;
    for (let i = 0; i < TOTAL_PITS; i++) {
        if (ownerOfPit(i) === 'A') sumA += pits[i];
        else sumB += pits[i];
    }
    return sumA === 0 || sumB === 0;
}

function finalizeGame() {
    // collect remaining stones
    for (let i = 0; i < TOTAL_PITS; i++) {
        const owner = ownerOfPit(i);
        if (pits[i] > 0) {
            if (owner === 'A') storeA += pits[i];
            else storeB += pits[i];
            pits[i] = 0;
        }
    }

    renderAll();

    isGameOver = true;
    let message;
    if (storeA > storeB) {
        message = `Game over! Player A wins (${storeA} : ${storeB})`;
    } else if (storeB > storeA) {
        message = `Game over! Computer wins (${storeB} : ${storeA})`;
    } else {
        message = `Game over! Draw (${storeA} : ${storeB})`;
    }
    setStatus(message);
}

// ----------------- AI -----------------

function aiMove() {
    if (isGameOver || isAnimating || currentPlayer !== 'B') return;

    // choose pit that gives max immediate capture
    let bestIndex = -1;
    let bestCapture = -1;

    for (let col = 0; col < NUM_PITS_PER_PLAYER; col++) {
        const index = NUM_PITS_PER_PLAYER + col; // B pits 9..17
        if (pits[index] === 0) continue;

        const captured = simulateCapture(index, 'B');
        if (captured > bestCapture) {
            bestCapture = captured;
            bestIndex = index;
        }
    }

    // fallback: first non-empty pit
    if (bestIndex === -1) {
        for (let col = 0; col < NUM_PITS_PER_PLAYER; col++) {
            const index = NUM_PITS_PER_PLAYER + col;
            if (pits[index] > 0) {
                bestIndex = index;
                break;
            }
        }
    }

    if (bestIndex !== -1) {
        performMove(bestIndex, 'B', true);
    }
}

// simulate only capture from a move (no animation)
function simulateCapture(startIndex, player) {
    const pitsCopy = pits.slice();
    let tuzACopy = tuzA;
    let tuzBCopy = tuzB;

    let stones = pitsCopy[startIndex];
    if (stones === 0) return -1;

    let leavingOne = stones > 1;
    let stonesToSow = leavingOne ? stones - 1 : stones;
    pitsCopy[startIndex] = leavingOne ? 1 : 0;

    let pos = startIndex;

    while (stonesToSow > 0) {
        pos = (pos + 1) % TOTAL_PITS;

        // In a real game stones landing on either tuz go to its owner's kazan.
        // For the AI we just don't put them into pitsCopy.
        if (pos === tuzACopy || pos === tuzBCopy) {
            // do nothing (stone goes to kazan in real game)
        } else {
            pitsCopy[pos]++;
        }

        stonesToSow--;
    }

    const lastPit = pos;
    let captured = 0;

    const opponent = player === 'A' ? 'B' : 'A';
    const isOppPit = ownerOfPit(lastPit) === opponent;

    // we don't capture from any tuz
    const isTuzPit = (lastPit === tuzACopy) || (lastPit === tuzBCopy);

    if (isOppPit && !isTuzPit) {
        const stonesInLast = pitsCopy[lastPit];

        if (stonesInLast > 0) {
            const playerHasTuzCopy = player === 'A' ? tuzACopy !== -1 : tuzBCopy !== -1;

            const isNinthPitCopy = isOpponentNinthPit(opponent, lastPit);

            const isOppositeToTuzCopy =
                (player === 'A' && tuzBCopy !== -1 && lastPit === tuzBCopy + NUM_PITS_PER_PLAYER) ||
                (player === 'B' && tuzACopy !== -1 && lastPit === tuzACopy - NUM_PITS_PER_PLAYER);

            const canMakeTuzCopy =
                !playerHasTuzCopy &&
                stonesInLast === 3 &&
                !isNinthPitCopy &&
                !isOppositeToTuzCopy;

            if (canMakeTuzCopy) {
                // Tuz creation is worth those 3 stones
                captured = stonesInLast;
            } else if (stonesInLast % 2 === 0) {
                captured = stonesInLast;
            }
        }
    }

    return captured;
}

// ----------------- SETTINGS + SPLASH -----------------

function initSettings() {
    // load sound preference
    const saved = localStorage.getItem('toguz_sound');
    if (saved !== null) {
        soundEnabled = saved === '1';
    }
    soundToggleEl.checked = soundEnabled;

    soundToggleEl.addEventListener('change', () => {
        soundEnabled = soundToggleEl.checked;
        localStorage.setItem('toguz_sound', soundEnabled ? '1' : '0');
        playBeep(700, 0.03, 0.04);
    });

    settingsBtn.addEventListener('click', () => {
        settingsOverlayEl.classList.remove('hidden');
    });

    settingsCloseBtn.addEventListener('click', () => {
        settingsOverlayEl.classList.add('hidden');
    });
}

function initSplash() {
    splashStartBtn.addEventListener('click', () => {
        splashEl.style.opacity = '0';
        setTimeout(() => {
            splashEl.style.display = 'none';
        }, 400);
        resetGame();
    });
}

// new game button always AI
aiBtn.addEventListener('click', () => {
    aiEnabled = true;
    resetGame();
});

// ----------------- INIT -----------------

document.addEventListener('DOMContentLoaded', () => {
    buildBoard();
    initSettings();
    initSplash();

    // Do not start game until splash is closed
    setStatus('Click "Start Game" to begin');
});
