/**
 * Boîtes de dialogue HTML du menu — introduites en v0.3.
 *
 * `Ui.alert` rend une boîte système sans mise en forme : ni lien cliquable
 * vers les présentations générées, ni distinction visuelle entre un simple
 * résultat et un point à vérifier. `afficherDialogue_` remplace tous les
 * `ui.alert` du projet par une même boîte HTML, pour qu'ouvrir le
 * trombinoscope ou l'organigramme depuis le compte rendu ne demande pas
 * d'aller chercher le lien dans l'onglet Config.
 */

const CSS_DIALOGUE_ = `
  body { font-family: 'Google Sans', Roboto, Arial, sans-serif; margin: 0; padding: 24px;
    color: #1f1f1f; background: #fff; }
  h2 { font-size: 16px; font-weight: 500; margin: 0 0 16px; }
  .ligne { font-size: 13px; line-height: 1.6; margin: 0 0 8px; }
  .badge { display: inline-block; padding: 1px 9px; border-radius: 10px; font-size: 11px;
    font-weight: 500; margin-right: 6px; vertical-align: middle; }
  .badge-ok { background: #e6f4ea; color: #137333; }
  .badge-attention { background: #fef7e0; color: #b06000; }
  .badge-erreur { background: #fce8e6; color: #c5221f; }
  ul.points { margin: 4px 0 12px; padding-left: 20px; font-size: 13px; color: #3c4043; }
  ul.points li { margin: 2px 0; }
  .boutons { margin-top: 16px; }
  a.bouton { display: inline-block; margin: 0 8px 8px 0; padding: 9px 18px; border-radius: 100px;
    background: #0b57d0; color: #fff; text-decoration: none; font-size: 13px; font-weight: 500; }
  a.bouton:hover { background: #0842a0; }
  .pied { margin-top: 20px; text-align: right; }
  button.fermer { background: #f1f3f4; color: #3c4043; border: none; border-radius: 100px;
    padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
  button.fermer:hover { background: #e8eaed; }
`;

const afficherDialogue_ = (titre, corpsHtml, { largeur = 440, hauteur = 300 } = {}) => {
  const html = `<style>${CSS_DIALOGUE_}</style>` +
    `<h2>${echapper_(titre)}</h2>${corpsHtml}` +
    '<div class="pied"><button class="fermer" onclick="google.script.host.close()">Fermer</button></div>';
  const sortie = HtmlService.createHtmlOutput(html).setWidth(largeur).setHeight(hauteur);
  SpreadsheetApp.getUi().showModalDialog(sortie, titre);
};

const badge_ = (type, texte) => `<span class="badge badge-${type}">${echapper_(texte)}</span>`;

const boutonOuvrir_ = (texte, url) => (url ? `<a class="bouton" href="${echapper_(url)}" target="_blank">${echapper_(texte)}</a>` : '');
