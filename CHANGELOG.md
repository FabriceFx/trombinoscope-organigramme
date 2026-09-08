# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

## [0.4.1] - 2026-09-08

### Corrigé

- **Régénération en échec avec « The width should not be zero. » quand
  `Config > Personnes par ligne` était trop grand pour la largeur de la
  diapositive.** `disposerGrille_` (Trombinoscope.gs) calculait la largeur
  d'une carte sans jamais vérifier qu'elle restait positive ; au-delà d'un
  certain nombre de colonnes, elle devenait négative et Slides refusait la
  diapositive. `Personnes par ligne` est maintenant réduit autant que
  nécessaire pour rester lisible, et le compte rendu le signale
  (`« Personnes par ligne » réduit à N pour tenir sur la diapositive`)
  plutôt que de le faire silencieusement.
- Le banc d'essai simule désormais un vrai refus de Slides sur une largeur
  ou une hauteur non positive (`verifierDimensions_`), et un nouveau cas de
  test reproduit le réglage qui a produit ce défaut.

## [0.4.0] - 2026-09-08

### Ajouté

- Interface bilingue français / anglais (`Config.langue`, liste déroulante
  « Français » / « English ») : menu, boîtes de dialogue, onglet `Guide` et
  texte des présentations générées (pages de titre, titres de diapositive,
  messages d'alerte) suivent ce réglage. Nouveau module `Langues.gs`
  centralisant les traductions (`t_`) et les deux versions du guide.
- L'onglet `Guide` est désormais régénéré à chaque installation (c'est de la
  documentation, jamais une donnée saisie à la main) : changer la langue
  s'y répercute sans étape supplémentaire.
- L'horodatage de génération suit l'ordre des champs de la langue choisie
  (jour/mois pour le français, mois/jour pour l'anglais) — jamais de nom de
  mois, qui suivrait la langue du compte Google plutôt que ce réglage.

### Changé

- Les en-têtes et clés des onglets `RH`/`Config`, ainsi que les valeurs des
  listes déroulantes, restent en français dans les deux langues : ce sont
  des identifiants techniques dont dépend la lecture du classeur, pas de la
  prose à traduire. Documenté dans le `Guide` et dans le README.

## [0.3.0] - 2026-09-08

### Ajouté

- Page de titre sur les deux présentations générées (bandeau de couleur,
  nom de l'entreprise si renseigné dans `Config`, effectif et date de
  génération), avec une légende des couleurs de service — jusqu'ici la
  couleur des bordures et des avatars codait le service sans que ça
  s'explique nulle part dans le document.
- Connecteurs en coude (`LineCategory.BENT`) dans l'organigramme au lieu de
  lignes diagonales, et bordures des boîtes plus marquées : convention
  visuelle standard d'un organigramme plutôt qu'un rendu utilitaire.
- Liseré de couleur de service sous chaque photo du trombinoscope, en écho
  à la légende de la page de titre.
- Toutes les boîtes de dialogue du menu (installation, régénération,
  synchronisation, activation du déclencheur, à propos) sont passées de
  `Ui.alert` à une boîte HTML cohérente (`Dialogues.gs`), avec des liens
  cliquables qui ouvrent directement le trombinoscope ou l'organigramme —
  jusqu'ici, il fallait aller chercher le lien dans l'onglet `Config`.
- `Config.nomEntreprise` (facultatif) : personnalise la page de titre.
- Listes déroulantes sur `Config.sourceEffectif` et `Config.sourcePhotos`,
  et sur `RH.Actif` : ces trois réglages pilotent le comportement du code
  (`lireConfig_`, `lirePersonnes_`) sur la base d'une correspondance de
  texte — une valeur mal recopiée à la main y basculait silencieusement sur
  le comportement par défaut.
- Couleurs d'onglet (RH bleu, Config gris, Guide vert) et fond distinct pour
  les lignes générées automatiquement dans `Config`, pour un repère visuel
  immédiat en ouvrant le classeur.

## [0.2.1] - 2026-09-08

### Ajouté

- `exemples/effectif-demo.csv` : jeu de données fictif de 30 personnes sur 4
  niveaux hiérarchiques, pour essayer l'organigramme et le trombinoscope sur
  un effectif qui dépasse ce que tient un seul slide (importable directement
  dans l'onglet `RH`).
- Banc d'essai : cas de test sur une hiérarchie à 4 niveaux réels, vérifiant
  que chaque génération descend strictement d'un cran par rapport à la
  précédente — les tests précédents ne dépassaient pas 2-3 niveaux, ou une
  racine large mais plate. Cas de test de bout en bout sur
  `effectif-demo.csv` lui-même, pour qu'il ne se désynchronise pas des
  colonnes RH sans que ça se voie.

## [0.2.0] - 2026-09-08

### Ajouté

- Deuxième source pour l'effectif : synchronisation depuis l'annuaire Google
  Workspace (Admin Directory), au choix avec l'onglet `RH` manuel — réglage
  « Source de l'effectif » dans `Config`. En mode annuaire, `RH` devient un
  miroir resynchronisé à chaque régénération (Prénom, Nom, Poste, Service,
  Manager, Actif) ; la colonne `Photo` n'est jamais touchée, dans les deux
  modes.
- Deuxième source pour les photos : photo de profil Workspace au lieu du
  dossier Drive — réglage « Source des photos » dans `Config`.
- Synchronisation reprenable sur un effectif nombreux : curseur de
  pagination dans les propriétés du document, reprise automatique par
  déclencheur une minute après une interruption par le plafond de 6
  minutes, sans perte ni doublon.
- Menu « RH > Synchroniser l'effectif depuis l'annuaire » : met à jour `RH`
  sans regénérer les présentations, pour vérifier le résultat avant de
  passer en mode annuaire ou pour amorcer `RH` une fois avant de repasser en
  mode manuel.
- Installation : retrait automatique de l'onglet par défaut (« Feuille 1 »
  / « Sheet1 ») laissé par la création du classeur, s'il est resté vide.

### Corrigé

- `creerOngletConfig_` n'écrivait l'en-tête de l'onglet `Config` que s'il
  venait d'être créé : un onglet `Config` déjà présent mais vide restait
  sans en-tête, décalant la première clé en ligne 1 où elle était prise pour
  l'en-tête et silencieusement ignorée à la lecture.

## [0.1.0] - 2026-09-08

### Ajouté

- Onglet `RH` : effectif (nom, poste, service, manager, photo, actif).
- Onglet `Config` : réglages éditables (dossier des photos, heure de mise à
  jour, personnes par ligne) et informations générées (liens, dernière
  génération, statut de la mise à jour quotidienne).
- Génération d'un **trombinoscope** (présentation Slides) : grille paginée,
  photo retrouvée par convention (email, puis « Prénom Nom »), avatar aux
  initiales en l'absence de photo.
- Génération d'un **organigramme** (présentation Slides) : disposition par
  centrage d'arbre à partir de la colonne Manager, bascule automatique en
  vue d'ensemble + un slide par service au-delà d'une échelle de lisibilité
  minimale.
- Menu « RH » : installation des onglets, régénération à la demande,
  activation/désactivation de la mise à jour quotidienne (déclencheur
  horaire), guide et à propos.
- Détection et signalement (jamais silencieux) des managers introuvables et
  des cycles hiérarchiques.
- Banc d'essai Node (`banc/test.js`) couvrant la lecture RH/Config, la
  construction de l'arbre, la disposition géométrique, la pagination et la
  non-duplication des déclencheurs.
