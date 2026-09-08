/**
 * Français / English — introduit en v0.4.
 *
 * Ce que l'outil écrit dans le classeur pour piloter son propre
 * comportement (en-têtes RH, clés Config, valeurs des listes déroulantes)
 * reste en français dans les deux langues : ce sont des identifiants
 * structurels, pas de la prose, et les traduire obligerait `lirePersonnes_`
 * et `lireConfigBrute_` à reconnaître les deux jeux de libellés pour un
 * gain minime. Ce qui se traduit ici, c'est ce que l'outil **dit** — menu,
 * boîtes de dialogue, guide, texte des présentations générées.
 */

const LANGUE_DEFAUT_ = 'fr';

const CHAINES_ = {
  fr: {
    menuRH: 'RH',
    menuInstaller: 'Installer les onglets',
    menuSynchroniser: 'Synchroniser l’effectif depuis l’annuaire',
    menuRegenerer: 'Régénérer maintenant',
    menuActiver: 'Activer la mise à jour quotidienne',
    menuDesactiver: 'Désactiver la mise à jour quotidienne',
    menuGuide: 'Ouvrir le guide',
    menuAPropos: 'À propos',

    boutonFermer: 'Fermer',
    boutonOuvrirTrombi: 'Ouvrir le trombinoscope',
    boutonOuvrirOrganigramme: 'Ouvrir l’organigramme',

    badgeOk: 'OK',
    badgePret: 'Prêt',
    badgeActivee: 'Activée',
    badgeDesactivee: 'Désactivée',
    badgeEnAttente: 'En attente',
    badgeEchec: 'Échec',
    badgePhotos: 'Photos',
    badgeMiseEnPage: 'Mise en page',
    badgeOrganigramme: 'Organigramme',
    badgeGenerees: 'Générées',
    badgePasEncore: 'Pas encore',

    titreAPropos: 'Trombinoscope & organigramme — v{version}',
    aProposGenere: 'Dernière génération : {date}.',
    aProposPasEncore: 'Aucune génération pour l’instant — lancez « Régénérer maintenant ».',

    personnesActives: '{n} personne(s) active(s) dans l’onglet {onglet}.',
    photosManquantes: '{n} photo(s) manquante(s), remplacée(s) par des initiales.',
    parLigneAjustee: '« Personnes par ligne » réduit à {n} pour tenir sur la diapositive.',
    pointsAVerifier: 'points à vérifier :',
    titreSyncEnCours: 'Synchronisation en cours',
    texteSyncEnCoursRegen: 'L’effectif est nombreux : la synchronisation de l’annuaire reprendra ' +
      'automatiquement dans une minute, puis la régénération s’enchaînera d’elle-même.',
    titreRegenTerminee: 'Régénération terminée',
    titreRegenEchec: 'La régénération a échoué',
    texteCorrigerPuisRelancer: 'Corrigez le point signalé puis relancez « Régénérer maintenant ».',

    titreMAJActivee: 'Mise à jour quotidienne activée',
    texteMAJActivee: 'Le trombinoscope et l’organigramme seront régénérés chaque jour vers {heure}h.',
    titreMAJDesactivee: 'Mise à jour quotidienne désactivée',
    texteMAJDesactivee: 'La régénération automatique n’aura plus lieu tant qu’elle n’est pas réactivée.',

    texteSyncEnCoursSimple: 'L’effectif est nombreux : la synchronisation reprendra automatiquement dans une minute.',
    titreSyncTerminee: 'Synchronisation terminée',
    texteSyncTerminee: '{ajoutes} personne(s) ajoutée(s), {misAJour} mise(s) à jour dans l’onglet {onglet}.',
    titreSyncEchec: 'La synchronisation a échoué',

    echecGenerationLe: 'Échec le {date} : {message}',

    titreInstallTerminee: 'Installation terminée',
    texteInstallOnglets: 'Les onglets {rh}, {config} et {guide} sont prêts.',
    texteInstallSuite: 'Complétez l’onglet {rh} avec votre effectif, réglez l’onglet {config}, ' +
      'puis lancez « Régénérer maintenant ».',

    alerteManagerIntrouvable: '{nom} : manager « {manager} » introuvable dans l’effectif, ' +
      'traité·e comme sommet de hiérarchie.',
    alertePropreManager: '{nom} est indiqué·e comme son propre manager : lien ignoré.',
    alerteCycle: 'Cycle hiérarchique détecté impliquant {nom} : traité·e comme sommet de ' +
      'hiérarchie pour rompre le cycle.',
    alerteAucunePersonne: 'Aucune personne active dans l’onglet {onglet}.',

    titreDocOrganigramme: 'Organigramme',
    titreDocTrombinoscope: 'Trombinoscope',
    titreOrganigrammeGeneral: 'Organigramme général',
    titreVueEnsemble: 'Organigramme — vue d’ensemble',
    texteDetailServices: 'Le détail de chaque service est présenté sur les diapositives suivantes.',
    titreOrganigrammeBranche: 'Organigramme — {nom}',
    titreTrombiPage: 'Trombinoscope ({n}/{total})',
    coverSousTitre: '{n} personne(s) — généré le {date}',
  },

  en: {
    menuRH: 'HR',
    menuInstaller: 'Set up the tabs',
    menuSynchroniser: 'Sync headcount from directory',
    menuRegenerer: 'Regenerate now',
    menuActiver: 'Enable daily update',
    menuDesactiver: 'Disable daily update',
    menuGuide: 'Open the guide',
    menuAPropos: 'About',

    boutonFermer: 'Close',
    boutonOuvrirTrombi: 'Open the staff directory',
    boutonOuvrirOrganigramme: 'Open the org chart',

    badgeOk: 'OK',
    badgePret: 'Ready',
    badgeActivee: 'Enabled',
    badgeDesactivee: 'Disabled',
    badgeEnAttente: 'Pending',
    badgeEchec: 'Failed',
    badgePhotos: 'Photos',
    badgeMiseEnPage: 'Layout',
    badgeOrganigramme: 'Org chart',
    badgeGenerees: 'Generated',
    badgePasEncore: 'Not yet',

    titreAPropos: 'Staff directory & org chart — v{version}',
    aProposGenere: 'Last generated: {date}.',
    aProposPasEncore: 'Nothing generated yet — run “Regenerate now”.',

    personnesActives: '{n} active person(s) in the {onglet} tab.',
    photosManquantes: '{n} missing photo(s), replaced with initials.',
    parLigneAjustee: '“Personnes par ligne” reduced to {n} to fit the slide.',
    pointsAVerifier: 'points to check:',
    titreSyncEnCours: 'Sync in progress',
    texteSyncEnCoursRegen: 'The headcount is large: the directory sync will automatically resume ' +
      'in a minute, then regeneration will follow on its own.',
    titreRegenTerminee: 'Regeneration complete',
    titreRegenEchec: 'Regeneration failed',
    texteCorrigerPuisRelancer: 'Fix the issue above, then run “Regenerate now” again.',

    titreMAJActivee: 'Daily update enabled',
    texteMAJActivee: 'The staff directory and org chart will be regenerated every day around {heure}:00.',
    titreMAJDesactivee: 'Daily update disabled',
    texteMAJDesactivee: 'Automatic regeneration won’t run again until it’s re-enabled.',

    texteSyncEnCoursSimple: 'The headcount is large: the sync will automatically resume in a minute.',
    titreSyncTerminee: 'Sync complete',
    texteSyncTerminee: '{ajoutes} person(s) added, {misAJour} updated in the {onglet} tab.',
    titreSyncEchec: 'Sync failed',

    echecGenerationLe: 'Failed on {date}: {message}',

    titreInstallTerminee: 'Setup complete',
    texteInstallOnglets: 'The {rh}, {config} and {guide} tabs are ready.',
    texteInstallSuite: 'Fill in the {rh} tab with your headcount, adjust the {config} tab, ' +
      'then run “Regenerate now”.',

    alerteManagerIntrouvable: '{nom}: manager “{manager}” not found in the headcount, ' +
      'treated as a top of the hierarchy.',
    alertePropreManager: '{nom} is listed as their own manager: link ignored.',
    alerteCycle: 'A hierarchy cycle was detected involving {nom}: treated as a top of the ' +
      'hierarchy to break the cycle.',
    alerteAucunePersonne: 'No active person in the {onglet} tab.',

    titreDocOrganigramme: 'Org Chart',
    titreDocTrombinoscope: 'Staff Directory',
    titreOrganigrammeGeneral: 'General org chart',
    titreVueEnsemble: 'Org chart — overview',
    texteDetailServices: 'The detail for each department is shown on the following slides.',
    titreOrganigrammeBranche: 'Org chart — {nom}',
    titreTrombiPage: 'Staff Directory ({n}/{total})',
    coverSousTitre: '{n} person(s) — generated on {date}',
  },
};

