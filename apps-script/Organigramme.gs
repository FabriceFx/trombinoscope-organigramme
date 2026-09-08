/**
 * Génération de l'organigramme dans une présentation Slides — introduit en
 * v0.1.
 *
 * Disposition : algorithme classique de centrage d'arbre (chaque nœud est
 * centré au-dessus de ses enfants). Calculée une première fois en unités
 * abstraites (disposerArbre_), elle est ensuite projetée dans l'espace de
 * la diapositive avec une échelle (dessinerArbre_) — la même disposition
 * sert donc aussi bien à une petite équipe qu'à une grande, seule
 * l'échelle change.
 */

const BOITE_LARGEUR_ = 140;
const BOITE_HAUTEUR_ = 46;
const ESPACE_H_ = 16;
const ESPACE_V_ = 40;
const MARGE_DIAPO_ = 30;

/**
 * En dessous de cette échelle, le texte des boîtes devient illisible : on
 * bascule alors d'un unique slide vers une vue d'ensemble + un slide par
 * branche, plutôt que de continuer à réduire.
 */
const ECHELLE_MIN_ORGANIGRAMME_ = 0.55;

/**
 * Calcule la largeur de chaque sous-arbre et la position (`_x`, centre)
 * de chaque nœud relativement à l'origine gauche de son propre sous-arbre.
 * `_decalage` est rempli sur les enfants : le décalage horizontal de leur
 * sous-arbre par rapport à celui de leur parent.
 */
const disposerArbre_ = (noeud) => {
  if (!noeud.enfants || noeud.enfants.length === 0) {
    noeud._largeur = BOITE_LARGEUR_;
    noeud._x = BOITE_LARGEUR_ / 2;
    return noeud._largeur;
  }
  let decalage = 0;
  noeud.enfants.forEach((enfant) => {
    const largeurEnfant = disposerArbre_(enfant);
    enfant._decalage = decalage;
    decalage += largeurEnfant + ESPACE_H_;
  });
  const largeurEnfants = decalage - ESPACE_H_;
  noeud._largeur = Math.max(BOITE_LARGEUR_, largeurEnfants);
  const centrage = (noeud._largeur - largeurEnfants) / 2;
  if (centrage > 0) noeud.enfants.forEach((enfant) => { enfant._decalage += centrage; });
  const premier = noeud.enfants[0];
  const dernier = noeud.enfants[noeud.enfants.length - 1];
  noeud._x = (premier._decalage + premier._x + dernier._decalage + dernier._x) / 2;
  return noeud._largeur;
};

/**
 * Dessine récursivement un nœud et ses enfants sur une diapositive, à
 * l'échelle donnée, avec l'origine (coin gauche du sous-arbre complet) à
 * (`origineX`, `origineY`). `enfant._decalage` est en unités non mises à
 * l'échelle (celles de disposerArbre_) : il est donc multiplié par
 * `echelle` ici, comme `noeud._x`, jamais ajouté tel quel.
 *
 * Un nœud sans `personne` (la racine virtuelle qui regroupe plusieurs
 * sommets de hiérarchie) ne dessine ni boîte ni connecteur vers ses
 * enfants : ceux-ci apparaissent alors comme plusieurs sommets côte à
 * côte, sans ligne qui partirait de nulle part.
 */
const dessinerNoeud_ = (diapo, noeud, origineX, origineY, echelle) => {
  const hauteurBoite = BOITE_HAUTEUR_ * echelle;
  const xCentre = origineX + noeud._x * echelle;
  let yBas = origineY;

  if (noeud.personne) {
    const largeurBoite = BOITE_LARGEUR_ * echelle;
    const rect = diapo.insertShape(
      SlidesApp.ShapeType.ROUND_RECTANGLE,
      xCentre - largeurBoite / 2, origineY, largeurBoite, hauteurBoite
    );
    rect.getFill().setSolidFill('#f1f3f4');
    rect.getBorder().getLineFill().setSolidFill(couleurService_(noeud.personne.service));
    const nom = nomComplet_(noeud.personne);
    const texte = rect.getText();
    texte.setText(`${nom}\n${noeud.personne.poste || ''}`);
    texte.getRange(0, nom.length).getTextStyle()
      .setBold(true).setFontSize(Math.max(6, 10 * echelle));
    texte.getRange(nom.length, texte.asString().length).getTextStyle()
      .setFontSize(Math.max(5, 8 * echelle)).setForegroundColor('#5f6368');
    texte.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    yBas = origineY + hauteurBoite;
  }

  const yEnfants = noeud.personne ? yBas + ESPACE_V_ * echelle : origineY;
  (noeud.enfants || []).forEach((enfant) => {
    const origineXEnfant = origineX + enfant._decalage * echelle;
    const xCentreEnfant = origineXEnfant + enfant._x * echelle;

    if (noeud.personne) {
      const ligne = diapo.insertLine(
        SlidesApp.LineCategory.STRAIGHT, xCentre, yBas, xCentreEnfant, yEnfants
      );
      ligne.getLineFill().setSolidFill('#9aa0a6');
      ligne.setWeight(1);
    }

    dessinerNoeud_(diapo, enfant, origineXEnfant, yEnfants, echelle);
  });

  return { x: xCentre, yBas };
};

