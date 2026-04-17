

## Root cause (confirmed via DB query)

Two independent problems combine to break steps 5 and 6:

### Bug A — RLS bloque `defunts`, `donations`, `calculation_results`, `uploaded_documents` pour les anonymes

Vérification base : sur les 5 dernières déclarations, **0 ligne `defunts`** existe. Toutes les autosaves de l'étape 1 sont silencieusement rejetées.

Les tables `actif_items`, `heritiers`, `passif_items` ont des policies `anon_insert/select/update/delete` correctement configurées. Mais `defunts`, `donations`, `calculation_results` et `uploaded_documents` n'ont qu'une policy `*_via_declaration` qui exige `d.user_id = auth.uid()`. En mode anonyme `auth.uid()` est null → tous les insert/update sont rejetés silencieusement (le code ne vérifie pas `error`).

### Bug B — `Synthese.tsx` lit la mauvaise clé localStorage

Ligne 100 : `localStorage.getItem("deesse_declaration_id")`. Cette clé **n'est jamais écrite** ailleurs dans l'app (toutes les pages utilisent `deesse_token`). Donc à l'étape 6 la valeur est `null` → redirection forcée vers `/etape/1`. C'est pour ça que "Sauvegarder et continuer" à l'étape 5 (qui pousse vers `/etape/6`) renvoie immédiatement à l'étape 1.

## Plan de correction

### 1. Migration SQL — ajouter les policies anon manquantes

Sur 4 tables (`defunts`, `donations`, `calculation_results`, `uploaded_documents`) ajouter les 4 policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) pour `anon, authenticated` avec la même condition que les autres tables :
```sql
EXISTS (SELECT 1 FROM declarations d
        WHERE d.id = <table>.declaration_id
          AND d.user_id IS NULL
          AND d.anonymous_token IS NOT NULL)
```

### 2. `Synthese.tsx` — fallback robuste sur le token

Remplacer la lecture de `deesse_declaration_id` par : si présente l'utiliser, sinon récupérer la déclaration via `anonymous_token = localStorage.getItem("deesse_token")` (même pattern que `Etape1Defunt.tsx`). Si toujours rien → redirect étape 1.

### 3. Feedback d'erreur sur l'autosave étape 1

Dans `Etape1Defunt.tsx` `autoSave()` : vérifier `{ error }` du upsert et passer `saveStatus` à `"error"` + un toast pour que l'utilisateur ne saisisse plus 30 minutes dans le vide.

### 4. Vérifier les autres pages utilisant `deesse_declaration_id`

Recherche rapide pour s'assurer qu'aucune autre page ne dépend de cette clé fantôme — sinon appliquer le même fallback token.

## Pas besoin d'inscription forcée

L'inscription anonyme fonctionne correctement pour `actif_items`/`heritiers`/`passif_items`. Le problème est purement RLS sur 4 tables oubliées + un bug de clé localStorage. Pas besoin de bloquer l'utilisateur derrière une création de compte.

## Fichiers concernés

- nouvelle migration SQL — 16 policies à créer
- `src/pages/Synthese.tsx` — fallback token
- `src/pages/Etape1Defunt.tsx` — gestion d'erreur `upsert` + toast

## Résultat attendu

- La date de décès se sauvegarde réellement → l'alerte étape 5 disparaît.
- Le bouton "Sauvegarder et continuer" navigue bien vers `/etape/6` au lieu de revenir étape 1.
- Toute future erreur RLS apparaîtra immédiatement à l'écran.

