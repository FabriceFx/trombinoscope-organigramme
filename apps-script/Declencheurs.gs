/**
 * Gestion du déclencheur quotidien — introduit en v0.1.
 *
 * Le nom de la fonction cible d'un déclencheur est résolu par Google au
 * nom global : `misAJourQuotidienne` doit donc rester une `function`
 * déclarée, jamais un `const` fléché, même si elle ne figure dans aucun
 * menu.
 */

const supprimerDeclencheurs_ = (nomFonction) => {
  ScriptApp.getProjectTriggers()
    .filter((d) => d.getHandlerFunction() === nomFonction)
    .forEach((d) => ScriptApp.deleteTrigger(d));
};

/**
 * Cible du déclencheur horaire. Aucune interface n'est disponible dans ce
 * contexte — `SpreadsheetApp.getUi()` y lève une exception — donc aucune
 * boîte de dialogue ici : un échec se lit dans l'onglet Config, jamais
 * dans une fenêtre que personne ne regarde à 6h du matin.
 */
function misAJourQuotidienne() {
  const classeur = classeurCourant_();
  try {
    regenererTout_();
  } catch (e) {
    ecrireConfig_(classeur, CLES_CONFIG_.derniereGeneration, `Échec le ${formaterHorodatage_(new Date())} : ${e.message}`);
  }
}

/** Point d'entrée menu : active la mise à jour quotidienne à l'heure configurée. */
function activerMiseAJourQuotidienne() {
  const classeur = classeurCourant_();
  const config = lireConfig_(classeur);
  supprimerDeclencheurs_('misAJourQuotidienne');
  ScriptApp.newTrigger('misAJourQuotidienne')
    .timeBased()
    .atHour(config.heureMAJ)
    .everyDays(1)
    .create();
  ecrireConfig_(classeur, CLES_CONFIG_.statutMAJ, `Activée (vers ${config.heureMAJ}h)`);
  SpreadsheetApp.getUi().alert(
    'Mise à jour quotidienne activée',
    `Le trombinoscope et l'organigramme seront régénérés chaque jour vers ${config.heureMAJ}h.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** Point d'entrée menu : désactive la mise à jour quotidienne. */
function desactiverMiseAJourQuotidienne() {
  const classeur = classeurCourant_();
  supprimerDeclencheurs_('misAJourQuotidienne');
  ecrireConfig_(classeur, CLES_CONFIG_.statutMAJ, 'Désactivée');
  SpreadsheetApp.getUi().alert('Mise à jour quotidienne désactivée.');
}
