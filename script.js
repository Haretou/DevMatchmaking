const ROWS = 6,
    COLS = 7;
let board, currentPlayer;
const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const winnerScreen = document.getElementById("winnerScreen");
const winnerMessage = document.getElementById("winnerMessage");

function initGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    currentPlayer = 'red';
    winnerScreen.classList.add("hidden");
    createBoard();
    statusElement.textContent = "Joueur Rouge commence";
}

function createBoard() {
    boardElement.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener("click", handleClick);
            boardElement.appendChild(cell);
        }
    }
}

function handleClick(event) {
    const col = parseInt(event.target.dataset.col);
    for (let row = ROWS - 1; row >= 0; row--) {
        if (!board[row][col]) {
            // Ajouter le jeton
            board[row][col] = currentPlayer;
            updateBoard();

            // Vérifier s'il y a une victoire avec le jeton actuel
            if (checkWin(row, col, currentPlayer)) {
                endGame(currentPlayer);
                return;
            }

            // Vérifier s'il y a match nul
            const isBoardFull = board.every(row => row.every(cell => cell !== null));
            if (isBoardFull) {
                displayDraw();
                return;
            }

            // Changer de joueur
            currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
            statusElement.textContent = `Tour de ${currentPlayer === 'red' ? 'Rouge' : 'Jaune'}`;
            break;
        }
    }
}

function updateBoard() {
    document.querySelectorAll(".cell").forEach(cell => {
        const row = parseInt(cell.dataset.row),
            col = parseInt(cell.dataset.col);
        cell.className = "cell";
        if (board[row][col]) cell.classList.add(board[row][col]);
    });
}

function checkWin(row, col, player) {
    const directions = [
        [0, 1], // horizontal
        [1, 0], // vertical
        [1, 1], // diagonal \
        [1, -1] // diagonal /
    ];

    for (const [dx, dy] of directions) {
        let winningPositions = [];
        let count = 0;

        // Vérifier dans les deux sens 
        for (let i = -3; i <= 3; i++) {
            const r = row + i * dx;
            const c = col + i * dy;

            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
                count++;
                winningPositions.push([r, c]);

                if (count >= 4) {
                    highlightWinningCells(winningPositions.slice(-4));
                    return true;
                }
            } else {
                count = 0;
                winningPositions = [];
            }
        }
    }

    return false;
}

function highlightWinningCells(positions) {
    positions.forEach(([r, c]) => {
        const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        if (cell) {
            cell.classList.add('winning-cell');
        }
    });
}

function endGame(winner) {
    const colorName = winner === 'red' ? 'Rouge' : 'Jaune';
    winnerMessage.textContent = `Joueur ${colorName} a gagné !`;
    winnerMessage.style.color = winner;
    winnerScreen.classList.remove("hidden");
    document.querySelectorAll(".cell").forEach(cell => cell.removeEventListener("click", handleClick));
    statusElement.textContent = `Partie terminée - ${colorName} gagne !`;
}

function displayDraw() {
    winnerMessage.textContent = "Match nul !";
    winnerMessage.style.color = "#333";
    winnerScreen.classList.remove("hidden");
    document.querySelectorAll(".cell").forEach(cell => cell.removeEventListener("click", handleClick));
    statusElement.textContent = "Partie terminée - Match nul !";
}

function restartGame() {
    initGame();
}

initGame();
