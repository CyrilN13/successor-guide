

# Déesse — Structure de base

## Design System
- Couleurs : bleu nuit `#1a2238`, blanc cassé `#faf9f6`, accent doré `#c9a961`
- Typos : Playfair Display (titres), Inter (corps) — chargées via Google Fonts
- Variables CSS personnalisées adaptées au thème

## Layout
- **Header** : logo textuel "Déesse" en Playfair Display doré, navigation minimale
- **Footer** : mention "Outil d'assistance administrative — Ne constitue pas un conseil juridique"
- Layout wrapper réutilisable pour toutes les pages

## Routes (pages vides avec titre)
- `/` — Accueil ("Déclaration de succession guidée")
- `/choix-mode` — Choix du mode
- `/diagnostic` — Diagnostic
- `/etape/1` à `/etape/6` — Étapes du formulaire
- `/synthese` — Synthèse
- `/connexion` — Connexion
- `/inscription` — Inscription

## Composants shadcn/ui
Button, Input, Card, Dialog, Alert, Progress, RadioGroup, Checkbox, Textarea, Select sont déjà installés ou seront vérifiés.

## Approche
- Mobile-first responsive
- Toutes les pages affichent un titre placeholder dans le layout
- Aucune mention de notaire nulle part

