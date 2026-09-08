/**
 * Création des onglets nécessaires — introduit en v0.1.
 *
 * Idempotente et non destructive : un onglet déjà présent n'est jamais
 * recréé, une ligne de Config déjà renseignée n'est jamais réécrite. Le
 * référentiel (photos, horaires, colonnes RH) n'est pas dans le code —
 * il vit dans le classeur, et le code ne fait qu'y ajouter ce qui manque.
 */

const ENTETES_RH_ = ['Prénom', 'Nom', 'Email', 'Poste', 'Service', 'Manager', 'Photo', 'Actif'];
const COULEUR_ONGLET_RH_ = '#1a73e8';
const COULEUR_ONGLET_CONFIG_ = '#5f6368';
const COULEUR_ONGLET_GUIDE_ = '#188038';
const COULEUR_ENTETE_ = '#e8f0fe';
const COULEUR_LIGNE_GENEREE_ = '#f8f9fa';

const creerOngletRH_ = (classeur) => {
  if (classeur.getSheetByName(NOM_ONGLET_RH_)) return;
  const onglet = classeur.insertSheet(NOM_ONGLET_RH_);
  onglet.getRange(1, 1, 1, ENTETES_RH_.length)
    .setValues([ENTETES_RH_]).setFontWeight('bold').setBackground(COULEUR_ENTETE_);
  onglet.appendRow([
    'Alex', 'Exemple', 'alex.exemple@exemple.fr', 'Directeur·rice général·e', 'Direction',
    '', '', 'Non',
  ]);
  onglet.appendRow([
    'Camille', 'Exemple', 'camille.exemple@exemple.fr', 'Responsable Qualité', 'Qualité',
    'alex.exemple@exemple.fr', '', 'Non',
  ]);
  onglet.setFrozenRows(1);
  onglet.autoResizeColumns(1, ENTETES_RH_.length);
  onglet.setTabColor(COULEUR_ONGLET_RH_);

  // Liste déroulante plutôt que texte libre : « oui »/« Actif » ne sont pas
  // reconnus par lirePersonnes_, qui ne teste que « non » — une faute de
  // frappe silencieuse inclurait une personne censée être exclue.
  const validationOuiNon = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Oui', 'Non'], true).setAllowInvalid(false).build();
  onglet.getRange(2, ENTETES_RH_.indexOf('Actif') + 1, 998, 1).setDataValidation(validationOuiNon);
};

/** Retrouve la ligne d'une clé Config par son contenu, jamais par position — même règle que ecrireConfig_. */
const ligneDeCleConfig_ = (onglet, cle) => {
  const cles = onglet.getRange(1, 1, onglet.getLastRow(), 1).getValues().flat();
  return cles.findIndex((c) => String(c).trim() === cle) + 1;
};

const creerOngletConfig_ = (classeur) => {
  const onglet = classeur.getSheetByName(NOM_ONGLET_CONFIG_) || classeur.insertSheet(NOM_ONGLET_CONFIG_);
  // Un onglet Config vide (créé à la volée, ou une coquille laissée par un
  // essai précédent) n'a pas encore d'en-tête : l'écrire dans ce cas aussi,
  // sinon la première clé ajoutée atterrit en ligne 1 et lireConfigBrute_,
  // qui saute cette ligne en la prenant pour l'en-tête, ne la voit jamais.
  if (onglet.getLastRow() === 0) {
    onglet.getRange(1, 1, 1, 2).setValues([['Clé', 'Valeur']]).setFontWeight('bold').setBackground(COULEUR_ENTETE_);
    onglet.setFrozenRows(1);
  }
  onglet.setTabColor(COULEUR_ONGLET_CONFIG_);

  const brut = lireConfigBrute_(classeur);
  const clesEditables = [
    CLES_CONFIG_.nomEntreprise, CLES_CONFIG_.sourceEffectif, CLES_CONFIG_.sourcePhotos,
    CLES_CONFIG_.dossierPhotos, CLES_CONFIG_.heureMAJ, CLES_CONFIG_.parLigne,
  ];
  const clesGenerees = [
    CLES_CONFIG_.trombinoscopeUrl, CLES_CONFIG_.organigrammeUrl,
    CLES_CONFIG_.derniereGeneration, CLES_CONFIG_.statutMAJ,
  ];
  [...clesEditables, ...clesGenerees].forEach((cle) => {
    if (brut[cle] === undefined) {
      onglet.appendRow([cle, VALEURS_CONFIG_PAR_DEFAUT_[cle] || '']);
    }
  });

  // Fond distinct pour les lignes que le code régénère lui-même : pas la
  // peine d'aller y taper une valeur, ni de s'inquiéter de la voir changer
  // toute seule après une génération — la couleur le dit avant qu'on lise.
  const dernieresLignes = onglet.getLastRow();
  if (dernieresLignes >= 2) {
    const cles = onglet.getRange(2, 1, dernieresLignes - 1, 1).getValues().flat();
    cles.forEach((cle, i) => {
      const generee = clesGenerees.includes(String(cle).trim());
      onglet.getRange(i + 2, 1, 1, 2).setBackground(generee ? COULEUR_LIGNE_GENEREE_ : '#ffffff');
    });
  }

  // Listes déroulantes sur les deux réglages qui pilotent l'aiguillage du
  // code (lireConfig_) : une valeur mal recopiée à la main y bascule sur le
  // mode par défaut sans avertir, une liste déroulante l'empêche à la source.
  const validation = (valeurs) => SpreadsheetApp.newDataValidation()
    .requireValueInList(valeurs, true).setAllowInvalid(false).build();
  const ligneEffectif = ligneDeCleConfig_(onglet, CLES_CONFIG_.sourceEffectif);
  if (ligneEffectif > 0) {
    onglet.getRange(ligneEffectif, 2).setDataValidation(validation(['RH manuel', 'Annuaire Google Workspace']));
  }
  const lignePhotos = ligneDeCleConfig_(onglet, CLES_CONFIG_.sourcePhotos);
  if (lignePhotos > 0) {
    onglet.getRange(lignePhotos, 2).setDataValidation(validation(['Dossier Drive', 'Annuaire Google Workspace']));
  }

  onglet.autoResizeColumns(1, 2);
};

