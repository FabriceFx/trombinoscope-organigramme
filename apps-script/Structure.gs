/**
 * Construction de l'arbre hiérarchique à partir de l'onglet RH — introduit
 * en v0.1.
 *
 * Le lien parent → enfant se fait par email (colonne Manager), jamais par
 * nom : deux personnes peuvent porter le même nom, jamais le même email
 * dans une organisation Workspace.
 */

/**
 * Construit l'arbre et rend { racines, alertes }.
 *
 * Une personne est une racine si sa colonne Manager est vide, ou si elle
 * pointe vers un email absent de l'effectif (manager parti, faute de
 * frappe) — dans ce dernier cas une alerte est produite : une hiérarchie
 * mal formée doit se voir, jamais se corriger silencieusement en la
 * rattachant au hasard.
 *
 * Un cycle (A manager de B, B manager de A, directement ou via une
 * chaîne) casserait un rendu récursif par une boucle infinie. Il est
 * détecté et rompu en traitant le premier nœud du cycle comme racine, et
 * signalé — jamais silencieux.
 */
const construireArbre_ = (personnes, langue = LANGUE_DEFAUT_) => {
  const alertes = [];
  const parEmail = new Map(personnes.map((p) => [p.email, { personne: p, enfants: [] }]));

  personnes.forEach((p) => {
    if (!p.manager) return;
    const manager = parEmail.get(p.manager);
    if (!manager) {
      alertes.push(t_(langue, 'alerteManagerIntrouvable', { nom: nomComplet_(p), manager: p.manager }));
      return;
    }
    if (manager === parEmail.get(p.email)) {
      alertes.push(t_(langue, 'alertePropreManager', { nom: nomComplet_(p) }));
      return;
    }
    manager.enfants.push(parEmail.get(p.email));
  });

  const racines = [];
  const visites = new Set();
  const enCoursDeVisite = new Set();

  const estAncetre_ = (noeud, cible) => {
    if (noeud === cible) return true;
    return noeud.enfants.some((e) => estAncetre_(e, cible));
  };

  personnes.forEach((p) => {
    const noeud = parEmail.get(p.email);
    if (!p.manager || !parEmail.get(p.manager)) {
      racines.push(noeud);
      return;
    }
    const manager = parEmail.get(p.manager);
    if (estAncetre_(noeud, manager)) {
      alertes.push(t_(langue, 'alerteCycle', { nom: nomComplet_(p) }));
      manager.enfants = manager.enfants.filter((e) => e !== noeud);
      racines.push(noeud);
    }
  });

  return { racines, alertes };
};

/**
 * Compte les personnes d'un sous-arbre, racine comprise — sert au choix de
 * pagination de l'organigramme (Organigramme.gs).
 */
const compterSousArbre_ = (noeud) =>
  1 + noeud.enfants.reduce((somme, e) => somme + compterSousArbre_(e), 0);
