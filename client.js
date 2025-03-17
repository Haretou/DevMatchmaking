
const SERVER_IP = window.location.hostname; // Utilise automatiquement l'IP ou le domaine actuel
const PORT = "3000";
const API_URL = `http://${SERVER_IP}:${PORT}/api`;
const SOCKET_URL = `http://${SERVER_IP}:${PORT}`;

// ======== INITIALISATION =========

// Variables globales
let socket;
let currentScreen = 'loginScreen';
let currentPlayer = {
    pseudo: '',
    color: null,
    isMyTurn: false
};
let currentMatch = {
    id: null,
    opponent: null,
    board: Array.from({ length: 6 }, () => Array(7).fill(null))
};
let queueTimer;
let queueStartTime;

// Éléments DOM
const screens = {
    login: document.getElementById('loginScreen'),
    queue: document.getElementById('queueScreen'),
    game: document.getElementById('gameScreen'),
    gameOver: document.getElementById('gameOverScreen'),
    profile: document.getElementById('profileScreen'),
    leaderboard: document.getElementById('leaderboardScreen')
};

// Afficher un message de débogage pour indiquer l'adresse du serveur
console.log(`Connexion au serveur: ${SOCKET_URL}`);
document.addEventListener('DOMContentLoaded', () => {
    const debugInfo = document.createElement('div');
    debugInfo.style.position = 'fixed';
    debugInfo.style.bottom = '5px';
    debugInfo.style.right = '5px';
    debugInfo.style.background = 'rgba(0,0,0,0.6)';
    debugInfo.style.color = 'white';
    debugInfo.style.padding = '5px';
    debugInfo.style.fontSize = '10px';
    debugInfo.style.borderRadius = '3px';
    debugInfo.textContent = `Serveur: ${SOCKET_URL}`;
    document.body.appendChild(debugInfo);
});

// ======== GESTION DES ÉCRANS =========

// Changer d'écran
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;

    // Actions spécifiques selon l'écran
    if (screenId === 'gameScreen') {
        createBoard();
    }
}

// ======== NOTIFICATIONS =========

// Afficher une notification
function showNotification(message, duration = 3000) {
    const container = document.getElementById('notificationContainer');
    const messageEl = document.getElementById('notificationMessage');

    messageEl.textContent = message;
    container.classList.remove('hidden');

    setTimeout(() => {
        container.classList.add('hidden');
    }, duration);
}

// ======== GESTION DU PLATEAU DE JEU =========

// Créer le plateau de jeu
function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';

    // Réinitialiser le plateau en mémoire
    currentMatch.board = Array.from({ length: 6 }, () => Array(7).fill(null));

    // Créer les cellules
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }

    // Mettre à jour l'interface
    updateTurnIndicator();
}

// Mettre à jour l'affichage du plateau
function updateBoard() {
    document.querySelectorAll('.cell').forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // Réinitialiser la classe
        cell.className = 'cell';

        // Ajouter la classe correspondant au jeton
        if (currentMatch.board[row][col]) {
            cell.classList.add(currentMatch.board[row][col]);
        }
    });
}

// Gérer le clic sur une cellule
function handleCellClick(event) {
    // Si ce n'est pas notre tour, on ne fait rien
    if (!currentPlayer.isMyTurn) {
        showNotification("Ce n'est pas votre tour");
        return;
    }

    const col = parseInt(event.target.dataset.col);

    // Envoyer le coup au serveur
    socket.emit('playTurn', {
        matchId: currentMatch.id,
        column: col
    });
}

// Mettre à jour l'indicateur de tour
function updateTurnIndicator() {
    const indicator = document.getElementById('turnIndicator');

    if (currentPlayer.isMyTurn) {
        indicator.textContent = "C'est votre tour";
        indicator.style.backgroundColor = currentPlayer.color === 'red' ? '#ff6b6b' : '#feca57';
        indicator.style.color = '#fff';
    } else {
        indicator.textContent = "Tour de l'adversaire";
        indicator.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        indicator.style.color = '#fff';
    }
}

// ======== GESTION DE LA FILE D'ATTENTE =========

