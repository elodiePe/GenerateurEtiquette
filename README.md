# Générateur d'étiquettes (CH)

Petit site local (installable sur ordinateur ou téléphone) qui recrée le formulaire
d'étiquette "Grande Lettre A Mail" : tu choisis un expéditeur enregistré, tu saisis le
code DigitalStamp et l'adresse du destinataire, et ça génère l'étiquette à imprimer
(10×15cm, A6, ou enveloppe C4).

- **L'expéditeur** est stocké dans une vraie base de données (Supabase), protégée par
  un vrai login.
- **Le destinataire n'est jamais stocké nulle part** — les champs ne vivent que dans le
  formulaire, le temps d'imprimer.

## 1. Créer le projet Supabase (gratuit)

1. Va sur [supabase.com](https://supabase.com) et crée un compte / un nouveau projet.
2. Dans **SQL Editor**, colle et exécute ceci pour créer la table des expéditeurs :

   ```sql
   create table senders (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) default auth.uid(),
     name text not null,
     address text not null,
     npa text not null,
     city text not null,
     country text not null default 'Suisse',
     phone text,
     website text,
     created_at timestamptz not null default now()
   );

   alter table senders enable row level security;

   create policy "Users manage their own senders"
     on senders
     for all
     using (auth.uid() = user_id)
     with check (auth.uid() = user_id);
   ```

   Cela garantit que même avec la clé publique, personne ne peut voir ou modifier les
   expéditeurs d'un autre compte.

   ⚠️ Si tu as déjà créé la table `senders` avant l'ajout du champ "site web", exécute
   en plus ceci dans le SQL Editor pour l'ajouter :

   ```sql
   alter table senders add column website text;
   ```

3. Dans **Authentication → Users**, clique "Add user" et crée-toi un compte (email +
   mot de passe) — c'est cet email/mot de passe que tu utiliseras pour te connecter au
   site. Pas besoin d'activer l'inscription publique : seul toi auras un compte.

4. Dans **Project Settings → API**, copie :
   - "Project URL"
   - la clé "anon public"

## 2. Configurer le site

Ouvre `config.js` et remplace les deux valeurs :

```js

```

La clé "anon" est **publique par design** chez Supabase (elle est faite pour être dans
le code front-end) — la vraie protection vient des policies RLS créées à l'étape 1.

## 3. Lancer en local

Aucune installation nécessaire : ouvre simplement `index.html` dans un navigateur, ou
lance un petit serveur local si ton navigateur bloque les requêtes :

```bash
npx serve .
```

Sur ton téléphone, connecte-le au même réseau Wi-Fi que l'ordinateur et ouvre
l'adresse affichée par `npx serve` (ex: `http://192.168.1.x:3000`).

## 4. Utilisation

1. Se connecter avec l'email/mot de passe créé à l'étape 1.3.
2. "+ Ajouter un expéditeur" une fois — il reste ensuite enregistré pour les prochains
   envois, sélectionnable dans le menu déroulant.
3. Remplir le code DigitalStamp (3 groupes de 4 caractères, comme indiqué dans l'app
   La Poste) et l'adresse du destinataire.
4. Choisir le format (10×15cm, A6, ou enveloppe C4).
5. "Imprimer / Enregistrer en PDF" — utilise l'impression du navigateur (choisir
   "Enregistrer en PDF" comme imprimante si besoin), la taille de page est déjà réglée
   sur le format choisi.

## 5. Publier sur GitHub Pages

Le dépôt est sur [github.com/elodiePe/GenerateurEtiquette](https://github.com/elodiePe/GenerateurEtiquette).

Pour activer GitHub Pages : **Settings → Pages → Build and deployment → Source: "Deploy from a branch"
→ Branch: `main` / `/ (root)` → Save**.

Le site sera accessible à `https://elodiepe.github.io/GenerateurEtiquette/`.

⚠️ `config.js` contenant l'URL et la clé "anon" sera visible publiquement — c'est normal
et sans danger tant que les policies RLS de l'étape 1 sont en place.