const TEXTE_GUIDE_ = [
  ['Guide — Trombinoscope & organigramme'],
  [''],
  [`Onglet ${NOM_ONGLET_RH_} : une ligne par personne. Deux façons de le remplir,`],
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
  [`Onglet ${NOM_ONGLET_CONFIG_} : réglages, modifiables sans toucher au code.`],
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

const creerOngletGuide_ = (classeur) => {
  if (classeur.getSheetByName(NOM_ONGLET_GUIDE_)) return;
  const onglet = classeur.insertSheet(NOM_ONGLET_GUIDE_);
  onglet.getRange(1, 1, TEXTE_GUIDE_.length, 1).setValues(TEXTE_GUIDE_);
  onglet.getRange(1, 1).setFontWeight('bold').setFontSize(13).setBackground(COULEUR_ENTETE_);
  onglet.setColumnWidth(1, 620);
  onglet.setTabColor(COULEUR_ONGLET_GUIDE_);
};

/**
 * Noms par défaut de l'onglet unique qu'attribue Google à un classeur tout
 * neuf, selon la langue de l'interface au moment de la création.
 */
const NOMS_FEUILLE_DEFAUT_ = ['Feuille 1', 'Sheet1'];

/**
 * Retire l'onglet par défaut laissé par la création du classeur — mais
 * seulement s'il est resté vide : s'il contient quoi que ce soit, quelqu'un
 * s'en sert peut-être, et une installation ne doit jamais faire disparaître
 * une donnée sans qu'on le lui ait demandé. Appelée après la création de
 * RH/Config/Guide, jamais avant : Sheets refuse un classeur sans aucun
 * onglet, donc supprimer le dernier onglet restant échouerait.
 */
const nettoyerFeuilleParDefaut_ = (classeur) => {
  NOMS_FEUILLE_DEFAUT_.forEach((nom) => {
    const onglet = classeur.getSheetByName(nom);
    const estVide = onglet && onglet.getLastRow() === 0 && onglet.getLastColumn() === 0;
    if (estVide && classeur.getSheets().length > 1) classeur.deleteSheet(onglet);
  });
};

/** Point d'entrée menu : crée les onglets manquants, sans jamais réécrire l'existant. */
function installer() {
  const classeur = classeurCourant_();
  creerOngletRH_(classeur);
  creerOngletConfig_(classeur);
  creerOngletGuide_(classeur);
  nettoyerFeuilleParDefaut_(classeur);
  afficherDialogue_(
    'Installation terminée',
    `<p class="ligne">${badge_('ok', 'Prêt')} Les onglets ${NOM_ONGLET_RH_}, ${NOM_ONGLET_CONFIG_} et ` +
    `${NOM_ONGLET_GUIDE_} sont prêts.</p>` +
    `<p class="ligne">Complétez l’onglet ${NOM_ONGLET_RH_} avec votre effectif, réglez l’onglet ` +
    `${NOM_ONGLET_CONFIG_}, puis lancez « Régénérer maintenant ».</p>`,
    { hauteur: 220 }
  );
}