/**
 * Traduction par clé, avec substitution de `{variable}`. Une clé absente du
 * dictionnaire de la langue demandée retombe sur le français plutôt que de
 * rendre `undefined` dans une diapositive ou une boîte de dialogue — un
 * texte en français au milieu d'une interface anglaise se remarque et se
 * corrige ; un « undefined » remarque surtout qu'on ne s'est pas relu.
 */
const t_ = (langue, cle, vars) => {
  const dico = CHAINES_[langue] || CHAINES_[LANGUE_DEFAUT_];
  let texte = dico[cle] !== undefined ? dico[cle] : CHAINES_[LANGUE_DEFAUT_][cle];
  if (texte === undefined) return cle;
  if (vars) {
    Object.keys(vars).forEach((cle2) => {
      texte = texte.replace(new RegExp(`\\{${cle2}\\}`, 'g'), vars[cle2]);
    });
  }
  return texte;
};

/**
 * Langue de l'interface pour un classeur. Ne doit jamais faire échouer un
 * rendu : un onglet Config absent ou illisible rend le français, pas une
 * exception — voir le même principe dans lireConfig_ (Commun.gs), qui ne
 * lève déjà pas pour cette raison ; ce filet est pour l'appelant qui
 * passerait un classeur inattendu (test, contexte de reprise).
 */