// Rejoindre la file d'attente
function joinQueue() {
    const pseudo = document.getElementById('pseudoInput').value.trim();

    if (!pseudo) {
        showNotification('Veuillez entrer un pseudo');
        return;
    }

    // Sauvegarder le pseudo
    currentPlayer.pseudo = pseudo;
    localStorage.setItem('puissance4_pseudo', pseudo);

    // Initialiser le socket si ce n'est pas déjà fait
    if (!socket) {
        initializeSocket();
    }

    // Rejoindre la file
    socket.emit('joinQueue', { pseudo });

    // Démarrer le chronomètre
    queueStartTime = Date.now();
    queueTimer = setInterval(updateQueueTime, 1000);

    // Afficher l'écran de file d'attente
    showScreen('queueScreen');
}

// Quitter la file d'attente
function leaveQueue() {
    if (socket) {
        socket.emit('leaveQueue');
    }

    // Arrêter le chronomètre
    clearInterval(queueTimer);

    // Revenir à l'écran d'accueil
    showScreen('loginScreen');
}

// Mettre à jour le temps d'attente affiché
function updateQueueTime() {
    const elapsed = Math.floor((Date.now() - queueStartTime) / 1000);
    document.getElementById('waitTime').textContent = elapsed;
}

// ======== COMMUNICATION SOCKET.IO =========

// Initialiser la connexion socket
function initializeSocket() {
    // Afficher un message de tentative de connexion
    console.log(`Tentative de connexion à ${SOCKET_URL}`);
    showNotification(`Connexion au serveur: ${SOCKET_URL}`, 5000);

    socket = io(SOCKET_URL);

    // Événements socket
    socket.on('connect', () => {
        console.log('Connecté au serveur');
        showNotification('Connecté au serveur!', 2000);
    });

    socket.on('connect_error', (err) => {
        console.error('Erreur de connexion:', err);
        showNotification(`Erreur de connexion au serveur: ${err.message}`, 5000);
    });

    socket.on('disconnect', () => {
        console.log('Déconnecté du serveur');
        showNotification('Connexion au serveur perdue. Tentative de reconnexion...', 5000);
    });

    socket.on('error', (data) => {
        showNotification(data.message);
    });

    // File d'attente
    socket.on('queueJoined', (data) => {
        document.getElementById('positionNumber').textContent = data.position;
    });

    // Début de match
    socket.on('matchStart', (data) => {
        // Arrêter le chronomètre de file d'attente
        clearInterval(queueTimer);

        // Sauvegarder les infos du match
        currentMatch.id = data.matchId;
        currentMatch.opponent = data.opponent;

        // Sauvegarder les infos du joueur
        currentPlayer.color = data.color;
        currentPlayer.isMyTurn = data.isYourTurn;

        // Mettre à jour l'interface
        document.getElementById('player1Name').textContent = currentPlayer.color === 'red' ? currentPlayer.pseudo : currentMatch.opponent;
        document.getElementById('player2Name').textContent = currentPlayer.color === 'yellow' ? currentPlayer.pseudo : currentMatch.opponent;

        // Afficher l'écran de jeu
        showScreen('gameScreen');
    });

    // Coup joué (par nous ou l'adversaire)
    socket.on('turnPlayed', (data) => {
        const { row, column, color, isYourTurn } = data;

        // Mettre à jour le plateau
        currentMatch.board[row][column] = color;
        updateBoard();

        // Mettre à jour le tour
        if (isYourTurn !== undefined) {
            currentPlayer.isMyTurn = isYourTurn;
            updateTurnIndicator();
        }
    });

    // Fin de match
    socket.on('matchEnd', (data) => {
        let title, message;

        switch (data.result) {
            case 'win':
                title = 'Victoire !';
                message = 'Félicitations, vous avez gagné la partie !';
                break;
            case 'lose':
                title = 'Défaite';
                message = `${data.winner} a remporté la partie.`;
                break;
            case 'draw':
                title = 'Match nul';
                message = 'Aucun joueur n\'a réussi à aligner 4 jetons.';
                break;
        }

        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;

        // Afficher l'écran de fin de partie
        showScreen('gameOverScreen');
    });

    // Déconnexion de l'adversaire
    socket.on('opponentDisconnected', () => {
        showNotification('Votre adversaire s\'est déconnecté');

        // La fin du match sera gérée par l'événement matchEnd
    });
}

// ======== GESTION DU PROFIL =========

