/**
 * Point d'entrée de régénération — introduit en v0.1, étendu en v0.2 pour
 * enchaîner sur la synchronisation annuaire quand elle est configurée.
 *
 * `regenererTout_` est appelée aussi bien depuis le menu (avec un compte
 * rendu affiché à l'écran) que depuis le déclencheur quotidien ou de reprise
 * (sans aucune interface disponible) : elle ne dépend donc jamais de
 * `getUi()`, et se contente de retourner un rapport que chaque appelant
 * présente à sa façon.
 *
 * Si `Config.sourceEffectif` vaut « annuaire » et que la synchronisation
 * n'a pas fini dans son budget de temps (gros effectif), elle a déjà posé
 * son propre déclencheur de reprise (Annuaire.gs) : `regenererTout_` rend
 * alors `{ enAttente: true }` sans générer de présentation à partir d'un RH
 * à moitié synchronisé. C'est cette même reprise qui rappelle
 * `regenererTout_` une fois terminée, enchaînant naturellement sur la
 * génération sans geste supplémentaire de la personne qui l'a demandée.
 */
const regenererTout_ = () => {
  const classeur = classeurCourant_();
  const config = lireConfig_(classeur);

  if (config.sourceEffectif === 'annuaire') {
    const synchro = synchroniserAnnuaire_(classeur);
    if (!synchro.termine) return { enAttente: true };
  }

  const personnes = lirePersonnes_(classeur);
  const trombinoscope = regenererTrombinoscope_(config, personnes);
  const organigramme = regenererOrganigramme_(config, personnes);

  ecrireConfig_(classeur, CLES_CONFIG_.derniereGeneration, formaterHorodatage_(new Date(), config.langue));

  return { trombinoscope, organigramme, nbPersonnes: personnes.length };
};

const corpsRapportRegeneration_ = (rapport, langue) => {
  const lignes = [
    `<p class="ligne">${badge_('ok', t_(langue, 'badgeOk'))} ` +
    `${t_(langue, 'personnesActives', { n: rapport.nbPersonnes, onglet: NOM_ONGLET_RH_ })}</p>`,
  ];
  if (rapport.trombinoscope.nbPhotosManquantes > 0) {
    lignes.push(
      `<p class="ligne">${badge_('attention', t_(langue, 'badgePhotos'))} ` +
      `${t_(langue, 'photosManquantes', { n: rapport.trombinoscope.nbPhotosManquantes })}</p>`
    );
  }
  if (rapport.trombinoscope.parLigneAjustee) {
    lignes.push(
      `<p class="ligne">${badge_('attention', t_(langue, 'badgeMiseEnPage'))} ` +
      `${t_(langue, 'parLigneAjustee', { n: rapport.trombinoscope.parLigneAjustee })}</p>`
    );
  }
  if (rapport.organigramme.alertes && rapport.organigramme.alertes.length > 0) {
    lignes.push(`<p class="ligne">${badge_('attention', t_(langue, 'badgeOrganigramme'))} ${t_(langue, 'pointsAVerifier')}</p>`);
    lignes.push(`<ul class="points">${rapport.organigramme.alertes.map((a) => `<li>${echapper_(a)}</li>`).join('')}</ul>`);
  }
  lignes.push(
    '<div class="boutons">' +
    boutonOuvrir_(t_(langue, 'boutonOuvrirTrombi'), rapport.trombinoscope.url) +
    boutonOuvrir_(t_(langue, 'boutonOuvrirOrganigramme'), rapport.organigramme.url) +
    '</div>'
  );
  return lignes.join('');
};

/** Point d'entrée menu : régénère et affiche un compte rendu à l'écran. */
function regenererMaintenant() {
  const langue = langueInterface_(classeurCourant_());
  try {
    const rapport = regenererTout_();
    if (rapport.enAttente) {
      afficherDialogue_(
        t_(langue, 'titreSyncEnCours'),
        `<p class="ligne">${badge_('attention', t_(langue, 'badgeEnAttente'))} ${t_(langue, 'texteSyncEnCoursRegen')}</p>`,
        { hauteur: 190, langue }
      );
      return;
    }
    afficherDialogue_(t_(langue, 'titreRegenTerminee'), corpsRapportRegeneration_(rapport, langue), { langue });
  } catch (e) {
    afficherDialogue_(
      t_(langue, 'titreRegenEchec'),
      `<p class="ligne">${badge_('erreur', t_(langue, 'badgeEchec'))} ${echapper_(e.message)}</p>` +
      `<p class="ligne">${t_(langue, 'texteCorrigerPuisRelancer')}</p>`,
      { hauteur: 220, langue }
    );
  }
}
