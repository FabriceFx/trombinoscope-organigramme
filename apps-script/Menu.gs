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
  const classeur = classeurCourant_();
  const brut = lireConfigBrute_(classeur);
  const trombinoscopeUrl = brut[CLES_CONFIG_.trombinoscopeUrl];
  const organigrammeUrl = brut[CLES_CONFIG_.organigrammeUrl];
  const derniereGeneration = brut[CLES_CONFIG_.derniereGeneration];

  const corps = [
    derniereGeneration
      ? `<p class="ligne">${badge_('ok', 'Générées')} Dernière génération : ${echapper_(String(derniereGeneration))}.</p>`
      : `<p class="ligne">${badge_('attention', 'Pas encore')} Aucune génération pour l’instant — lancez « Régénérer maintenant ».</p>`,
    `<div class="boutons">${boutonOuvrir_('Ouvrir le trombinoscope', trombinoscopeUrl)}${boutonOuvrir_('Ouvrir l’organigramme', organigrammeUrl)}</div>`,
  ].join('');

  afficherDialogue_(`Trombinoscope & organigramme — v${VERSION_}`, corps, { hauteur: 200 });
}
