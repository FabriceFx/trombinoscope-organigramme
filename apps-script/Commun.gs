/**
 * Constantes et fonctions partagées — introduites en v0.1.
 *
 * Convention du projet : les points d'entrée sont des `function` déclarées —
 * l'éditeur Apps Script ne propose qu'elles au menu d'exécution — et tout
 * l'interne est écrit en `const nom_ = (…) => …`, invisible de ce menu.
 */

/**
 * Version du projet — seul endroit du code qui la porte.
 *
 * Doit valoir exactement le contenu du fichier VERSION du dépôt ; le banc
 * d'essai le vérifie. Un numéro affiché et faux serait pire que pas de
 * numéro : un déploiement Apps Script sert une copie figée du code, et ce
 * numéro est le seul moyen de savoir laquelle tourne.
 */
const VERSION_ = '0.5.0';

const NOM_ONGLET_RH_ = 'RH';
const NOM_ONGLET_CONFIG_ = 'Config';
const NOM_ONGLET_GUIDE_ = 'Guide';

/** Clés de l'onglet Config — colonne A, recherchées par valeur, jamais par position. */
const CLES_CONFIG_ = {
  langue: 'Langue de l’interface (Français / English)',
  nomEntreprise: 'Nom de l’entreprise (facultatif, page de titre)',
  sourceEffectif: 'Source de l’effectif (RH manuel / Annuaire Google Workspace)',
  sourcePhotos: 'Source des photos (Dossier Drive / Annuaire Google Workspace)',
  dossierPhotos: 'Dossier des photos (Drive)',
  heureMAJ: 'Heure de mise à jour quotidienne (0-23)',
  parLigne: 'Personnes par ligne (trombinoscope)',
  trombinoscopeId: 'Trombinoscope (identifiant, généré)',
  trombinoscopeUrl: 'Trombinoscope (lien)',
  organigrammeId: 'Organigramme (identifiant, généré)',
  organigrammeUrl: 'Organigramme (lien)',
  derniereGeneration: 'Dernière génération',
  statutMAJ: 'Mise à jour quotidienne',
};

const VALEURS_CONFIG_PAR_DEFAUT_ = {
  [CLES_CONFIG_.langue]: 'Français',
  [CLES_CONFIG_.sourceEffectif]: 'RH manuel',
  [CLES_CONFIG_.sourcePhotos]: 'Dossier Drive',
  [CLES_CONFIG_.heureMAJ]: '6',
  [CLES_CONFIG_.parLigne]: '4',
  [CLES_CONFIG_.statutMAJ]: 'Désactivée',
};

const classeurCourant_ = () => SpreadsheetApp.getActive();

