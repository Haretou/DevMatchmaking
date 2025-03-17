# Puissance 4 avec Matchmaking

Ce projet implémente un système de matchmaking pour le jeu Puissance 4, permettant aux joueurs de s'affronter en ligne. Le système comprend un serveur de matchmaking, un client web et une base de données pour suivre les statistiques des joueurs.

## Fonctionnalités

### Serveur de Matchmaking
- File d'attente pour les joueurs cherchant une partie
- Création automatique de matchs entre joueurs
- Gestion de la logique du jeu Puissance 4
- Stockage des données de jeu (joueurs, matchs, coups joués)
- API REST pour accéder aux statistiques et à l'historique des parties

### Client Web
- Interface utilisateur pour rejoindre la file d'attente
- Plateau de jeu interactif
- Visualisation du profil joueur et statistiques
- Classement des meilleurs joueurs
- Historique des parties jouées

### Base de données
- Stockage des données des joueurs
- Suivi des matchs et de leur résultat
- Historique de tous les coups joués

## Technologies utilisées

### Backend
- Node.js
- Express.js
- Socket.IO pour la communication en temps réel
- PostgreSQL pour la base de données

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Socket.IO client pour la communication en temps réel

## Installation

### Prérequis
- Node.js (v14+ recommandé)
- PostgreSQL (v12+ recommandé)

### Étapes d'installation

1. Cloner le dépôt
```bash
git clone https://github.com/votre-nom/puissance4-matchmaking.git
cd puissance4-matchmaking
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer la base de données PostgreSQL
   - Créer une base de données PostgreSQL
   - Exécuter le script `database.sql` pour initialiser les tables

4. Configurer les variables d'environnement
   - Créer un fichier `.env` basé sur `.env.example`
   - Renseigner les informations de connexion à la base de données

5. Démarrer le serveur
```bash
npm start
```

6. Ouvrir le client
   - Ouvrir `client.html` dans un navigateur web
   - Pour tester avec plusieurs joueurs, ouvrir plusieurs fenêtres de navigateur

## Structure des fichiers

```
├── server.js           # Serveur principal (Express + Socket.IO)
├── database.sql        # Script d'initialisation de la base de données
├── package.json        # Configuration npm
├── client.html         # Interface utilisateur
├── client.css          # Styles de l'interface
└── client.js           # Logique client et communication avec le serveur
```

## Fonctionnement du matchmaking

1. Le joueur saisit son pseudo et rejoint la file d'attente
2. Le serveur vérifie régulièrement la file d'attente et associe les joueurs par paires
3. Une fois deux joueurs associés, un match est créé et les joueurs sont notifiés
4. Les joueurs jouent au Puissance 4 à tour de rôle
5. Le serveur vérifie après chaque coup si un joueur a gagné ou si le plateau est plein
6. Le résultat du match est sauvegardé et les joueurs peuvent rejouer ou consulter leurs statistiques

## Architecture du code

Ce projet suit une architecture client-serveur avec communication en temps réel via Socket.IO:

- Le serveur gère la logique métier, la file d'attente, la création des matchs et la vérification des règles
- Le client gère l'interface utilisateur et envoie les actions du joueur au serveur
- La base de données stocke les informations persistantes (joueurs, matchs, coups)

Le code est structuré de manière orientée objet pour faciliter la maintenance et l'évolution future.

## Améliorations possibles

- Ajout d'un système d'authentification
- Implémentation d'un matchmaking basé sur les niveaux (ELO)
- Ajout d'une IA pour jouer contre l'ordinateur
- Mode spectateur pour observer des parties en cours
- Système de chat entre joueurs
- Support pour d'autres jeux de plateau
