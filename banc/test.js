// Banc d'essai — se lance hors de Google, avec Node :
//
//     node banc/test.js
//
// Les fichiers .gs sont chargés dans un contexte où SpreadsheetApp, SlidesApp,
// DriveApp et ScriptApp sont simulés. Cela ne remplace pas une exécution
// réelle — les quotas, le rendu visuel exact et les droits Drive ne s'y
// voient pas — mais cela vérifie la construction de l'arbre hiérarchique, la
// disposition géométrique et la non-régression des déclencheurs, qui sont les
// points qui ont le plus de chances de casser silencieusement.

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const P = path.join(__dirname, '..', 'apps-script') + '/';

// ---- faux classeur --------------------------------------------------------
class FauxFeuille {
  constructor(nom) { this.nom = nom; this.cells = []; }
  getName() { return this.nom; }
  getLastRow() { return this.cells.length; }
  getLastColumn() { return this.cells.reduce((m, r) => Math.max(m, r ? r.length : 0), 0); }
  getRange(r, c, nr = 1, nc = 1) {
    const f = this;
    return {
      setValues(vals) {
        vals.forEach((row, i) => {
          const ligne = r + i - 1;
          f.cells[ligne] = f.cells[ligne] || [];
          row.forEach((v, j) => { f.cells[ligne][c + j - 1] = v; });
        });
        return this;
      },
      getValues() {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = f.cells[r + i - 1] || [];
          const ligne = [];
          for (let j = 0; j < nc; j++) ligne.push(row[c + j - 1] === undefined ? '' : row[c + j - 1]);
          out.push(ligne);
        }
        return out;
      },
      setValue(v) { return this.setValues([[v]]); },
      getValue() { return this.getValues()[0][0]; },
      setFontWeight() { return this; },
      setFontSize() { return this; },
      setBackground() { return this; },
      setDataValidation(regle) {
        f.validations = f.validations || {};
        f.validations[`${r}:${c}`] = regle && regle.valeurs;
        return this;
      },
    };
  }
  appendRow(arr) { this.cells.push([...arr]); return this; }
  setFrozenRows() { return this; }
  setColumnWidth() { return this; }
  autoResizeColumns() { return this; }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.cells.length), Math.max(1, this.getLastColumn())); }
  activate() { this.activee = true; return this; }
  hideSheet() { this.cachee = true; return this; }
  clearContents() { this.cells = []; return this; }
  setTabColor(c) { this.couleurOnglet = c; return this; }
}

