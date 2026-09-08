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

const disposerGrille_ = (presentation, parLigne) => {
  const largeurDisponible = presentation.getPageWidth() - 2 * MARGE_DIAPO_;
  const hauteurDisponible = presentation.getPageHeight() - MARGE_HAUT_TROMBI_ - MARGE_DIAPO_;
  const largeurCarte = (largeurDisponible - (parLigne - 1) * ESPACE_CARTE_) / parLigne;
  const hauteurCarte = (hauteurDisponible - (RANGEES_PAR_DIAPO_TROMBI_ - 1) * ESPACE_CARTE_) / RANGEES_PAR_DIAPO_TROMBI_;
  const taillePhoto = Math.max(30, Math.min(largeurCarte, hauteurCarte - HAUTEUR_LEGENDE_));
  return { largeurCarte, hauteurCarte, taillePhoto };
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

const dessinerCartePersonne_ = (diapo, x, y, dims, obtenirPhoto, personne) => {
  const decalageX = x + (dims.largeurCarte - dims.taillePhoto) / 2;
  const photo = obtenirPhoto(personne);
  if (photo) {
    diapo.insertImage(photo, decalageX, y, dims.taillePhoto, dims.taillePhoto);
  } else {
    dessinerAvatarInitiales_(diapo, decalageX, y, dims.taillePhoto, personne);
  }

  const legende = diapo.insertTextBox(
    `${nomComplet_(personne)}\n${personne.poste || ''}`,
    x, y + dims.taillePhoto + 2, dims.largeurCarte, HAUTEUR_LEGENDE_
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

  const obtenirPhoto = creerRecuperateurPhoto_(config);

  const tries = [...personnes].sort((a, b) =>
    a.service.localeCompare(b.service, 'fr') || nomComplet_(a).localeCompare(nomComplet_(b), 'fr')
  );

  const presentation = ouvrirOuCreerPresentation_(config.trombinoscopeId, 'Trombinoscope');
  const dims = disposerGrille_(presentation, config.parLigne);
  const parDiapo = config.parLigne * RANGEES_PAR_DIAPO_TROMBI_;
  const nbDiapos = Math.ceil(tries.length / parDiapo);
  let nbPhotosManquantes = 0;

  regenererDansPresentation_(presentation, (pres) => {
    for (let p = 0; p < nbDiapos; p++) {
      const diapo = ajouterDiapoVierge_(pres);
      ajouterTitreDiapo_(diapo, nbDiapos > 1 ? `Trombinoscope (${p + 1}/${nbDiapos})` : 'Trombinoscope');
      const page = tries.slice(p * parDiapo, (p + 1) * parDiapo);
      page.forEach((personne, i) => {
        const colonne = i % config.parLigne;
        const rangee = Math.floor(i / config.parLigne);
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
  };
};
