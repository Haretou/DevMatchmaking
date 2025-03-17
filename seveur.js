const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost', // Remplacez par l'adresse de votre BDD si elle est hébergée ailleurs
    database: 'puissance4_db',
    password: 'password', // Utilisez un mot de passe sécurisé en production
    port: 5432,
});

// Initialisation du serveur
const app = express();
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// File d'attente des joueurs
let waitingQueue = [];

// Matchs en cours
let activeMatches = {};

// ======== FONCTIONS UTILITAIRES =========

// Créer un nouveau plateau vide
function createEmptyBoard() {
    return Array.from({ length: 6 }, () => Array(7).fill(null));
}

// Vérifier si un coup est gagnant
function checkWin(board, row, col, player) {
    const directions = [
        [0, 1], // horizontal
        [1, 0], // vertical
        [1, 1], // diagonal \
        [1, -1] // diagonal /
    ];

    for (const [dx, dy] of directions) {
        let count = 0;
        // Vérifier dans les deux sens
        for (let i = -3; i <= 3; i++) {
            const r = row + i * dx;
            const c = col + i * dy;
            if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
                count++;
                if (count >= 4) return true;
            } else {
                count = 0;
            }
        }
    }
    return false;
}

// Vérifier si le plateau est plein (match nul)
function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== null));
}

// Trouver l'index de la ligne où le jeton va tomber
function findAvailableRow(board, col) {
    for (let row = 5; row >= 0; row--) {
        if (board[row][col] === null) {
            return row;
        }
    }
    return -1; // Colonne pleine
}

// ======== GESTION DES MATCHS =========

// Créer un nouveau match entre deux joueurs
async function createMatch(player1, player2) {
    console.log(`Création d'un match entre ${player1.pseudo} et ${player2.pseudo}`);

    const matchId = uuidv4();
    const matchData = {
        id: matchId,
        player1: {
            id: player1.id,
            socketId: player1.socketId,
            pseudo: player1.pseudo,
            color: 'red'
        },
        player2: {
            id: player2.id,
            socketId: player2.socketId,
            pseudo: player2.pseudo,
            color: 'yellow'
        },
        board: createEmptyBoard(),
        currentTurn: 'red', // Le joueur rouge commence toujours
        isFinished: false,
        winner: null,
        turnCount: 0
    };

    activeMatches[matchId] = matchData;

    // Sauvegarder le match dans la base de données
    try {
        const result = await pool.query(
            'INSERT INTO matches(id, player1_id, player2_id, is_finished, winner, created_at) VALUES($1, $2, $3, $4, $5, NOW()) RETURNING id', [matchId, player1.id, player2.id, false, null]
        );
        console.log(`Match créé en BDD avec ID: ${result.rows[0].id}`);
    } catch (err) {
        console.error('Erreur lors de la création du match en BDD:', err);
    }

    // Notifier les deux joueurs
    io.to(player1.socketId).emit('matchStart', {
        matchId: matchId,
        opponent: player2.pseudo,
        color: 'red',
        isYourTurn: true
    });

    io.to(player2.socketId).emit('matchStart', {
        matchId: matchId,
        opponent: player1.pseudo,
        color: 'yellow',
        isYourTurn: false
    });

    return matchId;
}

// Enregistrer un tour joué dans la BDD
async function saveTurn(matchId, playerId, col, row) {
    try {
        await pool.query(
            'INSERT INTO turns(match_id, player_id, column_played, row_played, created_at) VALUES($1, $2, $3, $4, NOW())', [matchId, playerId, col, row]
        );
    } catch (err) {
        console.error('Erreur lors de l\'enregistrement du tour:', err);
    }
}

