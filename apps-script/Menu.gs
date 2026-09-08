/**
 * Menu du classeur — introduit en v0.1.
 *
 * Déclencheur simple (`onOpen`), pas installable : le projet reste lié au
 * classeur, chaque action s'exécute sous l'identité de qui l'a lancée, et
 * le menu apparaît sans qu'aucune personne n'ait eu à autoriser quoi que
 * ce soit à l'avance.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RH')
    .addItem('Installer les onglets', 'installer')
    .addSeparator()
    .addItem('Synchroniser l’effectif depuis l’annuaire', 'synchroniserEffectifMaintenant')
    .addItem('Régénérer maintenant', 'regenererMaintenant')
    .addSeparator()
    .addItem('Activer la mise à jour quotidienne', 'activerMiseAJourQuotidienne')
    .addItem('Désactiver la mise à jour quotidienne', 'desactiverMiseAJourQuotidienne')
    .addSeparator()
    .addItem('Ouvrir le guide', 'ouvrirGuide')
    .addItem('À propos', 'aPropos')
    .addToUi();
}

function ouvrirGuide() {
  const onglet = classeurCourant_().getSheetByName(NOM_ONGLET_GUIDE_);
  if (onglet) onglet.activate();
}

function aPropos() {
  const config = lireConfig_(classeurCourant_());
  const liens = [
    config.trombinoscopeId ? 'Trombinoscope généré.' : 'Trombinoscope pas encore généré.',
    config.organigrammeId ? 'Organigramme généré.' : 'Organigramme pas encore généré.',
  ].join(' ');
  SpreadsheetApp.getUi().alert(
    `Trombinoscope & organigramme — v${VERSION_}`,
    `${liens}\n\nLes deux présentations sont accessibles depuis les liens de l’onglet ${NOM_ONGLET_CONFIG_}.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
