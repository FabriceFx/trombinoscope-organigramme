/**
 * Menu du classeur — introduit en v0.1.
 *
 * Déclencheur simple (`onOpen`), pas installable : le projet reste lié au
 * classeur, chaque action s'exécute sous l'identité de qui l'a lancée, et
 * le menu apparaît sans qu'aucune personne n'ait eu à autoriser quoi que
 * ce soit à l'avance.
 */
function onOpen() {
  const langue = langueInterface_(classeurCourant_());
  const tr = (cle) => t_(langue, cle);
  SpreadsheetApp.getUi()
    .createMenu(tr('menuRH'))
    .addItem(tr('menuInstaller'), 'installer')
    .addSeparator()
    .addItem(tr('menuSynchroniser'), 'synchroniserEffectifMaintenant')
    .addItem(tr('menuRegenerer'), 'regenererMaintenant')
    .addSeparator()
    .addItem(tr('menuActiver'), 'activerMiseAJourQuotidienne')
    .addItem(tr('menuDesactiver'), 'desactiverMiseAJourQuotidienne')
    .addSeparator()
    .addItem(tr('menuGuide'), 'ouvrirGuide')
    .addItem(tr('menuAPropos'), 'aPropos')
    .addToUi();
}

function ouvrirGuide() {
  const onglet = classeurCourant_().getSheetByName(NOM_ONGLET_GUIDE_);
  if (onglet) onglet.activate();
}

function aPropos() {
  const classeur = classeurCourant_();
  const langue = langueInterface_(classeur);
  const brut = lireConfigBrute_(classeur);
  const trombinoscopeUrl = brut[CLES_CONFIG_.trombinoscopeUrl];
  const organigrammeUrl = brut[CLES_CONFIG_.organigrammeUrl];
  const derniereGeneration = brut[CLES_CONFIG_.derniereGeneration];

  const corps = [
    derniereGeneration
      ? `<p class="ligne">${badge_('ok', t_(langue, 'badgeGenerees'))} ${echapper_(t_(langue, 'aProposGenere', { date: String(derniereGeneration) }))}</p>`
      : `<p class="ligne">${badge_('attention', t_(langue, 'badgePasEncore'))} ${t_(langue, 'aProposPasEncore')}</p>`,
    `<div class="boutons">${boutonOuvrir_(t_(langue, 'boutonOuvrirTrombi'), trombinoscopeUrl)}${boutonOuvrir_(t_(langue, 'boutonOuvrirOrganigramme'), organigrammeUrl)}</div>`,
  ].join('');

  afficherDialogue_(t_(langue, 'titreAPropos', { version: VERSION_ }), corps, { hauteur: 200, langue });
}