class FauxClasseur {
  constructor(feuilles = []) { this.feuilles = feuilles.map((n) => new FauxFeuille(n)); this._proprietes = {}; }
  getSheetByName(n) { return this.feuilles.find((f) => f.nom === n) || null; }
  insertSheet(n) { const f = new FauxFeuille(n); this.feuilles.push(f); return f; }
  getSheets() { return this.feuilles; }
  deleteSheet(f) { this.feuilles = this.feuilles.filter((x) => x !== f); }
  getId() { return 'CLASSEUR_FAUX'; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/FAUX/edit'; }
}

// ---- faux annuaire (Admin Directory) --------------------------------------
let annuaireFake = [];
const AdminDirectory = {
  Users: {
    list({ pageToken, maxResults = 200 } = {}) {
      const debut = pageToken ? Number(pageToken) : 0;
      const page = annuaireFake.slice(debut, debut + maxResults);
      const suivant = debut + maxResults < annuaireFake.length ? String(debut + maxResults) : undefined;
      return { users: page, nextPageToken: suivant };
    },
    Photos: {
      get(email) {
        const u = annuaireFake.find((x) => x.primaryEmail === email);
        // Le vrai Admin SDK lève sur une personne sans photo : le faux doit
        // lever aussi, pas rendre un objet vide qui masquerait le défaut.
        if (!u || !u._photoData) throw new Error('Ressource introuvable (aucune photo).');
        return { photoData: u._photoData, mimeType: 'image/jpeg' };
      },
    },
  },
};

// ---- fausses propriétés de document ---------------------------------------
const PropertiesService = {
  getDocumentProperties: () => {
    const c = classeurActif;
    return {
      getProperty: (k) => (k in c._proprietes ? c._proprietes[k] : null),
      setProperty: (k, v) => { c._proprietes[k] = String(v); },
      deleteProperty: (k) => { delete c._proprietes[k]; },
    };
  },
};

// ---- faux Drive -------------------------------------------------------
class FauxFichierDrive {
  constructor(nom) { this.nom = nom; }
  getBlob() { return { nomPhoto: this.nom }; }
}
class FauxDossierDrive {
  constructor(fichiers = []) { this.fichiers = fichiers.map((n) => new FauxFichierDrive(n)); }
  getFilesByName(nom) {
    const trouves = this.fichiers.filter((f) => f.nom === nom);
    let i = 0;
    return { hasNext: () => i < trouves.length, next: () => trouves[i++] };
  }
}
const dossiersFake = new Map();
const DriveApp = {
  getFolderById(id) {
    const d = dossiersFake.get(id);
    // Le vrai DriveApp refuse aussi un identifiant inconnu ou inaccessible :
    // le faux doit lever, pas rendre un dossier vide qui masquerait le défaut.
    if (!d) throw new Error('Accès refusé, ou aucun fichier ou dossier avec cet identifiant n’a été trouvé.');
    return d;
  },
};

// ---- faux Slides --------------------------------------------------------
class FauxTexte {
  constructor() { this.contenu = ''; }
  setText(t) { this.contenu = t; return this; }
  asString() { return this.contenu; }
  getRange() {
    return { getTextStyle: () => ({
      setBold() { return this; }, setFontSize() { return this; },
      setForegroundColor() { return this; }, setItalic() { return this; },
    }) };
  }
  getTextStyle() { return this.getRange().getTextStyle(); }
  getParagraphStyle() { return { setParagraphAlignment() { return this; } }; }
}
// Le vrai Slides refuse une largeur ou une hauteur non positive (« The width
// should not be zero. ») — un faux qui l'accepterait aurait laissé passer
// le défaut de disposerGrille_ (v0.4) sans qu'aucun test ne le voie.
const verifierDimensions_ = (w, h) => {
  if (!(w > 0) || !(h > 0)) {
    throw new Error(`The width should not be zero. (w=${w}, h=${h})`);
  }
};

class FauxDiapo {
  constructor() { this.shapes = []; this.lines = []; this.textboxes = []; this.images = []; this.removed = false; }
  insertShape(type, x, y, w, h) {
    verifierDimensions_(w, h);
    const texte = new FauxTexte();
    const forme = {
      type, x, y, w, h,
      getFill() { return { setSolidFill() { return this; } }; },
      getBorder() { return {
        getLineFill() { return { setSolidFill() { return this; } }; },
        setTransparent() { return this; },
        setWeight() { return this; },
      }; },
      getText() { return texte; },
    };
    this.shapes.push(forme);
    return forme;
  }
  insertTextBox(t, x, y, w, h) {
    verifierDimensions_(w, h);
    const texte = new FauxTexte(); texte.setText(t);
    const boite = { x, y, w, h, getText() { return texte; } };
    this.textboxes.push(boite);
    return boite;
  }
  insertImage(blob, x, y, w, h) {
    verifierDimensions_(w, h);
    const img = { blob, x, y, w, h };
    this.images.push(img);
    return img;
  }
  insertLine(category, x1, y1, x2, y2) {
    const ligne = {
      category, x1, y1, x2, y2,
      getLineFill() { return { setSolidFill() { return this; } }; },
      setWeight() { return this; },
    };
    this.lines.push(ligne);
    return ligne;
  }
  remove() { this.removed = true; }
}
class FauxPresentation {
  constructor(id, titre) { this.id = id; this.titre = titre; this.slides = [new FauxDiapo()]; }
  getSlides() { return this.slides.filter((s) => !s.removed); }
  appendSlide() { const d = new FauxDiapo(); this.slides.push(d); return d; }
  getPageWidth() { return 720; }
  getPageHeight() { return 405; }
  getId() { return this.id; }
  getUrl() { return `https://docs.google.com/presentation/d/${this.id}/edit`; }
}
const presentationsFake = new Map();
let compteurPres = 0;
const SlidesApp = {
  create(titre) { const id = `PRES_${++compteurPres}`; const p = new FauxPresentation(id, titre); presentationsFake.set(id, p); return p; },
  openById(id) {
    const p = presentationsFake.get(id);
    if (!p) throw new Error('Présentation introuvable ou inaccessible.');
    return p;
  },
  ShapeType: { ROUND_RECTANGLE: 'ROUND_RECTANGLE', ELLIPSE: 'ELLIPSE' },
  LineCategory: { STRAIGHT: 'STRAIGHT' },
  ParagraphAlignment: { CENTER: 'CENTER' },
  PredefinedLayout: { BLANK: 'BLANK' },
};

// ---- faux ScriptApp (déclencheurs) ----------------------------------------
let triggersFake = [];
const ScriptApp = {
  getProjectTriggers: () => triggersFake,
  deleteTrigger: (t) => { triggersFake = triggersFake.filter((x) => x !== t); },
  newTrigger: (fn) => ({
    _hour: null,
    timeBased() { return this; },
    atHour(h) { this._hour = h; return this; },
    everyDays() { return this; },
    after() { return this; },
    create() {
      const d = { getHandlerFunction: () => fn, hour: this._hour };
      triggersFake.push(d);
      return d;
    },
  }),
};

// ---- faux UI ---------------------------------------------------------------
let dernierAlerte = null;
let dernierDialogue = null;
let dernierMenu = null;
const ui = {
  alert: (...args) => { dernierAlerte = args; return 'OK'; },
  showModalDialog: (sortie, titre) => { dernierDialogue = { titre, html: sortie.getContent() }; },
  ButtonSet: { OK: 'OK' },
  createMenu: (nom) => {
    dernierMenu = { nom, items: [] };
    const m = {
      addItem(libelle, fn) { dernierMenu.items.push({ libelle, fn }); return m; },
      addSeparator() { return m; },
      addToUi() { return m; },
    };
    return m;
  },
};

const HtmlService = {
  createHtmlOutput: (html) => ({
    html,
    getContent() { return html; },
    setWidth() { return this; },
    setHeight() { return this; },
  }),
};

let classeurActif = null;

const sandbox = {
  console, Date, Math, String, Object, Array, Number, Error, JSON, Set, Map, Boolean, RegExp,
  Utilities: {
    // Doit vraiment tenir compte du fuseau (dont l'heure d'été) et du motif :
    // un faux qui les ignore validerait un formaterHorodatage_ qui mélange
    // les champs sans que rien ne le remarque.
    formatDate: (d, tz, fmt) => {
      const parties = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date(d));
      const val = (type) => parties.find((p) => p.type === type).value;
      const champs = { yyyy: val('year'), MM: val('month'), dd: val('day'), HH: val('hour'), mm: val('minute') };
      return fmt.replace(/yyyy|MM|dd|HH|mm/g, (jeton) => champs[jeton]);
    },
    base64Decode: (s) => Buffer.from(s, 'base64'),
    newBlob: (octets, mime, nom) => ({ octets, mime, nom }),
  },
  HtmlService,
  SpreadsheetApp: {
    getActive: () => classeurActif,
    getUi: () => ui,
    flush: () => {},
    newDataValidation: () => {
      let valeurs = null;
      return {
        requireValueInList(v) { valeurs = v; return this; },
        setAllowInvalid() { return this; },
        build() { return { valeurs }; },
      };
    },
  },
  DriveApp, SlidesApp, ScriptApp, AdminDirectory, PropertiesService,
};
vm.createContext(sandbox);
for (const f of ['Commun.gs', 'Langues.gs', 'Dialogues.gs', 'Structure.gs', 'Presentation.gs',
  'Organigramme.gs', 'Trombinoscope.gs', 'Annuaire.gs', 'Regeneration.gs', 'Declencheurs.gs',
  'Installation.gs', 'Menu.gs']) {
  vm.runInContext(fs.readFileSync(P + f, 'utf8'), sandbox, { filename: f });
}
// Les `const` de portée globale ne deviennent pas des propriétés de l'objet
// global en V8 : on les récupère dans la portée lexicale du contexte.
const pris = (nom) => vm.runInContext(nom, sandbox);
const {
  VERSION_, lireConfig_, lireConfigBrute_, ecrireConfig_, lirePersonnes_, dossierPhotos_, trouverPhoto_,
  nomComplet_, couleurService_, CLES_CONFIG_, t_, formaterHorodatage_,
} = Object.fromEntries([
  'VERSION_', 'lireConfig_', 'lireConfigBrute_', 'ecrireConfig_', 'lirePersonnes_', 'dossierPhotos_', 'trouverPhoto_',
  'nomComplet_', 'couleurService_', 'CLES_CONFIG_', 't_', 'formaterHorodatage_',
].map((n) => [n, pris(n)]));
const { onOpen } = Object.fromEntries(['onOpen'].map((n) => [n, pris(n)]));
const { construireArbre_, compterSousArbre_ } = Object.fromEntries(
  ['construireArbre_', 'compterSousArbre_'].map((n) => [n, pris(n)])
);
const { disposerArbre_ } = Object.fromEntries(['disposerArbre_'].map((n) => [n, pris(n)]));
const { regenererOrganigramme_ } = Object.fromEntries(['regenererOrganigramme_'].map((n) => [n, pris(n)]));
const { regenererTrombinoscope_ } = Object.fromEntries(['regenererTrombinoscope_'].map((n) => [n, pris(n)]));
const { installer, creerOngletConfig_, ligneDeCleConfig_ } = Object.fromEntries(
  ['installer', 'creerOngletConfig_', 'ligneDeCleConfig_'].map((n) => [n, pris(n)])
);
const { regenererMaintenant, regenererTout_ } = Object.fromEntries(
  ['regenererMaintenant', 'regenererTout_'].map((n) => [n, pris(n)])
);
const { activerMiseAJourQuotidienne, desactiverMiseAJourQuotidienne, misAJourQuotidienne } =
  Object.fromEntries(
    ['activerMiseAJourQuotidienne', 'desactiverMiseAJourQuotidienne', 'misAJourQuotidienne'].map((n) => [n, pris(n)])
  );
