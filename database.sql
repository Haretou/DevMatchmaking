-- Création de la base de données
CREATE DATABASE puissance4_db;

-- Connexion à la base de données
\c puissance4_db;

-- Table des joueurs
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudo VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

-- Table des matchs
CREATE TABLE matches (
    id UUID PRIMARY KEY,
    player1_id UUID NOT NULL REFERENCES players(id),
    player2_id UUID NOT NULL REFERENCES players(id),
    is_finished BOOLEAN NOT NULL DEFAULT false,
    winner UUID REFERENCES players(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Table des tours de jeu
CREATE TABLE turns (
    id SERIAL PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id),
    player_id UUID NOT NULL REFERENCES players(id),
    column_played INTEGER NOT NULL CHECK (column_played >= 0 AND column_played < 7),
    row_played INTEGER NOT NULL CHECK (row_played >= 0 AND row_played < 6),
    created_at TIMESTAMP NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_turns_match ON turns(match_id);
CREATE INDEX idx_turns_player ON turns(player_id);

-- Fonction pour mettre à jour automatiquement les timestamps updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour les timestamps
CREATE TRIGGER update_players_modtime
BEFORE UPDATE ON players
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_matches_modtime
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Vue pour faciliter les statistiques des joueurs
CREATE VIEW player_stats AS
SELECT 
    p.id,
    p.pseudo,
    COUNT(DISTINCT m.id) as total_matches,
    COUNT(CASE WHEN m.winner = p.id THEN 1 END) as wins,
    COUNT(CASE WHEN m.is_finished = true AND m.winner IS NULL THEN 1 END) as draws,
    COUNT(CASE WHEN m.is_finished = true AND m.winner IS NOT NULL AND m.winner != p.id THEN 1 END) as losses,
    ROUND(COUNT(CASE WHEN m.winner = p.id THEN 1 END) * 100.0 / GREATEST(COUNT(DISTINCT m.id), 1)) as win_rate
FROM players p
LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id)
GROUP BY p.id, p.pseudo;