// Charger le profil
async function loadProfile() {
    const pseudo = currentPlayer.pseudo || localStorage.getItem('puissance4_pseudo');

    if (!pseudo) {
        showNotification('Veuillez d\'abord vous connecter');
        return showScreen('loginScreen');
    }

    try {
        // Afficher le pseudo
        document.getElementById('profileName').textContent = pseudo;

        // Récupérer les statistiques
        const statsResponse = await fetch(`${API_URL}/players/${pseudo}/stats`);
        if (!statsResponse.ok) {
            throw new Error('Erreur lors de la récupération des statistiques');
        }

        const stats = await statsResponse.json();

        // Mettre à jour les statistiques
        document.getElementById('totalMatchesValue').textContent = stats.totalMatches;
        document.getElementById('winsValue').textContent = stats.wins;
        document.getElementById('lossesValue').textContent = stats.losses;
        document.getElementById('drawsValue').textContent = stats.draws;
        document.getElementById('winRateValue').textContent = `${stats.winRate}%`;

        // Récupérer l'historique des matchs
        const historyResponse = await fetch(`${API_URL}/players/${pseudo}/history`);
        if (!historyResponse.ok) {
            throw new Error('Erreur lors de la récupération de l\'historique');
        }

        const history = await historyResponse.json();

        // Mettre à jour l'historique
        const historyTableBody = document.getElementById('historyTableBody');
        historyTableBody.innerHTML = '';

        if (history.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" style="text-align: center;">Aucune partie jouée</td>';
            historyTableBody.appendChild(row);
        } else {
            history.forEach(match => {
                const row = document.createElement('tr');

                // Formater la date
                const date = new Date(match.created_at);
                const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                // Formater le résultat
                let resultClass = '';
                let resultText = '';

                switch (match.result) {
                    case 'victory':
                        resultClass = 'result-victory';
                        resultText = 'Victoire';
                        break;
                    case 'defeat':
                        resultClass = 'result-defeat';
                        resultText = 'Défaite';
                        break;
                    case 'draw':
                        resultClass = 'result-draw';
                        resultText = 'Match nul';
                        break;
                    case 'in_progress':
                        resultClass = '';
                        resultText = 'En cours';
                        break;
                }

                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${match.opponent}</td>
                    <td class="${resultClass}">${resultText}</td>
                `;

                historyTableBody.appendChild(row);
            });
        }

        // Afficher l'écran de profil
        showScreen('profileScreen');

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement des données');
    }
}

// ======== GESTION DU CLASSEMENT =========

// Charger le classement
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération du classement');
        }

        const leaderboard = await response.json();

        // Mettre à jour le tableau
        const tableBody = document.getElementById('leaderboardTableBody');
        tableBody.innerHTML = '';

        if (leaderboard.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align: center;">Aucun joueur classé</td>';
            tableBody.appendChild(row);
        } else {
            leaderboard.forEach((player, index) => {
                const row = document.createElement('tr');

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${player.pseudo}</td>
                    <td>${player.total_matches}</td>
                    <td>${player.wins}</td>
                    <td>${player.win_rate}%</td>
                `;

                tableBody.appendChild(row);
            });
        }

        // Afficher l'écran de classement
        showScreen('leaderboardScreen');

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement du classement');
    }
}

// ======== ÉVÉNEMENTS =========

// Événements au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Restaurer le pseudo si disponible
    const savedPseudo = localStorage.getItem('puissance4_pseudo');
    if (savedPseudo) {
        document.getElementById('pseudoInput').value = savedPseudo;
    }

    // Événements de l'écran de connexion
    document.getElementById('startButton').addEventListener('click', joinQueue);
    document.getElementById('pseudoInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinQueue();
    });

    // Événements de la file d'attente
    document.getElementById('cancelQueueButton').addEventListener('click', leaveQueue);

    // Événements de l'écran de jeu
    document.getElementById('surrenderButton').addEventListener('click', () => {
        if (confirm('Êtes-vous sûr de vouloir abandonner la partie ?')) {
            socket.emit('leaveMatch', { matchId: currentMatch.id });
        }
    });

    // Événements de l'écran de fin de partie
    document.getElementById('playAgainButton').addEventListener('click', joinQueue);
    document.getElementById('returnToMenuButton').addEventListener('click', () => {
        showScreen('loginScreen');
    });

    // Événements de la navigation principale
    document.getElementById('profileButton').addEventListener('click', loadProfile);
    document.getElementById('leaderboardButton').addEventListener('click', loadLeaderboard);

    // Événements de l'écran de profil
    document.getElementById('backFromProfileButton').addEventListener('click', () => {
        showScreen('loginScreen');
    });

    // Événements de l'écran de classement
    document.getElementById('backFromLeaderboardButton').addEventListener('click', () => {
        showScreen('loginScreen');
    });
});