/** Échappement HTML pour tout texte inséré dans une boîte de dialogue (Dialogues.gs). */
const echapper_ = (texte) => String(texte ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Lit l'onglet Config en objet clé → valeur brute (colonnes A/B).
 *
 * Ne lève jamais : un onglet absent ou incomplet rend un objet vide plutôt
 * qu'une exception, pour que l'installation puisse le compléter. Les clés
 * manquantes sont résolues via VALEURS_CONFIG_PAR_DEFAUT_ par lireConfig_.
 */
const lireConfigBrute_ = (classeur) => {
  const onglet = classeur.getSheetByName(NOM_ONGLET_CONFIG_);
  if (!onglet || onglet.getLastRow() < 2) return {};
  const lignes = onglet.getRange(2, 1, onglet.getLastRow() - 1, 2).getValues();
  const brut = {};
  lignes.forEach(([cle, valeur]) => {
    if (cle) brut[String(cle).trim()] = valeur;
  });
  return brut;
};

/**
 * Config exploitable, avec valeurs par défaut appliquées aux clés absentes
 * ou vides — jamais aux clés déjà renseignées : le référentiel n'est pas
 * dans le code, le code ne réécrit pas une décision humaine.
 */
const lireConfig_ = (classeur) => {
  const brut = lireConfigBrute_(classeur);
  const val = (cle) => {
    const v = brut[cle];
    return (v === undefined || v === null || v === '') ? VALEURS_CONFIG_PAR_DEFAUT_[cle] : v;
  };
  // Comparaison souple (insensible à la casse, sur un mot-clé) plutôt qu'une
  // égalité stricte sur tout le libellé : une case Config mal recopiée ne
  // doit pas faire basculer silencieusement sur le mode par défaut.
  return {
    langue: /^english/i.test(String(val(CLES_CONFIG_.langue)).trim()) ? 'en' : 'fr',
    nomEntreprise: String(brut[CLES_CONFIG_.nomEntreprise] || '').trim(),
    sourceEffectif: /annuaire/i.test(String(val(CLES_CONFIG_.sourceEffectif))) ? 'annuaire' : 'rh',
    sourcePhotos: /annuaire/i.test(String(val(CLES_CONFIG_.sourcePhotos))) ? 'annuaire' : 'drive',
    dossierPhotos: String(val(CLES_CONFIG_.dossierPhotos) || '').trim(),
    heureMAJ: Number(val(CLES_CONFIG_.heureMAJ)) || 6,
    parLigne: Number(val(CLES_CONFIG_.parLigne)) || 4,
    trombinoscopeId: String(brut[CLES_CONFIG_.trombinoscopeId] || '').trim(),
    organigrammeId: String(brut[CLES_CONFIG_.organigrammeId] || '').trim(),
  };
};

/**
 * Écrit une valeur en Config par clé, jamais par numéro de ligne : la
 * ligne est retrouvée dans la colonne A, ajoutée si elle n'existe pas
 * encore. Ainsi une ligne insérée à la main par l'utilisateur ne décale
 * jamais les écritures automatiques.
 */
const ecrireConfig_ = (classeur, cle, valeur) => {
  const onglet = classeur.getSheetByName(NOM_ONGLET_CONFIG_);
  if (!onglet) return;
  const derniere = onglet.getLastRow();
  const cles = derniere >= 1 ? onglet.getRange(1, 1, derniere, 1).getValues().flat() : [];
  const ligne = cles.findIndex((c) => String(c).trim() === cle) + 1;
  if (ligne > 0) {
    onglet.getRange(ligne, 2).setValue(valeur);
  } else {
    onglet.appendRow([cle, valeur]);
  }
};

/**
 * Résout un identifiant Drive à partir d'un ID brut ou d'une URL collée
 * depuis le navigateur — l'utilisateur ne devrait jamais avoir à extraire
 * l'ID lui-même.
 */
const idDepuisRefDrive_ = (ref) => {
  const texte = String(ref || '').trim();
  const correspondance = texte.match(/[-\w]{25,}/);
  return correspondance ? correspondance[0] : texte;
};

const dossierPhotos_ = (refDossier) => {
  const id = idDepuisRefDrive_(refDossier);
  if (!id) {
    throw new Error(
      `Aucun dossier de photos configuré. Dans l'onglet ${NOM_ONGLET_CONFIG_}, ` +
      `renseignez « ${CLES_CONFIG_.dossierPhotos} » avec le lien du dossier Drive.`
    );
  }
  try {
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error(
      `Le dossier de photos configuré (« ${refDossier} ») est introuvable ou ` +
      `inaccessible avec ce compte. Vérifiez le lien dans l'onglet ${NOM_ONGLET_CONFIG_} ` +
      `et que le dossier est bien partagé avec vous.`
    );
  }
};

/**
 * Cherche la photo d'une personne par convention plutôt que par saisie
 * obligatoire : email complet, puis partie locale de l'email, puis
 * « Prénom Nom », sur les extensions courantes. Rend `null` sans lever —
 * une photo manquante est un cas normal, traité par un avatar de secours,
 * pas une erreur.
 */
const trouverPhoto_ = (dossier, personne) => {
  if (!dossier) return null;
  const candidats = [];
  if (personne.photo) candidats.push(personne.photo);
  if (personne.email) {
    candidats.push(personne.email);
    candidats.push(personne.email.split('@')[0]);
  }
  candidats.push(`${personne.prenom} ${personne.nom}`.trim());

  const extensions = ['', '.jpg', '.jpeg', '.png'];
  for (const base of candidats) {
    if (!base) continue;
    for (const ext of extensions) {
      const fichiers = dossier.getFilesByName(base + ext);
      if (fichiers.hasNext()) return fichiers.next().getBlob();
    }
  }
  return null;
};

const nomComplet_ = (personne) => `${personne.prenom} ${personne.nom}`.trim();

const initiales_ = (personne) => {
  const p = (personne.prenom || '').trim().charAt(0);
  const n = (personne.nom || '').trim().charAt(0);
  return (p + n).toUpperCase() || '?';
};

/**
 * Couleur d'avatar dérivée du service, pas du hasard : la même personne
 * garde la même couleur d'une régénération à l'autre, ce qui évite un
 * trombinoscope qui « clignote » à chaque exécution sans raison visible.
 */
const couleurService_ = (service) => {
  const palette = ['#1a73e8', '#188038', '#e37400', '#8430ce', '#c5221f', '#12656a'];
  const texte = String(service || '');
  let somme = 0;
  for (let i = 0; i < texte.length; i++) somme += texte.charCodeAt(i);
  return palette[somme % palette.length];
};

/**
 * Lit l'onglet RH en tableau de personnes actives.
 *
 * Les colonnes sont retrouvées par en-tête (indexOf), jamais par indice en
 * dur : l'ordre des colonnes dans l'onglet peut changer sans casser la
 * lecture. Une ligne sans email est ignorée — c'est une ligne vide en fin
 * de tableau, pas une personne.
 */
const lirePersonnes_ = (classeur) => {
  const onglet = classeur.getSheetByName(NOM_ONGLET_RH_);
  if (!onglet || onglet.getLastRow() < 2) return [];
  const donnees = onglet.getDataRange().getValues();
  const entetes = donnees[0].map((e) => String(e).trim());
  const col = (nom) => entetes.indexOf(nom);

  const iPrenom = col('Prénom');
  const iNom = col('Nom');
  const iEmail = col('Email');
  const iPoste = col('Poste');
  const iService = col('Service');
  const iManager = col('Manager');
  const iPhoto = col('Photo');
  const iActif = col('Actif');

  return donnees.slice(1)
    .filter((ligne) => String(ligne[iEmail] || '').trim() !== '')
    .filter((ligne) => iActif < 0 || String(ligne[iActif] || 'Oui').trim().toLowerCase() !== 'non')
    .map((ligne) => ({
      prenom: String(ligne[iPrenom] || '').trim(),
      nom: String(ligne[iNom] || '').trim(),
      email: String(ligne[iEmail] || '').trim().toLowerCase(),
      poste: iPoste >= 0 ? String(ligne[iPoste] || '').trim() : '',
      service: iService >= 0 ? String(ligne[iService] || '').trim() : '',
      manager: iManager >= 0 ? String(ligne[iManager] || '').trim().toLowerCase() : '',
      photo: iPhoto >= 0 ? String(ligne[iPhoto] || '').trim() : '',
    }));
};

/**
 * Pas de nom de mois (« MMM ») : Utilities.formatDate suit la locale du
 * compte Google exécutant le script, pas notre réglage `Config.langue` —
 * un motif anglais combiné à un mois rendu en français serait pire que pas
 * de traduction du tout. L'ordre des champs numériques, lui, dépend
 * uniquement du motif qu'on choisit ici.
 */
const formaterHorodatage_ = (date, langue = LANGUE_DEFAUT_) =>
  Utilities.formatDate(date, 'Europe/Paris', langue === 'en' ? 'MM/dd/yyyy HH:mm' : 'dd/MM/yyyy HH:mm');
