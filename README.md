# Trombinoscope & organigramme

Génère automatiquement, à partir d'un onglet RH, un trombinoscope et un
organigramme sous forme de deux présentations Google Slides — régénérables à
la demande ou chaque jour, sans jamais casser le lien vers les fichiers déjà
partagés.

## Deux sources pour l'effectif

- **RH manuel** (par défaut) : vous complétez et corrigez l'onglet `RH`
  vous-même. Aucun droit particulier requis.
- **Annuaire Google Workspace** : `RH` devient un miroir de l'annuaire,
  resynchronisé à chaque régénération (Prénom, Nom, Poste, Service, Manager,
  Actif). Une correction manuelle de ces colonnes ne survit pas à la
  synchronisation suivante — corrigez la donnée dans l'annuaire, pas dans
  l'onglet. La colonne `Photo` n'est en revanche **jamais** synchronisée,
  dans aucun des deux modes : toujours modifiable à la main. Nécessite un
  compte administrateur Workspace (ou délégué) pour synchroniser.

Le choix se fait dans `Config > Source de l'effectif`, et se change à tout
moment sans toucher au code. Les photos suivent le même principe, séparément
(`Config > Source des photos` : dossier Drive ou photo de profil Workspace).

## Interface en français ou en anglais

`Config > Langue de l'interface` (« Français » ou « English ») pilote le
menu, les boîtes de dialogue, l'onglet `Guide` et le texte des présentations
générées (page de titre, titres de diapositive, messages d'alerte). Changer
ce réglage prend effet immédiatement, y compris sur le `Guide` qui est
régénéré à chaque installation.

Les en-têtes et les clés des onglets `RH` et `Config`, ainsi que les valeurs
des listes déroulantes (« RH manuel », « Dossier Drive », etc.), restent en
français dans les deux cas : ce sont des identifiants dont dépend la lecture
du classeur par le code, pas de la prose à traduire.

## Présentation soignée, pas seulement un export brut

Chaque présentation s'ouvre sur une page de titre (nom de l'entreprise si
renseigné dans `Config`, effectif, date de génération) suivie d'une légende
des couleurs de service — la même couleur retrouvée sur les bordures de
l'organigramme et sous les photos du trombinoscope. L'organigramme utilise
des connecteurs en coude, la convention visuelle habituelle d'un
organigramme plutôt qu'un rendu utilitaire à base de lignes diagonales.
Toutes les boîtes de dialogue du menu proposent un lien direct vers chaque
présentation, sans avoir à aller le chercher dans `Config`.

## Pourquoi deux présentations, pas une

Un trombinoscope se consulte comme une liste ; un organigramme se lit comme
une carte. Les regrouper dans un seul fichier aurait forcé un compromis sur
les deux mises en page. Chacun garde son fichier, son URL stable (régénérer
ne change jamais l'identifiant du fichier, donc jamais les droits de partage
déjà accordés) et sa propre logique de pagination.

## Installation

Ce projet est un script **lié à un classeur Google Sheets** — il ne
fonctionne pas de façon autonome, et ce n'est pas un oubli : chaque
régénération s'exécute avec les droits de la personne qui l'a déclenchée.

1. Créez un Google Sheet, puis **Extensions > Apps Script** pour lui
   attacher un projet.