const ouvrirOuCreerPresentation_ = (id, titre) => {
  if (id) {
    try {
      return SlidesApp.openById(id);
    } catch (e) {
      // L'identifiant enregistré ne pointe plus vers rien d'accessible
      // (fichier supprimé, déplacé hors de portée) : on en recrée un
      // plutôt que d'échouer, et Config sera mis à jour avec le nouveau.
    }
  }
  return SlidesApp.create(titre);
};

const ajouterDiapoVierge_ = (presentation) =>
  presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);

const ajouterTitreDiapo_ = (diapo, texte) => {
  const boite = diapo.insertTextBox(texte, MARGE_DIAPO_, 6, 400, 24);
  boite.getText().getTextStyle().setFontSize(14).setBold(true).setForegroundColor('#202124');
};

/**
 * Vide une présentation de ses diapositives existantes en préservant
 * l'identifiant du fichier (donc son URL et ses droits de partage) : les
 * anciennes diapositives sont supprimées après coup, jamais avant, pour
 * qu'une présentation ne se retrouve jamais à zéro diapositive au milieu
 * du traitement.
 */
const regenererDansPresentation_ = (presentation, construire) => {
  const anciennes = presentation.getSlides();
  construire(presentation);
  anciennes.forEach((diapo) => diapo.remove());
};

const brancherRacines_ = (racines) =>
  racines.length === 1 ? (racines[0].enfants.length ? racines[0].enfants : racines) : racines;

const regenererOrganigramme_ = (config, personnes) => {
  const classeur = classeurCourant_();
  if (personnes.length === 0) {
    return { url: '', id: '', nbPersonnes: 0, alertes: ['Aucune personne active dans l’onglet RH.'] };
  }

  const { racines, alertes } = construireArbre_(personnes);
  const superRacine = { personne: null, enfants: racines };
  disposerArbre_(superRacine);

  const presentation = ouvrirOuCreerPresentation_(config.organigrammeId, 'Organigramme');
  const pageWidth = presentation.getPageWidth();

  const largeurDisponible = pageWidth - 2 * MARGE_DIAPO_;
  const echelleGlobale = Math.min(1, largeurDisponible / superRacine._largeur);

  regenererDansPresentation_(presentation, (pres) => {
    if (echelleGlobale >= ECHELLE_MIN_ORGANIGRAMME_) {
      const diapo = ajouterDiapoVierge_(pres);
      ajouterTitreDiapo_(diapo, 'Organigramme général');
      dessinerNoeud_(diapo, superRacine, MARGE_DIAPO_, 40, echelleGlobale);
    } else {
      const branches = brancherRacines_(racines);

      const vue = ajouterDiapoVierge_(pres);
      ajouterTitreDiapo_(vue, 'Organigramme — vue d’ensemble');
      const superVue = { personne: null, enfants: racines.map((r) => ({
        personne: r.personne,
        enfants: (r.enfants || []).map((e) => ({ personne: e.personne, enfants: [] })),
      })) };
      disposerArbre_(superVue);
      const echelleVue = Math.min(1, largeurDisponible / superVue._largeur);
      dessinerNoeud_(vue, superVue, MARGE_DIAPO_, 40, echelleVue);
      vue.insertTextBox(
        'Le détail de chaque service est présenté sur les diapositives suivantes.',
        MARGE_DIAPO_, presentation.getPageHeight() - 30, 400, 20
      ).getText().getTextStyle().setFontSize(9).setItalic(true).setForegroundColor('#5f6368');

      branches.forEach((branche) => {
        const diapo = ajouterDiapoVierge_(pres);
        ajouterTitreDiapo_(diapo, `Organigramme — ${nomComplet_(branche.personne)}`);
        disposerArbre_(branche);
        const echelleBranche = Math.max(
          ECHELLE_MIN_ORGANIGRAMME_,
          Math.min(1, largeurDisponible / branche._largeur)
        );
        dessinerNoeud_(diapo, branche, MARGE_DIAPO_, 40, echelleBranche);
      });
    }
  });

  ecrireConfig_(classeur, CLES_CONFIG_.organigrammeId, presentation.getId());
  ecrireConfig_(classeur, CLES_CONFIG_.organigrammeUrl, presentation.getUrl());

  return { url: presentation.getUrl(), id: presentation.getId(), nbPersonnes: personnes.length, alertes };
};