const {
  synchroniserAnnuaire_, fusionnerAnnuaireDansRH_, trouverPhotoAnnuaire_,
  synchroniserEffectifMaintenant, reprendreSynchronisationAnnuaire, ongletAnnuaireBrut_,
  nettoyerFeuilleParDefaut_,
} = Object.fromEntries([
  'synchroniserAnnuaire_', 'fusionnerAnnuaireDansRH_', 'trouverPhotoAnnuaire_',
  'synchroniserEffectifMaintenant', 'reprendreSynchronisationAnnuaire', 'ongletAnnuaireBrut_',
  'nettoyerFeuilleParDefaut_',
].map((n) => [n, pris(n)]));

let echecs = 0;
const verifier = (libelle, obtenu, attendu) => {
  if (JSON.stringify(obtenu) === JSON.stringify(attendu)) {
    console.log(`  ok     ${libelle}`);
    return;
  }
  echecs++;
  console.log(`  ÉCHEC  ${libelle}\n    obtenu  ${JSON.stringify(obtenu)}\n    attendu ${JSON.stringify(attendu)}`);
};

const personne = (prenom, nom, email, poste, service, manager = '') =>
  ({ prenom, nom, email: email.toLowerCase(), poste, service, manager: manager.toLowerCase(), photo: '' });

// ---------------------------------------------------------------------------
console.log('\nVersion — un seul numéro, et il doit être vrai');
const versionFichier = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();
verifier('VERSION_ vaut le fichier VERSION du dépôt', VERSION_, versionFichier);

// ---------------------------------------------------------------------------
console.log('\nlirePersonnes_ — une ligne sans email n’est pas une personne');
{
  const classeur = new FauxClasseur(['RH']);
  const onglet = classeur.getSheetByName('RH');
  onglet.appendRow(['Prénom', 'Nom', 'Email', 'Poste', 'Service', 'Manager', 'Photo', 'Actif']);
  onglet.appendRow(['Alix', 'Dupont', 'Alix.Dupont@Exemple.fr', 'Directrice générale', 'Direction', '', '', 'Oui']);
  onglet.appendRow(['Sam', 'Martin', 'sam.martin@exemple.fr', 'Resp. Qualité', 'Qualité', 'alix.dupont@exemple.fr', '', 'Oui']);
  onglet.appendRow(['Jo', 'Ancien', 'jo.ancien@exemple.fr', 'Ex-salarié', 'Qualité', 'alix.dupont@exemple.fr', '', 'Non']);
  onglet.appendRow(['', '', '', '', '', '', '', '']);
  const personnes = lirePersonnes_(classeur);
  verifier('3 lignes de données, 2 personnes actives retenues', personnes.length, 2);
  verifier('email normalisé en minuscules', personnes[0].email, 'alix.dupont@exemple.fr');
  verifier('manager normalisé en minuscules', personnes[1].manager, 'alix.dupont@exemple.fr');
}

// ---------------------------------------------------------------------------
console.log('\nConfig — clé/valeur, défauts appliqués sans écraser l’existant');
{
  const classeur = new FauxClasseur([]);
  creerOngletConfig_(classeur);
  let config = lireConfig_(classeur);
  verifier('heure de mise à jour par défaut', config.heureMAJ, 6);
  verifier('personnes par ligne par défaut', config.parLigne, 4);

  ecrireConfig_(classeur, CLES_CONFIG_.heureMAJ, '9');
  config = lireConfig_(classeur);
  verifier('écriture par clé prise en compte', config.heureMAJ, 9);

  creerOngletConfig_(classeur); // second appel : ne doit pas écraser la valeur déjà changée
  config = lireConfig_(classeur);
  verifier('un second appel à creerOngletConfig_ ne réécrase pas une valeur modifiée', config.heureMAJ, 9);

  const onglet = classeur.getSheetByName('Config');
  const nbLignesApresDoubleInstall = onglet.getLastRow();
  creerOngletConfig_(classeur);
  verifier('creerOngletConfig_ est idempotente (pas de doublon de clé)', onglet.getLastRow(), nbLignesApresDoubleInstall);
}

