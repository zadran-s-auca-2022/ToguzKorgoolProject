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
    let vsComputer = false;

    // settings state
    let soundOn = true;
    let language = "en";
    let audioCtx = null;

    const RULES_TEXT = {
        en: "Each player has 9 pits with 9 stones. On your turn, choose one of your own pits. " +
            "If the pit has 1 stone, move that stone to the next pit. " +
            "If it has more than 1 stone, leave 1 stone in the starting pit and sow the rest " +
            "anti-clockwise across all pits. If your last stone lands in the opponent's pit and " +
            "the number of stones there becomes even, you capture all stones from that pit into your Kazan. " +
            "The player who collects at least 82 stones wins. If one side becomes empty, the remaining stones " +
            "on the other side go to that player's Kazan and the game ends.",
        kg: "Ар бир оюнчу 9 уячадан жана ар биринде 9 коргоолдон баштайт. " +
            "Өз кезегиңизде өз тарабыңыздагы бир уячаны тандаңыз. " +
            "Эгер уяча 1 коргоол болсо, аны кийинки уячага жылдырасыз. " +
            "Эгер 1ден көп болсо, баштапкы уячага 1 коргоол калтырып, калганын саат жебесине каршы таратып чыгасыз. " +
            "Акыркы коргоол каршы тараптын уячасына түшүп, ал жактагы коргоолдордун саны жуп болуп калса, " +
            "анын баары сиздин казаныңызга өтөт. Ким 82 же андан көп коргоол топтосо, ошогочеут жеңет.",
        ru: "У каждого игрока 9 лунок по 9 камней. В свой ход вы выбираете одну из своих лунок. " +
            "Если в лунке 1 камень, вы переносите его в следующую лунку. " +
            "Если камней больше, один камень остаётся в исходной лунке, а остальные вы раскладываете " +
            "по кругу против часовой стрелки. Если последний камень попадает в лунку соперника и общее число " +
            "камней там становится чётным, вы забираете все эти камни в свой казан. " +
            "Побеждает игрок, который собрал не менее 82 камней. Если у одного игрока лунки пустые, " +
            "оставшиеся камни переходят в казан второго, и игра заканчивается."
    };

    // ---------- DOM ELEMENTS ----------

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

    const settingsBtn = document.getElementById("settingsBtn");
    const settingsOverlay = document.getElementById("settingsOverlay");
    const settingsClose = document.getElementById("settingsClose");
    const soundToggle = document.getElementById("soundToggle");
    const languageSelect = document.getElementById("languageSelect");
    const rulesTextEl = document.getElementById("rulesText");

    const splash = document.getElementById("splash");
    const splashStartBtn = document.getElementById("splashStartBtn");

    // ---------- AUDIO (simple beeps, no files) ----------

    function initAudio() {
        if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new Ctx();
        }
    }

    function playTone(freq, duration) {
        if (!soundOn) return;
        if (!audioCtx) initAudio();
        if (!audioCtx) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.value = freq;
        osc.type = "sine";

        const now = audioCtx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    // one short “tick” per stone
    function playStoneSound() {
        playTone(650, 0.07);
    }

    function playCaptureSound() {
        playTone(320, 0.18);
    }

    function playGameOverSound() {
        playTone(220, 0.3);
    }

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
            maxBalls = Math.min(count, 82);
        } else {
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
                setStatus(
                    `Player ${
                        currentPlayer === "A" ? "A (You)" : "B (Computer)"
                    }'s turn`
                );
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

        let text = `${entry.moveNumber}. Player ${entry.player} – pit ${
            entry.pitIndex + 1
        }`;
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
        playGameOverSound();
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

            // sound for EACH stone
            playStoneSound();

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

        // we no longer play a single move sound here;
        // instead we play one sound per stone in sowAnimated
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

            if (captured > 0) {
                playCaptureSound();
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
        if (idx === null) return;

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

    // ---------- SETTINGS LOGIC ----------

    function updateRulesText() {
        if (rulesTextEl) {
            rulesTextEl.textContent = RULES_TEXT[language] || RULES_TEXT.en;
        }
    }

    function loadPreferences() {
        const s = localStorage.getItem("tk_sound");
        if (s === "0") {
            soundOn = false;
            if (soundToggle) soundToggle.checked = false;
        } else {
            soundOn = true;
            if (soundToggle) soundToggle.checked = true;
        }

        const lang = localStorage.getItem("tk_lang");
        if (lang && RULES_TEXT[lang]) {
            language = lang;
        }
        if (languageSelect) {
            languageSelect.value = language;
        }
        updateRulesText();
    }

    if (settingsBtn && settingsOverlay && settingsClose) {
        settingsBtn.addEventListener("click", () => {
            settingsOverlay.classList.remove("hidden");
        });

        settingsClose.addEventListener("click", () => {
            settingsOverlay.classList.add("hidden");
        });

        settingsOverlay.addEventListener("click", (e) => {
            if (e.target === settingsOverlay) {
                settingsOverlay.classList.add("hidden");
            }
        });
    }

    if (soundToggle) {
        soundToggle.addEventListener("change", () => {
            soundOn = soundToggle.checked;
            localStorage.setItem("tk_sound", soundOn ? "1" : "0");
            if (soundOn) {
                initAudio();
                playTone(880, 0.08);
            }
        });
    }

    if (languageSelect) {
        languageSelect.addEventListener("change", () => {
            language = languageSelect.value;
            localStorage.setItem("tk_lang", language);
            updateRulesText();
        });
    }

    // ---------- SPLASH LOGIC ----------

    function hideSplash() {
        if (!splash) return;
        splash.classList.add("hidden");
    }

    if (splash && splashStartBtn) {
        splashStartBtn.addEventListener("click", hideSplash);
        splash.addEventListener("click", (e) => {
            if (e.target === splash) hideSplash();
        });
    }

    // ---------- INITIALIZE ----------

    createBoardDOM();
    loadPreferences();
    resetGame();
});
