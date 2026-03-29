# MovieQuizz

Une web app de devinette de film basée sur l'API TMDb.

## Démarrage

1. Installer les dépendances:
   ```bash
   npm install
   ```
2. Ajouter la variable d'environnement TMDb:
   - Sur Windows (PowerShell):
     ```bash
     $env:VITE_TMDB_API_KEY='votre_cle'
     ```
3. Lancer le mode dev:
   ```bash
   npm run dev
   ```
4. Construire:
   ```bash
   npm run build
   ```

## Règles de base

- Frontend-first, déploiement Netlify/Render static
- Jeu solo, crédit de départ 100
- Indices : année, genre, synopsis, poster, acteurs
- Autocomplétion de titre via TMDb