console.log('\nConfig — un onglet déjà présent mais vide reçoit quand même son en-tête');
{
  // Régression : un onglet Config existant mais vide (créé à la volée, ou
  // une coquille laissée par un essai précédent) ne doit pas décaler la
  // première clé en ligne 1, où lireConfigBrute_ la prendrait pour l'en-tête
  // et l'ignorerait silencieusement.
  const classeur = new FauxClasseur(['Config']);
  creerOngletConfig_(classeur);
  ecrireConfig_(classeur, CLES_CONFIG_.heureMAJ, '11');
  verifier('la valeur écrite après coup est bien relue', lireConfig_(classeur).heureMAJ, 11);
}

// ---------------------------------------------------------------------------
console.log('\nconstruireArbre_ — hiérarchie normale');
{
  const dg = personne('Alix', 'Dupont', 'alix@exemple.fr', 'DG', 'Direction');
  const rh = personne('Sam', 'Martin', 'sam@exemple.fr', 'RRH', 'RH', 'alix@exemple.fr');
  const rq = personne('Jo', 'Petit', 'jo@exemple.fr', 'RQ', 'Qualité', 'alix@exemple.fr');
  const tech = personne('Lou', 'Roux', 'lou@exemple.fr', 'Technicien', 'Qualité', 'jo@exemple.fr');
  const { racines, alertes } = construireArbre_([dg, rh, rq, tech]);
  verifier('une seule racine', racines.length, 1);
  verifier('aucune alerte sur une hiérarchie propre', alertes.length, 0);
  verifier('le sous-arbre complet compte les 4 personnes', compterSousArbre_(racines[0]), 4);
}

console.log('\nconstruireArbre_ — manager introuvable devient un sommet, avec alerte');
{
  const orpheline = personne('Ana', 'Seule', 'ana@exemple.fr', 'Chargée de mission', 'Direction', 'inconnu@exemple.fr');
  const { racines, alertes } = construireArbre_([orpheline]);
  verifier('la personne devient racine', racines.length, 1);
  verifier('une alerte signale le manager introuvable', alertes.some((a) => a.includes('introuvable')), true);
}

console.log('\nconstruireArbre_ — une personne indiquée comme son propre manager');
{
  const bouclee = personne('Bo', 'Uclee', 'bo@exemple.fr', 'Poste', 'Service', 'bo@exemple.fr');
  const { racines, alertes } = construireArbre_([bouclee]);
  verifier('la personne devient racine malgré la boucle', racines.length, 1);
  verifier('une alerte signale le lien ignoré', alertes.some((a) => a.includes('propre manager')), true);
}

console.log('\nconstruireArbre_ — cycle à deux (A manager de B, B manager de A) : pas de boucle infinie');
{
  const a = personne('A', 'A', 'a@exemple.fr', 'Poste A', 'Service', 'b@exemple.fr');
  const b = personne('B', 'B', 'b@exemple.fr', 'Poste B', 'Service', 'a@exemple.fr');
  const { racines, alertes } = construireArbre_([a, b]);
  verifier('une alerte signale le cycle', alertes.some((al) => al.includes('Cycle')), true);
  const total = racines.reduce((s, r) => s + compterSousArbre_(r), 0);
  verifier('les deux personnes apparaissent malgré tout, une seule fois chacune', total, 2);
}

// ---------------------------------------------------------------------------
console.log('\ndisposerArbre_ — une feuille occupe une largeur de boîte');
{
  const feuille = { enfants: [] };
  const largeur = disposerArbre_(feuille);
  verifier('largeur d’une feuille', largeur, 140);
  verifier('centre d’une feuille', feuille._x, 70);
}

console.log('\ndisposerArbre_ — un parent de deux feuilles est centré au-dessus d’elles');
{
  const g = { enfants: [] };
  const d = { enfants: [] };
  const parent = { enfants: [g, d] };
  const largeur = disposerArbre_(parent);
  verifier('largeur = 2 boîtes + 1 espace', largeur, 140 * 2 + 16);
  verifier('parent centré entre les deux enfants', parent._x, (140 * 2 + 16) / 2);
}

// ---------------------------------------------------------------------------
console.log('\ntrouverPhoto_ — retrouve par email, sinon rend null sans lever');
{
  const dossier = new FauxDossierDrive(['sam.martin@exemple.fr.jpg']);
  const trouvee = trouverPhoto_(dossier, { email: 'sam.martin@exemple.fr', prenom: 'Sam', nom: 'Martin' });
  verifier('photo retrouvée par email', trouvee && trouvee.nomPhoto, 'sam.martin@exemple.fr.jpg');
  const absente = trouverPhoto_(dossier, { email: 'personne@exemple.fr', prenom: 'Personne', nom: 'Absente' });
  verifier('aucune photo : null, pas d’exception', absente, null);
}

console.log('\ndossierPhotos_ — un identifiant inconnu lève une erreur explicite');
{
  let leve = false;
  try { dossierPhotos_('id-inconnu-1234567890123456789'); } catch (e) { leve = /introuvable ou inaccessible/.test(e.message); }
  verifier('erreur explicite sur dossier inaccessible', leve, true);
}

// ---------------------------------------------------------------------------
console.log('\nregenererOrganigramme_ — petite équipe : un seul slide, toutes les boîtes et les liens');
{
  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  const config = lireConfig_(classeur);

  const dg = personne('Alix', 'Dupont', 'alix@exemple.fr', 'DG', 'Direction');
  const rh = personne('Sam', 'Martin', 'sam@exemple.fr', 'RRH', 'RH', 'alix@exemple.fr');
  const rq = personne('Jo', 'Petit', 'jo@exemple.fr', 'RQ', 'Qualité', 'alix@exemple.fr');
  const rapport = regenererOrganigramme_(config, [dg, rh, rq]);

  const presentation = presentationsFake.get(rapport.id);
  verifier('couverture + un seul slide de contenu pour une petite équipe', presentation.getSlides().length, 2);
  verifier('une boîte par personne', presentation.getSlides()[1].shapes.length, 3);
  verifier('un connecteur par lien hiérarchique', presentation.getSlides()[1].lines.length, 2);
  verifier('Config reçoit l’identifiant de la présentation', lireConfig_(classeur).organigrammeId, rapport.id);
}

