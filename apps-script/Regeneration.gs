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

  ecrireConfig_(classeur, CLES_CONFIG_.derniereGeneration, formaterHorodatage_(new Date()));

  return { trombinoscope, organigramme, nbPersonnes: personnes.length };
};

const resumerRapport_ = (rapport) => {
  const lignes = [`${rapport.nbPersonnes} personne(s) active(s) dans l'onglet ${NOM_ONGLET_RH_}.`];
  if (rapport.trombinoscope.nbPhotosManquantes > 0) {
    lignes.push(`Trombinoscope : ${rapport.trombinoscope.nbPhotosManquantes} photo(s) manquante(s), remplacée(s) par des initiales.`);
  }
  if (rapport.organigramme.alertes && rapport.organigramme.alertes.length > 0) {
    lignes.push('Organigramme — points à vérifier :');
    rapport.organigramme.alertes.forEach((a) => lignes.push(`• ${a}`));
  }
  return lignes.join('\n');
};

/** Point d'entrée menu : régénère et affiche un compte rendu à l'écran. */
function regenererMaintenant() {
  const ui = SpreadsheetApp.getUi();
  try {
    const rapport = regenererTout_();
    if (rapport.enAttente) {
      ui.alert(
        'Synchronisation en cours',
        'L’effectif est nombreux : la synchronisation de l’annuaire reprendra ' +
        'automatiquement dans une minute, puis la régénération s’enchaînera d’elle-même.',
        ui.ButtonSet.OK
      );
      return;
    }
    ui.alert(
      'Régénération terminée',
      resumerRapport_(rapport),
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert(
      'La régénération a échoué',
      `${e.message}\n\nCorrigez le point signalé puis relancez « Régénérer maintenant ».`,
      ui.ButtonSet.OK
    );
  }
}