// Finaliser un match
async function endMatch(matchId, winnerId = null) {
    try {
        const match = activeMatches[matchId];
        if (!match) return;

        match.isFinished = true;
        match.winner = winnerId;

        // Mettre à jour en BDD
        await pool.query(
            'UPDATE matches SET is_finished = true, winner = $1, updated_at = NOW() WHERE id = $2', [winnerId, matchId]
        );

        // Informer les deux joueurs
        let winnerPseudo = null;
        if (winnerId) {
            winnerPseudo = match.player1.id === winnerId ? match.player1.pseudo : match.player2.pseudo;
        }

        if (winnerId === null) {
            // Match nul
            io.to(match.player1.socketId).emit('matchEnd', { result: 'draw' });
            io.to(match.player2.socketId).emit('matchEnd', { result: 'draw' });
        } else {
            // Victoire
            io.to(match.player1.socketId).emit('matchEnd', {
                result: match.player1.id === winnerId ? 'win' : 'lose',
                winner: winnerPseudo
            });
            io.to(match.player2.socketId).emit('matchEnd', {
                result: match.player2.id === winnerId ? 'win' : 'lose',
                winner: winnerPseudo
            });
        }

        // Supprimer le match de la mémoire après un délai
        setTimeout(() => {
            delete activeMatches[matchId];
            console.log(`Match ${matchId} supprimé de la mémoire`);
        }, 5000);

    } catch (err) {
        console.error('Erreur lors de la finalisation du match:', err);
    }
}

// ======== VÉRIFICATION DE LA FILE D'ATTENTE =========

// Fonction qui vérifie régulièrement la file d'attente et crée des matchs
function checkWaitingQueue() {
    console.log(`Vérification de la file d'attente: ${waitingQueue.length} joueurs en attente`);

    // On a besoin d'au moins 2 joueurs pour faire un match
    if (waitingQueue.length >= 2) {
        const player1 = waitingQueue.shift();
        const player2 = waitingQueue.shift();

        // Vérifier que les joueurs sont toujours connectés
        if (io.sockets.sockets.has(player1.socketId) && io.sockets.sockets.has(player2.socketId)) {
            createMatch(player1, player2);
        } else {
            // Si un joueur s'est déconnecté, remettre l'autre en file d'attente
            if (io.sockets.sockets.has(player1.socketId)) {
                waitingQueue.push(player1);
            }
            if (io.sockets.sockets.has(player2.socketId)) {
                waitingQueue.push(player2);
            }
        }
    }
}

// Vérifier la file d'attente toutes les 5 secondes
setInterval(checkWaitingQueue, 5000);

// ======== GESTION DES CONNEXIONS SOCKET.IO =========