console.log('\nregenererOrganigramme_ — organisation large : vue d’ensemble + un slide par service');
{
  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  const config = lireConfig_(classeur);

  const dg = personne('Alix', 'Dupont', 'alix@exemple.fr', 'DG', 'Direction');
  const branches = Array.from({ length: 8 }, (_, i) =>
    personne(`Resp${i}`, 'Service', `resp${i}@exemple.fr`, `Resp. Service ${i}`, `Service ${i}`, 'alix@exemple.fr'));
  const rapport = regenererOrganigramme_(config, [dg, ...branches]);

  const presentation = presentationsFake.get(rapport.id);
  verifier('couverture + 1 vue d’ensemble + 8 slides de service', presentation.getSlides().length, 10);
  verifier('la vue d’ensemble montre la racine et les 8 responsables', presentation.getSlides()[1].shapes.length, 9);
}

console.log('\nregenererOrganigramme_ — hiérarchie à 4 niveaux réels : chaque niveau descend bien d’un cran');
{
  // Les tests précédents couvrent soit une petite équipe à 2 niveaux, soit
  // une racine large mais plate (8 enfants directs, profondeur 1) : aucun
  // des deux n'aurait attrapé un décalage de niveau qui ne se manifeste
  // qu'à partir de la 3ᵉ génération — voir la note sur enfant._decalage
  // dans CLAUDE.md, découverte justement en retraçant un calcul à la main.
  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  const config = lireConfig_(classeur);

  const racine = personne('Alix', 'Dupont', 'n0@exemple.fr', 'DG', 'Direction');
  const n1 = personne('Marc', 'Girard', 'n1@exemple.fr', 'Directeur', 'Direction', 'n0@exemple.fr');
  const n2 = personne('Léa', 'Bernard', 'n2@exemple.fr', 'Responsable', 'Direction', 'n1@exemple.fr');
  const n3a = personne('Hugo', 'Petit', 'n3a@exemple.fr', 'Employé', 'Direction', 'n2@exemple.fr');
  const n3b = personne('Chloé', 'Robert', 'n3b@exemple.fr', 'Employé', 'Direction', 'n2@exemple.fr');
  const rapport = regenererOrganigramme_(config, [racine, n1, n2, n3a, n3b]);

  const presentation = presentationsFake.get(rapport.id);
  verifier('couverture + un seul slide de contenu (5 personnes)', presentation.getSlides().length, 2);
  const formes = presentation.getSlides()[1].shapes;
  verifier('5 boîtes, une par personne', formes.length, 5);
  verifier('4 niveaux distincts de hauteur (n3a et n3b partagent le même niveau)',
    new Set(formes.map((f) => f.y)).size, 4);
  // Chaque niveau doit être strictement plus bas que le précédent — un
  // niveau qui resterait à la même hauteur, ou qui remonterait, signalerait
  // que `_decalage` (non mis à l'échelle) a été ajouté sans être multiplié
  // par `echelle`, ou l'inverse.
  const hauteurs = [...new Set(formes.map((f) => f.y))].sort((a, b) => a - b);
  verifier('chaque niveau descend strictement par rapport au précédent',
    hauteurs.every((h, i) => i === 0 || h > hauteurs[i - 1]), true);
}

console.log('\nJeu de données de démonstration — effectif-demo.csv reste cohérent et se génère sans exception');
{
  // Garde-fou sur le fichier livré aux utilisateurs (exemples/effectif-demo.csv) :
  // s'il se corrompt ou se désynchronise des colonnes RH, ce test le signale
  // avant qu'une personne ne l'importe dans son classeur.
  const csv = fs.readFileSync(path.join(__dirname, '..', 'exemples', 'effectif-demo.csv'), 'utf8')
    .trim().split('\n').slice(1);
  const toutes = csv.map((ligne) => {
    const [prenom, nom, email, poste, service, manager, photo, actif] = ligne.split(',');
    return { prenom, nom, email, poste, service, manager, photo, actif };
  });
  verifier('30 personnes dans le jeu de démonstration', toutes.length, 30);

  const actives = toutes.filter((p) => p.actif !== 'Non').map((p) => personne(p.prenom, p.nom, p.email, p.poste, p.service, p.manager));
  verifier('29 personnes actives (Sacha Adam exclu)', actives.length, 29);

  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  const config = lireConfig_(classeur);

  const rapportOrg = regenererOrganigramme_(config, actives);
  verifier('aucune alerte sur ce jeu de données (pas de manager orphelin ni de cycle)', rapportOrg.alertes.length, 0);
  const presOrg = presentationsFake.get(rapportOrg.id);
  verifier('couverture + vue d’ensemble + 4 directions (3 directeurs + le poste informatique en direct)',
    presOrg.getSlides().length, 6);

  const rapportTrombi = regenererTrombinoscope_(config, actives);
  verifier('les 29 personnes actives sont traitées par le trombinoscope', rapportTrombi.nbPersonnes, 29);
}

console.log('\nregenererOrganigramme_ — aucune personne : pas d’exception, rapport explicite');
{
  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  const rapport = regenererOrganigramme_(lireConfig_(classeur), []);
  verifier('rapport vide sans exception', rapport.nbPersonnes, 0);
  verifier('une alerte explique l’absence de données', rapport.alertes.length > 0, true);
}

