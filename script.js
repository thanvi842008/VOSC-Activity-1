const players = [
    { name: "Red Realm", color: "red", start: 0, tokens: [] },
    { name: "Green Realm", color: "green", start: 13, tokens: [] },
    { name: "Yellow Realm", color: "yellow", start: 26, tokens: [] },
    { name: "Blue Realm", color: "blue", start: 39, tokens: [] }
];

const pathEl = document.getElementById("path");
const rollBtn = document.getElementById("rollBtn");
const newGameBtn = document.getElementById("newGameBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const diceEl = document.getElementById("dice");
const diceHint = document.getElementById("diceHint");
const turnText = document.getElementById("turnText");
const statusEl = document.getElementById("status");
const winModal = document.getElementById("winModal");
const winnerText = document.getElementById("winnerText");

let currentPlayer = 0;
let rolled = false;
let diceValue = 1;
let gameOver = false;

const track = [
    [4,0],[5,0],[6,0],[7,0],[8,0],
    [8,1],[8,2],[8,3],[8,4],[8,5],[8,6],
    [8,7],[8,8],[7,8],[6,8],[5,8],[4,8],
    [3,8],[2,8],[1,8],[0,8],[0,7],[0,6],
    [0,5],[0,4],[0,3],[0,2],[0,1],
    [1,0],[2,0],[3,0],
    [3,1],[3,2],[3,3],[3,4],[3,5],[3,6],
    [4,6],[5,6],[6,6],[6,5],[6,4],[6,3],
    [5,3],[4,3],[4,2],[4,1],
    [5,1],[6,1],[6,2],[5,2]
];

const colorClassForTile = (index) => {
    if ([0,1,2,3,4,47,48,49,50,51].includes(index)) return "path-red";
    if ([13,14,15,16,17,18,19,20,21,22,23].includes(index)) return "path-green";
    if ([26,27,28,29,30,31,32,33,34,35,36].includes(index)) return "path-yellow";
    if ([39,40,41,42,43,44,45,46].includes(index)) return "path-blue";
    return "";
};

function buildBoard() {
    pathEl.innerHTML = "";

    const grid = Array.from({length: 81}, () => null);
    track.forEach((pos, index) => {
        grid[pos[0] * 9 + pos[1]] = index;
    });

    for (let i = 0; i < 81; i++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        if (grid[i] !== null) {
            const index = grid[i];
            tile.dataset.index = index;
            tile.classList.add(colorClassForTile(index));
            if (index % 8 === 0) tile.classList.add("safe");
        }
        pathEl.appendChild(tile);
    }
}

function createTokens() {
    players.forEach((player, pIndex) => {
        player.tokens = [];
        const yard = document.getElementById(`${player.color}-yard`);
        yard.innerHTML = "";

        for (let i = 0; i < 4; i++) {
            const token = document.createElement("button");
            token.className = `token ${player.color}`;
            token.title = `${player.name} token ${i + 1}`;
            token.dataset.player = pIndex;
            token.dataset.token = i;
            token.addEventListener("click", () => moveToken(pIndex, i));
            yard.appendChild(token);
            player.tokens.push({ position: -1, element: token, finished: false });
        }
    });
}

function tokenTrackPosition(playerIndex, token) {
    const tokenData = players[playerIndex].tokens[token];
    if (tokenData.position < 0) return null;
    return (players[playerIndex].start + tokenData.position) % 52;
}

function renderTokens() {
    document.querySelectorAll(".token-on-board").forEach(el => el.remove());

    players.forEach((player, pIndex) => {
        player.tokens.forEach((tokenData, tokenIndex) => {
            tokenData.element.classList.toggle("clickable", false);

            const trackIndex = tokenTrackPosition(pIndex, tokenIndex);
            if (trackIndex === null || tokenData.finished) {
                tokenData.element.style.display = "grid";
                return;
            }

            const tile = pathEl.querySelector(`[data-index="${trackIndex}"]`);
            if (!tile) return;

            const piece = document.createElement("button");
            piece.className = `token-on-board ${player.color}`;
            piece.textContent = "◆";
            piece.dataset.player = pIndex;
            piece.dataset.token = tokenIndex;

            if (pIndex === currentPlayer && rolled && canMove(pIndex, tokenIndex)) {
                piece.classList.add("clickable");
                piece.addEventListener("click", () => moveToken(pIndex, tokenIndex));
            }

            tile.appendChild(piece);
            tokenData.element.style.display = "none";
        });
    });
}

function canMove(playerIndex, tokenIndex) {
    const token = players[playerIndex].tokens[tokenIndex];

    if (token.finished) return false;
    if (token.position === -1) return diceValue === 6;

    return token.position + diceValue <= 56;
}

function moveToken(playerIndex, tokenIndex) {
    if (gameOver || !rolled || playerIndex !== currentPlayer || !canMove(playerIndex, tokenIndex)) return;

    const token = players[playerIndex].tokens[tokenIndex];

    if (token.position === -1) {
        token.position = 0;
    } else {
        token.position += diceValue;
    }

    if (token.position === 56) {
        token.finished = true;
    }

    captureOpponents(playerIndex, tokenIndex);

    rolled = false;
    diceHint.textContent = "Choose your next roll";
    statusEl.textContent = `${players[playerIndex].name} moved a token.`;

    if (players[playerIndex].tokens.every(t => t.finished)) {
        endGame(players[playerIndex]);
        return;
    }

    if (diceValue !== 6) {
        currentPlayer = (currentPlayer + 1) % players.length;
    } else {
        statusEl.textContent += " You rolled a 6 — roll again!";
    }

    updateUI();
}

function captureOpponents(playerIndex, tokenIndex) {
    const landing = tokenTrackPosition(playerIndex, tokenIndex);
    if (landing === null) return;

    const safe = [0, 13, 26, 39];
    if (safe.includes(landing)) return;

    players.forEach((player, pIndex) => {
        if (pIndex === playerIndex) return;

        player.tokens.forEach(token => {
            if (token.finished) return;
            const pos = tokenTrackPosition(pIndex, player.tokens.indexOf(token));
            if (pos === landing) {
                token.position = -1;
                statusEl.textContent = `${players[playerIndex].name} captured an opponent!`;
            }
        });
    });
}

function rollDice() {
    if (gameOver || rolled) return;

    diceValue = Math.floor(Math.random() * 6) + 1;
    rolled = true;
    diceEl.textContent = diceValue;
    diceHint.textContent = `You rolled a ${diceValue}`;

    const movable = players[currentPlayer].tokens.some((_, i) => canMove(currentPlayer, i));

    if (!movable) {
        statusEl.textContent = diceValue === 6
            ? "No token can move yet."
            : "No legal move. Turn passes.";
        rolled = false;
        currentPlayer = (currentPlayer + 1) % players.length;
        setTimeout(updateUI, 600);
        return;
    }

    statusEl.textContent = diceValue === 6
        ? "Choose a glowing token. You get another roll after moving."
        : "Choose a glowing token to move.";
    renderTokens();
}

function updateUI() {
    turnText.textContent = players[currentPlayer].name;
    turnText.style.color = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${players[currentPlayer].color}`).trim();

    if (!rolled) {
        diceHint.textContent = "Roll to begin";
    }

    renderTokens();
}

function resetGame() {
    currentPlayer = 0;
    rolled = false;
    diceValue = 1;
    gameOver = false;
    diceEl.textContent = "1";
    winModal.classList.add("hidden");
    createTokens();
    buildBoard();
    statusEl.textContent = "Red Realm begins the journey.";
    updateUI();
}

function endGame(player) {
    gameOver = true;
    winnerText.textContent = `${player.name.toUpperCase()} WINS!`;
    winModal.classList.remove("hidden");
}

rollBtn.addEventListener("click", rollDice);
newGameBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);

buildBoard();
createTokens();
updateUI();
