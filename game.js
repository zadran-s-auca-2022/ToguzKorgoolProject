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
    let isAnimating = false; // <--- NEW: block clicks during animation

    const rowTop = document.getElementById("row-top");
    const rowBottom = document.getElementById("row-bottom");
    const scoreAEl = document.getElementById("scoreA");
    const scoreBEl = document.getElementById("scoreB");
    const storeAEl = document.getElementById("storeA");
    const storeBEl = document.getElementById("storeB");
    const statusEl = document.getElementById("status");
    const resetBtn = document.getElementById("resetBtn");

    // ---------- BOARD SETUP ----------

    function createBoardDOM() {
        // Player B (top row) – reversed visually
        rowTop.innerHTML = "";
        for (let i = PITS_PER_SIDE - 1; i >= 0; i--) {
            const pit = document.createElement("div");
            pit.className = "pit pit-top";
            pit.dataset.player = "B";
            pit.dataset.index = i;
            rowTop.appendChild(pit);
        }

        // Player A (bottom row)
        rowBottom.innerHTML = "";
        for (let i = 0; i < PITS_PER_SIDE; i++) {
            const pit = document.createElement("div");
            pit.className = "pit pit-bottom";
            pit.dataset.player = "A";
            pit.dataset.index = i;
            rowBottom.appendChild(pit);
        }

        rowTop.addEventListener("click", onPitClick);
        rowBottom.addEventListener("click", onPitClick);

        updateView();
    }

    // ---------- HELPERS ----------

    function setStatus(msg) {
        statusEl.textContent = msg;
    }

    function updateView() {
        // Update pits
        document.querySelectorAll(".pit").forEach(pit => {
            const player = pit.dataset.player;
            const idx = parseInt(pit.dataset.index, 10);

            const stones = player === "A" ? pitsA[idx] : pitsB[idx];
            pit.textContent = stones;
            pit.classList.toggle("active-player", player === currentPlayer);
        });

        // Update stores
        storeAEl.innerHTML = `A<br>Kazan<br>${storeA}`;
        storeBEl.innerHTML = `B<br>Kazan<br>${storeB}`;

        // Update scores text (stores only)
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
            // Player A pits
            selector = `.pit-bottom[data-index="${globalPos}"]`;
        } else {
            // Player B pits
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
                // clear highlight from last pit
                if (path.length > 0) {
                    highlightPit(path[path.length - 1], false);
                }
                done();
                return;
            }

            const pos = path[i];

            // remove highlight from previous pit
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
            setTimeout(step, 180); // speed of animation (ms per stone)
        }

        step();
    }

    // ---------- GAME LOGIC ----------

    function onPitClick(e) {
        if (gameOver || isAnimating) return;

        const target = e.target;
        if (!target.classList.contains("pit")) return;

        const player = target.dataset.player;
        const idx = parseInt(target.dataset.index, 10);

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

        // pick up stones from chosen pit
        pits[idx] = 0;
        updateView(); // immediately show empty pit

        // global board position (0..17)
        const startPos = player === "A" ? idx : 9 + idx;

        // build sowing path
        const path = [];
        for (let s = 1; s <= stones; s++) {
            path.push((startPos + s) % 18);
        }

        isAnimating = true;

        sowAnimated(path, () => {
            const lastPos = path[path.length - 1];

            // Capture rule (simplified):
            // If last stone lands in opponent pit and that pit now has an even number,
            // current player captures all stones in that pit.
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

            // Switch turn
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
