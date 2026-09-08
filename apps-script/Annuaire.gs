/**
 * Synchronisation depuis l'annuaire Google Workspace (Admin Directory) —
 * introduite en v0.2.
 *
 * L'onglet RH reste la seule source lue par la génération (Trombinoscope.gs,
 * Organigramme.gs) : ce fichier ne fait qu'alimenter RH automatiquement
 * quand `Config.sourceEffectif` vaut « annuaire ». Basculer sur l'onglet RH
 * manuel n'importe quand ne casse donc rien en aval.
 *
 * En mode annuaire, RH devient un **miroir** : Prénom, Nom, Poste, Service,
 * Manager et Actif sont réécrits à chaque synchronisation et une correction
 * manuelle de ces colonnes ne survit pas à la suivante — la corriger dans
 * l'annuaire, pas dans l'onglet. Seule la colonne Photo n'est jamais touchée
 * par la synchronisation, dans les deux modes.
 *
 * Necessite que la personne qui synchronise ait un accès en lecture à
 * l'annuaire du domaine (portée `admin.directory.user.readonly`) — en
 * pratique, un compte administrateur Workspace ou un compte délégué.
 */

const NOM_ONGLET_ANNUAIRE_BRUT_ = 'Annuaire (technique)';
const COLONNES_ANNUAIRE_BRUT_ = ['Email', 'Prénom', 'Nom', 'Poste', 'Service', 'Manager', 'Actif'];
const COLONNES_RH_POSSEDEES_PAR_ANNUAIRE_ = ['Prénom', 'Nom', 'Poste', 'Service', 'Manager', 'Actif'];

const CLE_PROP_ETAT_ANNUAIRE_ = 'annuaireEtat';
const CLE_PROP_PAGE_TOKEN_ANNUAIRE_ = 'annuairePageToken';

/**
 * Budget sous le plafond de 6 minutes par exécution — voir Regeneration.gs
 * et Declencheurs.gs pour le même principe appliqué à la génération.
 * Un paramètre par défaut, pas une constante inaccessible : le banc d'essai
 * simule un effectif large avec un budget minuscule, sans quoi la reprise
 * ne se testerait qu'avec des dizaines de milliers de faux utilisateurs.
 */
const BUDGET_MS_ANNUAIRE_ = 4.5 * 60 * 1000;
const TAILLE_LOT_ANNUAIRE_ = 200;

const ongletAnnuaireBrut_ = (classeur) => {
  let onglet = classeur.getSheetByName(NOM_ONGLET_ANNUAIRE_BRUT_);
  if (!onglet) {
    onglet = classeur.insertSheet(NOM_ONGLET_ANNUAIRE_BRUT_);
    onglet.hideSheet();
  }
  if (onglet.getLastRow() === 0) {
    onglet.getRange(1, 1, 1, COLONNES_ANNUAIRE_BRUT_.length).setValues([COLONNES_ANNUAIRE_BRUT_]);
  }
  return onglet;
};

const viderAnnuaireBrut_ = (onglet) => {
  onglet.clearContents();
  onglet.getRange(1, 1, 1, COLONNES_ANNUAIRE_BRUT_.length).setValues([COLONNES_ANNUAIRE_BRUT_]);
};

/**
 * Traduit un utilisateur Directory (`projection: 'full'`) en ligne brute.
 * Le manager est le premier élément de `relations` de type « manager » —
 * un champ que Workspace ne renseigne que si l'organisation l'a saisi dans
 * l'annuaire ; absent, la personne remonte comme sommet de hiérarchie,
 * exactement comme une colonne Manager vide dans l'onglet RH manuel.
 */