2. Récupérez son identifiant de script (**Paramètres du projet**, ou dans
   l'URL `.../projects/<ID>/edit`) et créez à la racine de ce dossier un
   fichier `.clasp.json` :
   ```json
   { "scriptId": "VOTRE_ID_DE_SCRIPT", "rootDir": "apps-script" }
   ```
3. Poussez le code :
   ```bash
   clasp push
   ```
4. Ouvrez le Sheet, rechargez-le : le menu **RH** apparaît.
5. **RH > Installer les onglets**, puis réglez l'onglet `Config` :
   - laissez « Source de l'effectif » à `RH manuel` et complétez l'onglet
     `RH` vous-même, **ou**
   - passez-la à `Annuaire Google Workspace` et lancez **RH > Synchroniser
     l'effectif depuis l'annuaire** pour vérifier le résultat avant de
     régénérer les présentations.
6. **RH > Régénérer maintenant**.

Pour essayer avec un effectif fictif plus fourni (30 personnes, 4 niveaux
hiérarchiques) avant d'y mettre vos vraies données : voir
[exemples/effectif-demo.csv](exemples/effectif-demo.csv).

## L'onglet RH

| Colonne  | Contenu                                                             |
|----------|----------------------------------------------------------------------|
| Prénom, Nom, Email, Poste, Service | Texte libre.                                    |
| Manager  | Email du n+1. Vide = sommet de la hiérarchie.                        |
| Photo    | Nom de fichier dans le dossier de photos (facultatif).                |
| Actif    | `Non` pour exclure une ligne sans la supprimer (ex. personne partie). |

Une photo non renseignée est retrouvée par convention : email complet, puis
partie locale de l'email, puis « Prénom Nom », sur les extensions
`.jpg`/`.jpeg`/`.png`. Absente, elle est remplacée par un avatar aux
initiales — une génération incomplète reste plus utile qu'une génération qui
échoue.

## Avant de partager le Sheet

Le déclencheur quotidien s'exécute avec les droits de la personne qui l'a
activé (**RH > Activer la mise à jour quotidienne**), pas avec ceux de qui
consulte le Sheet ensuite. Activez-le avec un compte qui a durablement accès
au dossier de photos.

## Portées demandées

- `spreadsheets.currentonly` — uniquement ce classeur.
- `presentations` — créer et modifier les deux présentations générées.
- `drive.readonly` — lire le dossier de photos existant. Cette portée ne se
  décline pas en plus restrictif ici : le dossier n'est pas créé par le
  script, `drive.file` ne suffirait donc pas. Elle est en lecture seule :
  aucun appel du projet ne modifie ou ne supprime quoi que ce soit sur
  Drive (vérifiable par `grep -r "\.setTrashed\|removeFile\|\.remove()" apps-script/` —
  seules les diapositives obsolètes des présentations générées sont
  supprimées, jamais un fichier Drive).
- `admin.directory.user.readonly` — lire l'annuaire du domaine (noms,
  postes, services, managers, photos de profil) pour le mode « Annuaire
  Google Workspace ». **Coût à connaître avant d'autoriser le script** :
  Apps Script demande toutes les portées déclarées dès la première
  autorisation, quel que soit le mode réellement choisi ensuite dans
  `Config` — même en restant sur « RH manuel », quiconque autorise ce
  script accepte que Google puisse en théorie l'utiliser pour lire tout
  l'annuaire du domaine. En lecture seule : aucun appel du projet ne
  modifie l'annuaire (`grep -r "AdminDirectory\.Users\.\(insert\|update\|patch\|delete\)" apps-script/`
  ne doit rien trouver).
- `script.scriptapp` — poser/retirer le déclencheur quotidien et celui de
  reprise de synchronisation.
- `script.container.ui` — le menu et les boîtes de dialogue.

## Limitations connues (v0.4)

- Les photos non carrées sont insérées à taille carrée forcée, sans
  recadrage intelligent.
- Un organigramme trop large pour tenir lisiblement sur un slide bascule en
  vue d'ensemble + un slide par service ; à l'intérieur d'un même service
  très nombreux, la mise en page peut rester dense.
- Pas d'historique des personnes retirées : `Actif = Non` les exclut des
  générations sans les supprimer de l'onglet. En mode annuaire, une
  personne supprimée de l'annuaire n'est pas retirée automatiquement de
  `RH` — désactivez-la ou supprimez la ligne à la main.
- En mode annuaire, un effectif très nombreux peut demander plusieurs
  minutes avant que la régénération ne parte (reprise automatique par
  paliers d'une minute, sans action à refaire).
- La traduction couvre ce que l'outil affiche (menu, dialogues, guide,
  présentations) ; les en-têtes et clés des onglets `RH`/`Config` restent en
  français dans les deux langues (voir « Interface en français ou en
  anglais » ci-dessus).

## Banc d'essai

```bash
node banc/test.js
```

Simule Sheets, Slides, Drive, l'annuaire Google Workspace et les
déclencheurs. Couvre la construction de l'arbre hiérarchique (managers
introuvables, cycles), la disposition géométrique, la pagination, la
synchronisation annuaire (fusion dans RH, reprise après interruption sans
perte ni doublon), la non-duplication des déclencheurs et le changement de
langue de bout en bout (menu, guide, dialogues, présentations). À lancer
avant chaque `clasp push`.