// ---------------------------------------------------------------------------
console.log('\nregenererTrombinoscope_ — photo manquante remplacée par un avatar, jamais un blocage');
{
  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  dossiersFake.set('DOSSIER_1', new FauxDossierDrive(['alix@exemple.fr.jpg']));
  ecrireConfig_(classeur, CLES_CONFIG_.dossierPhotos, 'DOSSIER_1');
  const config = lireConfig_(classeur);

  const gens = [
    personne('Alix', 'Dupont', 'alix@exemple.fr', 'DG', 'Direction'),
    personne('Sam', 'Martin', 'sam@exemple.fr', 'RRH', 'RH', 'alix@exemple.fr'),
  ];
  const rapport = regenererTrombinoscope_(config, gens);
  verifier('2 personnes traitées', rapport.nbPersonnes, 2);
  verifier('1 photo manquante sur 2', rapport.nbPhotosManquantes, 1);

  const presentation = presentationsFake.get(rapport.id);
  verifier('une image sur le slide de contenu', presentation.getSlides()[1].images.length, 1);
  verifier('un avatar (ellipse) pour la photo manquante',
    presentation.getSlides()[1].shapes.filter((s) => s.type === 'ELLIPSE').length, 1);
}

console.log('\nregenererTrombinoscope_ — pagination selon « personnes par ligne »');
{
  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  ecrireConfig_(classeur, CLES_CONFIG_.parLigne, '4'); // 4 x 3 rangées = 12 par diapo
  const config = lireConfig_(classeur);
  const gens = Array.from({ length: 25 }, (_, i) => personne(`P${i}`, 'X', `p${i}@exemple.fr`, 'Poste', 'Service'));
  const rapport = regenererTrombinoscope_(config, gens);
  const presentation = presentationsFake.get(rapport.id);
  verifier('couverture + 25 personnes sur 12/diapo → 3 diapos de contenu', presentation.getSlides().length, 4);
}

console.log('\nregenererTrombinoscope_ — « Personnes par ligne » trop grand pour la diapositive : réduit, jamais négatif');
{
  // Régression : avec parLigne=100 sur une diapositive de 720pt, la largeur
  // de carte calculée devenait négative et Slides refusait avec
  // « The width should not be zero. ». disposerGrille_ doit maintenant
  // réduire parLigne plutôt que transmettre une largeur non positive.
  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  ecrireConfig_(classeur, CLES_CONFIG_.parLigne, '100');
  const config = lireConfig_(classeur);
  const gens = Array.from({ length: 5 }, (_, i) => personne(`P${i}`, 'X', `p${i}@exemple.fr`, 'Poste', 'Service'));

  let leve = null;
  let rapport = null;
  try { rapport = regenererTrombinoscope_(config, gens); } catch (e) { leve = e; }
  verifier('aucune exception (aucune largeur non positive transmise à Slides)', leve, null);
  verifier('« Personnes par ligne » a bien été réduit', rapport.parLigneAjustee > 0 && rapport.parLigneAjustee < 100, true);
}

// ---------------------------------------------------------------------------
console.log('\nDéclencheur quotidien — activer/désactiver ne crée jamais de doublon');
{
  const classeur = new FauxClasseur(['Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  ecrireConfig_(classeur, CLES_CONFIG_.heureMAJ, '9');
  triggersFake = [];

  activerMiseAJourQuotidienne();
  verifier('un déclencheur créé', triggersFake.length, 1);
  verifier('à la bonne heure', triggersFake[0].hour, 9);

  activerMiseAJourQuotidienne(); // ré-activation : ne doit pas empiler un second déclencheur
  verifier('toujours un seul déclencheur après ré-activation', triggersFake.length, 1);

  desactiverMiseAJourQuotidienne();
  verifier('plus aucun déclencheur après désactivation', triggersFake.length, 0);
}

console.log('\nmisAJourQuotidienne — s’exécute sans dépendre d’une interface');
{
  const classeur = new FauxClasseur(['RH', 'Config']);
  classeurActif = classeur;
  creerOngletConfig_(classeur);
  const rh = classeur.getSheetByName('RH');
  rh.appendRow(['Prénom', 'Nom', 'Email', 'Poste', 'Service', 'Manager', 'Photo', 'Actif']);
  rh.appendRow(['Alix', 'Dupont', 'alix@exemple.fr', 'DG', 'Direction', '', '', 'Oui']);

  dernierAlerte = null;
  misAJourQuotidienne();
  verifier('aucune alerte affichée depuis le déclencheur (pas d’UI en contexte réel)', dernierAlerte, null);
  const brut = lireConfigBrute_(classeur);
  verifier('Config note la dernière génération avec un horodatage (fr : jour/mois/année)',
    /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(brut[CLES_CONFIG_.derniereGeneration]), true);
}

// ---------------------------------------------------------------------------
console.log('\ninstaller — idempotent, ne duplique aucun onglet');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  installer();
  const nbRH = classeur.feuilles.filter((f) => f.nom === 'RH').length;
  const nbConfig = classeur.feuilles.filter((f) => f.nom === 'Config').length;
  const nbGuide = classeur.feuilles.filter((f) => f.nom === 'Guide').length;
  verifier('un seul onglet RH après deux installations', nbRH, 1);
  verifier('un seul onglet Config après deux installations', nbConfig, 1);
  verifier('un seul onglet Guide après deux installations', nbGuide, 1);
}

console.log('\ninstaller — retire l’onglet « Feuille 1 » laissé par défaut, s’il est vide');
{
  const classeur = new FauxClasseur(['Feuille 1']);
  classeurActif = classeur;
  installer();
  verifier('« Feuille 1 » vide a disparu', classeur.getSheetByName('Feuille 1'), null);
}

console.log('\ninstaller — ne touche pas à « Feuille 1 » si elle contient quelque chose');
{
  const classeur = new FauxClasseur(['Feuille 1']);
  classeurActif = classeur;
  classeur.getSheetByName('Feuille 1').appendRow(['donnée déjà là']);
  installer();
  verifier('« Feuille 1 » non vide est conservée', classeur.getSheetByName('Feuille 1') !== null, true);
}

// ---------------------------------------------------------------------------
console.log('\nAnnuaire — synchronisation complète : ajout, service par orgUnitPath, suspendu exclu');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  annuaireFake = [
    { primaryEmail: 'DG@exemple.fr', name: { givenName: 'Alix', familyName: 'Dupont' },
      organizations: [{ title: 'DG', department: 'Direction' }], suspended: false },
    { primaryEmail: 'rh@exemple.fr', name: { givenName: 'Sam', familyName: 'Martin' },
      organizations: [{ title: 'RRH', department: 'RH' }],
      relations: [{ type: 'manager', value: 'dg@exemple.fr' }], suspended: false },
    { primaryEmail: 'qualite@exemple.fr', name: { givenName: 'Jo', familyName: 'Petit' },
      orgUnitPath: '/Qualité', relations: [{ type: 'manager', value: 'dg@exemple.fr' }], suspended: false },
    { primaryEmail: 'parti@exemple.fr', name: { givenName: 'Ex', familyName: 'Salarie' },
      organizations: [{ title: 'Ancien poste', department: 'Qualité' }],
      relations: [{ type: 'manager', value: 'dg@exemple.fr' }], suspended: true },
  ];

  const resultat = synchroniserAnnuaire_(classeur);
  verifier('synchronisation terminée en un seul passage', resultat.termine, true);
  verifier('4 personnes ajoutées', resultat.ajoutes, 4);

  const personnes = lirePersonnes_(classeur);
  const parEmail = new Map(personnes.map((p) => [p.email, p]));
  verifier('la personne suspendue est exclue (Actif = Non)', parEmail.has('parti@exemple.fr'), false);
  verifier('service retrouvé via orgUnitPath quand organizations est absent', parEmail.get('qualite@exemple.fr').service, 'Qualité');
  verifier('manager retrouvé via relations, en minuscules', parEmail.get('rh@exemple.fr').manager, 'dg@exemple.fr');

  const ongletBrut = ongletAnnuaireBrut_(classeur);
  verifier('l’onglet technique est masqué', ongletBrut.cachee, true);
}

