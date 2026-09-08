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
    const langue = langueInterface_(classeur);
    ecrireConfig_(classeur, CLES_CONFIG_.derniereGeneration,
      t_(langue, 'echecGenerationLe', { date: formaterHorodatage_(new Date(), langue), message: e.message }));
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
  // Valeur stockée dans Config : reste en français comme le reste de la
  // structure du classeur (voir Langues.gs), indépendamment de la langue
  // de l'interface au moment où on l'écrit.
  ecrireConfig_(classeur, CLES_CONFIG_.statutMAJ, `Activée (vers ${config.heureMAJ}h)`);
  afficherDialogue_(
    t_(config.langue, 'titreMAJActivee'),
    `<p class="ligne">${badge_('ok', t_(config.langue, 'badgeActivee'))} ` +
    `${t_(config.langue, 'texteMAJActivee', { heure: config.heureMAJ })}</p>`,
    { hauteur: 180, langue: config.langue }
  );
}

/** Point d'entrée menu : désactive la mise à jour quotidienne. */
function desactiverMiseAJourQuotidienne() {
  const classeur = classeurCourant_();
  const langue = langueInterface_(classeur);
  supprimerDeclencheurs_('misAJourQuotidienne');
  ecrireConfig_(classeur, CLES_CONFIG_.statutMAJ, 'Désactivée');
  afficherDialogue_(
    t_(langue, 'titreMAJDesactivee'),
    `<p class="ligne">${badge_('attention', t_(langue, 'badgeDesactivee'))} ${t_(langue, 'texteMAJDesactivee')}</p>`,
    { hauteur: 170, langue }
  );
}
