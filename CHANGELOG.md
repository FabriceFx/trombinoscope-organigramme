# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

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