console.log('\nAnnuaire — colonne Photo jamais touchée par la synchronisation');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  const rh = classeur.getSheetByName('RH');
  rh.appendRow(['Alix', 'Dupont', 'dg@exemple.fr', 'DG', 'Direction', '', 'photo-perso.jpg', 'Oui']);
  annuaireFake = [
    { primaryEmail: 'dg@exemple.fr', name: { givenName: 'Alix', familyName: 'Dupont' },
      organizations: [{ title: 'DG', department: 'Direction' }], suspended: false },
  ];
  synchroniserAnnuaire_(classeur);
  const donnees = rh.getDataRange().getValues();
  const entetes = donnees[0];
  const ligne = donnees.find((l) => l[entetes.indexOf('Email')] === 'dg@exemple.fr');
  verifier('la colonne Photo garde sa valeur manuelle après synchronisation', ligne[entetes.indexOf('Photo')], 'photo-perso.jpg');
}

console.log('\nAnnuaire — reprise après interruption : ni perte, ni doublon');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  annuaireFake = Array.from({ length: 5 }, (_, i) =>
    ({ primaryEmail: `p${i}@exemple.fr`, name: { givenName: `P${i}`, familyName: 'X' },
      organizations: [{ title: 'Poste', department: 'Service' }], suspended: false }));

  // budgetMs = 0 force un arrêt après chaque page ; tailleLot = 2 force 3 pages (2+2+1).
  let resultat = synchroniserAnnuaire_(classeur, 0, 2);
  verifier('page 1 : pas encore terminé', resultat.termine, false);
  verifier('un déclencheur de reprise est posé', triggersFake.some((t) => t.getHandlerFunction() === 'reprendreSynchronisationAnnuaire'), true);
  verifier('2 lignes déjà écrites dans l’onglet technique', ongletAnnuaireBrut_(classeur).getLastRow() - 1, 2);

  resultat = synchroniserAnnuaire_(classeur, 0, 2);
  verifier('page 2 : toujours pas terminé', resultat.termine, false);
  verifier('un seul déclencheur de reprise, pas d’empilement',
    triggersFake.filter((t) => t.getHandlerFunction() === 'reprendreSynchronisationAnnuaire').length, 1);
  verifier('4 lignes après la deuxième page (pas de doublon de la première)',
    ongletAnnuaireBrut_(classeur).getLastRow() - 1, 4);

  resultat = synchroniserAnnuaire_(classeur, 0, 2);
  verifier('page 3 : synchronisation terminée', resultat.termine, true);
  verifier('les 5 personnes sont ajoutées au total', resultat.ajoutes, 5);
  verifier('plus aucun déclencheur de reprise une fois terminé',
    triggersFake.some((t) => t.getHandlerFunction() === 'reprendreSynchronisationAnnuaire'), false);
}

console.log('\ntrouverPhotoAnnuaire_ — photo de profil décodée, absence sans exception');
{
  const donneesBrutes = Buffer.from('faux-octets-photo');
  annuaireFake = [
    { primaryEmail: 'photo@exemple.fr', _photoData: donneesBrutes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_') },
    { primaryEmail: 'sansphoto@exemple.fr' },
  ];
  const blob = trouverPhotoAnnuaire_('photo@exemple.fr');
  verifier('la photo est décodée correctement', blob && blob.octets.equals(donneesBrutes), true);
  verifier('une personne sans photo rend null, sans exception', trouverPhotoAnnuaire_('sansphoto@exemple.fr'), null);
}

console.log('\nregenererTout_ — source « annuaire » synchronise puis génère en une seule fois si l’effectif tient dans le budget');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  ecrireConfig_(classeur, CLES_CONFIG_.sourceEffectif, 'Annuaire Google Workspace');
  annuaireFake = [
    { primaryEmail: 'dg@exemple.fr', name: { givenName: 'Alix', familyName: 'Dupont' },
      organizations: [{ title: 'DG', department: 'Direction' }], suspended: false },
  ];
  const rapport = regenererTout_();
  verifier('pas d’attente : le budget par défaut suffit pour un petit effectif', Boolean(rapport.enAttente), false);
  verifier('la génération a bien eu lieu après la synchronisation', rapport.nbPersonnes, 1);
}

