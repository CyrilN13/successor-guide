

## Problème identifié

À l'étape 3, les comptes bancaires n'apparaissent jamais après ajout, alors que les véhicules / biens immobiliers sont bien enregistrés (vérifié en base : 2 actifs présents, 0 compte_bancaire).

### Diagnostic technique

Le composant `Etape3Actif.tsx` utilise **un seul `useForm`** instancié au montage de la page avec `resolver: zodResolver(schema)`. Le problème :

1. **Le resolver est figé sur le type initial** (`compte_bancaire`). Quand l'utilisateur ouvre le formulaire pour un autre type (immobilier, véhicule…), le resolver continue à valider le schéma `compte_bancaire`. Les champs absents ne sont pas enregistrés par RHF, donc la validation passe par chance — c'est pour ça que les autres types fonctionnent.
2. **Pour `compte_bancaire` lui-même**, le resolver exige strictement `libelle`, `banque`, `solde > 0`. Si une erreur survient (ex: champ `solde` vidé, `banque` non rempli, ou erreur Supabase silencieuse), `onSubmit` n'est jamais appelé et **aucun toast d'erreur** ne s'affiche.
3. **Les erreurs Supabase sont avalées** : `await supabase.from("actif_items").insert(payload)` ne vérifie jamais `error`. Si RLS rejette ou si la colonne pose problème, l'utilisateur ne voit rien.
4. **Les détails JSONB contiennent des chaînes vides `""`** au lieu de `null` (visible en base sur véhicule : `annee: ""`). Sain mais peu propre.

### Bugs annexes confirmés en base

- Déclaration test `f932d9fe…` (current_step=2) : aucun item — confirme que les comptes bancaires ne se sauvegardent pas.
- Déclaration `c08acda1…` : que des immobilier/véhicule, jamais de compte bancaire malgré les tentatives.

## Plan de correction

### 1. Recréer le `useForm` à chaque changement de type

Utiliser une `key` sur le composant `<Dialog>` ou faire un `form.reset` qui inclut un changement de resolver. Le plus propre : extraire le formulaire modal dans un sous-composant `<AssetDialogForm type={activeType} … />` qui reçoit `activeType` en prop et instancie son propre `useForm` avec le bon schéma. Démontage/remontage automatique au changement de type via `key={activeType}`.

### 2. Gérer les erreurs Supabase explicitement

Dans `onSubmit` :
```ts
const { error } = await supabase.from("actif_items").insert(payload);
if (error) {
  toast.error("Erreur lors de l'enregistrement : " + error.message);
  return;
}
```
Idem pour `update` et `delete`.

### 3. Afficher un toast en cas de validation échouée

Passer un second handler `onInvalid` à `form.handleSubmit(onSubmit, onInvalid)` qui affiche un toast récapitulant les champs manquants — l'utilisateur saura immédiatement qu'il doit corriger le formulaire.

### 4. Nettoyer le payload `details`

Convertir les `""` en `null` avant d'écrire dans Supabase pour éviter du bruit dans les JSONB.

### 5. Recharger après insertion : déjà OK

`loadItems(declarationId)` est bien appelé après `track()`. Le bug d'affichage venait uniquement du fait que l'insert n'avait jamais lieu.

## Fichiers concernés

- `src/pages/Etape3Actif.tsx` — refactor : extraction du modal en sous-composant `AssetDialogForm` avec `useForm` propre + gestion des erreurs Supabase + toasts validation.

## Résultat attendu

- Ajout d'un compte bancaire fonctionnel (apparaît immédiatement dans la catégorie ouverte).
- Toute erreur (validation ou réseau/RLS) remonte sous forme de toast clair.
- Aucun changement visuel hormis les messages d'erreur.

