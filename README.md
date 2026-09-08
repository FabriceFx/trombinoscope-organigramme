<a id="francais"></a>

# Trombinoscope & organigramme

📖 Français (ci-dessous) · [🇬🇧 English version](#english)

Génère automatiquement, à partir d'un onglet RH, un trombinoscope et un
organigramme sous forme de deux présentations Google Slides — régénérables à
la demande ou chaque jour, sans jamais casser le lien vers les fichiers déjà
partagés.

![L'onglet RH et le menu de l'outil dans Google Sheets](captures/Capture%201.png)
![Un slide d'organigramme généré dans Google Slides](captures/Capture%202.png)

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
du classeur par le code, pas de la prose à traduire. (Ce README, lui, est
disponible dans les deux langues — voir la version anglaise plus bas.)

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

---

<a id="english"></a>

# Staff Directory & Org Chart

📖 English (below) · [🇫🇷 Version française](#francais)

Automatically generates, from an HR tab, a staff directory and an org chart
as two Google Slides presentations — regenerable on demand or daily, without
ever breaking the link to files already shared.

![The RH tab and the tool's menu in Google Sheets](captures/Capture%201.png)
![A generated org chart slide in Google Slides](captures/Capture%202.png)

## Two sources for the headcount

- **Manual HR** (default): you fill in and correct the `RH` tab yourself.
  No special permission required.
- **Google Workspace directory**: `RH` becomes a mirror of the directory,
  resynced on every regeneration (First name, Last name, Title, Department,
  Manager, Active). A manual edit to these columns does not survive the
  next sync — fix the data in the directory, not in the tab. The `Photo`
  column, however, is **never** synced, in either mode: always editable by
  hand. Syncing requires a Workspace admin account (or a delegated one).

The choice is made in `Config > Source de l'effectif`, and can be changed at
any time without touching the code. Photos follow the same principle,
separately (`Config > Source des photos`: Drive folder or Workspace profile
photo).

## Interface in French or English

`Config > Langue de l'interface` (“Français” or “English”) drives the menu,
dialog boxes, the `Guide` tab, and the text of the generated presentations
(title page, slide titles, alert messages). Changing this setting takes
effect immediately, including on the `Guide`, which is regenerated on every
install.

The headers and keys of the `RH` and `Config` tabs, as well as the dropdown
values (“RH manuel”, “Dossier Drive”, etc.), stay in French either way: they
are identifiers the code depends on to read the spreadsheet, not prose to
translate. (This README itself is available in both languages — see the
French version above.)

## A polished presentation, not just a raw export

Each presentation opens with a title page (company name if set in `Config`,
headcount, generation date) followed by a legend of department colors — the
same color found on the org chart's borders and under the staff directory's
photos. The org chart uses elbow connectors, the usual visual convention for
an org chart rather than a utilitarian rendering made of diagonal lines.
Every dialog box in the menu offers a direct link to each presentation,
without having to go look for it in `Config`.

## Why two presentations, not one

A staff directory is browsed like a list; an org chart is read like a map.
Combining them into a single file would have forced a compromise on both
layouts. Each keeps its own file, its own stable URL (regenerating never
changes the file's identifier, so never the sharing permissions already
granted) and its own pagination logic.

## Installation

This project is a script **bound to a Google Sheets spreadsheet** — it does
not work standalone, and that's not an oversight: every regeneration runs
with the permissions of the person who triggered it.

1. Create a Google Sheet, then **Extensions > Apps Script** to attach a
   project to it.
2. Get its script ID (**Project Settings**, or from the URL
   `.../projects/<ID>/edit`) and create a `.clasp.json` file at the root of
   this folder:
   ```json
   { "scriptId": "YOUR_SCRIPT_ID", "rootDir": "apps-script" }
   ```
3. Push the code:
   ```bash
   clasp push
   ```
4. Open the Sheet, reload it: the **RH** menu appears.
5. **RH > Installer les onglets** (Set up the tabs), then adjust the
   `Config` tab:
   - leave “Source de l'effectif” at `RH manuel` and fill in the `RH` tab
     yourself, **or**
   - switch it to `Annuaire Google Workspace` and run **RH > Synchroniser
     l'effectif depuis l'annuaire** (Sync headcount from directory) to
     check the result before regenerating the presentations.
6. **RH > Régénérer maintenant** (Regenerate now).

To try it with a richer fictional headcount (30 people, 4 hierarchy levels)
before entering your real data: see
[exemples/effectif-demo.csv](exemples/effectif-demo.csv).

## The RH tab

| Column | Content |
|---|---|
| Prénom, Nom, Email, Poste, Service (First/Last name, Email, Title, Department) | Free text. |
| Manager | Email of the person they report to. Blank = top of the hierarchy. |
| Photo | File name in the photo folder (optional). |
| Actif (Active) | `Non` to exclude a row without deleting it (e.g. someone who left). |

A photo left blank is found by convention: full email, then the local part
of the email, then “Prénom Nom” (First Last), on the `.jpg`/`.jpeg`/`.png`
extensions. If missing, it's replaced with an avatar showing initials — an
incomplete generation is still more useful than one that fails.

## Before sharing the Sheet

The daily trigger runs with the permissions of the person who enabled it
(**RH > Activer la mise à jour quotidienne** / Enable daily update), not
with those of whoever opens the Sheet afterward. Enable it with an account
that has lasting access to the photo folder.

## Scopes requested

- `spreadsheets.currentonly` — this spreadsheet only.
- `presentations` — create and edit the two generated presentations.
- `drive.readonly` — read the existing photo folder. This scope cannot be
  narrowed further here: the folder isn't created by the script, so
  `drive.file` wouldn't be enough. It's read-only: no call in the project
  modifies or deletes anything on Drive (checkable with
  `grep -r "\.setTrashed\|removeFile\|\.remove()" apps-script/` — only
  obsolete slides of the generated presentations are removed, never a
  Drive file).
- `admin.directory.user.readonly` — read the domain directory (names,
  titles, departments, managers, profile photos) for “Annuaire Google
  Workspace” mode. **Cost to know before authorizing the script**: Apps
  Script requests every declared scope at first authorization, regardless
  of which mode is actually chosen afterward in `Config` — even staying on
  “RH manuel”, whoever authorizes this script accepts that Google could in
  theory use it to read the entire domain directory. Read-only: no call in
  the project modifies the directory
  (`grep -r "AdminDirectory\.Users\.\(insert\|update\|patch\|delete\)" apps-script/`
  should find nothing).
- `script.scriptapp` — set/remove the daily trigger and the sync-resume
  trigger.
- `script.container.ui` — the menu and dialog boxes.

## Known limitations (v0.4)

- Non-square photos are force-cropped to a square, with no smart cropping.
- An org chart too wide to fit legibly on one slide switches to an overview
  + one slide per department; within a single very large department, the
  layout can still be dense.
- No history of removed people: `Actif = Non` excludes them from generation
  without deleting the row. In directory mode, a person removed from the
  directory is not automatically removed from `RH` — disable or delete the
  row by hand.
- In directory mode, a very large headcount can take several minutes before
  regeneration starts (automatic resume in one-minute steps, nothing to
  redo).
- Translation covers what the tool displays (menu, dialogs, guide,
  presentations); the headers and keys of the `RH`/`Config` tabs stay in
  French in both languages (see “Interface in French or English” above).

## Test suite

```bash
node banc/test.js
```

Simulates Sheets, Slides, Drive, the Google Workspace directory, and
triggers. Covers building the hierarchy tree (unmatched managers, cycles),
the geometric layout, pagination, directory sync (merging into RH, resuming
after an interruption without loss or duplication), trigger
non-duplication, and switching languages end to end (menu, guide, dialogs,
presentations). Run before every `clasp push`.
