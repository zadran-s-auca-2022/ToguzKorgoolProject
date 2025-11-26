// game.js

document.addEventListener("DOMContentLoaded", () => {
    const PITS_PER_SIDE = 9;
    const START_STONES = 9; // 9 pits × 9 korgools

    let pitsA = new Array(PITS_PER_SIDE).fill(START_STONES); // bottom row
    let pitsB = new Array(PITS_PER_SIDE).fill(START_STONES); // top row
    let storeA = 0;
    let storeB = 0;
    let currentPlayer = "A";
    let gameOver = false;
    let isAnimating = false; // block clicks during animation

    const rowTop = document.getElementById("row-top");
    const rowBottom = document.getElementById("row-bottom");
    const scoreAEl = document.getElementById("scoreA");
    const scoreBEl = document.getElementById("scoreB");
    const storeAEl = document.getElementById("storeA");
    const storeBEl = document.getElementById("storeB");
    const statusEl = document.getElementById("status");
    const resetBtn = document.getElementById("resetBtn");

    // ---------- BOARD SETUP ----------

    function createPitElement(player, idx) {
        const pit = document.createElement("div");
        pit.className = "pit " + (player === "A" ? "pit-bottom" : "pit-top");
        pit.dataset.player = player;
        pit.dataset.index = idx;

        // container for ball stones
        const stonesContainer = document.createElement("div");
        stonesContainer.className = "stones-container";
        pit.appendChild(stonesContainer);

        // small label showing total number
        const countLabel = document.createElement("div");
        countLabel.className = "stone-count";
        pit.appendChild(countLabel);

        return pit;
    }

    function createBoardDOM() {
        // Player B (top row) – reversed visually
        rowTop.innerHTML = "";
        for (let i = PITS_PER_SIDE - 1; i >= 0; i--) {
            const pit = createPitElement("B", i);
            rowTop.appendChild(pit);
        }

        // Player A (bottom row)
        rowBottom.innerHTML = "";
        for (let i = 0; i < PITS_PER_SIDE; i++) {
            const pit = createPitElement("A", i);
            rowBottom.appendChild(pit);
        }

        // click handler on rows (use closest(".pit") because of inner elements)
        rowTop.addEventListener("click", onPitClick);
        rowBottom.addEventListener("click", onPitClick);

        updateView();
    }

    // ---------- HELPERS ----------

    function setStatus(msg) {
        statusEl.textContent = msg;
    }

    function renderPit(pit, stones, isActive) {
        const container = pit.querySelector(".stones-container");
        const label = pit.querySelector(".stone-count");

        // update active highlight
        pit.classList.toggle("active-player", isActive);

        // clear old balls
        container.innerHTML = "";

        // how many balls to draw (don’t overflow the pit visually)
        const maxBalls = Math.min(stones, 20);

        for (let i = 0; i < maxBalls; i++) {
            const stone = document.createElement("div");
            stone.className = "stone";
            container.appendChild(stone);
        }

        // show total number (even if we don’t draw all balls)
        label.textContent = stones;
    }

    function updateView() {
        document.querySelectorAll(".pit").forEach(pit => {
            const player = pit.dataset.player;
            const idx = parseInt(pit.dataset.index, 10);
            const stones = player === "A" ? pitsA[idx] : pitsB[idx];
            const isActive = player === currentPlayer;
            renderPit(pit, stones, isActive);
        });

        // stores
        storeAEl.innerHTML = `A<br>Kazan<br>${storeA}`;
        storeBEl.innerHTML = `B<br>Kazan<br>${storeB}`;

        // scores (just kazan counts)
        scoreAEl.textContent = `Player A : ${storeA}`;
        scoreBEl.textContent = `Player B : ${storeB}`;

        if (!gameOver) {
            setStatus(`Player ${currentPlayer}'s turn`);
        }
    }

    function totalStones(arr) {
        return arr.reduce((a, b) => a + b, 0);
    }

    function checkGameEnd() {
        if (totalStones(pitsA) === 0 || totalStones(pitsB) === 0) {
            // Remaining stones go to each player's kazan
            storeA += totalStones(pitsA);
            storeB += totalStones(pitsB);
            pitsA.fill(0);
            pitsB.fill(0);
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
    }

    // ---------- ANIMATION HELPERS ----------

    // highlight pit that is currently receiving a stone
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

    // path = [global positions 0..17] where stones will be dropped
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
            setTimeout(step, 180); // ms per stone
        }

        step();
    }

    // ---------- GAME LOGIC ----------

    function onPitClick(e) {
        if (gameOver || isAnimating) return;

        // we might click on inner .stone, so find closest .pit
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
            setStatus("You cannot choose an empty pit.");
            return;
        }

        // pick up stones
        pits[idx] = 0;
        updateView(); // show empty pit immediately

        const startPos = player === "A" ? idx : 9 + idx;

        const path = [];
        for (let s = 1; s <= stones; s++) {
            path.push((startPos + s) % 18);
        }

        isAnimating = true;

        sowAnimated(path, () => {
            const lastPos = path[path.length - 1];

            // simplified capture rule
            if (currentPlayer === "A" && lastPos >= 9) {
                const pitIndex = lastPos - 9;
                if (pitsB[pitIndex] % 2 === 0) {
                    storeA += pitsB[pitIndex];
                    pitsB[pitIndex] = 0;
                }
            } else if (currentPlayer === "B" && lastPos < 9) {
                const pitIndex = lastPos;
                if (pitsA[pitIndex] % 2 === 0) {
                    storeB += pitsA[pitIndex];
                    pitsA[pitIndex] = 0;
                }
            }

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
        updateView();
    }

    resetBtn.addEventListener("click", resetGame);

    // Initial setup
    createBoardDOM();
    setStatus("Player A starts");
});