const ligneDepuisUtilisateurAnnuaire_ = (u) => {
  const org = (u.organizations || [])[0] || {};
  const manager = (u.relations || []).find((r) => r.type === 'manager');
  const service = org.department || (u.orgUnitPath ? String(u.orgUnitPath).replace(/^\//, '') : '');
  return [
    String(u.primaryEmail || '').toLowerCase(),
    (u.name && u.name.givenName) || '',
    (u.name && u.name.familyName) || '',
    org.title || '',
    service,
    manager ? String(manager.value || '').toLowerCase() : '',
    u.suspended ? 'Non' : 'Oui',
  ];
};

const ecrirePageAnnuaire_ = (onglet, utilisateurs) => {
  if (!utilisateurs || utilisateurs.length === 0) return;
  const lignes = utilisateurs.map(ligneDepuisUtilisateurAnnuaire_);
  const derniere = onglet.getLastRow();
  onglet.getRange(derniere + 1, 1, lignes.length, COLONNES_ANNUAIRE_BRUT_.length).setValues(lignes);
};

/**
 * Photo de profil Workspace d'une personne, ou `null` sans lever — même
 * contrat que trouverPhoto_ (Commun.gs) pour le dossier Drive. `photoData`
 * est encodé en base64url ; Utilities.base64Decode attend du base64
 * standard, d'où la substitution avant décodage.
 */
const trouverPhotoAnnuaire_ = (email) => {
  try {
    const photo = AdminDirectory.Users.Photos.get(email);
    if (!photo || !photo.photoData) return null;
    const base64Standard = photo.photoData.replace(/-/g, '+').replace(/_/g, '/');
    const octets = Utilities.base64Decode(base64Standard);
    return Utilities.newBlob(octets, photo.mimeType || 'image/jpeg', `${email}.jpg`);
  } catch (e) {
    return null;
  }
};

/**
 * Fusionne l'onglet technique dans RH : une ligne par email existant est
 * mise à jour sur les seules colonnes possédées par la synchronisation
 * (COLONNES_RH_POSSEDEES_PAR_ANNUAIRE_) ; un email nouveau est ajouté. La
 * colonne Photo, absente de cette liste, n'est jamais lue ni écrite ici.
 *
 * Lecture puis écriture en un seul lot chacune, quelle que soit la taille
 * de l'effectif — jamais une écriture par ligne modifiée.
 */
const fusionnerAnnuaireDansRH_ = (classeur, ongletBrut) => {
  creerOngletRH_(classeur);
  const ongletRH = classeur.getSheetByName(NOM_ONGLET_RH_);
  const donneesRH = ongletRH.getDataRange().getValues();
  const entetes = donneesRH[0];
  const corps = donneesRH.slice(1);
  const iEmailRH = entetes.indexOf('Email');
  const indices = {};
  COLONNES_RH_POSSEDEES_PAR_ANNUAIRE_.forEach((c) => { indices[c] = entetes.indexOf(c); });

  const ligneParEmail = new Map();
  corps.forEach((ligne, i) => {
    const email = String(ligne[iEmailRH] || '').trim().toLowerCase();
    if (email) ligneParEmail.set(email, i);
  });

  const nbLignesBrutes = ongletBrut.getLastRow() - 1;
  const brut = nbLignesBrutes > 0
    ? ongletBrut.getRange(2, 1, nbLignesBrutes, COLONNES_ANNUAIRE_BRUT_.length).getValues()
    : [];

  let ajoutes = 0;
  let misAJour = 0;
  brut.forEach(([email, prenom, nom, poste, service, manager, actif]) => {
    const emailMin = String(email || '').trim().toLowerCase();
    if (!emailMin) return;
    const valeurs = {
      Prénom: prenom, Nom: nom, Email: emailMin, Poste: poste, Service: service, Manager: manager, Actif: actif,
    };

    if (ligneParEmail.has(emailMin)) {
      const i = ligneParEmail.get(emailMin);
      COLONNES_RH_POSSEDEES_PAR_ANNUAIRE_.forEach((c) => {
        if (indices[c] >= 0) corps[i][indices[c]] = valeurs[c];
      });
      misAJour++;
    } else {
      corps.push(entetes.map((c) => (c in valeurs ? valeurs[c] : '')));
      ajoutes++;
    }
  });

  if (corps.length > 0) {
    ongletRH.getRange(2, 1, corps.length, entetes.length).setValues(corps);
  }
  return { ajoutes, misAJour, total: brut.length };
};

/**
 * Cœur de la synchronisation, repris depuis son curseur si une exécution
 * précédente a été interrompue par le plafond de 6 minutes.
 *
 * Le classeur ne rend un « départ propre » (onglet technique vidé) que
 * lorsque `pageToken` est vide : c'est vrai au tout premier appel, et le
 * reste tant que la toute première page n'a pas fini d'être écrite. Une
 * interruption avant cette écriture reprend donc en revidant la page 1 —
 * sans dupliquer de lignes — plutôt que de distinguer « pas commencé » de
 * « interrompu en cours de première page », une distinction que l'état
 * stocké ne permet pas de faire de façon fiable.
 */
const synchroniserAnnuaire_ = (classeur, budgetMs = BUDGET_MS_ANNUAIRE_, tailleLot = TAILLE_LOT_ANNUAIRE_) => {
  const debut = Date.now();
  const props = PropertiesService.getDocumentProperties();
  const onglet = ongletAnnuaireBrut_(classeur);

  let pageToken = props.getProperty(CLE_PROP_PAGE_TOKEN_ANNUAIRE_) || null;
  if (!pageToken) viderAnnuaireBrut_(onglet);
  props.setProperty(CLE_PROP_ETAT_ANNUAIRE_, 'enCours');

  let continuer = true;
  while (continuer) {
    const reponse = AdminDirectory.Users.list({
      customer: 'my_customer',
      projection: 'full',
      orderBy: 'email',
      maxResults: tailleLot,
      pageToken: pageToken || undefined,
    });
    ecrirePageAnnuaire_(onglet, reponse.users);
    pageToken = reponse.nextPageToken || null;
    // Le curseur n'avance qu'après l'écriture de la page correspondante.
    props.setProperty(CLE_PROP_PAGE_TOKEN_ANNUAIRE_, pageToken || '');
    continuer = Boolean(pageToken) && (Date.now() - debut < budgetMs);
  }

  if (pageToken) {
    supprimerDeclencheurs_('reprendreSynchronisationAnnuaire');
    ScriptApp.newTrigger('reprendreSynchronisationAnnuaire').timeBased().after(60 * 1000).create();
    return { termine: false };
  }

  const rapport = fusionnerAnnuaireDansRH_(classeur, onglet);
  props.deleteProperty(CLE_PROP_ETAT_ANNUAIRE_);
  props.deleteProperty(CLE_PROP_PAGE_TOKEN_ANNUAIRE_);
  supprimerDeclencheurs_('reprendreSynchronisationAnnuaire');
  return { termine: true, ...rapport };
};

/**
 * Cible du déclencheur de reprise. Rappelle `regenererTout_` plutôt que la
 * seule synchronisation : si celle-ci se termine à cet appel, la
 * régénération des présentations s'enchaîne dans la foulée, sans exiger un
 * second geste de la personne qui avait lancé « Régénérer maintenant ».
 */
function reprendreSynchronisationAnnuaire() {
  regenererTout_();
}

/** Point d'entrée menu : synchronise RH depuis l'annuaire, sans régénérer les présentations. */
function synchroniserEffectifMaintenant() {
  const ui = SpreadsheetApp.getUi();
  try {
    const resultat = synchroniserAnnuaire_(classeurCourant_());
    if (!resultat.termine) {
      ui.alert(
        'Synchronisation en cours',
        'L’effectif est nombreux : la synchronisation reprendra automatiquement dans une minute.',
        ui.ButtonSet.OK
      );
      return;
    }
    ui.alert(
      'Synchronisation terminée',
      `${resultat.ajoutes} personne(s) ajoutée(s), ${resultat.misAJour} mise(s) à jour dans l’onglet ${NOM_ONGLET_RH_}.`,
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('La synchronisation a échoué', e.message, ui.ButtonSet.OK);
  }
}
