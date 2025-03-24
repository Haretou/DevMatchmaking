# Puissance 4 avec Matchmaking

Ce projet implémente un système de matchmaking pour le jeu Puissance 4, permettant aux joueurs de s'affronter en local. Le système comprend un serveur de matchmaking, un client web et une base de données pour suivre les statistiques des joueurs.

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
