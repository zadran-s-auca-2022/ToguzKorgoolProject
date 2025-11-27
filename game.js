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

    const rowTop = document.getElementById("row-top");
    const rowBottom = document.getElementById("row-bottom");
    const scoreAEl = document.getElementById("scoreA");
    const scoreBEl = document.getElementById("scoreB");
    const storeAEl = document.getElementById("storeA");
    const storeBEl = document.getElementById("storeB");
    const statusEl = document.getElementById("status");
    const resetBtn = document.getElementById("resetBtn");
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
        // show many stones in store, but limit to avoid overflow
        const maxBalls = isStore ? Math.min(count, 80) : Math.min(count, 12);

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
            setStatus(`Player ${currentPlayer}'s turn`);
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
        const lastIndex = entry.lastPos < 9 ? entry.lastPos + 1 : entry.lastPos - 8; // B pits: 10..18 -> 1..9

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
            setStatus(`Game over! Player B wins (${storeB} : ${storeA})`);
        } else {
            setStatus(`Game over! It's a tie (${storeA} : ${storeB})`);
        }
        updateView();
    }

    function checkGameEnd() {
        // 1) immediate win as soon as someone reaches 82 or more
        if (storeA >= 82 || storeB >= 82) {
            finishGameByScore();
            return;
        }

        // 2) if one side of the board is empty
        if (totalStones(pitsA) === 0 || totalStones(pitsB) === 0) {
            storeA += totalStones(pitsA);
            storeB += totalStones(pitsB);
            pitsA.fill(0);
            pitsB.fill(0);
            finishGameByScore();
        }
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

    // path = array of board positions (0..17)
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

    // ---------- GAME LOGIC (CLICK + MOVE RULE) ----------

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

        const pits = player === "A" ? pitsA : pitsB;
        let stones = pits[idx];

        if (stones === 0) {
            setStatus("You cannot move from an empty pit.");
            return;
        }

        const stonesBefore = stones;
        const startPos = player === "A" ? idx : 9 + idx;

        let stonesToSow;
        if (stones === 1) {
            // RULE: if you have 1 stone, it moves to the NEXT pit
            pits[idx] = 0;
            stonesToSow = 1;
        } else {
            // RULE: if you have more than 1, one stays, rest move
            pits[idx] = 1;
            stonesToSow = stones - 1;
        }

        updateView(); // show updated starting pit

        // Sowing always starts from the NEXT pit
        const path = [];
        for (let s = 1; s <= stonesToSow; s++) {
            path.push((startPos + s) % 18);
        }

        isAnimating = true;
        const movePlayer = currentPlayer;
        let captured = 0;

        sowAnimated(path, () => {
            const lastPos = path[path.length - 1];

            // simplified capture rule
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

            // record history BEFORE switching currentPlayer
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

            // next player's turn
            currentPlayer = currentPlayer === "A" ? "B" : "A";

            checkGameEnd();
            if (!gameOver) {
                updateView();
            }

            isAnimating = false;
        });
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
        setStatus("Player A starts");
    }

    resetBtn.addEventListener("click", resetGame);

    // Initial setup
    createBoardDOM();
    setStatus("Player A starts");
});
