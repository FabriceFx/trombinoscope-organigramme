# Jeu de données de démonstration

`effectif-demo.csv` : 30 personnes fictives sur 4 niveaux hiérarchiques
(Présidente-Directrice Générale → 3 directeurs de service + 1 responsable
informatique en direct → 6 responsables → 18 employés), pour essayer
l'organigramme et le trombinoscope sur un effectif qui dépasse ce que tient
un seul slide.

Ce que ça exerce, que 2-3 personnes ne permettent pas de voir :

- la bascule automatique en vue d'ensemble + un slide par direction dans
  l'organigramme (le calcul tient sur un seul slide en dessous d'une
  certaine taille, voir `ECHELLE_MIN_ORGANIGRAMME_` dans
  [Organigramme.gs](../apps-script/Organigramme.gs)) ;
- une hiérarchie à 4 niveaux réels, pas seulement 2 ;
- une branche qui n'est qu'une feuille (Nadia Blanchard, sans personne sous
  elle) mélangée à des branches profondes, dans le même organigramme ;
- une ligne `Actif = Non` (Sacha Adam) exclue des deux générations sans être
  supprimée de l'onglet ;
- la pagination du trombinoscope sur plusieurs diapositives.

## Pour l'essayer

1. Ouvrez l'onglet `RH` de votre classeur.
2. **Fichier > Importer > Importer un fichier**, sélectionnez ce CSV.
3. Choisissez **Remplacer la feuille actuelle** si `RH` ne contient que les
   deux lignes d'exemple posées par l'installation, ou **Ajouter à la
   feuille actuelle** pour les conserver à côté.
4. **RH > Régénérer maintenant**.

Ces données sont fictives (domaine `@exemple.fr`) : à remplacer par votre
effectif réel une fois l'essai concluant.
