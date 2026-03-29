<!--
Sync Impact Report:
- Version change: placeholder → 1.0.0
- Modified principles: [PRINCIPLE_1_NAME]..[PRINCIPLE_5_NAME] replaced with concrete project principles
- Added sections: Deployment and Stack Constraints; Development Workflow
- Removed sections: none
- Templates requiring updates: ✅ .specify/templates/plan-template.md (Review complete)
  ✅ .specify/templates/spec-template.md (Review complete)
  ✅ .specify/templates/tasks-template.md (Review complete)
  ⚠ No commands template folder present; no action required
- Follow-up TODOs: none
-->

# MovieQuizz Constitution

## Core Principles

### I. Frontend-first architecture (No backend unless unavoidable)
Le projet doit prioriser un SPA JavaScript déployable sur Render en mode static site, sans couche serveur dédiée. L’application se base sur TMDb (https://www.themoviedb.org/) pour récupérer les indices de film (titre, synopsis, poster, acteurs, metadata). Les clés TMDb sont stockées en variables d’environnement, et tous les appels réseau passent par HTTPS.

### II. Gameplay clair et crédités via indices
L’expérience utilisateur doit être centrée sur le mécanisme : l’utilisateur commence avec un crédit initial (ex: 100 points), dépense des crédits pour débloquer des indices (caractéristiques, images, poster, acteurs). Le coût d’indice varie par type (ex : poster 30, acteurs 20, synopsis 15, genre 10, année 5). Après chaque indice débloqué, le joueur peut tenter une réponse via recherche auto-complétée.

### III. Recherche assistée sûreté & intégrité
La saisie de réponse se fait via un champ de recherche avec autocomplétion TMDb sécurisée. L’application doit vérifier le film deviné (ID TMDb) et bloquer les réponses non valides. Les réponses sont traitées localement et aucune donnée privée n’est exposée.

### IV. Observabilité et résilience du jeu
L’application doit tracker les événements critiques : démarrage de partie, achat d’indice, tentative de réponse, succès/échec, erreurs API. En cas de panne TMDb, un message utilisateur clair s’affiche et une tentative de reconnexion est proposée. Les erreurs via logs console doivent être accompagnées de diagnostics exploitables.

### V. Simplicité, performance, accessibilité et usage raisonnable API
Architecture minima pour une charge d’usage basique (1-5 concurrent, jeu solo). Bundle compressé (gzip < 500KB), Lighthouse >= 90, accessibilité WCAG AA (clavier, lecture). Limiter les appels TMDb (cache local via sessionStorage/max-age 5min) pour respecter les quotas API et réduire latence.

## Deployment and Stack Constraints

L’application est déployée sur Render avec un pipeline CI/CD pour build statique (ex: Vite, Next.js static export, ou équivalent). Pas de DB serveur en v1. Les secrets (API keys) sont gérés via les variables d’environnement Render et ne sont pas stockés dans le code source.

## Development Workflow

- Branche principale : `main` (déployée automatiquement après tests verts)
- Travail en feature branches : `feature/...` ou `fix/...`
- PR obligatoire, revue par au moins un pair, validation des tests unitaires et E2E.
- Tests automatisés exigés pour chaque composant : unité + intégration UI.
- Révisions de sécurité & dépendances avant chaque release majeure.

## Governance

La Constitution prévaut sur les pratiques locales. Toute modification demande :
1. Proposition dans PR ciblant `.specify/memory/constitution.md`.
2. Au moins un approbateur externe au contributeur.
3. Mise à jour de la section "Synch Impact Report".
4. Revue des templates (`plan-template.md`, `spec-template.md`, `tasks-template.md`) pour la cohérence.

Les projets doivent documenter les écarts non-évités et les corrigés d’ici la release suivante.

**Version**: 1.0.0 | **Ratified**: 2026-03-29 | **Last Amended**: 2026-03-29