io.on('connection', (socket) => {
    console.log(`Nouvelle connexion: ${socket.id}`);

    // Entrée en file d'attente
    socket.on('joinQueue', async(data) => {
        console.log(`${data.pseudo} (${socket.id}) rejoint la file d'attente`);

        let playerId;

        // Vérifier si le joueur existe déjà en BDD
        try {
            const result = await pool.query('SELECT id FROM players WHERE pseudo = $1', [data.pseudo]);
            if (result.rows.length === 0) {
                // Créer le joueur s'il n'existe pas
                const newPlayer = await pool.query(
                    'INSERT INTO players(pseudo, created_at) VALUES($1, NOW()) RETURNING id', [data.pseudo]
                );
                playerId = newPlayer.rows[0].id;
            } else {
                playerId = result.rows[0].id;
            }

            // Ajouter à la file d'attente
            waitingQueue.push({
                id: playerId,
                socketId: socket.id,
                pseudo: data.pseudo,
                joinTime: new Date()
            });

            socket.emit('queueJoined', { position: waitingQueue.length });

            // Vérifier immédiatement si on peut créer un match
            checkWaitingQueue();

        } catch (err) {
            console.error('Erreur lors de l\'entrée en file d\'attente:', err);
            socket.emit('error', { message: 'Erreur lors de l\'entrée en file d\'attente' });
        }
    });

    // Jouer un coup
    socket.on('playTurn', async(data) => {
        const { matchId, column } = data;

        // Vérifier que le match existe
        if (!activeMatches[matchId]) {
            return socket.emit('error', { message: 'Ce match n\'existe pas ou est terminé' });
        }

        const match = activeMatches[matchId];

        // Identifier le joueur
        let player, opponent;
        if (socket.id === match.player1.socketId) {
            player = match.player1;
            opponent = match.player2;
        } else if (socket.id === match.player2.socketId) {
            player = match.player2;
            opponent = match.player1;
        } else {
            return socket.emit('error', { message: 'Vous ne participez pas à ce match' });
        }

        // Vérifier que c'est bien le tour du joueur
        const playerColor = player.color;
        if (match.currentTurn !== playerColor) {
            return socket.emit('error', { message: 'Ce n\'est pas votre tour' });
        }

        // Vérifier que la colonne est valide
        if (column < 0 || column >= 7) {
            return socket.emit('error', { message: 'Colonne invalide' });
        }

        // Trouver la ligne où le jeton va tomber
        const row = findAvailableRow(match.board, column);
        if (row === -1) {
            return socket.emit('error', { message: 'Cette colonne est pleine' });
        }

        // Placer le jeton
        match.board[row][column] = playerColor;
        match.turnCount++;

        // Sauvegarder le tour en BDD
        await saveTurn(matchId, player.id, column, row);

        // Vérifier s'il y a une victoire
        const hasWon = checkWin(match.board, row, column, playerColor);

        if (hasWon) {
            // Envoyer le dernier coup avant de terminer
            io.to(match.player1.socketId).emit('turnPlayed', {
                row,
                column,
                color: playerColor
            });
            io.to(match.player2.socketId).emit('turnPlayed', {
                row,
                column,
                color: playerColor
            });

            // Terminer le match
            return endMatch(matchId, player.id);
        }

        // Vérifier s'il y a match nul
        if (isBoardFull(match.board)) {
            // Envoyer le dernier coup avant de terminer
            io.to(match.player1.socketId).emit('turnPlayed', {
                row,
                column,
                color: playerColor
            });
            io.to(match.player2.socketId).emit('turnPlayed', {
                row,
                column,
                color: playerColor
            });

            // Terminer le match
            return endMatch(matchId, null);
        }

        // Changer de joueur
        match.currentTurn = match.currentTurn === 'red' ? 'yellow' : 'red';

        // Envoyer les mises à jour aux deux joueurs
        io.to(match.player1.socketId).emit('turnPlayed', {
            row,
            column,
            color: playerColor,
            isYourTurn: match.currentTurn === match.player1.color
        });

        io.to(match.player2.socketId).emit('turnPlayed', {
            row,
            column,
            color: playerColor,
            isYourTurn: match.currentTurn === match.player2.color
        });
    });

    // Quitter un match
    socket.on('leaveMatch', (data) => {
        const { matchId } = data;

        if (activeMatches[matchId]) {
            const match = activeMatches[matchId];

            // Identifier le gagnant (l'adversaire de celui qui quitte)
            let winnerId = null;

            if (socket.id === match.player1.socketId) {
                winnerId = match.player2.id;
            } else if (socket.id === match.player2.socketId) {
                winnerId = match.player1.id;
            }

            if (winnerId && !match.isFinished) {
                endMatch(matchId, winnerId);
            }
        }
    });

    // Quitter la file d'attente
    socket.on('leaveQueue', () => {
        waitingQueue = waitingQueue.filter(player => player.socketId !== socket.id);
        console.log(`${socket.id} a quitté la file d'attente`);
    });

    // Déconnexion
    socket.on('disconnect', () => {
        console.log(`Déconnexion: ${socket.id}`);

        // Enlever de la file d'attente
        waitingQueue = waitingQueue.filter(player => player.socketId !== socket.id);

        // Gérer les matchs actifs
        for (const matchId in activeMatches) {
            const match = activeMatches[matchId];

            if (!match.isFinished && (socket.id === match.player1.socketId || socket.id === match.player2.socketId)) {
                let winnerId = null;

                if (socket.id === match.player1.socketId) {
                    winnerId = match.player2.id;
                    io.to(match.player2.socketId).emit('opponentDisconnected');
                } else {
                    winnerId = match.player1.id;
                    io.to(match.player1.socketId).emit('opponentDisconnected');
                }

                endMatch(matchId, winnerId);
            }
        }
    });
});