const langueInterface_ = (classeur) => {
  try {
    return lireConfig_(classeur).langue;
  } catch (e) {
    return LANGUE_DEFAUT_;
  }
};

const TEXTE_GUIDE_FR_ = [
  ['Guide — Trombinoscope & organigramme'],
  [''],
  ['Onglet RH : une ligne par personne. Deux façons de le remplir,'],
  ['réglées dans Config (« Source de l’effectif ») :'],
  ['  • RH manuel (par défaut) : vous complétez et corrigez l’onglet vous-même.'],
  ['  • Annuaire Google Workspace : RH devient un miroir de l’annuaire, resynchronisé'],
  ['    à chaque régénération. Une correction manuelle de Prénom, Nom, Poste, Service,'],
  ['    Manager ou Actif ne survit pas à la synchronisation suivante — corrigez la donnée'],
  ['    dans l’annuaire, pas dans l’onglet. Colonne Photo exceptée : jamais synchronisée,'],
  ['    toujours modifiable à la main. Nécessite un compte administrateur Workspace (ou'],
  ['    délégué) pour la synchronisation ; « RH manuel » n’a besoin d’aucun droit particulier.'],
  ['  Prénom, Nom, Email, Poste, Service : texte libre.'],
  ['  Manager : l’email de la personne dont elle dépend. Vide = sommet de la hiérarchie.'],
  ['  Photo : nom de fichier dans le dossier de photos (facultatif).'],
  ['    Si vide, le fichier est retrouvé automatiquement par email, puis par « Prénom Nom ».'],
  ['  Actif : mettre « Non » pour exclure une ligne sans la supprimer (ex. personne partie).'],
  [''],
  ['Onglet Config : réglages, modifiables sans toucher au code.'],
  ['  Langue de l’interface : « Français » ou « English » — menu, dialogues, guide et'],
  ['    présentations générées suivent ce réglage. Les en-têtes RH/Config restent en français'],
  ['    dans les deux cas : ce sont des identifiants techniques, pas du texte à traduire.'],
  ['  Nom de l’entreprise : facultatif, affiché sur la page de titre des deux présentations.'],
  ['  Source de l’effectif : « RH manuel » ou « Annuaire Google Workspace ».'],
  ['  Source des photos : « Dossier Drive » ou « Annuaire Google Workspace » (photo de profil).'],
  ['  Dossier des photos (Drive) : lien ou identifiant du dossier, si la source est Drive.'],
  ['  Heure de mise à jour quotidienne : heure (0-23) à laquelle la régénération automatique se lance.'],
  ['  Personnes par ligne : nombre de cartes par rangée dans le trombinoscope.'],
  ['  Les autres lignes (liens, dernière génération, statut) sont remplies automatiquement.'],
  [''],
  ['Menu RH :'],
  ['  Synchroniser l’effectif depuis l’annuaire : met à jour RH sans toucher aux présentations.'],
  ['  Régénérer maintenant : synchronise si nécessaire, puis reconstruit les deux présentations.'],
  ['  Activer / désactiver la mise à jour quotidienne : pose ou retire le déclencheur automatique.'],
  [''],
  ['Limitations connues de cette version :'],
  ['  Les photos non carrées sont recadrées en carré sans ajustement fin.'],
  ['  Un organigramme très large est scindé en une vue d’ensemble + un slide par service ;'],
  ['  à l’intérieur d’un même service, l’équipe peut rester dense si elle est très nombreuse.'],
  ['  Un effectif très nombreux peut faire reprendre la synchronisation annuaire sur plusieurs'],
  ['  minutes (automatiquement, sans action à refaire) avant que la régénération ne parte.'],
];

