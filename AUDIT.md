# Famille TCG — Audit & changelog v20

Méthode : lecture du code + **test réel dans Chromium sans tête** (hors ligne, partie contre le bot, cartes jouées) à 390×780, 360×640, 844×390 (paysage) et 1280×720 (PC). Le multijoueur / Firebase n'a **pas** pu être testé (réseau bloqué).
Les règles du jeu n'ont pas été modifiées.

## 1. Bugs corrigés

| # | Bug | Cause | Correctif |
|---|-----|-------|-----------|
| 1 | Grand vide en bas du plateau (mobile) | Grille à 6 lignes alors que `#action-log` et `#mulligan-overlay` (position:absolute) ne comptent pas → les `1fr` tombent sur le séparateur et la main | Grille à 5 lignes + placement explicite (style.css) |
| 2 | Page qui déborde / scroll fantôme (mobile) | `100vh` > écran réellement visible (barre d'adresse) + padding des zones de sécurité | `--app-h` = `100dvh` − safe-areas, remplace les 9 `100vh` |
| 3 | « Jouer cette carte / Fermer » affichés en permanence | **Aucun CSS n'existait** pour la visionneuse de carte (HTML+JS présents, style absent) | Section 13 : masquée par défaut, `.open` l'affiche |
| 4 | Menu inaccessible hors partie (mobile) | Bouton ☰ avec la classe `hidden` (`display:none !important`), jamais retirée | Classe retirée du HTML + garde-fou CSS |
| 5 | Bannière « À toi de jouer » en colonne étroite | `left:50%` + `translateX(-50%)` limite la largeur à 50 % | `width:max-content; white-space:nowrap` |
| 6 | Pastille « Terrain » coupée hors écran | Libellé texte plus large que la colonne | Icône 🏡 compacte sur mobile |
| 7 | Texte de carte qui déborde du cadre | `ajusterTextes()` s'arrête à la taille mini sans masquer | `overflow:hidden` après ajustement |
| 8 | PC : main de cartes coupée sous l'écran, nav sur 2 lignes | Barre de nav + écran à `100vh` | `--nav-h` mesuré par ResizeObserver ; nav sur 1 ligne ≤ 1500 px |
| 9 | Layout mobile figé au chargement | Détection `is-mobile` faite une seule fois | `majClasseMobile()` : rotation, redimensionnement, tablettes, fenêtre étroite |
| 10 | **Faille XSS** | Pseudo, nom de deck, code ami, nom/desc/emoji de carte injectés dans `innerHTML` sans échappement (9 emplacements) | `esc()` partout |
| 11 | Écoute Firebase `cartesBannies` enregistrée 2 fois | `chargerCartesBannies()` + `setupFirebaseListeners()` | Écoute unique et idempotente |
| 12 | Visionneuse : « Pas assez de mana » affiché pendant le tour adverse | Un seul message pour deux cas | « ⏳ Tour de l'adversaire » |
| 13 | Déconnexion : le joueur reste « en ligne » un moment | Pas de `remove()` avant le rechargement | `fbUserRef.remove()` |
| 14 | Chargement lent | Polices sans `swap` effectif côté rendu, scripts bloquants | `defer`, `theme-color`, favicon (évite un 404), `noscript` |

## 2. Améliorations visuelles / ergonomiques ajoutées

- Tokens (espacements, rayons, ombres, courbe d'animation, typo fluide), focus clavier visible, transitions hover/active partout, cibles tactiles 44–48 px, `prefers-reduced-motion`.
- Plateau mobile portrait : bandeau héros + plateau pleine largeur (4 cartes visibles), main plus grande avec léger chevauchement et centrage automatique.
- Ambiance : vignette, « couloirs » lumineux par camp, séparateur lumineux, badges PV/mana en dégradé.
- Cartes jouables : lévitation + halo vert pulsé ; créature prête à attaquer : anneau net ; halo épique/légendaire.
- Bouton « Fin du tour » avec pulsation discrète.
- Paysage téléphone dédié ; petits écrans ≤ 360 px.
- Accessibilité : rôles `dialog`, navigation clavier, Échap, `aria-live` (journal, tour), labels des champs.

## 3. Constats NON corrigés (décision ou test requis de ta part)

1. **Règles de sécurité Firebase** — à vérifier en priorité. Les fonctions `adminMaxCoins`, `adminToutDebloquer`… sont globales côté client : n'importe qui peut les appeler depuis la console. Seules les *règles* Firebase peuvent l'empêcher (écriture de `admin`, pièces, collection, `cartesBannies`, `motd`).
2. **`messagesPrives`** : l'écoute est faite sur toute la branche racine (télécharge tout, y compris les conversations des autres si les règles le permettent). De plus `child_added` reçoit une *conversation*, donc `msg.ts` est indéfini et la notification « Nouveau message » ne se déclenche probablement jamais. À refaire par conversation.
3. **`salles`** : écoute de toute la branche à chaque changement (coût réseau croissant) et une salle ancienne contenant ton pseudo peut relancer un combat. Préférer un nœud `joueurs/{id}/invitation` ou une requête indexée.
4. **Architecture** : `app.js` = 4 200 lignes, ~230 fonctions globales, `var` globaux, ~70 `innerHTML`. Découpage en modules (état, rendu, réseau, tutoriel, admin) et `let/const` recommandés, mais non fait ici sans jeu de tests : risque de régression sur les règles.
5. **Cartes** : à petite taille (main mobile) le texte reste minuscule ; la visionneuse compense. Envisager une icône de mot-clé à la place du texte sur le plateau.

## 4. Pour aller vers Duel Links / Pokémon TCG Pocket

Priorité haute : animations d'attaque (élan + impact + secousse + chiffres flottants existants), écran de victoire/défaite cinématique, ouverture de booster animée (déchirure, révélation carte par carte), sons + vibration, illustrations à la place des emojis, PWA (manifest + service worker : installation et jeu hors ligne), écran de chargement, classement / saisons, replay.