// ---------------------------------------------------------------------------
console.log('\nregenererMaintenant — le compte rendu propose un lien direct vers chaque présentation');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  const rh = classeur.getSheetByName('RH');
  rh.appendRow(['Alix', 'Dupont', 'alix@exemple.fr', 'DG', 'Direction', '', '', 'Oui']);

  dernierDialogue = null;
  regenererMaintenant();
  verifier('une boîte de dialogue HTML est affichée', dernierDialogue !== null, true);
  verifier('le lien vers le trombinoscope est présent', dernierDialogue.html.includes('Ouvrir le trombinoscope'), true);
  verifier('le lien vers l’organigramme est présent', dernierDialogue.html.includes('Ouvrir l’organigramme'), true);
}

console.log('\ninstaller — couleurs d’onglet cohérentes (repère visuel rapide)');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  verifier('onglet RH en bleu', classeur.getSheetByName('RH').couleurOnglet, '#1a73e8');
  verifier('onglet Config en gris', classeur.getSheetByName('Config').couleurOnglet, '#5f6368');
  verifier('onglet Guide en vert', classeur.getSheetByName('Guide').couleurOnglet, '#188038');
}

console.log('\ninstaller — listes déroulantes sur les réglages qui pilotent l’aiguillage du code');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  const config = classeur.getSheetByName('Config');
  const ligneEffectif = ligneDeCleConfig_(config, CLES_CONFIG_.sourceEffectif);
  const lignePhotos = ligneDeCleConfig_(config, CLES_CONFIG_.sourcePhotos);
  verifier('« Source de l’effectif » limitée aux deux valeurs reconnues par lireConfig_',
    config.validations[`${ligneEffectif}:2`], ['RH manuel', 'Annuaire Google Workspace']);
  verifier('« Source des photos » limitée aux deux valeurs reconnues par lireConfig_',
    config.validations[`${lignePhotos}:2`], ['Dossier Drive', 'Annuaire Google Workspace']);
}

console.log('\nt_ — traduction avec repli sur le français');
{
  verifier('clé connue en anglais', t_('en', 'menuRegenerer'), 'Regenerate now');
  verifier('clé connue en français', t_('fr', 'menuRegenerer'), 'Régénérer maintenant');
  verifier('substitution de variable', t_('en', 'titreOrganigrammeBranche', { nom: 'Alix Dupont' }), 'Org chart — Alix Dupont');
  verifier('langue non reconnue : repli sur le français', t_('de', 'menuRegenerer'), 'Régénérer maintenant');
}

console.log('\nformaterHorodatage_ — l’ordre des champs suit la langue, jamais le nom du mois');
{
  const date = new Date(Date.UTC(2026, 8, 8, 12, 0)); // 8 septembre 2026, 12:00 UTC
  verifier('fr : jour/mois/année', formaterHorodatage_(date, 'fr'), '08/09/2026 14:00');
  verifier('en : mois/jour/année', formaterHorodatage_(date, 'en'), '09/08/2026 14:00');
}

console.log('\nonOpen — le menu suit Config.langue');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();

  dernierMenu = null;
  onOpen();
  verifier('menu « RH » par défaut (français)', dernierMenu.nom, 'RH');
  verifier('premier item en français', dernierMenu.items[0].libelle, 'Installer les onglets');

  ecrireConfig_(classeur, CLES_CONFIG_.langue, 'English');
  dernierMenu = null;
  onOpen();
  verifier('menu « HR » une fois la langue changée', dernierMenu.nom, 'HR');
  verifier('premier item en anglais', dernierMenu.items[0].libelle, 'Set up the tabs');
  verifier('bouton régénérer en anglais', dernierMenu.items.find((i) => i.fn === 'regenererMaintenant').libelle, 'Regenerate now');
}

console.log('\nGuide — suit Config.langue et se régénère à chaque installation');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  const guideFr = classeur.getSheetByName('Guide').cells.map((l) => l[0]).join('\n');
  verifier('guide en français par défaut', guideFr.includes('Guide — Trombinoscope & organigramme'), true);

  ecrireConfig_(classeur, CLES_CONFIG_.langue, 'English');
  installer();
  const guideEn = classeur.getSheetByName('Guide').cells.map((l) => l[0]).join('\n');
  verifier('guide en anglais après changement de langue, sans étape supplémentaire',
    guideEn.includes('Guide — Staff directory & org chart'), true);
}

console.log('\nDialogues et présentations — le contenu suit Config.langue de bout en bout');
{
  const classeur = new FauxClasseur([]);
  classeurActif = classeur;
  installer();
  ecrireConfig_(classeur, CLES_CONFIG_.langue, 'English');
  const rh = classeur.getSheetByName('RH');
  rh.appendRow(['Alix', 'Dupont', 'alix@exemple.fr', 'DG', 'Direction', '', '', 'Oui']);
  rh.appendRow(['Ex', 'Salarie', 'ex@exemple.fr', 'Ancien', 'Direction', 'introuvable@exemple.fr', '', 'Oui']);

  dernierDialogue = null;
  regenererMaintenant();
  verifier('bouton Fermer traduit', dernierDialogue.html.includes('>Close<'), true);
  verifier('lien vers le trombinoscope traduit', dernierDialogue.html.includes('Open the staff directory'), true);
  verifier('lien vers l’organigramme traduit', dernierDialogue.html.includes('Open the org chart'), true);
  verifier('alerte de manager introuvable traduite', dernierDialogue.html.includes('not found in the headcount'), true);

  const config = lireConfig_(classeur);
  const presOrg = presentationsFake.get(config.organigrammeId);
  verifier('titre de couverture de l’organigramme traduit',
    presOrg.getSlides()[0].textboxes.some((t) => t.getText().asString() === 'Org Chart'), true);
  const presTrombi = presentationsFake.get(config.trombinoscopeId);
  verifier('titre de couverture du trombinoscope traduit',
    presTrombi.getSlides()[0].textboxes.some((t) => t.getText().asString() === 'Staff Directory'), true);
}

console.log('\ncouleurService_ — déterministe, jamais aléatoire');
{
  verifier('même service → même couleur', couleurService_('Qualité'), couleurService_('Qualité'));
}

console.log(`\n${echecs === 0 ? 'Tous les tests passent.' : `${echecs} échec(s).`}`);
process.exit(echecs ? 1 : 0);
