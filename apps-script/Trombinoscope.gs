/**
 * Génération du trombinoscope dans une présentation Slides — introduit en
 * v0.1.
 *
 * Grille de cartes (photo + nom + poste), paginée sur plusieurs
 * diapositives selon l'effectif. Une photo introuvable ne bloque jamais
 * la génération : elle est remplacée par un avatar aux initiales, coloré
 * par service (couleurService_, Commun.gs) — un trombinoscope incomplet
 * reste plus utile qu'un trombinoscope qui ne se génère pas.
 *
 * Les photos non carrées sont insérées à taille carrée forcée (pas de
 * recadrage automatique) : limitation connue de cette version, documentée
 * dans le Guide plutôt que corrigée par un recadrage approximatif.
 */

const RANGEES_PAR_DIAPO_TROMBI_ = 3;
const ESPACE_CARTE_ = 14;
const HAUTEUR_LEGENDE_ = 34;
const MARGE_HAUT_TROMBI_ = 46;

/**
 * En dessous de cette largeur, une carte n'est plus lisible — et surtout,
 * rien ne garantit qu'elle reste positive : `Config.parLigne` est un
 * nombre libre, saisi à la main, et un « Personnes par ligne » trop grand
 * pour la largeur de la diapositive rendait `largeurCarte` négative, que
 * Slides refuse (« The width should not be zero »). `disposerGrille_`
 * réduit donc `parLigne` autant qu'il faut pour rester au-dessus de ce
 * plancher, plutôt que de transmettre à l'API une largeur qu'elle
 * rejettera — et le dit dans le rapport (`parLigneAjustee`), jamais en
 * silence.
 */
const LARGEUR_MIN_CARTE_ = 60;

const disposerGrille_ = (presentation, parLigneDemande) => {
  const largeurDisponible = presentation.getPageWidth() - 2 * MARGE_DIAPO_;
  const hauteurDisponible = presentation.getPageHeight() - MARGE_HAUT_TROMBI_ - MARGE_DIAPO_;
  const parLigneMax = Math.max(1, Math.floor((largeurDisponible + ESPACE_CARTE_) / (LARGEUR_MIN_CARTE_ + ESPACE_CARTE_)));
  const parLigne = Math.min(Math.max(1, Math.round(parLigneDemande) || 1), parLigneMax);
  const largeurCarte = (largeurDisponible - (parLigne - 1) * ESPACE_CARTE_) / parLigne;
  const hauteurCarte = (hauteurDisponible - (RANGEES_PAR_DIAPO_TROMBI_ - 1) * ESPACE_CARTE_) / RANGEES_PAR_DIAPO_TROMBI_;
  const taillePhoto = Math.max(30, Math.min(largeurCarte, hauteurCarte - HAUTEUR_LEGENDE_));
  return { largeurCarte, hauteurCarte, taillePhoto, parLigne, parLigneAjustee: parLigne !== parLigneDemande };
};

const dessinerAvatarInitiales_ = (diapo, x, y, taille, personne) => {
  const cercle = diapo.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, taille, taille);
  cercle.getFill().setSolidFill(couleurService_(personne.service));
  cercle.getBorder().setTransparent();
  const texte = cercle.getText();
  texte.setText(initiales_(personne));
  texte.getTextStyle().setBold(true).setFontSize(Math.max(10, taille / 3)).setForegroundColor('#ffffff');
  texte.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
};

/**
 * Décide comment retrouver une photo, une fois pour toute la génération,
 * selon `Config.sourcePhotos` — jamais rappelé personne par personne :
 * en source Drive, cela éviterait de rouvrir le dossier à chaque carte,
 * et en source Annuaire, `trouverPhotoAnnuaire_` gère déjà son propre
 * échec par personne (Annuaire.gs).
 */
const creerRecuperateurPhoto_ = (config) => {
  if (config.sourcePhotos === 'annuaire') {
    return (personne) => trouverPhotoAnnuaire_(personne.email);
  }
  let dossier = null;
  try {
    dossier = dossierPhotos_(config.dossierPhotos);
  } catch (e) {
    // Pas de dossier configuré ou inaccessible : le trombinoscope se
    // génère quand même, entièrement en avatars aux initiales — c'est
    // signalé dans le rapport, jamais une raison d'échouer.
  }
  return (personne) => trouverPhoto_(dossier, personne);
};

