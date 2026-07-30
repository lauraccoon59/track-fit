# TrackFit

Application PWA mobile-first de suivi de musculation, entièrement utilisable hors connexion.

## Technologies

- React + TypeScript
- Vite
- Tailwind CSS
- Dexie (IndexedDB)
- vite-plugin-pwa
- React Router
- Lucide React

## Installation

```bash
npm install
```

## Lancement (développement)

```bash
npm run dev
```

Ouvre ensuite l’URL affichée dans le terminal (généralement `http://localhost:5173`).

## Build de production

```bash
npm run build
```

Pour prévisualiser le build :

```bash
npm run preview
```

## Installation de la PWA sur iPhone

1. Déploie ou ouvre l’application via **HTTPS** (requis pour l’installation, sauf `localhost`).
2. Ouvre le site dans **Safari**.
3. Appuie sur le bouton **Partager**.
4. Choisis **Sur l’écran d’accueil**.
5. Confirme avec **Ajouter**.

L’icône « TrackFit » apparaît alors sur l’écran d’accueil et s’ouvre en mode autonome.

## Architecture du projet

```
src/
  components/     # Layout, chronomètre, bilan pré-séance, saisie de séries, graphique
  context/        # Thème clair/sombre + chronomètre de repos global
  data/           # Programme initial (séances A, B, C)
  db/             # Base Dexie (sessions, réglages, programme)
  pages/          # Accueil, Séance, Historique, Progression, Réglages
  types/          # Types TypeScript partagés
  utils/          # Helpers séance, progression double (8–12 / 10–15)
public/           # Icônes PWA et favicon
```

### Données

Toutes les données vivent dans **IndexedDB** via Dexie :

- `sessions` — séances en cours, terminées ou abandonnées
- `settings` — thème et surcharges de temps de repos
- `program` — exercices modifiables (séries, plages de répétitions)

Aucun serveur ni authentification : export / import JSON pour la sauvegarde.

### Parcours principal

1. **Accueil** — prochaine séance, résumé de la semaine, dernier résultat aux tractions
2. **Bilan rapide** — fatigue, genoux, futsal, match proche (recommandations non bloquantes)
3. **Séance** — saisie série par série, supersets, chronomètre de repos, suggestion d’augmentation de charge
4. **Historique / Progression / Réglages** — consultation, graphiques, personnalisation et sauvegarde

### Hors connexion

Le service worker (Workbox via `vite-plugin-pwa`) met en cache l’application. Une fois installée ou visitée, l’UI et IndexedDB restent disponibles sans réseau.
