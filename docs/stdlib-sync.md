# Synchronisation de la bibliothèque standard — 25 septembre 2026

Référence : arbre de travail local de `chic_lang/core`, révision
`646716d4ed756f6fd8f95e596884379f28618c37`. Les fichiers présents sont lus directement,
y compris les modifications non commitées éventuelles. Aucun fichier du langage
n'a été modifié. Les empreintes des 57 fichiers examinés sont conservées dans
[stdlib-sources.json](../src/data/stdlib-sources.json).

## Couverture

17 packages, dont `core` : **96 structures et 697 fonctions publiques**, soit
**793 déclarations**, surcharges et variantes de plateforme comprises. L'ancien
instantané contenait 310 entrées (21 structures et 289 fonctions).
488 déclarations ont été ajoutées et 5 déclarations internes retirées.

| Package | Anciennes entrées | Structures | Fonctions | Total actuel |
| --- | ---: | ---: | ---: | ---: |
| core | 11 | 1 | 35 | 36 |
| core.atomic | 0 | 0 | 40 | 40 |
| core.containers | 66 | 8 | 62 | 70 |
| core.fmt | 6 | 0 | 6 | 6 |
| core.imgui | 24 | 30 | 82 | 112 |
| core.io | 48 | 2 | 46 | 48 |
| core.json | 7 | 2 | 6 | 8 |
| core.libc | 1 | 1 | 43 | 44 |
| core.math | 1 | 6 | 41 | 47 |
| core.memory | 34 | 6 | 35 | 41 |
| core.net | 32 | 6 | 32 | 38 |
| core.os | 9 | 4 | 21 | 25 |
| core.posix | 16 | 22 | 170 | 192 |
| core.process | 0 | 0 | 4 | 4 |
| core.runtime | 1 | 0 | 1 | 1 |
| core.strings | 32 | 2 | 52 | 54 |
| core.threading | 22 | 6 | 21 | 27 |
| **Total** | **310** | **96** | **697** | **793** |

Les 40 déclarations de `core.atomic` couvrent les surcharges de chargement,
stockage, échange et comparaison-échange. `core.process` comporte deux fonctions,
chacune déclarée dans deux branches de plateforme ; ses quatre entrées ne sont
pas quatre fonctions différentes. Les 193 déclarations conditionnelles de
l'ensemble de la référence portent les conditions de leurs sources.

## Exactitude et visibilité

- Toutes les déclarations de fonctions et structures publiques sont extraites,
  avec ou sans commentaire. Les fonctions importées, signatures multilignes,
  paramètres par défaut et attributs sont conservés.
- Les structures affichent leurs champs, types, valeurs par défaut, membres
  `inline` et directives conditionnelles, tels qu'ils figurent dans les sources.
- Les 316 déclarations `@internal` sont exclues. Les fonctions locales et le code
  commenté ne sont pas présentés comme API publique.
- Les cinq anciennes entrées retirées sont `append_json_literal`,
  `permanent_allocator_grow`, `pool_allocator_rebuild_free_list`,
  `pool_allocator_slot_index` et `posix_windows_access_for_open` : elles sont
  explicitement internes dans les sources actuelles.
- La visibilité suit `@internal`, pas une heuristique sur le nom. Par exemple,
  les structures `__ThreadStart` ne sont pas marquées internes et restent donc
  présentes avec leur condition de plateforme.
- Les descriptions viennent des commentaires sources existants. 488 déclarations
  n'ont pas de commentaire associé : elles affichent leur déclaration exacte,
  sans description comportementale inventée.

## Vérifications effectuées

- Inventaire indépendant par fichier : correspondance exacte des 793 déclarations
  publiques et des 316 exclusions internes avec les sources.
- Comparaison textuelle de chacune des 793 signatures/déclarations de structure
  avec son fichier et sa ligne d'origine.
- Huit tests du générateur : visibilité, surcharges importées, signatures longues,
  valeurs par défaut, champs, conditions, commentaires et packages logiques.
- `docs:check` : reproduction exacte des deux instantanés, empreintes incluses.
- TypeScript : `tsc --noEmit` réussi.
- Construction de 18 pages ; contrôle des signatures et structures rendues,
  des comptes par fichier/package, de l'unicité des ancres et de tous les liens
  internes. Navigation et affichage vérifiés sur ordinateur et mobile.
- Vérification de la conservation du contact sans Martin, de `direction`, du
  `switch` sur les couleurs et du `match` retournant une `string`.

## Périmètre et limites

Cette référence couvre les structures et les fonctions. Les constantes, enums,
unions et alias ne constituent pas des entrées séparées ; ils peuvent apparaître
dans les signatures et champs. Les conditions des sources sont conservées sans
être évaluées. La présence d'une déclaration ne garantit pas son comportement sur
toutes les plateformes : les variantes non macOS de `core.process` renvoient
`Unsupported`. Il s'agit d'une vérification de documentation, pas d'un test
fonctionnel de l'ensemble de la bibliothèque sur chaque système.

La génération ne conserve ni chemins locaux absolus ni corps d'implémentation des
fonctions. La publication utilise l'instantané versionné, sans accès au dépôt du
langage. Le workflow teste désormais l'extracteur avec Node 22 avant de publier.

Pour refaire la synchronisation :

```sh
CHIC_SOURCE_DIR=/path/to/chic_lang npm run docs:refresh
CHIC_SOURCE_DIR=/path/to/chic_lang npm run docs:check
npm test
npm run build
```
