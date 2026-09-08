/**
 * Utilitaires partagés entre les deux présentations Slides — introduits en
 * v0.1 (Organigramme.gs), regroupés ici et enrichis d'une page de titre en
 * v0.3 pour que chaque génération produise un document présentable tel
 * quel, pas seulement un rendu utilitaire.
 */

const MARGE_DIAPO_ = 30;
const COULEUR_ACCENT_ = '#1a73e8';

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
 * Rangée de puces colorées + libellé de service, centrée. Rend visible ce
 * que la couleur des bordures et des avatars code déjà silencieusement
 * ailleurs — sans elle, un code couleur par service ne s'explique nulle
 * part dans le document lui-même.
 */
const ajouterLegendeServices_ = (diapo, largeurDiapo, y, personnes, langue) => {
  const services = [...new Set(personnes.map((p) => p.service).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, langue));
  if (services.length === 0) return;

  const largeurPuce = 10;
  const espaceTexte = 4;
  const espaceEntreItems = 18;
  // Largeur approximative par caractère à 9pt : suffisant pour centrer la
  // rangée sans mesurer un texte réellement rendu, ce que l'API ne permet
  // pas d'interroger.
  const largeurItem = (texte) => largeurPuce + espaceTexte + texte.length * 5.6 + espaceEntreItems;
  const largeursItems = services.map(largeurItem);
  const largeurTotale = largeursItems.reduce((a, b) => a + b, 0);
  let x = Math.max(MARGE_DIAPO_, (largeurDiapo - largeurTotale) / 2);

  services.forEach((service, i) => {
    const puce = diapo.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y + 4, largeurPuce, largeurPuce);
    puce.getFill().setSolidFill(couleurService_(service));
    puce.getBorder().setTransparent();
    const texte = diapo.insertTextBox(service, x + largeurPuce + espaceTexte, y, 160, 18);
    texte.getText().getTextStyle().setFontSize(9).setForegroundColor('#3c4043');
    x += largeursItems[i];
  });
};

/**
 * Page de titre : bandeau de couleur, nom de l'entreprise si renseigné
 * (`Config.nomEntreprise`, facultatif), titre du document, effectif et date
 * de génération, légende des couleurs de service. Toujours la première
 * diapositive — une présentation qui atterrit dans une réunion sans dire
 * ni ce qu'elle est, ni de quand elle date, n'est pas un document fini.
 */
const ajouterDiapoCouverture_ = (presentation, titre, config, personnes) => {
  const langue = config.langue || LANGUE_DEFAUT_;
  const diapo = ajouterDiapoVierge_(presentation);
  const largeur = presentation.getPageWidth();
  const hauteur = presentation.getPageHeight();

  const bandeau = diapo.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, largeur, 6);
  bandeau.getFill().setSolidFill(COULEUR_ACCENT_);
  bandeau.getBorder().setTransparent();

  let y = hauteur / 2 - 76;
  if (config.nomEntreprise) {
    const entete = diapo.insertTextBox(config.nomEntreprise.toUpperCase(), 0, y, largeur, 22);
    const style = entete.getText().getTextStyle();
    style.setFontSize(11).setBold(true).setForegroundColor('#5f6368');
    entete.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    y += 28;
  }

  const titreBoite = diapo.insertTextBox(titre, 0, y, largeur, 48);
  titreBoite.getText().getTextStyle().setFontSize(32).setBold(true).setForegroundColor('#202124');
  titreBoite.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  y += 54;

  const sousTitre = diapo.insertTextBox(
    t_(langue, 'coverSousTitre', { n: personnes.length, date: formaterHorodatage_(new Date(), langue) }),
    0, y, largeur, 22
  );
  sousTitre.getText().getTextStyle().setFontSize(12).setForegroundColor('#5f6368');
  sousTitre.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  ajouterLegendeServices_(diapo, largeur, hauteur - 40, personnes, langue);

  return diapo;
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
