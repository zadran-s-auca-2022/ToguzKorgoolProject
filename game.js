// ----- Core game model for Toguz Korgool -----
class ToguzKorgoolGame {
    constructor(onUpdate) {
        // onUpdate is a callback to refresh the UI
        this.onUpdate = onUpdate;
        this.reset();
    }

    reset() {
        // Each player has 9 pits (korgool pits)
        // board[player][pitIndex]
        this.board = [
            new Array(9).fill(9), // Player A (bottom)
            new Array(9).fill(9)  // Player B (top)
        ];

        this.kazan = [0, 0];       // stores for A, B
        this.currentPlayer = 0;    // 0 = Player A, 1 = Player B
        this.isOver = false;
        this.winner = null;
        this.onUpdate();
    }

    getSideSum(player) {
        return this.board[player].reduce((a, b) => a + b, 0);
    }

    checkGameOver() {
        if (this.isOver) return;

        const sumA = this.getSideSum(0);
        const sumB = this.getSideSum(1);

        // If one player has no korgools left, opponent takes all remaining
        if (sumA === 0 || sumB === 0) {
            this.kazan[0] += sumA;
            this.kazan[1] += sumB;

            this.board = [
                new Array(9).fill(0),
                new Array(9).fill(0)
            ];
        }

        // Winning condition: first to collect more than 81 korgools
        if (this.kazan[0] > 81) {
            this.isOver = true;
            this.winner = 0;
        } else if (this.kazan[1] > 81) {
            this.isOver = true;
            this.winner = 1;
        } else if (this.getSideSum(0) === 0 && this.getSideSum(1) === 0) {
            // All korgools have been collected
            if (this.kazan[0] > this.kazan[1]) this.winner = 0;
            else if (this.kazan[1] > this.kazan[0]) this.winner = 1;
            else this.winner = 'draw';

            this.isOver = true;
        }
    }

    // player: 0 or 1; pitIndex: 0..8
    makeMove(player, pitIndex) {
        if (this.isOver) return false;
        if (player !== this.currentPlayer) return false;

        const korgools = this.board[player][pitIndex];
        if (korgools <= 1) return false; // must leave 1 behind

        // Keep 1 korgool in the chosen pit
        this.board[player][pitIndex] = 1;
        let toDistribute = korgools - 1;

        // Sowing loop
        let side = player;
        let index = pitIndex + 1;
        let lastSide = side;
        let lastIndex = pitIndex;

        while (toDistribute > 0) {
            if (index >= 9) {
                side = 1 - side; // switch side
                index = 0;
            }

            this.board[side][index]++;
            toDistribute--;

            lastSide = side;
            lastIndex = index;
            index++;
        }

        // Capture rule: last korgool lands on opponent side AND becomes even
        const opponent = 1 - player;

        if (lastSide === opponent && this.board[opponent][lastIndex] % 2 === 0) {
            const captured = this.board[opponent][lastIndex];
            this.kazan[player] += captured;
            this.board[opponent][lastIndex] = 0;
        }

        // Switch turn
        this.currentPlayer = opponent;

        // Check game over
        this.checkGameOver();

        // Update UI
        this.onUpdate();
        return true;
    }
}

// ----- UI / DOM integration -----

const rowTop = document.getElementById('row-top');
const rowBottom = document.getElementById('row-bottom');
const statusEl = document.getElementById('status');
const scoreAEl = document.getElementById('scoreA');
const scoreBEl = document.getElementById('scoreB');
const storeAEl = document.getElementById('storeA');
const storeBEl = document.getElementById('storeB');
const resetBtn = document.getElementById('resetBtn');
const container = document.querySelector('.container');

// Create pit elements once
function createPits() {
    // Top row: Player B pits displayed right-to-left
    rowTop.innerHTML = '';
    for (let i = 8; i >= 0; i--) {
        const pit = document.createElement('div');
        pit.className = 'pit';
        pit.dataset.player = '1';
        pit.dataset.index = i.toString();
        pit.appendChild(document.createElement('span'));
        rowTop.appendChild(pit);
    }

    // Bottom row: Player A pits left-to-right
    rowBottom.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const pit = document.createElement('div');
        pit.className = 'pit';
        pit.dataset.player = '0';
        pit.dataset.index = i.toString();
        pit.appendChild(document.createElement('span'));
        rowBottom.appendChild(pit);
    }
}

createPits();

// Create game instance
const game = new ToguzKorgoolGame(updateUI);

function updateUI() {
    // Update pit counts
    const pits = document.querySelectorAll('.pit');
    pits.forEach(pit => {
        const player = Number(pit.dataset.player);
        const index = Number(pit.dataset.index);
        const count = game.board[player][index];
        pit.querySelector('span').textContent = count;

        // Enable only current player's pits with >1 korgool
        if (player === game.currentPlayer && count > 1 && !game.isOver) {
            pit.classList.remove('disabled');
        } else {
            pit.classList.add('disabled');
        }
    });

    // Update stores (just A/B and numbers, no "Kazan" text)
    storeAEl.innerHTML = 'A<br>' + game.kazan[0];
    storeBEl.innerHTML = 'B<br>' + game.kazan[1];

    // Scores: show as "Player A: x", "Player B: x"
    scoreAEl.textContent = 'Player A: ' + game.kazan[0];
    scoreBEl.textContent = 'Player B: ' + game.kazan[1];

    // Highlight current player
    container.classList.remove('current-player-A', 'current-player-B');
    if (!game.isOver) {
        if (game.currentPlayer === 0) container.classList.add('current-player-A');
        else container.classList.add('current-player-B');
    }

    // Status text
    if (game.isOver) {
        if (game.winner === 'draw') {
            statusEl.textContent = 'Game over: Draw!';
        } else {
            statusEl.textContent = `Game over: Player ${game.winner === 0 ? 'A' : 'B'} wins!`;
        }
    } else {
        statusEl.textContent = `Turn: Player ${game.currentPlayer === 0 ? 'A' : 'B'}`;
    }
}

// Handle clicks on pits
document.addEventListener('click', (e) => {
    const pit = e.target.closest('.pit');
    if (!pit) return;

    const player = Number(pit.dataset.player);
    const index = Number(pit.dataset.index);

    game.makeMove(player, index);
});

// Reset button
resetBtn.addEventListener('click', () => {
    game.reset();
});
