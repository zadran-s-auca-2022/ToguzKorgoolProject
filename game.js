// game.js

document.addEventListener("DOMContentLoaded", () => {
    const PITS_PER_SIDE = 9;
    const START_STONES = 9;

    let pitsA = new Array(PITS_PER_SIDE).fill(START_STONES);
    let pitsB = new Array(PITS_PER_SIDE).fill(START_STONES);
    let storeA = 0;
    let storeB = 0;
    let currentPlayer = "A";
    let gameOver = false;
    let isAnimating = false;
    let moveHistory = [];
    let vsComputer = false; // if true, Player B is AI

    const rowTop = document.getElementById("row-top");
    const rowBottom = document.getElementById("row-bottom");
    const scoreAEl = document.getElementById("scoreA");
    const scoreBEl = document.getElementById("scoreB");
    const storeAEl = document.getElementById("storeA");
    const storeBEl = document.getElementById("storeB");
    const statusEl = document.getElementById("status");
    const resetBtn = document.getElementById("resetBtn");
    const aiBtn = document.getElementById("aiBtn");
    const historyListEl = document.getElementById("historyList");

    // ---------- BOARD SETUP ----------

    function createPitElement(player, idx) {
        const pit = document.createElement("div");
        pit.className = "pit " + (player === "A" ? "pit-bottom" : "pit-top");
        pit.dataset.player = player;
        pit.dataset.index = idx;

        const stonesContainer = document.createElement("div");
        stonesContainer.className = "stones-container";
        pit.appendChild(stonesContainer);

        const countLabel = document.createElement("div");
        countLabel.className = "stone-count";
        pit.appendChild(countLabel);

        return pit;
    }

    function createBoardDOM() {
        rowTop.innerHTML = "";
        for (let i = PITS_PER_SIDE - 1; i >= 0; i--) {
            rowTop.appendChild(createPitElement("B", i));
        }

        rowBottom.innerHTML = "";
        for (let i = 0; i < PITS_PER_SIDE; i++) {
            rowBottom.appendChild(createPitElement("A", i));
        }

        rowTop.addEventListener("click", onPitClick);
        rowBottom.addEventListener("click", onPitClick);

        updateView();
    }

    // ---------- RENDER HELPERS ----------

    function setStatus(msg) {
        statusEl.textContent = msg;
    }

    function renderStones(container, count, isStore) {
        container.innerHTML = "";

        let maxBalls;
        if (isStore) {
            // cap only in kazans visually – 82 is enough
            maxBalls = Math.min(count, 82);
        } else {
            // in pits show ALL stones
            maxBalls = count;
        }

        for (let i = 0; i < maxBalls; i++) {
            const stone = document.createElement("div");
            stone.className = "stone";
            container.appendChild(stone);
        }
    }

    function renderPit(pit, stones, isActive) {
        const container = pit.querySelector(".stones-container");
        const label = pit.querySelector(".stone-count");

        pit.classList.toggle("active-player", isActive);
        renderStones(container, stones, false);
        label.textContent = stones;
    }

    function renderStore(storeEl, count, labelHtml) {
        const labelEl = storeEl.querySelector(".store-label");
        const stonesContainer = storeEl.querySelector(".store-stones");
        const countEl = storeEl.querySelector(".store-count");

        if (labelHtml) labelEl.innerHTML = labelHtml;
        renderStones(stonesContainer, count, true);
        countEl.textContent = count;
    }

    function updateView() {
        document.querySelectorAll(".pit").forEach(pit => {
            const player = pit.dataset.player;
            const idx = parseInt(pit.dataset.index, 10);
            const stones = player === "A" ? pitsA[idx] : pitsB[idx];
            const isActive = player === currentPlayer;
            renderPit(pit, stones, isActive);
        });

        renderStore(storeAEl, storeA, "A<br>Kazan");
        renderStore(storeBEl, storeB, "B<br>Kazan");

        scoreAEl.textContent = `Player A : ${storeA}`;
        scoreBEl.textContent = `Player B : ${storeB}`;

        if (!gameOver) {
            if (vsComputer) {
                setStatus(`Player ${currentPlayer === "A" ? "A (You)" : "B (Computer)"}'s turn`);
            } else {
                setStatus(`Player ${currentPlayer}'s turn`);
            }
        }
    }

    function totalStones(arr) {
        return arr.reduce((a, b) => a + b, 0);
    }

    // ---------- HISTORY ----------

    function addHistoryEntry(entry) {
        moveHistory.push(entry);
        if (!historyListEl) return;

        const div = document.createElement("div");
        div.className = "history-entry";

        const lastSide = entry.lastPos < 9 ? "A" : "B";
        const lastIndex = entry.lastPos < 9 ? entry.lastPos + 1 : entry.lastPos - 8;

        let text = `${entry.moveNumber}. Player ${entry.player} – pit ${entry.pitIndex + 1}`;
        text += ` (stones ${entry.stonesBefore} → moved ${entry.stonesMoved}, last: ${lastSide}${lastIndex}`;
        if (entry.captured > 0) {
            text += `, captured ${entry.captured}`;
        }
        text += `, A:${entry.storeA}, B:${entry.storeB})`;

        div.textContent = text;
        historyListEl.appendChild(div);
        historyListEl.scrollTop = historyListEl.scrollHeight;
    }

    function clearHistory() {
        moveHistory = [];
        if (historyListEl) {
            historyListEl.innerHTML = "";
        }
    }

    // ---------- GAME END RULES ----------

    function finishGameByScore() {
        gameOver = true;
        if (storeA > storeB) {
            setStatus(`Game over! Player A wins (${storeA} : ${storeB})`);
        } else if (storeB > storeA) {
            const label = vsComputer ? "Computer (B)" : "Player B";
            setStatus(`Game over! ${label} wins (${storeB} : ${storeA})`);
        } else {
            setStatus(`Game over! It's a tie (${storeA} : ${storeB})`);
        }
        updateView();
    }

    function checkGameEnd() {
        if (storeA >= 82 || storeB >= 82) {
            finishGameByScore();
            return true;
        }
        if (totalStones(pitsA) === 0 || totalStones(pitsB) === 0) {
            storeA += totalStones(pitsA);
            storeB += totalStones(pitsB);
            pitsA.fill(0);
            pitsB.fill(0);
            finishGameByScore();
            return true;
        }
        return false;
    }

    // ---------- ANIMATION HELPERS ----------

    function highlightPit(globalPos, on) {
        let selector;
        if (globalPos < 9) {
            selector = `.pit-bottom[data-index="${globalPos}"]`;
        } else {
            const idx = globalPos - 9;
            selector = `.pit-top[data-index="${idx}"]`;
        }
        const el = document.querySelector(selector);
        if (!el) return;
        if (on) el.classList.add("sowing");
        else el.classList.remove("sowing");
    }

    function sowAnimated(path, done) {
        let i = 0;

        function step() {
            if (i === path.length) {
                if (path.length > 0) {
                    highlightPit(path[path.length - 1], false);
                }
                done();
                return;
            }

            const pos = path[i];

            if (i > 0) {
                highlightPit(path[i - 1], false);
            }

            if (pos < 9) {
                pitsA[pos]++;
            } else {
                pitsB[pos - 9]++;
            }

            highlightPit(pos, true);
            updateView();

            i++;
            setTimeout(step, 180);
        }

        step();
    }

    // ---------- MOVE EXECUTION (used by human + AI) ----------

    function startMove(player, idx) {
        if (gameOver || isAnimating) return false;

        const pits = player === "A" ? pitsA : pitsB;
        let stones = pits[idx];

        if (stones === 0) {
            // Only show error for human moves
            if (!vsComputer || player === "A") {
                setStatus("You cannot move from an empty pit.");
            }
            return false;
        }

        const stonesBefore = stones;
        const startPos = player === "A" ? idx : 9 + idx;

        let stonesToSow;
        if (stones === 1) {
            pits[idx] = 0;
            stonesToSow = 1;
        } else {
            pits[idx] = 1;
            stonesToSow = stones - 1;
        }

        updateView();

        const path = [];
        for (let s = 1; s <= stonesToSow; s++) {
            path.push((startPos + s) % 18);
        }

        isAnimating = true;
        const movePlayer = player;
        let captured = 0;

        sowAnimated(path, () => {
            const lastPos = path[path.length - 1];

            if (movePlayer === "A" && lastPos >= 9) {
                const pitIndex = lastPos - 9;
                if (pitsB[pitIndex] % 2 === 0) {
                    captured = pitsB[pitIndex];
                    storeA += pitsB[pitIndex];
                    pitsB[pitIndex] = 0;
                }
            } else if (movePlayer === "B" && lastPos < 9) {
                const pitIndex = lastPos;
                if (pitsA[pitIndex] % 2 === 0) {
                    captured = pitsA[pitIndex];
                    storeB += pitsA[pitIndex];
                    pitsA[pitIndex] = 0;
                }
            }

            addHistoryEntry({
                moveNumber: moveHistory.length + 1,
                player: movePlayer,
                pitIndex: idx,
                stonesBefore,
                stonesMoved: stonesToSow,
                lastPos,
                captured,
                storeA,
                storeB
            });

            currentPlayer = currentPlayer === "A" ? "B" : "A";

            const ended = checkGameEnd();
            if (!ended) {
                updateView();
            }

            isAnimating = false;

            // Trigger AI move if needed
            if (!ended && vsComputer && currentPlayer === "B") {
                setTimeout(aiMove, 400);
            }
        });

        return true;
    }

    // ---------- HUMAN CLICK HANDLER ----------

    function onPitClick(e) {
        if (gameOver || isAnimating) return;

        const pitEl = e.target.closest(".pit");
        if (!pitEl) return;

        const player = pitEl.dataset.player;
        const idx = parseInt(pitEl.dataset.index, 10);

        if (player !== currentPlayer) {
            setStatus(`It's Player ${currentPlayer}'s turn`);
            return;
        }

        // In vsComputer mode, human is only Player A
        if (vsComputer && player === "B") {
            return;
        }

        startMove(player, idx);
    }

    // ---------- AI (Player B) ----------

    function simulateMove(player, idx) {
        const pitsA_copy = pitsA.slice();
        const pitsB_copy = pitsB.slice();
        let storeA_copy = storeA;
        let storeB_copy = storeB;

        const pits = player === "A" ? pitsA_copy : pitsB_copy;
        let stones = pits[idx];
        if (stones === 0) return null;

        const startPos = player === "A" ? idx : 9 + idx;

        let stonesToSow;
        if (stones === 1) {
            pits[idx] = 0;
            stonesToSow = 1;
        } else {
            pits[idx] = 1;
            stonesToSow = stones - 1;
        }

        let lastPos = startPos;
        for (let s = 1; s <= stonesToSow; s++) {
            lastPos = (startPos + s) % 18;
            if (lastPos < 9) {
                pitsA_copy[lastPos]++;
            } else {
                pitsB_copy[lastPos - 9]++;
            }
        }

        let captured = 0;
        if (player === "A" && lastPos >= 9) {
            const pitIndex = lastPos - 9;
            if (pitsB_copy[pitIndex] % 2 === 0) {
                captured = pitsB_copy[pitIndex];
                storeA_copy += pitsB_copy[pitIndex];
            }
        } else if (player === "B" && lastPos < 9) {
            const pitIndex = lastPos;
            if (pitsA_copy[pitIndex] % 2 === 0) {
                captured = pitsA_copy[pitIndex];
                storeB_copy += pitsA_copy[pitIndex];
            }
        }

        return { captured, lastPos };
    }

    function aiChoosePit() {
        let bestIdx = null;
        let bestCaptured = -1;

        for (let i = 0; i < PITS_PER_SIDE; i++) {
            if (pitsB[i] === 0) continue;
            const result = simulateMove("B", i);
            if (!result) continue;
            if (result.captured > bestCaptured) {
                bestCaptured = result.captured;
                bestIdx = i;
            }
        }

        // If no capture is possible, just take the first non-empty pit
        if (bestIdx === null) {
            for (let i = 0; i < PITS_PER_SIDE; i++) {
                if (pitsB[i] > 0) {
                    bestIdx = i;
                    break;
                }
            }
        }

        return bestIdx;
    }

    function aiMove() {
        if (!vsComputer || gameOver || isAnimating || currentPlayer !== "B") return;

        const idx = aiChoosePit();
        if (idx === null) return; // no legal moves (shouldn’t really happen)

        startMove("B", idx);
    }

    // ---------- RESET ----------

    function resetGame() {
        pitsA = new Array(PITS_PER_SIDE).fill(START_STONES);
        pitsB = new Array(PITS_PER_SIDE).fill(START_STONES);
        storeA = 0;
        storeB = 0;
        currentPlayer = "A";
        gameOver = false;
        isAnimating = false;
        clearHistory();
        updateView();

        if (vsComputer) {
            setStatus("Player A (You) vs Computer (B) – Player A starts");
        } else {
            setStatus("Player A starts");
        }
    }

    resetBtn.addEventListener("click", () => {
        vsComputer = false;
        resetGame();
    });

    aiBtn.addEventListener("click", () => {
        vsComputer = true;
        resetGame();
    });

    // Initial setup
    createBoardDOM();
    setStatus("Player A starts");
});
