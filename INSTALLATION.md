# Guide d'installation du jeu Puissance 4 multi-joueurs

Ce guide vous explique comment installer et configurer le jeu Puissance 4 pour que plusieurs personnes puissent jouer sur des ordinateurs différents.

## Prérequis

- Node.js (v14 ou supérieur)
- PostgreSQL (v12 ou supérieur)
- Deux ordinateurs ou plus sur le même réseau local

## Installation du serveur

Suivez ces étapes sur l'ordinateur qui servira de serveur de jeu:

### 1. Préparation du système

```bash
# Cloner le projet
git clone <url-du-depot> puissance4-matchmaking
cd puissance4-matchmaking

# Installer les dépendances
npm install
```

### 2. Configuration de la base de données

1. Assurez-vous que PostgreSQL est installé et en cours d'exécution
2. Créez une base de données PostgreSQL:

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans l'invite PostgreSQL
CREATE DATABASE puissance4_db;
\c puissance4_db
```

3. Exécutez le script de création de la base de données:

```bash
# Depuis l'invite PostgreSQL
\i database.sql

# Ou depuis la ligne de commande
psql -U postgres -d puissance4_db -f database.sql
```

### 3. Configuration du serveur

1. Modifiez la configuration de la base de données dans `server.js` si nécessaire:

```javascript
const pool = new Pool({
    user: 'postgres',      // Votre nom d'utilisateur PostgreSQL
    host: 'localhost',     // L'hôte de votre base de données
    database: 'puissance4_db',
    password: 'password',  // Votre mot de passe PostgreSQL
    port: 5432,
});
```

2. Créez un dossier `public` à la racine du projet:

```bash
mkdir public
```

3. Copiez les fichiers clients dans le dossier `public`:

```bash
cp client.html public/
cp client.css public/
cp client.js-modified public/client.js
```

### 4. Démarrage du serveur

1. Lancez le serveur:

```bash
node server.js
```

2. Notez l'adresse IP de votre machine:
   - Sur Windows, utilisez `ipconfig` dans le terminal
   - Sur Linux/Mac, utilisez `ifconfig` ou `ip addr show`

Le serveur devrait afficher un message comme:
```
Serveur démarré sur http://0.0.0.0:3000
Pour y accéder depuis un autre ordinateur, utilisez http://<IP-DU-SERVEUR>:3000
```

## Connexion des clients

Sur chaque ordinateur client:

1. Ouvrez un navigateur web (Chrome, Firefox, Edge, Safari)
2. Accédez à l'URL: `http://<IP-DU-SERVEUR>:3000`
   - Remplacez `<IP-DU-SERVEUR>` par l'adresse IP de l'ordinateur qui exécute le serveur
   - Par exemple: `http://192.168.1.100:3000`

3. Entrez un pseudo différent sur chaque ordinateur
4. Cliquez sur "Jouer" pour rejoindre la file d'attente

## Résolution des problèmes

### Le client ne peut pas se connecter au serveur

1. Vérifiez que le client et le serveur sont sur le même réseau
2. Assurez-vous que le port 3000 n'est pas bloqué par un pare-feu
3. Vérifiez que l'adresse IP est correcte

### Problèmes de base de données

1. Vérifiez que PostgreSQL est en cours d'exécution
2. Vérifiez les identifiants dans le fichier `server.js`
3. Assurez-vous que la base de données `puissance4_db` existe

### Le serveur ne démarre pas

1. Vérifiez que vous avez installé toutes les dépendances avec `npm install`
2. Vérifiez les logs d'erreur dans la console
3. Assurez-vous que le port 3000 n'est pas déjà utilisé par une autre application

## Configuration avancée

### Changer le port du serveur

Si vous souhaitez utiliser un port différent de 3000, modifiez la variable `PORT` dans `server.js` et dans `client.js`:

```javascript
// Dans server.js
const PORT = process.env.PORT || 5000;

// Dans client.js
const PORT = "5000";
```

### Déploiement sur Internet

Pour rendre le jeu accessible depuis Internet:

1. Déployez le serveur sur un service d'hébergement (Heroku, DigitalOcean, AWS, etc.)
2. Configurez les règles de pare-feu pour autoriser les connexions au port utilisé
3. Utilisez le nom de domaine ou l'adresse IP publique dans la configuration client