/** Hauteur du liseré de couleur sous la photo, qui relie visuellement chaque carte à la légende de service. */
const HAUTEUR_ACCENT_CARTE_ = 3;

const dessinerCartePersonne_ = (diapo, x, y, dims, obtenirPhoto, personne) => {
  const decalageX = x + (dims.largeurCarte - dims.taillePhoto) / 2;
  const photo = obtenirPhoto(personne);
  if (photo) {
    diapo.insertImage(photo, decalageX, y, dims.taillePhoto, dims.taillePhoto);
  } else {
    dessinerAvatarInitiales_(diapo, decalageX, y, dims.taillePhoto, personne);
  }

  const accent = diapo.insertShape(
    SlidesApp.ShapeType.RECTANGLE, decalageX, y + dims.taillePhoto, dims.taillePhoto, HAUTEUR_ACCENT_CARTE_
  );
  accent.getFill().setSolidFill(couleurService_(personne.service));
  accent.getBorder().setTransparent();

  const legende = diapo.insertTextBox(
    `${nomComplet_(personne)}\n${personne.poste || ''}`,
    x, y + dims.taillePhoto + HAUTEUR_ACCENT_CARTE_ + 3, dims.largeurCarte, HAUTEUR_LEGENDE_
  );
  const texte = legende.getText();
  const nom = nomComplet_(personne);
  texte.getRange(0, nom.length).getTextStyle().setBold(true).setFontSize(9);
  texte.getRange(nom.length, texte.asString().length).getTextStyle().setFontSize(8).setForegroundColor('#5f6368');
  texte.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  return !photo;
};

const regenererTrombinoscope_ = (config, personnes) => {
  const classeur = classeurCourant_();
  if (personnes.length === 0) {
    return { url: '', id: '', nbPersonnes: 0, nbPhotosManquantes: 0 };
  }

  const langue = config.langue || LANGUE_DEFAUT_;
  const obtenirPhoto = creerRecuperateurPhoto_(config);

  const tries = [...personnes].sort((a, b) =>
    a.service.localeCompare(b.service, langue) || nomComplet_(a).localeCompare(nomComplet_(b), langue)
  );

  const presentation = ouvrirOuCreerPresentation_(config.trombinoscopeId, t_(langue, 'titreDocTrombinoscope'));
  const dims = disposerGrille_(presentation, config.parLigne);
  const parDiapo = dims.parLigne * RANGEES_PAR_DIAPO_TROMBI_;
  const nbDiapos = Math.ceil(tries.length / parDiapo);
  let nbPhotosManquantes = 0;

  regenererDansPresentation_(presentation, (pres) => {
    ajouterDiapoCouverture_(pres, t_(langue, 'titreDocTrombinoscope'), config, tries);
    for (let p = 0; p < nbDiapos; p++) {
      const diapo = ajouterDiapoVierge_(pres);
      ajouterTitreDiapo_(diapo, nbDiapos > 1
        ? t_(langue, 'titreTrombiPage', { n: p + 1, total: nbDiapos })
        : t_(langue, 'titreDocTrombinoscope'));
      const page = tries.slice(p * parDiapo, (p + 1) * parDiapo);
      page.forEach((personne, i) => {
        const colonne = i % dims.parLigne;
        const rangee = Math.floor(i / dims.parLigne);
        const x = MARGE_DIAPO_ + colonne * (dims.largeurCarte + ESPACE_CARTE_);
        const y = MARGE_HAUT_TROMBI_ + rangee * (dims.hauteurCarte + ESPACE_CARTE_);
        const sansPhoto = dessinerCartePersonne_(diapo, x, y, dims, obtenirPhoto, personne);
        if (sansPhoto) nbPhotosManquantes++;
      });
    }
  });

  ecrireConfig_(classeur, CLES_CONFIG_.trombinoscopeId, presentation.getId());
  ecrireConfig_(classeur, CLES_CONFIG_.trombinoscopeUrl, presentation.getUrl());

  return {
    url: presentation.getUrl(), id: presentation.getId(),
    nbPersonnes: tries.length, nbPhotosManquantes,
    parLigneAjustee: dims.parLigneAjustee ? dims.parLigne : null,
  };
};