// ======== ROUTES API =========

// Route principale pour servir le client
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

// Obtenir les statistiques d'un joueur
app.get('/api/players/:pseudo/stats', async(req, res) => {
    try {
        const { pseudo } = req.params;
        const player = await pool.query('SELECT id FROM players WHERE pseudo = $1', [pseudo]);

        if (player.rows.length === 0) {
            return res.status(404).json({ message: 'Joueur non trouvé' });
        }

        const playerId = player.rows[0].id;

        // Total des matchs joués
        const totalMatches = await pool.query(
            'SELECT COUNT(*) FROM matches WHERE player1_id = $1 OR player2_id = $1', [playerId]
        );

        // Victoires
        const wins = await pool.query(
            'SELECT COUNT(*) FROM matches WHERE winner = $1', [playerId]
        );

        // Matchs nuls
        const draws = await pool.query(
            'SELECT COUNT(*) FROM matches WHERE (player1_id = $1 OR player2_id = $1) AND is_finished = true AND winner IS NULL', [playerId]
        );

        // Défaites
        const total = parseInt(totalMatches.rows[0].count);
        const wonMatches = parseInt(wins.rows[0].count);
        const drawMatches = parseInt(draws.rows[0].count);
        const losses = total - wonMatches - drawMatches;

        res.json({
            pseudo,
            totalMatches: total,
            wins: wonMatches,
            draws: drawMatches,
            losses: losses,
            winRate: total > 0 ? Math.round((wonMatches / total) * 100) : 0
        });

    } catch (err) {
        console.error('Erreur lors de la récupération des statistiques:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Obtenir l'historique des matchs d'un joueur
app.get('/api/players/:pseudo/history', async(req, res) => {
    try {
        const { pseudo } = req.params;
        const player = await pool.query('SELECT id FROM players WHERE pseudo = $1', [pseudo]);

        if (player.rows.length === 0) {
            return res.status(404).json({ message: 'Joueur non trouvé' });
        }

        const playerId = player.rows[0].id;

        const matches = await pool.query(
            `SELECT 
                m.id, 
                m.created_at, 
                m.is_finished,
                CASE 
                    WHEN m.winner = $1 THEN 'victory'
                    WHEN m.winner IS NULL AND m.is_finished = true THEN 'draw'
                    WHEN m.winner IS NOT NULL THEN 'defeat'
                    ELSE 'in_progress'
                END as result,
                CASE 
                    WHEN m.player1_id = $1 THEN p2.pseudo
                    ELSE p1.pseudo
                END as opponent
            FROM matches m
            JOIN players p1 ON m.player1_id = p1.id
            JOIN players p2 ON m.player2_id = p2.id
            WHERE m.player1_id = $1 OR m.player2_id = $1
            ORDER BY m.created_at DESC
            LIMIT 10`, [playerId]
        );

        res.json(matches.rows);

    } catch (err) {
        console.error('Erreur lors de la récupération de l\'historique:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Obtenir le top 10 des joueurs
app.get('/api/leaderboard', async(req, res) => {
    try {
        const leaderboard = await pool.query(
            `SELECT 
                p.pseudo,
                COUNT(DISTINCT m.id) as total_matches,
                COUNT(CASE WHEN m.winner = p.id THEN 1 END) as wins,
                ROUND(COUNT(CASE WHEN m.winner = p.id THEN 1 END) * 100.0 / GREATEST(COUNT(DISTINCT m.id), 1)) as win_rate
            FROM players p
            LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id)
            GROUP BY p.id, p.pseudo
            HAVING COUNT(DISTINCT m.id) > 0
            ORDER BY wins DESC, win_rate DESC
            LIMIT 10`
        );

        res.json(leaderboard.rows);

    } catch (err) {
        console.error('Erreur lors de la récupération du classement:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
    console.log(`Pour y accéder depuis un autre ordinateur, utilisez http://<IP-DU-SERVEUR>:${PORT}`);
});