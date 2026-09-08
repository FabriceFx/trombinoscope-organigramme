const fs = require('fs');
const source = fs.readFileSync('apps-script/Organigramme.gs', 'utf8');
// Mock environment
global.BOITE_LARGEUR_ = 140;
global.BOITE_HAUTEUR_ = 46;
global.ESPACE_H_ = 16;
global.ESPACE_V_ = 40;
global.MARGE_DIAPO_ = 30;
global.ECHELLE_MIN_ORGANIGRAMME_ = 0.55;
global.couleurService_ = () => '#ffffff';
global.nomComplet_ = (p) => p.nom;

eval(source);

const arbre = { personne: null, enfants: [] };
for (let i = 0; i < 500; i++) {
  arbre.enfants.push({ personne: { nom: 'Test ' + i }, enfants: [] });
}
disposerArbre_(arbre);
const largeurDisponible = 660;
const echelleVue = Math.min(1, largeurDisponible / arbre._largeur);
console.log('Arbre largeur:', arbre._largeur);
console.log('Echelle:', echelleVue);
console.log('Largeur boite:', BOITE_LARGEUR_ * echelleVue);
console.log('Hauteur boite:', BOITE_HAUTEUR_ * echelleVue);