const TEXTE_GUIDE_EN_ = [
  ['Guide — Staff directory & org chart'],
  [''],
  ['RH tab: one row per person. Two ways to fill it in,'],
  ['set in Config (“Source de l’effectif”):'],
  ['  • Manual HR (default): you fill in and correct the tab yourself.'],
  ['  • Google Workspace directory: RH becomes a mirror of the directory, resynced'],
  ['    on every regeneration. A manual edit to First name, Last name, Title, Department,'],
  ['    Manager or Active does not survive the next sync — fix the data in the directory,'],
  ['    not in the tab. Photo column excepted: never synced, always editable by hand.'],
  ['    Syncing needs a Workspace admin account (or a delegated one); “Manual HR” needs'],
  ['    no particular permission.'],
  ['  First name, Last name, Email, Title, Department: free text.'],
  ['  Manager: the email of the person they report to. Blank = top of the hierarchy.'],
  ['  Photo: file name in the photo folder (optional).'],
  ['    If blank, the file is found automatically by email, then by “First Last”.'],
  ['  Active: set to “Non” to exclude a row without deleting it (e.g. someone who left).'],
  [''],
  ['Config tab: settings, editable without touching the code.'],
  ['  Interface language: “Français” or “English” — the menu, dialogs, guide and'],
  ['    generated presentations follow this setting. RH/Config headers stay in French'],
  ['    either way: they are technical identifiers, not prose to translate.'],
  ['  Company name: optional, shown on the title page of both presentations.'],
  ['  Source de l’effectif: “RH manuel” (manual) or “Annuaire Google Workspace” (directory).'],
  ['  Source des photos: “Dossier Drive” (Drive folder) or “Annuaire Google Workspace” (profile photo).'],
  ['  Dossier des photos (Drive): link or ID of the folder, if the source is Drive.'],
  ['  Heure de mise à jour quotidienne: hour (0-23) the automatic regeneration runs at.'],
  ['  Personnes par ligne: number of cards per row in the staff directory.'],
  ['  The other rows (links, last generation, status) are filled in automatically.'],
  [''],
  ['HR menu:'],
  ['  Sync headcount from directory: updates RH without touching the presentations.'],
  ['  Regenerate now: syncs if needed, then rebuilds both presentations.'],
  ['  Enable / disable daily update: sets or removes the automatic trigger.'],
  [''],
  ['Known limitations of this version:'],
  ['  Non-square photos are force-cropped to a square, with no smart cropping.'],
  ['  A very wide org chart splits into an overview + one slide per department;'],
  ['  within a single very large department, the layout can still be dense.'],
  ['  A very large headcount can make the directory sync resume over several'],
  ['  minutes (automatically, nothing to redo) before regeneration starts.'],
];

const texteGuide_ = (langue) => (langue === 'en' ? TEXTE_GUIDE_EN_ : TEXTE_GUIDE_FR_);
