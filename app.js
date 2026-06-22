// ==========================================================================
// RévisBrevet 2026 — app.js (SOFT UI EVOLUTION EDITION — v6.0 ARCHITECTURE COUVERTURE PILOTÉE)
// ==========================================================================

const AppState = {
  data: null,
  leitner: {},          // Acquis / mémorisation (boîtes Leitner), indexé par id de CHAPITRE
  historiqueQuestions: [],
  quiz: {
    chapitreId: null,
    questions: [],
    idx: 0,
    score: 0,
    isAutomatisme: false,
    niveauFiltre: 1
  }
};

const $ = id => document.getElementById(id);

const DATA_SECOURS = {
  matieres: [
    {
      id: "maths",
      label: "Mathématiques",
      emoji: "📐",
      categorie: "Logique & Calcul",
      chapitres: [
        {
          id: "fractions",
          titre: "Calculs avec des fractions",
          theme: "Nombres",
          cours: "Pour additionner ou soustraire deux fractions, il faut les mettre au même dénominateur. Pour multiplier, on multiplie les numérateurs entre eux et les dénominateurs entre eux.",
          piege: "Oublier la priorité opératoire de la multiplication sur l'addition !"
        }
      ]
    }
  ]
};

// Dictionnaire des SVG remplaçant les émojis dans l'interface — clés alignées sur les vrais id de matières du JSON
const SVGMappings = {
  "maths": `<svg viewBox="0 0 24 24"><path d="M22 10v4h-6v6h-4v-6H6v-4h6V4h4v6h6z"/></svg>`,
  "francais": `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  "histoire_geo": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>`,
  "emc": `<svg viewBox="0 0 24 24"><path d="M12 2L3 7v2h18V7l-9-5z"/><path d="M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18"/></svg>`,
  "sciences": `<svg viewBox="0 0 24 24"><path d="M9 2v6L4 18a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L15 8V2"/><path d="M9 2h6"/></svg>`
};

// ==========================================================================
// 🧮 MOTEUR DE GÉNÉRATION — PILOTE MATHS (7 chapitres × 3 niveaux)
// Chaque générateur retourne { enonce, options, bonne_reponse, explication }
// ==========================================================================

function randInt(min, max) { // inclusif
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pgcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function estPremier(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

function decompositionPremiers(n) {
  const facteurs = [];
  let reste = n;
  for (let p = 2; p * p <= reste; p++) {
    let exposant = 0;
    while (reste % p === 0) { reste /= p; exposant++; }
    if (exposant > 0) facteurs.push([p, exposant]);
  }
  if (reste > 1) facteurs.push([reste, 1]);
  return facteurs;
}

function formatDecomposition(facteurs) {
  const exposantsUnicode = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };
  return facteurs.map(([p, e]) => e > 1 ? `${p}${exposantsUnicode[e] || '^' + e}` : `${p}`).join('×');
}

// Construit un tableau de 4 options uniques (1 correcte + 3 distracteurs).
// Retourne null si moins de 3 distracteurs uniques sont disponibles : dans ce
// cas, l'appelant doit se re-tirer (nouveaux paramètres aléatoires) plutôt que
// d'afficher un texte de secours artificiel et confus pour l'élève.
function uniqueOptionsFromList(distracteurs, correcte) {
  const pool = [...new Set(distracteurs.filter(d => d !== correcte))];
  if (pool.length < 3) return null;
  return shuffleArr([correcte, ...pool.slice(0, 3)]);
}

// ==========================================================================
// 🔁 GESTIONNAIRE DE SESSION SANS DOUBLON (sac à malice)
// ==========================================================================

function genererSessionSansDoublon(genererUneFn, quantite) {
  const session = [];
  const signaturesVues = new Set();
  let tentatives = 0;
  const budgetMax = quantite * 40;

  while (session.length < quantite && tentatives < budgetMax) {
    const q = genererUneFn();
    tentatives++;
    const signature = `${q.enonce}__${q.options.join('|')}`;
    if (!signaturesVues.has(signature)) {
      signaturesVues.add(signature);
      session.push(q);
    }
  }
  // Filet de sécurité : si le pool naturel est trop petit (ex: m2-n1), on complète
  // en acceptant des répétitions plutôt que de bloquer la session.
  while (session.length < quantite) {
    session.push(genererUneFn());
  }
  return session;
}

// ==========================================================================
// M1 — Arithmétique & Nombres premiers
// ==========================================================================

const BANQUE_PREMIERS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79];
const BANQUE_COMPOSES = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 32, 33, 34, 35, 36, 38, 39, 40, 44, 45, 46, 48, 49, 50, 51, 52, 54, 55, 56, 57, 58, 62, 63, 64, 65, 66, 68, 69, 70, 72, 74, 75, 76, 77, 78];

function genM1_n1() {
  const premier = pick(BANQUE_PREMIERS);
  const composesChoisis = shuffleArr(BANQUE_COMPOSES).slice(0, 3);
  const options = shuffleArr([String(premier), ...composesChoisis.map(String)]);
  const exempleCompose = composesChoisis[0];
  const facteurExemple = decompositionPremiers(exempleCompose)[0][0];
  return {
    enonce: `Lequel de ces nombres est premier ?`,
    options,
    bonne_reponse: options.indexOf(String(premier)),
    explication: `${premier} n'est divisible que par 1 et lui-même. Les autres se décomposent (ex : ${exempleCompose} est divisible par ${facteurExemple}).`
  };
}

function genM1_n2() {
  let n;
  do { n = randInt(12, 100); } while (estPremier(n));
  const facteurs = decompositionPremiers(n);
  const correcte = formatDecomposition(facteurs);

  const distracteurs = [];
  // Mutation 1 : exposant du premier facteur +1 (toujours différent de l'original)
  const f1 = facteurs.map(f => [...f]);
  f1[0][1] += 1;
  distracteurs.push(formatDecomposition(f1));
  // Mutation 2 : exposant du dernier facteur +2 (toujours différent de l'original ET de la mutation 1)
  const f2 = facteurs.map(f => [...f]);
  f2[f2.length - 1][1] += 2;
  distracteurs.push(formatDecomposition(f2));
  // Mutation 3 : ajout d'un facteur premier absent de la décomposition (toujours différent)
  const premiersDisponibles = [2, 3, 5, 7, 11, 13].filter(p => !facteurs.some(([pp]) => pp === p));
  const premierExtra = premiersDisponibles.length > 0 ? pick(premiersDisponibles) : 13;
  distracteurs.push(formatDecomposition([...facteurs, [premierExtra, 1]]));
  // Mutation 4 (opportuniste, filtrée automatiquement si elle collisionne) : produit de deux diviseurs
  for (let d = 2; d < n; d++) {
    if (n % d === 0) { distracteurs.push(`${d}×${n / d}`); break; }
  }

  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM1_n2();
  return {
    enonce: `La décomposition en facteurs premiers de ${n} est :`,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `${n} = ${facteurs.map(([p, e]) => Array(e).fill(p).join('×')).join('×')} = ${correcte}, et tous les facteurs sont premiers.`
  };
}

function genM1_n3() {
  const couples = [[6, 11], [7, 9], [8, 11], [9, 11], [10, 13], [11, 13], [12, 17], [13, 15], [14, 17], [15, 17], [16, 19], [17, 19], [18, 23], [19, 21], [20, 23], [21, 23], [22, 25], [23, 25], [24, 29], [25, 27], [26, 29], [27, 29], [28, 31], [29, 31], [30, 37]];
  const [a, b] = pick(couples);
  const options = shuffleArr(['Premiers entre eux', 'Égaux', 'Pairs', "Multiples l'un de l'autre"]);
  return {
    enonce: `On calcule PGCD(${a}, ${b}) et on trouve 1. Que peut-on en déduire sur ${a} et ${b} ?`,
    options,
    bonne_reponse: options.indexOf('Premiers entre eux'),
    explication: `Lorsque PGCD(a, b) = 1, par définition, a et b sont premiers entre eux (ils n'ont aucun diviseur commun autre que 1).`
  };
}

function genM1(niveau) {
  if (niveau === 1) return genM1_n1();
  if (niveau === 2) return genM1_n2();
  return genM1_n3();
}

// ==========================================================================
// M2 — Pythagore & Thalès
// ==========================================================================

const REFORMULATIONS_M2_N1 = [
  "Dans quel type de triangle applique-t-on le théorème de Pythagore ?",
  "Pour utiliser la trigonométrie (sinus, cosinus, tangente), de quel type de triangle a-t-on besoin ?",
  "Le théorème de Pythagore ne s'applique que dans un triangle de quel type ?"
];

function genM2_n1() {
  const enonce = pick(REFORMULATIONS_M2_N1);
  const options = shuffleArr(['Isocèle', 'Rectangle', 'Équilatéral', 'Quelconque']);
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf('Rectangle'),
    explication: `Pythagore et la trigonométrie ne s'appliquent que dans un triangle rectangle.`
  };
}

const TRIPLETS_PYTHAGORE = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [7, 24, 25], [8, 15, 17], [9, 12, 15], [9, 40, 41], [10, 24, 26], [12, 16, 20], [12, 35, 37], [15, 20, 25], [15, 36, 39], [16, 30, 34], [18, 24, 30], [20, 21, 29], [21, 28, 35], [24, 32, 40], [24, 45, 51], [27, 36, 45], [28, 45, 53], [30, 40, 50], [33, 44, 55], [36, 48, 60], [40, 42, 58]];

function genM2_n2() {
  const estRectangle = Math.random() < 0.6;
  let a, b, c;
  if (estRectangle) {
    [a, b, c] = pick(TRIPLETS_PYTHAGORE);
  } else {
    let base = pick(TRIPLETS_PYTHAGORE);
    a = base[0]; b = base[1]; c = base[2] + randInt(1, 3);
    if (a === b) b += 1;
  }
  const [p, q, r] = [a, b, c].sort((x, y) => x - y);
  const estPyth = (p * p + q * q === r * r);
  const estIso = (a === b || b === c || a === c);

  let correcte, explication;
  if (estIso) {
    correcte = 'Isocèle';
    explication = `Deux côtés sont égaux, le triangle est isocèle.`;
  } else if (estPyth) {
    correcte = 'Rectangle';
    explication = `Car ${p}²+${q}²=${r}² (${p * p}+${q * q}=${r * r}), d'après la réciproque de Pythagore.`;
  } else {
    correcte = 'Quelconque';
    explication = `Car ${p}²+${q}² (${p * p}+${q * q}) ≠ ${r}² (${r * r}) : ce n'est pas un triangle rectangle, et aucune autre propriété particulière ne s'applique.`;
  }
  const options = shuffleArr(['Rectangle', 'Isocèle', 'Quelconque', 'Plat']);
  return {
    enonce: `Si un triangle a des côtés de ${a}cm, ${b}cm, et ${c}cm, il est :`,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication
  };
}

const REFORMULATIONS_M2_N3 = [
  "Pour utiliser Thalès, que doivent impérativement être deux des droites ?",
  "Le théorème de Thalès nécessite que les droites concernées soient... ?",
  "Quelle est la condition indispensable sur les droites pour appliquer Thalès ?"
];

function genM2_n3() {
  const enonce = pick(REFORMULATIONS_M2_N3);
  const options = shuffleArr(['Perpendiculaires', 'Sécantes', 'Parallèles', 'Confondues']);
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf('Parallèles'),
    explication: `Les droites doivent être parallèles pour conserver les proportions (théorème de Thalès).`
  };
}

function genM2(niveau) {
  if (niveau === 1) return genM2_n1();
  if (niveau === 2) return genM2_n2();
  return genM2_n3();
}

// ==========================================================================
// M3 — Calcul littéral & Équations
// ==========================================================================

function genM3_n1() {
  const a = randInt(2, 9);
  const b = pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const signe = b < 0 ? '-' : '+';
  const absB = Math.abs(b);
  const enonce = `Développer l'expression : ${a}(x ${signe} ${absB})`;
  const ab = a * b;
  const correcte = `${a}x ${ab < 0 ? '-' : '+'} ${Math.abs(ab)}`;
  const distracteurs = [
    `${a}x ${signe} ${absB}`,
    `x ${ab < 0 ? '-' : '+'} ${Math.abs(ab)}`,
    `${a}x² ${ab < 0 ? '-' : '+'} ${Math.abs(ab)}`
  ];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM3_n1();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `${a}×x ${signe} ${a}×${absB} = ${a}x ${ab < 0 ? '-' : '+'} ${Math.abs(ab)}.`
  };
}

function genM3_n2() {
  const a = randInt(2, 9);
  const xSol = pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const b = -a * xSol;
  const signe = b < 0 ? '-' : '+';
  const absB = Math.abs(b);
  const enonce = `Quelle est la solution de ${a}x ${signe} ${absB} = 0 ?`;
  const correcte = `x = ${xSol}`;
  const distracteurs = [`x = ${-xSol}`, `x = ${b}`, `x = ${-b}`];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM3_n2();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `${a}x = ${-b} donc x = ${-b}/${a} = ${xSol}.`
  };
}

function genM3_n3() {
  const b = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  const b2 = b * b;
  const enonce = `Factoriser x² - ${b2} donne :`;
  const correcte = `(x-${b})(x+${b})`;
  const distracteurs = [`(x-${b})²`, `(x+${b})²`, `${b}x(x-${b})`];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM3_n3();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `Identité remarquable a² - b² = (a-b)(a+b), avec a=x et b=${b} (car ${b}² = ${b2}).`
  };
}

function genM3(niveau) {
  if (niveau === 1) return genM3_n1();
  if (niveau === 2) return genM3_n2();
  return genM3_n3();
}

// ==========================================================================
// M4 — Fonctions (Linéaires, Affines, Graphiques)
// ==========================================================================

function genM4_n1() {
  const a = randInt(1, 9) * (Math.random() < 0.5 ? -1 : 1);
  const estLineaire = Math.random() < 0.5;
  const b = estLineaire ? 0 : pick([-7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7]);
  const bStr = b === 0 ? '' : (b > 0 ? ` + ${b}` : ` - ${Math.abs(b)}`);
  const enonce = `f(x) = ${a}x${bStr} : s'agit-il d'une fonction linéaire ?`;
  const correcte = estLineaire ? 'Oui, car b = 0' : 'Non, car b ≠ 0';
  const options = shuffleArr(['Oui, car b = 0', 'Oui, car a ≠ 0', 'Non, car b ≠ 0', 'Non, car a ≠ 0']);
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: estLineaire
      ? `b = 0, donc la droite passe par l'origine : c'est bien une fonction linéaire.`
      : `b = ${b} ≠ 0, la droite ne passe pas par l'origine : c'est une fonction affine, mais pas linéaire.`
  };
}

function genM4_n2() {
  const a = pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const x0 = pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const correcte = a * x0;
  const enonce = `Pour f(x) = ${a}x, quelle est l'image de ${x0} ?`;
  const distracteurs = [a + x0, -correcte, a - x0];
  const options = uniqueOptionsFromList(distracteurs.map(String), String(correcte));
  if (!options) return genM4_n2();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(String(correcte)),
    explication: `${a} × (${x0}) = ${correcte}.`
  };
}

function genM4_n3() {
  const a = pick([-7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7]);
  const b = pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
  const bStr = b > 0 ? ` + ${b}` : ` - ${Math.abs(b)}`;
  const demanderA = Math.random() < 0.5;
  const enonce = demanderA
    ? `Dans f(x) = ${a}x${bStr}, comment appelle-t-on le terme ${a} (devant x) ?`
    : `Dans f(x) = ${a}x${bStr}, comment appelle-t-on le terme ${b} ?`;
  const correcte = demanderA ? 'Le coefficient directeur' : "L'ordonnée à l'origine";
  const options = shuffleArr(['Le coefficient directeur', "L'image", "L'ordonnée à l'origine", "L'antécédent"]);
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: demanderA
      ? `${a} est le coefficient directeur : il indique la pente de la droite.`
      : `${b} est l'ordonnée à l'origine : c'est l'endroit où la droite coupe l'axe vertical.`
  };
}

function genM4(niveau) {
  if (niveau === 1) return genM4_n1();
  if (niveau === 2) return genM4_n2();
  return genM4_n3();
}

// ==========================================================================
// M5 — Statistiques & Probabilités
// ==========================================================================

function genM5_n1() {
  const certain = Math.random() < 0.5;
  const enonce = certain
    ? `Quelle est la probabilité d'un événement certain ?`
    : `Quelle est la probabilité d'un événement impossible ?`;
  const correcte = certain ? '1' : '0';
  const options = shuffleArr(['0', '0.5', '1', '100']);
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: certain
      ? `Un événement certain a une probabilité de 1 (soit 100%).`
      : `Un événement impossible a une probabilité de 0 (il ne peut jamais se réaliser).`
  };
}

function genM5_n2() {
  const moyenneCible = randInt(8, 20);
  const v1 = randInt(5, 25);
  const v2 = randInt(5, 25);
  const v3 = moyenneCible * 3 - v1 - v2;
  if (v3 < 1 || v3 > 40) return genM5_n2();
  const valeurs = shuffleArr([v1, v2, v3]);
  const enonce = `Quelle est la moyenne de la série : ${valeurs.join(' ; ')} ?`;
  const somme = v1 + v2 + v3;
  const correcte = String(moyenneCible);
  const triees = [...valeurs].sort((x, y) => x - y);
  const distracteurs = [String(somme), String(moyenneCible + 1), String(triees[1])];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM5_n2();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `(${valeurs.join('+')})/3 = ${somme}/3 = ${moyenneCible}.`
  };
}

function simplifierFraction(num, den) {
  const d = pgcd(num, den);
  return [num / d, den / d];
}

function genM5_n3() {
  const config = pick([
    { n: 6, favorables: [3, 6], critere: 'un multiple de 3' },
    { n: 6, favorables: [1, 2, 3, 4], critere: 'inférieur ou égal à 4' },
    { n: 6, favorables: [6], critere: 'le numéro 6' },
    { n: 8, favorables: [4, 8], critere: 'un multiple de 4' },
    { n: 8, favorables: [1, 2, 3, 4, 5, 6], critere: 'inférieur à 7' },
    { n: 8, favorables: [2, 4, 8], critere: 'un diviseur de 8 (autre que 1)' },
    { n: 10, favorables: [5, 10], critere: 'un multiple de 5' },
    { n: 10, favorables: [3, 6, 9], critere: 'un multiple de 3' },
    { n: 10, favorables: [1, 2, 3, 4], critere: 'inférieur à 5' },
    { n: 12, favorables: [3, 6, 9, 12], critere: 'un multiple de 3' },
    { n: 12, favorables: [4, 8, 12], critere: 'un multiple de 4' },
    { n: 12, favorables: [6, 12], critere: 'un multiple de 6' },
    { n: 20, favorables: [4, 8, 12, 16, 20], critere: 'un multiple de 4' },
    { n: 20, favorables: [5, 10, 15, 20], critere: 'un multiple de 5' },
    { n: 20, favorables: [10, 20], critere: 'un multiple de 10' }
  ]);
  const [num, den] = simplifierFraction(config.favorables.length, config.n);
  const correcte = `${num}/${den}`;
  const enonce = `Si on lance un dé équilibré à ${config.n} faces, quelle est la probabilité d'obtenir ${config.critere} ?`;
  const [numFaux, denFaux] = simplifierFraction(config.n - config.favorables.length, config.n);
  const distracteurs = [
    `${config.favorables.length}/${config.n}`,
    `${numFaux}/${denFaux}`,
    `${den}/${num}`
  ];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM5_n3();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `Il y a ${config.favorables.length} issues favorables sur ${config.n}, soit ${config.favorables.length}/${config.n} = ${correcte}.`
  };
}

function genM5(niveau) {
  if (niveau === 1) return genM5_n1();
  if (niveau === 2) return genM5_n2();
  return genM5_n3();
}

// ==========================================================================
// M6 — Trigonométrie dans le triangle rectangle
// ==========================================================================

function genM6_n1() {
  const variantes = [
    { paire: "le côté opposé ET l'hypoténuse", correcte: 'Le sinus' },
    { paire: "le côté adjacent ET l'hypoténuse", correcte: 'Le cosinus' },
    { paire: "le côté opposé ET le côté adjacent", correcte: 'La tangente' }
  ];
  const v = pick(variantes);
  const options = shuffleArr(['Le sinus', 'Le cosinus', 'La tangente', 'Pythagore']);
  return {
    enonce: `Quelle formule utilise ${v.paire} ?`,
    options,
    bonne_reponse: options.indexOf(v.correcte),
    explication: `${v.correcte} relie ${v.paire.toLowerCase()} dans un triangle rectangle (SOH-CAH-TOA).`
  };
}

function genM6_n2() {
  const [a, b, c] = pick(TRIPLETS_PYTHAGORE);
  const correcte = `${c} cm`;
  const enonce = `Dans un triangle rectangle de côtés ${a}cm, ${b}cm et ${c}cm, lequel est l'hypoténuse ?`;
  const distracteurs = [`${a} cm`, `${b} cm`, `${a + b} cm`]; // 4e leurre : confusion avec la somme des deux côtés
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM6_n2();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `L'hypoténuse est toujours le côté opposé à l'angle droit, et c'est le plus long des trois côtés : ici ${c}cm.`
  };
}

function genM6_n3() {
  const tan = pick([0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.2, 1.25, 1.5]);
  const adjacent = pick([10, 20, 25, 40, 50]);
  const oppose = Math.round(tan * adjacent * 100) / 100;
  const enonce = `Si tan(angle) = opposé/adjacent = ${tan} et que le côté adjacent vaut ${adjacent} cm, le côté opposé vaut :`;
  const correcte = `${oppose} cm`;
  const distracteurs = [
    `${Math.round((adjacent / tan) * 100) / 100} cm`,
    `${Math.round((adjacent + oppose) * 100) / 100} cm`,
    `${Math.round((oppose / 10) * 100) / 100} cm`
  ];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM6_n3();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `${tan} × ${adjacent} = ${oppose} cm.`
  };
}

function genM6(niveau) {
  if (niveau === 1) return genM6_n1();
  if (niveau === 2) return genM6_n2();
  return genM6_n3();
}

// ==========================================================================
// M7 — Géométrie dans l'espace : solides et volumes
// ==========================================================================

const FORMULES_VOLUMES = {
  'pavé droit': 'L × l × h',
  'cylindre': 'π × r² × h',
  'cône': '(π × r² × h) / 3',
  'sphère': '(4/3) × π × r³',
  'pyramide': '(aire base × hauteur) / 3'
};

function genM7_n1() {
  const solides = Object.keys(FORMULES_VOLUMES);
  const solide = pick(solides);
  const correcte = FORMULES_VOLUMES[solide];
  const autresFormules = solides.filter(s => s !== solide).map(s => FORMULES_VOLUMES[s]);
  const distracteurs = shuffleArr(autresFormules).slice(0, 3);
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM7_n1();
  return {
    enonce: `Quelle est la formule du volume d'un ${solide} ?`,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `Le volume d'un ${solide} se calcule avec : ${correcte}.`
  };
}

function genM7_n2() {
  const solide = pick(['une pyramide', 'un cône']);
  const aire = pick([6, 9, 12, 15, 18, 21, 24]);
  const hauteur = pick([3, 5, 6, 9, 12]);
  const volume = (aire * hauteur) / 3;
  const enonce = `${solide.charAt(0).toUpperCase() + solide.slice(1)} a une aire de base de ${aire} cm² et une hauteur de ${hauteur} cm. Quel est son volume ?`;
  const correcte = `${volume} cm³`;
  const distracteurs = [`${aire * hauteur} cm³`, `${(aire * hauteur) / 2} cm³`, `${aire * hauteur * 3} cm³`];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM7_n2();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `Volume = (aire base × hauteur) / 3 = (${aire} × ${hauteur}) / 3 = ${volume} cm³. Ne pas oublier de diviser par 3 !`
  };
}

function genM7_n3() {
  const echelles = [
    { num: 1, den: 2 }, { num: 1, den: 3 }, { num: 1, den: 4 }, { num: 1, den: 5 },
    { num: 2, den: 1 }, { num: 2, den: 3 }, { num: 2, den: 5 },
    { num: 3, den: 1 }, { num: 3, den: 2 }, { num: 3, den: 4 }, { num: 3, den: 5 },
    { num: 4, den: 1 }, { num: 4, den: 3 }, { num: 4, den: 5 },
    { num: 5, den: 1 }, { num: 5, den: 2 }, { num: 5, den: 3 }, { num: 5, den: 4 }
  ];
  const e = pick(echelles);
  const enonce = `Si on réduit (ou agrandit) un solide à l'échelle ${e.num}/${e.den}, son volume est multiplié par :`;
  const numCube = e.num ** 3;
  const denCube = e.den ** 3;
  const d = pgcd(numCube, denCube);
  const correcte = denCube / d === 1 ? `${numCube / d}` : `${numCube / d}/${denCube / d}`;
  const distracteurs = [
    e.den === 1 ? `${e.num}` : `${e.num}/${e.den}`,
    `${e.num * e.num}/${e.den * e.den}`,
    `${3 * e.num}/${e.den}`
  ];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genM7_n3();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `Le volume varie selon le CUBE du coefficient : (${e.num}/${e.den})³ = ${correcte}.`
  };
}

function genM7(niveau) {
  if (niveau === 1) return genM7_n1();
  if (niveau === 2) return genM7_n2();
  return genM7_n3();
}

function obtenirQuestionsFiltrees(pool, quantite) {
  let questionsDisponibles = pool.filter(q => !AppState.historiqueQuestions.includes(q.enonce));
  if (questionsDisponibles.length < quantite) {
    AppState.historiqueQuestions = AppState.historiqueQuestions.filter(enonce => !pool.some(q => q.enonce === enonce));
    questionsDisponibles = pool;
  }
  const selectionnees = shuffleArr(questionsDisponibles).slice(0, quantite);
  selectionnees.forEach(q => AppState.historiqueQuestions.push(q.enonce));
  if (AppState.historiqueQuestions.length > 50) AppState.historiqueQuestions.shift();
  localStorage.setItem('dnb_history_anti_repeat', JSON.stringify(AppState.historiqueQuestions));
  return selectionnees;
}

// ==========================================================================
// 🎲 GÉNÉRATEURS « AUTOMATISMES » — pool de plusieurs types (mode Automatismes uniquement)
// ==========================================================================

function genPourcentage() {
  const pList = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75];
  const vList = [30, 40, 50, 60, 80, 100, 120, 150, 200, 300, 400, 500];
  const p = pList[Math.floor(Math.random() * pList.length)];
  const v = vList[Math.floor(Math.random() * vList.length)];
  const res = parseFloat(((p * v) / 100).toFixed(2));

  const enonce = `Calculer ${p}% de ${v} €.`;
  const bonneReponse = `${res} €`;
  const explication = `Prendre ${p}%, revient à calculer (${p} × ${v}) / 100 = ${res} €.`;

  const options = [bonneReponse, `${parseFloat((res + (v * 0.05)).toFixed(2))} €`, `${res - 2 > 0 ? parseFloat((res - 2).toFixed(2)) : parseFloat((res + 10).toFixed(2))} €`, `${parseFloat((res * 1.5).toFixed(2))} €`];
  const shuffled = shuffleArr([...new Set(options)]);
  return { enonce, options: shuffled, bonne_reponse: shuffled.indexOf(bonneReponse), explication };
}

function genConversion() {
  const familles = [
    { unites: ['km', 'm'], facteur: 1000 },
    { unites: ['m', 'cm'], facteur: 100 },
    { unites: ['cm', 'mm'], facteur: 10 },
    { unites: ['kg', 'g'], facteur: 1000 },
    { unites: ['g', 'mg'], facteur: 1000 },
    { unites: ['L', 'mL'], facteur: 1000 },
    { unites: ['h', 'min'], facteur: 60 },
    { unites: ['min', 's'], facteur: 60 }
  ];
  const f = familles[Math.floor(Math.random() * familles.length)];
  const sensDirect = Math.random() < 0.5;
  const valeurDepart = [2, 3, 4, 5, 6, 7, 8, 1.5, 2.5][Math.floor(Math.random() * 9)];

  let bonneVal, uniteDepart, uniteArrivee;
  if (sensDirect) {
    uniteDepart = f.unites[0]; uniteArrivee = f.unites[1];
    bonneVal = parseFloat((valeurDepart * f.facteur).toFixed(3));
  } else {
    uniteDepart = f.unites[1]; uniteArrivee = f.unites[0];
    bonneVal = parseFloat((valeurDepart / f.facteur).toFixed(4));
  }

  const enonce = `Convertir ${valeurDepart} ${uniteDepart} en ${uniteArrivee}.`;
  const bonneReponse = `${bonneVal} ${uniteArrivee}`;
  const leurres = [
    `${parseFloat((bonneVal * 10).toFixed(4))} ${uniteArrivee}`,
    `${parseFloat((bonneVal / 10).toFixed(4))} ${uniteArrivee}`,
    `${valeurDepart} ${uniteArrivee}`
  ];
  const options = shuffleArr([...new Set([bonneReponse, ...leurres])]);
  return {
    enonce, options, bonne_reponse: options.indexOf(bonneReponse),
    explication: `1 ${f.unites[0]} = ${f.facteur} ${f.unites[1]}, donc on ${sensDirect ? 'multiplie' : 'divise'} par ${f.facteur}.`
  };
}

function genOrdreDeGrandeur() {
  const a = [18, 21, 32, 48, 55, 79, 103, 198, 305][Math.floor(Math.random() * 9)];
  const b = [9, 11, 19, 22, 31, 48, 52][Math.floor(Math.random() * 7)];
  const op = Math.random() < 0.5 ? '×' : '+';
  const arrondiA = Math.round(a / 10) * 10;
  const arrondiB = Math.round(b / 10) * 10;
  const exact = op === '×' ? a * b : a + b;
  const estimation = op === '×' ? arrondiA * arrondiB : arrondiA + arrondiB;

  const enonce = `Sans calculatrice, quel est l'ordre de grandeur de ${a} ${op} ${b} ?`;
  const bonneReponse = `Environ ${estimation}`;
  const leurres = [`Environ ${estimation * 10}`, `Environ ${Math.round(estimation / 10)}`, `Environ ${exact + (op === '×' ? 50 : 5)}`];
  const options = shuffleArr([...new Set([bonneReponse, ...leurres])]);
  return {
    enonce, options, bonne_reponse: options.indexOf(bonneReponse),
    explication: `En arrondissant ${a} en ${arrondiA} et ${b} en ${arrondiB}, on obtient rapidement environ ${estimation} (valeur exacte : ${exact}).`
  };
}

function genPrioritesOperatoires() {
  const a = Math.floor(Math.random() * 9) + 2;
  const b = Math.floor(Math.random() * 9) + 2;
  const c = Math.floor(Math.random() * 9) + 2;
  const formeAvecParentheses = Math.random() < 0.5;

  let enonce, resultat, piege;
  if (formeAvecParentheses) {
    resultat = (a + b) * c;
    piege = a + b * c;
    enonce = `Calculer : (${a} + ${b}) × ${c}`;
  } else {
    resultat = a + b * c;
    piege = (a + b) * c;
    enonce = `Calculer : ${a} + ${b} × ${c}`;
  }

  const bonneReponse = `${resultat}`;
  const leurres = [`${piege}`, `${resultat + 1}`, `${resultat - c}`];
  const options = shuffleArr([...new Set([bonneReponse, ...leurres])]);
  return {
    enonce, options, bonne_reponse: options.indexOf(bonneReponse),
    explication: formeAvecParentheses
      ? `Les parenthèses se calculent en premier : (${a}+${b}) = ${a + b}, puis × ${c} = ${resultat}.`
      : `La multiplication est prioritaire sur l'addition : ${b}×${c} = ${b * c}, puis ${a} + ${b * c} = ${resultat}.`
  };
}

function genProportionnalite() {
  const prixUnitaire = [2, 3, 4, 5, 6, 8][Math.floor(Math.random() * 6)];
  const qteRef = [3, 4, 5, 6][Math.floor(Math.random() * 4)];
  const qteCherchee = [7, 9, 10, 12, 15][Math.floor(Math.random() * 5)];
  const totalRef = prixUnitaire * qteRef;
  const resultat = parseFloat(((totalRef / qteRef) * qteCherchee).toFixed(2));

  const enonce = `${qteRef} articles identiques coûtent ${totalRef} €. Combien coûtent ${qteCherchee} de ces articles (même prix unitaire) ?`;
  const bonneReponse = `${resultat} €`;
  const leurres = [
    `${parseFloat((resultat + totalRef * 0.1).toFixed(2))} €`,
    `${parseFloat((totalRef + qteCherchee).toFixed(2))} €`,
    `${parseFloat((resultat - prixUnitaire).toFixed(2))} €`
  ];
  const options = shuffleArr([...new Set([bonneReponse, ...leurres])]);
  return {
    enonce, options, bonne_reponse: options.indexOf(bonneReponse),
    explication: `Le prix d'un article est ${totalRef}/${qteRef} = ${prixUnitaire} €. Pour ${qteCherchee} articles : ${prixUnitaire} × ${qteCherchee} = ${resultat} €.`
  };
}

const GENERATEURS_AUTOMATISMES = [genPourcentage, genConversion, genOrdreDeGrandeur, genPrioritesOperatoires, genProportionnalite];

function genererQuestionAutomatisme() {
  const fn = GENERATEURS_AUTOMATISMES[Math.floor(Math.random() * GENERATEURS_AUTOMATISMES.length)];
  return fn();
}

// ==========================================================================
// ⏱️ TIMER (mode Automatismes uniquement)
// ==========================================================================

let timerInterval = null;
let tempsRestant = 45;

function lancerTimer() {
  clearInterval(timerInterval);
  tempsRestant = 45;
  $('quiz-timer').style.display = 'inline-flex';
  $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
  $('quiz-timer').style.background = '#E2E8F0';
  $('quiz-timer').style.color = 'var(--text-primary)';

  timerInterval = setInterval(() => {
    tempsRestant--;
    $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
    if (tempsRestant <= 10) {
      $('quiz-timer').style.background = '#FEE2E2';
      $('quiz-timer').style.color = 'var(--color-danger)';
    }
    if (tempsRestant <= 0) {
      clearInterval(timerInterval);
      forcerEchecTimeout();
    }
  }, 1000);
}

function forcerEchecTimeout() {
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  $('quiz-explanation-box').className = "explanation-box visible bad";
  $('explanation-status').textContent = "⏰ TEMPS ÉCOULÉ !";
  $('explanation-text').textContent = "Les 45 secondes maximales pour cet automatisme sont passées.";
  $('quiz-next').disabled = false;
  enregistrerLacune("automatismes_global", false, "Automatismes");
}

// ==========================================================================
// 🔁 RÉPÉTITION ESPACÉE (boîtes de Leitner) — remplace l'ancien seuil binaire 35%
// ==========================================================================

const LEITNER_INTERVALLES_JOURS = [1, 3, 7, 16, 35]; // index = box - 1

function enregistrerLacune(cle, estSucces = false, labelAffichage = null) {
  const now = Date.now();
  if (!AppState.leitner[cle]) {
    AppState.leitner[cle] = { box: 1, nextReview: now, derniereRevision: now, total: 0, echecs: 0, label: labelAffichage || cle };
  }
  const entry = AppState.leitner[cle];
  entry.label = labelAffichage || entry.label || cle;
  entry.total = (entry.total || 0) + 1;

  if (estSucces) {
    entry.box = Math.min((entry.box || 1) + 1, 5);
  } else {
    entry.echecs = (entry.echecs || 0) + 1;
    entry.box = 1;
  }

  entry.derniereRevision = now;
  entry.nextReview = now + LEITNER_INTERVALLES_JOURS[entry.box - 1] * 24 * 60 * 60 * 1000;

  localStorage.setItem('dnb_leitner_v3', JSON.stringify(AppState.leitner));
  analyserLacunes();
}

function analyserLacunes() {
  const now = Date.now();
  const dus = Object.entries(AppState.leitner)
    .filter(([cle, e]) => e.nextReview <= now)
    .sort((a, b) => a[1].nextReview - b[1].nextReview);

  if (dus.length > 0) {
    $('lacunes-box').classList.remove('hidden');
    const listeLabels = dus.slice(0, 3).map(([cle, e]) => e.label || cle).join(', ');
    const reste = dus.length > 3 ? ` (+${dus.length - 3} autre${dus.length - 3 > 1 ? 's' : ''})` : '';
    $('lacunes-text').innerHTML = `🔁 <b>Révision programmée :</b> ${dus.length} chapitre${dus.length > 1 ? 's' : ''} à revoir aujourd'hui (répétition espacée) — <b>${listeLabels}</b>${reste}.`;
  } else {
    $('lacunes-box').classList.add('hidden');
  }
}

// Statut personnel de maîtrise d'UN MODULE (chapitre), indexé sur son id — jamais sur son
// libellé de thème, partagé par plusieurs chapitres. Codé par FORME d'icône (pas par couleur
// rouge/vert/orange) pour ne jamais se confondre avec les barres de couverture du programme.
function statutMaitrise(chapitreId) {
  const e = AppState.leitner[chapitreId];
  if (!e) return { icone: '⚪', label: 'Pas encore testé' };
  if (e.nextReview <= Date.now()) return { icone: '🔄', label: 'À revoir aujourd\'hui' };
  if (e.box >= 4) return { icone: '✅', label: 'Maîtrisé (révision dans plusieurs jours)' };
  return { icone: '📝', label: 'En cours d\'apprentissage' };
}


// ==========================================================================
// 📊 TABLEAU DE BORD « COUVERTURE DU PROGRAMME » — indicateur honnête, calculé
// ==========================================================================

function calculerCouverture() {
  const dataToUse = AppState.data || DATA_SECOURS;
  const detail = dataToUse.matieres.map(m => {
    const referentiel = m.referentiel_officiel || [];
    const total = referentiel.length;
    const couverts = new Set();
    (m.chapitres || []).forEach(c => (c.couvre || []).forEach(id => couverts.add(id)));
    const nbCouverts = total > 0 ? referentiel.filter(r => couverts.has(r.id)).length : 0;
    const pct = total > 0 ? Math.round((nbCouverts / total) * 100) : null;
    return { id: m.id, label: m.label || m.id, emoji: m.emoji || '📘', total, nbCouverts, pct };
  });
  const totalGlobal = detail.reduce((s, d) => s + d.total, 0);
  const couvertGlobal = detail.reduce((s, d) => s + d.nbCouverts, 0);
  const pctGlobal = totalGlobal > 0 ? Math.round((couvertGlobal / totalGlobal) * 100) : 0;
  return { detail, pctGlobal, totalGlobal, couvertGlobal };
}

function couleurCouverture(pct) {
  if (pct >= 70) return 'var(--color-success)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

// ==========================================================================
// 🚀 INITIALISATION
// ==========================================================================

async function initialiserApp() {
  const savedLeitner = localStorage.getItem('dnb_leitner_v3');
  if (savedLeitner) {
    try { AppState.leitner = JSON.parse(savedLeitner); } catch (e) { AppState.leitner = {}; }
  }

  const savedHistory = localStorage.getItem('dnb_history_anti_repeat');
  if (savedHistory) {
    try { AppState.historiqueQuestions = JSON.parse(savedHistory); } catch (e) { AppState.historiqueQuestions = []; }
  }

  try {
    const res = await fetch('troisieme.json');
    if (res.ok) {
      AppState.data = await res.json();
    } else {
      AppState.data = DATA_SECOURS;
    }
  } catch (e) {
    AppState.data = DATA_SECOURS;
  }

  if (!AppState.data || !AppState.data.matieres) {
    AppState.data = DATA_SECOURS;
  }

  construireMenuMatieres();
  analyserLacunes();
  configurerNavigation();
}

function construireMenuMatieres() {
  const container = $('matieres-container');
  if (!container) return;
  container.innerHTML = "";

  const dataToUse = AppState.data || DATA_SECOURS;
  const groupes = {};
  const couvertureParId = {};
  calculerCouverture().detail.forEach(d => { couvertureParId[d.id] = d; });

  dataToUse.matieres.forEach(m => {
    const cat = m.categorie || "Enseignement Général";
    if (!groupes[cat]) groupes[cat] = [];
    groupes[cat].push(m);
  });

  for (const [nomCategorie, listeMatieres] of Object.entries(groupes)) {
    const titreCategorie = document.createElement('div');
    titreCategorie.className = 'category-group-title';
    titreCategorie.textContent = nomCategorie;
    container.appendChild(titreCategorie);

    listeMatieres.forEach(m => {
      if (!m.chapitres) return;

      const card = document.createElement('div');
      card.className = 'card matiere-card-wrapper';

      const header = document.createElement('div');
      header.className = 'matiere-trigger-header';

      const defaultIcon = `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      const svgIcon = SVGMappings[m.id] || defaultIcon;

      const cov = couvertureParId[m.id];
      const covBar = (cov && cov.total > 0) ? `
        <div style="margin-top:8px;">
          <div style="width:100%; height:4px; background:var(--border-color); border-radius:2px; overflow:hidden;">
            <div style="width:${cov.pct}%; height:100%; background:${couleurCouverture(cov.pct)};"></div>
          </div>
          <span style="font-size:0.62rem; font-weight:700; color:${couleurCouverture(cov.pct)}; text-transform:uppercase; letter-spacing:0.03em;">📚 Programme : ${cov.pct}% (${cov.nbCouverts}/${cov.total})</span>
        </div>
      ` : '';

      header.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0; flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="header-icon-box">${svgIcon}</div>
            <h3 style="margin:0; font-size:1rem; font-weight:700; color:var(--text-primary); letter-spacing:-0.01em;">${m.label || m.id}</h3>
          </div>
          ${covBar}
        </div>
        <svg class="arrow-indicator" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      `;

      const bodyContent = document.createElement('div');
      bodyContent.className = 'matiere-chapters-body';

      m.chapitres.forEach(c => {
        const row = document.createElement('div');
        row.className = 'chapitre-item';
        row.style.cssText = "padding:16px 14px; margin-top:12px; background:var(--bg-card); border-radius:12px; display:flex; flex-direction:column; gap:10px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);";
        row.onclick = (e) => ouvrirPreQuiz(m.id, c.id, e);
        const statut = statutMaitrise(c.id);
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="display:flex; align-items:center; gap:8px; font-weight:600; font-size:.88rem; padding-right:12px; text-align:left; color:var(--text-primary); line-height:1.4;">
              <span title="${statut.label}" style="font-size:0.85rem; flex-shrink:0;">${statut.icone}</span>
              ${c.titre}
            </span>
            <span style="font-size:.68rem; font-weight:700; color:var(--color-primary); background:#EEF2FF; padding:5px 10px; border-radius:8px; white-space:nowrap; text-transform:uppercase; letter-spacing:0.03em;">${c.theme || 'DNB'}</span>
          </div>
        `;
        bodyContent.appendChild(row);
      });

      header.onclick = () => {
        const estOuvert = bodyContent.classList.contains('is-open');

        document.querySelectorAll('.matiere-chapters-body').forEach(b => b.classList.remove('is-open'));
        document.querySelectorAll('.arrow-indicator').forEach(a => a.classList.remove('rotated'));
        document.querySelectorAll('.matiere-card-wrapper').forEach(w => w.classList.remove('is-expanded'));

        if (!estOuvert) {
          bodyContent.classList.add('is-open');
          card.classList.add('is-expanded');
          header.querySelector('.arrow-indicator').classList.add('rotated');
        }
      };

      card.appendChild(header);
      card.appendChild(bodyContent);
      container.appendChild(card);
    });
  }
}

let currentMatiereSelected = null;
let currentChapitreSelected = null;

function ouvrirPreQuiz(matiereId, chapitreId, event) {
  if (event) event.stopPropagation();

  const dataToUse = AppState.data || DATA_SECOURS;
  currentMatiereSelected = dataToUse.matieres.find(m => m.id === matiereId);
  currentChapitreSelected = currentMatiereSelected.chapitres.find(c => c.id === chapitreId);

  $('home-screen').classList.add('hidden');
  $('pre-quiz-screen').classList.remove('hidden');

  $('pre-quiz-title').textContent = currentChapitreSelected.titre;
  $('pre-quiz-theme').textContent = currentChapitreSelected.theme || "Général";
  $('pre-quiz-cours-text').textContent = currentChapitreSelected.cours || "Résumé de cours non spécifié.";
  $('pre-quiz-piege-text').textContent = currentChapitreSelected.piege || "Pas de vigilance particulière recensée.";

  if (currentChapitreSelected.support_texte && $('pre-quiz-support-card')) {
    $('pre-quiz-support-card').classList.remove('hidden');
    $('pre-quiz-support-text').textContent = currentChapitreSelected.support_texte;
  } else if ($('pre-quiz-support-card')) {
    $('pre-quiz-support-card').classList.add('hidden');
  }

  $('btn-lvl-1').onclick = () => lancerQuiz(1);
  $('btn-lvl-2').onclick = () => lancerQuiz(2);
  $('btn-lvl-3').onclick = () => lancerQuiz(3);

  if (currentChapitreSelected.exercice_ouvert) {
    $('btn-open-exercice').classList.remove('hidden');
    $('btn-open-exercice').onclick = () => ouvrirExerciceOuvert();
  } else {
    $('btn-open-exercice').classList.add('hidden');
  }
}

function activerNav(navId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if ($(navId)) $(navId).classList.add('active');
}

function goHome() {
  $('pre-quiz-screen').classList.add('hidden');
  if ($('open-exercise-screen')) $('open-exercise-screen').classList.add('hidden');
  $('quiz-screen').classList.add('hidden');
  $('flashcards-screen').classList.add('hidden');
  if ($('oral-screen')) $('oral-screen').classList.add('hidden');
  $('home-screen').classList.remove('hidden');
  clearInterval(timerInterval);
  $('quiz-timer').style.display = 'none';
  clearInterval(oralTimerInterval);
  oralTimerInterval = null;
  activerNav('nav-home');
  construireMenuMatieres();
}

// ==========================================================================
// 🗂️ MOTEUR DE GÉNÉRATION — AUTRES MATIÈRES (15 chapitres × 3 niveaux)
// Partage shuffleArr(), pick(), randInt(), pgcd() définis dans app.js
// ==========================================================================

// Helper commun : pioche dans une banque de Q/R, mélange les options,
// recalcule l'index de la bonne réponse après mélange.
function genFromBank(bank) {
  const item = pick(bank);
  const options = shuffleArr([...item.options]);
  return {
    enonce: item.enonce,
    options,
    bonne_reponse: options.indexOf(item.correcte),
    explication: item.explication
  };
}

// ==========================================================================
// F1 — Figures de style & Analyse de texte
// ==========================================================================

const BANQUE_F1_N1 = [
  { enonce: "Quelle figure de style utilise un outil comparatif explicite (comme, tel que, pareil à) ?", options: ["La métaphore", "La comparaison", "La personnification", "L'allégorie"], correcte: "La comparaison", explication: "La comparaison relie deux éléments avec un outil comparatif visible : 'rapide comme l'éclair'." },
  { enonce: "Quelle figure de style établit une comparaison SANS outil comparatif ?", options: ["La comparaison", "L'hyperbole", "La métaphore", "La litote"], correcte: "La métaphore", explication: "La métaphore est une comparaison implicite : 'La vie est un long fleuve tranquille' (sans 'comme')." },
  { enonce: "Quelle figure consiste à attribuer des caractéristiques humaines à un objet ou un animal ?", options: ["La métonymie", "L'allégorie", "La personnification", "La synecdoque"], correcte: "La personnification", explication: "La personnification prête des traits humains à ce qui n'est pas humain : 'Le vent gémissait'." },
  { enonce: "Quelle figure de style consiste à exagérer volontairement pour intensifier une idée ?", options: ["La litote", "L'euphémisme", "L'hyperbole", "L'antithèse"], correcte: "L'hyperbole", explication: "L'hyperbole est une exagération expressive : 'Je meurs de faim', 'Je te l'ai dit mille fois'." },
  { enonce: "Quelle figure consiste à dire MOINS pour sous-entendre PLUS, souvent par modestie ou ironie ?", options: ["L'hyperbole", "L'antithèse", "L'ironie", "La litote"], correcte: "La litote", explication: "La litote dit moins pour exprimer plus : 'Ce n'est pas mauvais' signifie 'c'est très bon'." },
  { enonce: "Quelle figure rapproche deux mots ou idées opposés dans une même phrase ?", options: ["L'anaphore", "L'antithèse", "La métaphore", "La périphrase"], correcte: "L'antithèse", explication: "L'antithèse oppose deux réalités contraires : 'Je vis, je meurs; je me brûle et me noie' (Louise Labé)." },
  { enonce: "Quelle figure consiste à répéter un même mot ou groupe de mots en début de plusieurs phrases ?", options: ["Le chiasme", "L'anaphore", "L'oxymore", "La métonymie"], correcte: "L'anaphore", explication: "L'anaphore est une répétition en tête de groupe : 'Il faut qu'on l'aide. Il faut qu'on lui parle. Il faut agir.'." },
  { enonce: "Quelle figure atténue volontairement une réalité difficile ou choquante ?", options: ["L'ironie", "La litote", "L'euphémisme", "L'hyperbole"], correcte: "L'euphémisme", explication: "L'euphémisme adoucit une réalité : 'quitter ce monde' pour 'mourir', 'personnes à mobilité réduite'." },
];

const BANQUE_F1_N2 = [
  { enonce: "Dans 'Le vent hurlait de douleur dans les arbres', quelle figure reconnaît-on ?", options: ["Une hyperbole", "Une comparaison", "Une personnification", "Une antithèse"], correcte: "Une personnification", explication: "Le vent ne peut pas 'hurler de douleur' : c'est une personnification, on lui prête une émotion humaine." },
  { enonce: "Dans 'Elle a mille raisons d'être fière', quelle figure est utilisée ?", options: ["Une litote", "Une anaphore", "Une métaphore", "Une hyperbole"], correcte: "Une hyperbole", explication: "'Mille raisons' est une exagération expressive (hyperbole) : elle n'en a évidemment pas exactement mille." },
  { enonce: "Dans 'Rapide comme l'éclair, il disparut', quelle figure identifiez-vous ?", options: ["Une métaphore", "Une comparaison", "Une personnification", "Un oxymore"], correcte: "Une comparaison", explication: "'Comme' est l'outil comparatif : c'est une comparaison. La métaphore dirait 'Il était l'éclair'." },
  { enonce: "Dans 'Ce n'est pas sans intérêt', que sous-entend réellement l'auteur ?", options: ["C'est ennuyeux", "C'est passionnant", "C'est inutile", "C'est dangereux"], correcte: "C'est passionnant", explication: "C'est une litote : dire 'pas sans intérêt' pour signifier 'c'est très intéressant'." },
  { enonce: "Dans 'Je vis, je meurs; je me brûle et me noie', quelle figure domine ?", options: ["L'hyperbole", "L'anaphore", "L'antithèse", "La métonymie"], correcte: "L'antithèse", explication: "Vivre/mourir, brûler/se noyer : des couples d'opposés s'affrontent — c'est l'antithèse caractéristique (Louise Labé)." },
  { enonce: "Dans 'Il est libre enfin, il a quitté ce monde', quelle figure atténue la réalité de la mort ?", options: ["L'ironie", "La litote", "L'euphémisme", "L'allégorie"], correcte: "L'euphémisme", explication: "'Quitter ce monde' est un euphémisme pour 'mourir' : on adoucit une réalité difficile." },
  { enonce: "Dans 'La victoire chantait dans nos cœurs', quelle figure est à l'œuvre ?", options: ["Une comparaison", "Une hyperbole", "Une personnification", "Une litote"], correcte: "Une personnification", explication: "La victoire (abstraction) est personnifiée : elle 'chante', comme le ferait un être humain." },
  { enonce: "Dans 'Demain, dès l'aube… / Demain, dès l'aube… / Je partirai', quelle figure reconnaît-on ?", options: ["L'antithèse", "L'anaphore", "La métaphore", "L'euphémisme"], correcte: "L'anaphore", explication: "La répétition de 'Demain, dès l'aube' en tête de vers est une anaphore caractéristique (Hugo, 'Demain dès l'aube')." },
];

const BANQUE_F1_N3 = [
  { enonce: "Qu'est-ce qu'un oxymore ?", options: ["Une exagération intense", "L'association de deux mots de sens opposés", "Une comparaison sans outil", "La répétition d'un terme"], correcte: "L'association de deux mots de sens opposés", explication: "L'oxymore réunit deux termes contradictoires : 'un silence assourdissant', 'une douce violence', 'obscure clarté'." },
  { enonce: "La métonymie consiste à :", options: ["Comparer deux réalités sans outil", "Désigner une chose par un terme qui lui est lié (contenant, auteur, lieu...)", "Répéter une idée en fin de vers", "Atténuer une réalité choquante"], correcte: "Désigner une chose par un terme qui lui est lié (contenant, auteur, lieu...)", explication: "Ex : 'Boire un verre' (le contenant pour le contenu), 'Lire du Molière' (l'auteur pour l'œuvre)." },
  { enonce: "Une périphrase consiste à :", options: ["Répéter le même mot pour insister", "Remplacer un mot simple par une expression descriptive", "Mettre deux idées opposées face à face", "Exprimer l'impossible"], correcte: "Remplacer un mot simple par une expression descriptive", explication: "Ex : 'le Roi des animaux' pour 'le lion', 'la Ville Lumière' pour 'Paris'." },
  { enonce: "L'ironie consiste à :", options: ["Exagérer pour intensifier un effet", "Dire le contraire de ce qu'on pense pour moquer ou critiquer", "Répéter les mêmes mots en début de phrase", "Personnifier un objet"], correcte: "Dire le contraire de ce qu'on pense pour moquer ou critiquer", explication: "Ex : 'Quelle belle journée !' dit sous la pluie — on dit le contraire de ce qu'on pense réellement." },
  { enonce: "Dans 'obscure clarté', 'un silence assourdissant', quelle figure est utilisée ?", options: ["L'antithèse", "L'anaphore", "L'oxymore", "La synecdoque"], correcte: "L'oxymore", explication: "L'oxymore soude deux termes contradictoires en un seul groupe : cela crée un effet de paradoxe saisissant." },
  { enonce: "La synecdoque consiste à désigner :", options: ["Le tout par la partie (ou la partie par le tout)", "Une chose par son contraire", "Une abstraction par une image concrète", "Un auteur par son œuvre"], correcte: "Le tout par la partie (ou la partie par le tout)", explication: "Ex : 'Les voiles s'éloignèrent' (les voiles = les bateaux — la partie pour le tout)." },
  { enonce: "Une allégorie représente :", options: ["Une exagération poétique d'une émotion", "Une idée abstraite sous une forme concrète et personnifiée", "La répétition d'un son en fin de vers", "Un détail réel devenant symbole universel"], correcte: "Une idée abstraite sous une forme concrète et personnifiée", explication: "Ex : la Justice représentée par une femme aux yeux bandés tenant une balance — l'abstrait devient image." },
  { enonce: "Quel registre littéraire valorise les sentiments personnels et la sensibilité du 'je' poétique ?", options: ["Le registre épique", "Le registre comique", "Le registre lyrique", "Le registre ironique"], correcte: "Le registre lyrique", explication: "Le registre lyrique exprime les émotions intimes du locuteur : amour, mélancolie, nature... Très présent en poésie romantique." },
];

function genF1(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_F1_N1);
  if (niveau === 2) return genFromBank(BANQUE_F1_N2);
  return genFromBank(BANQUE_F1_N3);
}

// ==========================================================================
// F2 — Grammaire : Classes & Fonctions grammaticales
// ==========================================================================

const BANQUE_F2_N1 = [
  { enonce: "Quelle est la classe grammaticale (nature) du mot 'magnifique' dans 'un magnifique tableau' ?", options: ["Nom commun", "Verbe", "Adjectif qualificatif", "Adverbe"], correcte: "Adjectif qualificatif", explication: "'Magnifique' qualifie le nom 'tableau' : c'est un adjectif qualificatif." },
  { enonce: "Quelle est la nature du mot 'rapidement' dans 'Il court rapidement' ?", options: ["Adjectif", "Nom", "Adverbe", "Préposition"], correcte: "Adverbe", explication: "'Rapidement' modifie le verbe 'court' : c'est un adverbe de manière." },
  { enonce: "Dans 'Ce livre est intéressant', quelle est la nature du mot 'Ce' ?", options: ["Article défini", "Adjectif démonstratif", "Pronom personnel", "Préposition"], correcte: "Adjectif démonstratif", explication: "'Ce' accompagne le nom 'livre' en le désignant : c'est un adjectif (ou déterminant) démonstratif." },
  { enonce: "Quelle est la nature du mot 'parce que' dans 'Il pleure parce qu'il est triste' ?", options: ["Préposition", "Adverbe", "Conjonction de subordination", "Pronom relatif"], correcte: "Conjonction de subordination", explication: "'Parce que' introduit une proposition subordonnée de cause : c'est une conjonction de subordination." },
  { enonce: "Dans 'Nous partirons demain', quelle est la nature de 'Nous' ?", options: ["Nom propre", "Adjectif possessif", "Pronom personnel", "Pronom indéfini"], correcte: "Pronom personnel", explication: "'Nous' est un pronom personnel de la 1ère personne du pluriel : il remplace ou représente des personnes." },
  { enonce: "Quelle est la nature du mot 'avec' dans 'Il voyage avec ses amis' ?", options: ["Adverbe", "Conjonction de coordination", "Préposition", "Article"], correcte: "Préposition", explication: "'Avec' introduit un groupe nominal complément : c'est une préposition." },
  { enonce: "Dans 'Le chien aboie', quelle est la nature du mot 'Le' ?", options: ["Article défini", "Adjectif démonstratif", "Pronom personnel", "Déterminant possessif"], correcte: "Article défini", explication: "'Le' est un article défini qui introduit et détermine le nom 'chien'." },
  { enonce: "Quelle est la nature du mot 'mais' dans 'Il est fatigué mais il continue' ?", options: ["Préposition", "Conjonction de subordination", "Conjonction de coordination", "Adverbe"], correcte: "Conjonction de coordination", explication: "'Mais' relie deux propositions de même niveau (coordination) : c'est une conjonction de coordination (liste : mais, ou, et, donc, or, ni, car)." },
];

const BANQUE_F2_N2 = [
  { enonce: "Dans 'Il lui donne un livre', quelle est la fonction de 'un livre' ?", options: ["Sujet", "COD", "COI", "Attribut du sujet"], correcte: "COD", explication: "'Un livre' répond à 'il donne quoi ?' sans préposition : c'est un complément d'objet direct (COD)." },
  { enonce: "Dans 'Elle parle à son ami', quelle est la fonction de 'à son ami' ?", options: ["COD", "Sujet", "COI", "Complément circonstanciel de lieu"], correcte: "COI", explication: "'À son ami' répond à 'elle parle à qui ?' avec la préposition 'à' : c'est un complément d'objet indirect (COI)." },
  { enonce: "Dans 'La musique semble douce', quelle est la fonction de 'douce' ?", options: ["COD", "Épithète liée", "Attribut du sujet", "Complément du nom"], correcte: "Attribut du sujet", explication: "'Douce' est relié au sujet 'la musique' par le verbe d'état 'semble' : c'est un attribut du sujet." },
  { enonce: "Dans 'une belle journée', quelle est la fonction de 'belle' ?", options: ["Attribut du sujet", "COD", "Épithète liée", "Apposé"], correcte: "Épithète liée", explication: "'Belle' qualifie directement 'journée' sans verbe intermédiaire : c'est une épithète liée." },
  { enonce: "Dans 'Léa, élève sérieuse, a réussi son examen', quelle est la fonction de 'élève sérieuse' ?", options: ["Sujet", "COD", "Attribut du sujet", "Apposé"], correcte: "Apposé", explication: "'Élève sérieuse' est encadré de virgules et précise le sujet 'Léa' : c'est un apposé (apposition)." },
  { enonce: "Dans 'Il travaille le soir', quelle est la fonction de 'le soir' ?", options: ["COD", "Sujet", "Complément circonstanciel de temps", "Attribut du sujet"], correcte: "Complément circonstanciel de temps", explication: "'Le soir' répond à 'quand ?' : c'est un complément circonstanciel de temps (CCT)." },
  { enonce: "Dans 'Les enfants jouent dans le jardin', quelle est la fonction de 'dans le jardin' ?", options: ["COI", "Complément circonstanciel de lieu", "Attribut du sujet", "COD"], correcte: "Complément circonstanciel de lieu", explication: "'Dans le jardin' répond à 'où ?' : c'est un complément circonstanciel de lieu (CCL)." },
  { enonce: "Dans 'Marie chante', quelle est la fonction de 'Marie' ?", options: ["COD", "Attribut du sujet", "Sujet", "COI"], correcte: "Sujet", explication: "'Marie' fait l'action de chanter : c'est le sujet du verbe 'chante'. On vérifie : 'Qui est-ce qui chante ? → Marie'." },
];

const BANQUE_F2_N3 = [
  { enonce: "Dans 'Je vois l'homme qui parle', quelle est la nature de 'qui parle' ?", options: ["Proposition subordonnée conjonctive", "Proposition principale", "Proposition subordonnée relative", "Proposition indépendante"], correcte: "Proposition subordonnée relative", explication: "'Qui parle' est introduite par le pronom relatif 'qui' et complète le nom 'l'homme' : c'est une relative." },
  { enonce: "Dans 'Je sais que tu viendras', quelle est la nature de 'que tu viendras' ?", options: ["Proposition subordonnée relative", "Proposition subordonnée conjonctive complétive", "Proposition circonstancielle de cause", "Proposition participiale"], correcte: "Proposition subordonnée conjonctive complétive", explication: "'Que tu viendras' est COD du verbe 'sais' : c'est une proposition subordonnée complétive (introduite par 'que')." },
  { enonce: "Dans 'Parce qu'il pleuvait, nous sommes restés', quelle est la nature de 'Parce qu'il pleuvait' ?", options: ["Proposition principale", "Proposition subordonnée relative", "Proposition subordonnée circonstancielle de cause", "Proposition subordonnée complétive"], correcte: "Proposition subordonnée circonstancielle de cause", explication: "'Parce qu'il pleuvait' exprime la cause (pourquoi ?) de l'action de rester." },
  { enonce: "Quelle est la fonction d'une proposition subordonnée relative ?", options: ["COD du verbe principal", "Complément circonstanciel", "Complément du nom ou du pronom antécédent", "Sujet de la principale"], correcte: "Complément du nom ou du pronom antécédent", explication: "La relative complète un nom ou un pronom (son antécédent) : 'Le film que j'ai vu' — 'que j'ai vu' complète 'film'." },
  { enonce: "Dans 'Bien qu'il fasse froid, il sort sans manteau', quelle valeur a la subordonnée ?", options: ["Cause", "Conséquence", "Concession (opposition)", "But"], correcte: "Concession (opposition)", explication: "'Bien que' introduit une concession : le froid ne l'empêche pas de sortir. C'est une subordonnée circonstancielle d'opposition/concession." },
  { enonce: "Dans 'Il parle si vite qu'on ne le comprend pas', quelle relation logique est exprimée ?", options: ["Cause", "But", "Conséquence", "Condition"], correcte: "Conséquence", explication: "La tournure 'si... que' exprime la conséquence : le fait de parler vite a pour conséquence qu'on ne comprend pas." },
  { enonce: "Dans 'Pour réussir, il faut travailler', quelle est la valeur de 'Pour réussir' ?", options: ["Cause", "But", "Condition", "Conséquence"], correcte: "But", explication: "'Pour + infinitif' exprime le but : on travaille DANS LE BUT de réussir." },
  { enonce: "Quelle est la fonction d'une proposition subordonnée complétive introduite par 'que' ?", options: ["Complément du nom", "COD ou sujet du verbe principal", "Complément circonstanciel de manière", "Attribut du sujet"], correcte: "COD ou sujet du verbe principal", explication: "La complétive est souvent COD (je pense QUE...) ou parfois sujet (QU'il parte me surprend)." },
];

function genF2(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_F2_N1);
  if (niveau === 2) return genFromBank(BANQUE_F2_N2);
  return genFromBank(BANQUE_F2_N3);
}

// ==========================================================================
// F3 — Conjugaison : temps, modes et valeurs
// ==========================================================================

const BANQUE_F3_N1 = [
  { enonce: "Quel temps verbal exprime une action brève et achevée dans un récit au passé ?", options: ["L'imparfait", "Le passé simple", "Le présent", "Le futur antérieur"], correcte: "Le passé simple", explication: "Le passé simple marque une action ponctuelle, délimitée dans le temps : 'Il sortit brusquement.' (récit littéraire)" },
  { enonce: "Quel temps exprime une description, une habitude ou une action en cours dans le passé ?", options: ["Le passé simple", "Le futur simple", "L'imparfait", "Le passé antérieur"], correcte: "L'imparfait", explication: "L'imparfait décrit, donne le contexte ou indique une habitude : 'Chaque soir, elle lisait au coin du feu.'" },
  { enonce: "Quel temps peut exprimer une vérité générale ou universelle (valeur de vérité générale) ?", options: ["Le futur simple", "Le passé simple", "Le présent de l'indicatif", "Le conditionnel"], correcte: "Le présent de l'indicatif", explication: "Le présent à valeur de vérité générale : 'La Terre tourne autour du Soleil.' — toujours vrai." },
  { enonce: "Quel temps exprime une action future certaine ?", options: ["Le conditionnel présent", "Le futur simple", "Le présent", "L'imparfait"], correcte: "Le futur simple", explication: "Le futur simple exprime ce qui se passera plus tard avec certitude : 'Demain, il pleuvra.'" },
  { enonce: "Quel est le mode du verbe dans 'Mange tes légumes !' ?", options: ["L'infinitif", "Le conditionnel", "L'impératif", "Le subjonctif"], correcte: "L'impératif", explication: "L'impératif exprime un ordre, un conseil ou une interdiction. Il n'a pas de sujet exprimé." },
  { enonce: "Quel temps exprime une action ANTÉRIEURE à une autre action passée ?", options: ["L'imparfait", "Le futur antérieur", "Le plus-que-parfait", "Le passé simple"], correcte: "Le plus-que-parfait", explication: "Le plus-que-parfait marque l'antériorité : 'Il avait terminé (avant qu'elle arrive).' — action avant une autre au passé." },
  { enonce: "Quel temps exprime une hypothèse ou un fait imaginaire, non réel ?", options: ["Le futur simple", "Le passé composé", "Le conditionnel présent", "Le présent"], correcte: "Le conditionnel présent", explication: "Le conditionnel exprime une hypothèse : 'Si j'avais de l'argent, j'achèterais une maison.'" },
  { enonce: "Le passé composé est formé de :", options: ["Deux auxiliaires + participe passé", "L'auxiliaire être ou avoir au présent + participe passé", "L'imparfait + infinitif", "Le présent + -ais"], correcte: "L'auxiliaire être ou avoir au présent + participe passé", explication: "Ex : 'j'ai mangé' (avoir + mangé), 'elle est partie' (être + partie). Le choix dépend du verbe." },
];

const BANQUE_F3_N2 = [
  { enonce: "Quelle est la principale valeur de l'imparfait dans un récit littéraire ?", options: ["Action soudaine et terminée", "Description du décor, des personnages, habitude passée", "Ordre ou conseil", "Hypothèse imaginaire"], correcte: "Description du décor, des personnages, habitude passée", explication: "Dans un récit, l'imparfait 'peint' le cadre et les habitudes, pendant que le passé simple fait avancer l'action." },
  { enonce: "Dans 'Il aurait voulu partir, mais il resta', à quel temps est 'aurait voulu' ?", options: ["Conditionnel passé", "Futur antérieur", "Plus-que-parfait", "Passé antérieur"], correcte: "Conditionnel passé", explication: "Auxiliaire 'avoir' au conditionnel + participe passé 'voulu' = conditionnel passé. Il exprime un souhait non réalisé." },
  { enonce: "Quelle construction introduit généralement le subjonctif présent ?", options: ["'Quand' + verbe", "Verbe à l'indicatif seul", "'Il faut que', 'bien que', verbes de volonté ou de doute", "Futur simple"], correcte: "'Il faut que', 'bien que', verbes de volonté ou de doute", explication: "Le subjonctif suit des expressions de nécessité, doute, sentiment, opposition : 'il faut que TU VIENNES'." },
  { enonce: "Dans 'Quand il aura fini, nous partirons', à quel temps est 'aura fini' ?", options: ["Futur simple", "Conditionnel passé", "Futur antérieur", "Plus-que-parfait"], correcte: "Futur antérieur", explication: "Auxiliaire 'avoir' au futur + participe passé = futur antérieur. Il exprime l'antériorité par rapport à une action future." },
  { enonce: "Quelle est la valeur du conditionnel dans 'Selon les témoins, il aurait fui' ?", options: ["Hypothèse sur le futur", "Information non confirmée (conditionnel journalistique)", "Ordre poli", "Regret"], correcte: "Information non confirmée (conditionnel journalistique)", explication: "Le conditionnel journalistique indique que l'information n'est pas certifiée : 'Il aurait fui = on dit qu'il a fui, sans certitude'." },
  { enonce: "Quelle différence d'aspect y a-t-il entre passé simple et passé composé ?", options: ["Le passé composé est réservé à l'écrit, le passé simple à l'oral", "Le passé simple est littéraire et souligne une action passée isolée ; le passé composé relie le passé au présent ou s'emploie à l'oral", "Ils sont strictement interchangeables", "Le passé composé concerne uniquement les verbes d'état"], correcte: "Le passé simple est littéraire et souligne une action passée isolée ; le passé composé relie le passé au présent ou s'emploie à l'oral", explication: "Le passé simple est le temps du récit écrit littéraire. Le passé composé domine dans la conversation et les textes courants." },
  { enonce: "Dans 'Si tu travaillais davantage, tu réussirais', quel système temporel est utilisé ?", options: ["Imparfait + conditionnel présent (hypothèse réalisable)", "Présent + futur simple (certitude)", "Passé simple + futur antérieur", "Subjonctif + conditionnel passé"], correcte: "Imparfait + conditionnel présent (hypothèse réalisable)", explication: "Si + imparfait → conditionnel présent = hypothèse sur le présent/futur, potentiellement réalisable." },
  { enonce: "Quelle est la valeur du présent dans 'César traverse le Rubicon en 49 av. J.-C.' ?", options: ["Valeur d'habitude", "Présent de narration (historique)", "Présent d'ordre", "Vérité générale"], correcte: "Présent de narration (historique)", explication: "Le présent de narration (ou historique) rend les événements passés plus vivants et dynamiques dans un récit." },
];

const BANQUE_F3_N3 = [
  { enonce: "Après 'bien que', quel mode emploie-t-on obligatoirement ?", options: ["L'indicatif", "Le conditionnel", "Le subjonctif", "L'impératif"], correcte: "Le subjonctif", explication: "'Bien que' exprime une opposition/concession et exige le subjonctif : 'Bien qu'il soit fatigué, il continue'." },
  { enonce: "Quelle est la valeur principale du mode subjonctif ?", options: ["Exprimer une action certaine et réelle", "Exprimer l'ordre direct", "Exprimer le doute, la volonté, le sentiment, la nécessité", "Exprimer une action à venir"], correcte: "Exprimer le doute, la volonté, le sentiment, la nécessité", explication: "Le subjonctif suit les verbes de volonté (vouloir que), doute (douter que), sentiment (craindre que) et nécessité (il faut que)." },
  { enonce: "Dans 'Avoir de la chance, c'est ne pas mériter sa réussite', quelle est la valeur de l'infinitif ?", options: ["COD", "Sujet du verbe 'c'est'", "Attribut du sujet", "Complément circonstanciel"], correcte: "Sujet du verbe 'c'est'", explication: "L'infinitif peut fonctionner comme un nom et occuper la fonction de sujet : 'Avoir de la chance' = cela." },
  { enonce: "Quelle est la différence entre 'tu dois partir' et 'tu devrais partir' ?", options: ["Aucune différence de sens", "'Tu dois partir' = obligation réelle ; 'tu devrais partir' = conseil ou obligation atténuée", "'Tu dois partir' est du passé ; 'tu devrais' du présent", "Le conditionnel rend la phrase plus ancienne"], correcte: "'Tu dois partir' = obligation réelle ; 'tu devrais partir' = conseil ou obligation atténuée", explication: "Le conditionnel présent ('devrais') atténue l'obligation et la transforme en conseil, alors que l'indicatif présent ('dois') marque une obligation directe." },
  { enonce: "Dans 'S'il avait travaillé, il aurait réussi', quel système exprime une hypothèse ?", options: ["Plus-que-parfait + conditionnel passé (irréel du passé)", "Imparfait + conditionnel présent", "Passé composé + futur simple", "Subjonctif + conditionnel présent"], correcte: "Plus-que-parfait + conditionnel passé (irréel du passé)", explication: "Si + plus-que-parfait → conditionnel passé = hypothèse dans le passé, non réalisée : il n'a PAS travaillé." },
  { enonce: "Le gérondif est formé de :", options: ["'En' + participe présent", "'À' + infinitif", "Participe passé seul", "Auxiliaire + infinitif"], correcte: "'En' + participe présent", explication: "Ex : 'en mangeant', 'en courant'. Le gérondif exprime la simultanéité ou la manière : 'Il siffle en travaillant'." },
  { enonce: "Quelle est la valeur du participe présent dans 'Croyant bien faire, il s'est trompé' ?", options: ["Il exprime une conséquence", "Il indique la cause de l'action principale", "Il remplace un futur", "Il exprime un ordre"], correcte: "Il indique la cause de l'action principale", explication: "'Croyant bien faire' = parce qu'il croyait bien faire. Le participe présent peut avoir une valeur causale." },
  { enonce: "Quelle construction exprime une hypothèse irréelle sur le présent ?", options: ["Si + présent → futur simple", "Si + imparfait → conditionnel présent", "Si + passé composé → conditionnel passé", "Si + subjonctif → conditionnel"], correcte: "Si + imparfait → conditionnel présent", explication: "'Si j'étais riche, j'achèterais une maison' : l'hypothèse est irréelle dans le présent (je ne suis pas riche)." },
];

function genF3(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_F3_N1);
  if (niveau === 2) return genFromBank(BANQUE_F3_N2);
  return genFromBank(BANQUE_F3_N3);
}

// ==========================================================================
// F4 — Compréhension littéraire : phrases à analyser (figures + sens + registre)
// ==========================================================================

const BANQUE_F4_N1 = [
  { enonce: "Dans 'Le ciel était une mer de flammes au coucher du soleil', quelle figure identifiez-vous ?", options: ["Une comparaison", "Une métaphore", "Une litote", "Une anaphore"], correcte: "Une métaphore", explication: "'Le ciel était une mer de flammes' : le ciel est assimilé à une mer sans outil comparatif — c'est une métaphore." },
  { enonce: "Dans 'Ses mains étaient froides comme la glace', quelle figure est utilisée ?", options: ["Une métaphore", "Une hyperbole", "Une comparaison", "Une personnification"], correcte: "Une comparaison", explication: "'Comme' est l'outil comparatif : 'froides comme la glace' est une comparaison." },
  { enonce: "Dans 'Je t'ai attendu une éternité !', quelle figure est à l'œuvre ?", options: ["Une litote", "Une antithèse", "Une hyperbole", "Une allégorie"], correcte: "Une hyperbole", explication: "Personne n'attend réellement une éternité : 'une éternité' est une hyperbole (exagération expressive)." },
  { enonce: "Dans 'La forêt respirait doucement dans la nuit', quelle figure reconnaît-on ?", options: ["Une métaphore", "Une comparaison", "Une personnification", "Un oxymore"], correcte: "Une personnification", explication: "Une forêt ne 'respire' pas : on lui prête un geste humain — c'est une personnification." },
  { enonce: "Dans 'Il n'est pas mécontent de son travail', que sous-entend l'auteur ?", options: ["Il est très insatisfait", "Il est indifférent", "Il est plutôt satisfait", "Il n'a pas encore jugé"], correcte: "Il est plutôt satisfait", explication: "C'est une litote : dire 'pas mécontent' pour signifier 'satisfait', voire 'très content'." },
  { enonce: "Dans 'Vieux, pauvre et seul, il marchait sous la pluie', quelle figure d'accumulation est utilisée ?", options: ["L'anaphore", "La gradation", "L'énumération / asyndète", "L'ellipse"], correcte: "L'énumération / asyndète", explication: "Trois adjectifs juxtaposés sans conjonction : c'est une énumération (asyndète). L'effet est d'accumuler les malheurs." },
  { enonce: "Dans 'Un silence assourdissant s'abattit sur la salle', quelle figure reconnaît-on ?", options: ["Une antithèse", "Une litote", "Un oxymore", "Une métonymie"], correcte: "Un oxymore", explication: "'Silence' et 'assourdissant' sont contradictoires mais accolés : c'est un oxymore, créant un effet paradoxal intense." },
  { enonce: "Dans 'Partir, c'est mourir un peu' (Edmond Haraucourt), quelle figure est présente ?", options: ["Une hyperbole", "Une comparaison", "Une métaphore", "Une litote"], correcte: "Une métaphore", explication: "'Partir' est assimilé à 'mourir un peu' sans outil comparatif — c'est une métaphore qui évoque la séparation douloureuse." },
];

const BANQUE_F4_N2 = [
  { enonce: "Dans 'Il rendit son dernier soupir entouré des siens', quel procédé linguistique est utilisé ?", options: ["La métaphore", "L'hyperbole", "L'euphémisme", "L'ironie"], correcte: "L'euphémisme", explication: "'Rendre son dernier soupir' est un euphémisme pour 'mourir' : on atténue la brutalité du fait." },
  { enonce: "Dans 'Quelle belle journée !' prononcé sous une tempête de grêle, quelle figure est utilisée ?", options: ["L'hyperbole", "L'ironie", "La litote", "La comparaison"], correcte: "L'ironie", explication: "On dit le contraire de ce qu'on pense pour moquer la situation : c'est de l'ironie." },
  { enonce: "Quel est l'effet produit par la personnification dans 'La mer rugissait de colère' ?", options: ["Atténuer la violence de la mer", "Rendre la mer plus vivante, menaçante, presque humaine", "Comparer la mer à un animal précis", "Montrer que la mer est calme"], correcte: "Rendre la mer plus vivante, menaçante, presque humaine", explication: "La personnification donne à la mer une présence presque humaine et hostile, renforçant l'atmosphère de danger." },
  { enonce: "Dans 'J'ai lu tout Zola cet été', que désigne réellement 'tout Zola' ?", options: ["La vie de Zola", "Toute l'œuvre littéraire de Zola", "Un seul roman de Zola", "La pensée philosophique de Zola"], correcte: "Toute l'œuvre littéraire de Zola", explication: "C'est une métonymie : 'Zola' (l'auteur) désigne 'l'œuvre de Zola'. On désigne la chose par son créateur." },
  { enonce: "Dans 'Elle avait des yeux comme des étoiles et sa voix était du miel', quelles figures sont associées ?", options: ["Deux métaphores", "Une comparaison et une métaphore", "Deux personnifications", "Une antithèse et une litote"], correcte: "Une comparaison et une métaphore", explication: "'Des yeux comme des étoiles' = comparaison (outil 'comme'). 'Sa voix était du miel' = métaphore (sans outil)." },
  { enonce: "Pourquoi l'hyperbole est-elle fréquente dans le langage quotidien ?", options: ["Pour être plus précis", "Pour intensifier l'expression d'une émotion ou d'une situation", "Pour éviter de blesser l'interlocuteur", "Pour imiter le langage littéraire classique"], correcte: "Pour intensifier l'expression d'une émotion ou d'une situation", explication: "'Je meurs de rire', 'j'ai mille choses à faire' : l'hyperbole amplifie pour mieux faire ressentir. Elle est naturelle dans l'expression orale." },
  { enonce: "Quel est l'effet stylistique d'une anaphore dans un texte ?", options: ["Créer la surprise par un mot inattendu", "Marquer une insistance rythmique et émotionnelle", "Opposer deux idées contradictoires", "Atténuer la force d'un propos"], correcte: "Marquer une insistance rythmique et émotionnelle", explication: "La répétition en tête de phrase (anaphore) martèle une idée et crée un effet incantatoire, comme dans les discours de Martin Luther King : 'I have a dream…'." },
  { enonce: "Dans 'La Mort fauchait sans pitié les hommes du bataillon', quelle figure est présente ?", options: ["Une comparaison", "Une hyperbole", "Une personnification et une allégorie", "Une litote"], correcte: "Une personnification et une allégorie", explication: "La Mort (abstraite) est personnifiée en faucheur — c'est aussi une allégorie traditionnelle de la mort représentée comme un être agissant." },
];

const BANQUE_F4_N3 = [
  { enonce: "Quel registre littéraire caractérise un texte exprimant l'enthousiasme guerrier et la grandeur des héros ?", options: ["Le registre lyrique", "Le registre comique", "Le registre épique", "Le registre tragique"], correcte: "Le registre épique", explication: "Le registre épique exalte les exploits héroïques, les combats, la grandeur : Homère, La Chanson de Roland." },
  { enonce: "Quel registre est dominant dans un poème où le 'je' exprime sa mélancolie amoureuse ?", options: ["Le registre épique", "Le registre polémique", "Le registre lyrique", "Le registre didactique"], correcte: "Le registre lyrique", explication: "Le registre lyrique est celui de l'expression des sentiments personnels : amour, nostalgie, deuil — très présent en poésie romantique." },
  { enonce: "Quel registre vise à provoquer le rire par des situations absurdes, des jeux de mots ou des personnages ridicules ?", options: ["Le registre tragique", "Le registre lyrique", "Le registre épique", "Le registre comique"], correcte: "Le registre comique", explication: "Le registre comique cherche à faire rire : Molière, les fables de La Fontaine (avec ironie), les comédies." },
  { enonce: "Quel registre présente des personnages pris dans une fatalité inévitable, souvent menant à leur perte ?", options: ["Le registre lyrique", "Le registre tragique", "Le registre polémique", "Le registre fantastique"], correcte: "Le registre tragique", explication: "Le registre tragique met en scène des héros confrontés à une destinée inexorable : Racine (Phèdre), Sophocle (Antigone)." },
  { enonce: "Quel registre caractérise un texte argumentatif qui attaque avec violence une idée ou une personne ?", options: ["Le registre lyrique", "Le registre épique", "Le registre polémique", "Le registre comique"], correcte: "Le registre polémique", explication: "Le registre polémique est combatif et virulent : pamphlets, discours d'attaque, éditoriaux engagés." },
  { enonce: "Dans un roman policier, quand le narrateur introduit des éléments inexpliqués et inquiétants, quel registre domine ?", options: ["Le registre didactique", "Le registre fantastique", "Le registre comique", "Le registre épique"], correcte: "Le registre fantastique", explication: "Le registre fantastique crée le doute entre naturel et surnaturel, générant angoisse et mystère : Maupassant, Le Horla." },
  { enonce: "Quel registre vise à instruire, expliquer ou démontrer une vérité de manière neutre et pédagogique ?", options: ["Le registre polémique", "Le registre lyrique", "Le registre didactique", "Le registre épique"], correcte: "Le registre didactique", explication: "Le registre didactique transmet un savoir de manière claire et méthodique : encyclopédies, manuels, certains essais." },
  { enonce: "Qu'est-ce qui distingue l'ironie du registre comique ?", options: ["L'ironie est toujours légère et inoffensive", "L'ironie peut être mordante et critique, pas nécessairement comique ; le comique vise avant tout le rire", "Ils sont strictement identiques", "Le comique est littéraire, l'ironie est uniquement orale"], correcte: "L'ironie peut être mordante et critique, pas nécessairement comique ; le comique vise avant tout le rire", explication: "L'ironie sert souvent la critique sociale ou politique (registre polémique ou satirique). Le comique a pour but premier de faire rire." },
];

function genF4(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_F4_N1);
  if (niveau === 2) return genFromBank(BANQUE_F4_N2);
  return genFromBank(BANQUE_F4_N3);
}

// ==========================================================================
// H1 — La Première Guerre mondiale & Civils au front
// ==========================================================================

const BANQUE_H1_N1 = [
  { enonce: "En quelle année éclate la Première Guerre mondiale ?", options: ["1870", "1914", "1918", "1939"], correcte: "1914", explication: "La Première Guerre mondiale débute en juillet-août 1914, après l'assassinat de l'archiduc François-Ferdinand à Sarajevo." },
  { enonce: "En quelle année se termine la Première Guerre mondiale ?", options: ["1916", "1917", "1918", "1920"], correcte: "1918", explication: "L'armistice est signé le 11 novembre 1918 à 11h dans un wagon à Rethondes, mettant fin aux combats." },
  { enonce: "En quelle année s'est déroulée la bataille de Verdun ?", options: ["1914", "1915", "1916", "1917"], correcte: "1916", explication: "La bataille de Verdun (février-décembre 1916) est l'un des combats les plus meurtriers : près de 700 000 morts et blessés." },
  { enonce: "Quel terme désigne les tranchées creusées pendant la Grande Guerre pour protéger les soldats ?", options: ["Les abris", "La guerre de position", "La guerre des tranchées", "Le no man's land"], correcte: "La guerre des tranchées", explication: "La guerre des tranchées (ou guerre de position) caractérise le front occidental : les soldats vivent et combattent dans des tranchées creusées dans la terre." },
  { enonce: "Quel pays quitte la guerre en 1917 après une révolution interne ?", options: ["L'Autriche-Hongrie", "L'Empire ottoman", "La Russie", "La Bulgarie"], correcte: "La Russie", explication: "La révolution bolchevique d'octobre 1917 amène Lénine au pouvoir, qui signe la paix avec l'Allemagne (traité de Brest-Litovsk, 1918)." },
  { enonce: "Quel pays entre en guerre aux côtés des Alliés en 1917, renforçant decisivément le camp de la France et du Royaume-Uni ?", options: ["L'Espagne", "Les États-Unis", "La Suisse", "Le Japon"], correcte: "Les États-Unis", explication: "Après des années de neutralité, les États-Unis entrent en guerre en avril 1917, notamment après la guerre sous-marine à outrance allemande." },
  { enonce: "Comment appelle-t-on la zone dévastée et sans vie située entre les deux camps de tranchées ?", options: ["La zone rouge", "Le no man's land", "Le champ de mines", "La tranchée avancée"], correcte: "Le no man's land", explication: "Le no man's land est l'espace infranchissable entre les deux lignes de tranchées, criblé d'obus, de barbelés et de cadavres." },
  { enonce: "Quel traité met officiellement fin à la Première Guerre mondiale en 1919 ?", options: ["Le traité de Brest-Litovsk", "Le traité de Versailles", "Le traité de Francfort", "Les accords de Genève"], correcte: "Le traité de Versailles", explication: "Le traité de Versailles (28 juin 1919) impose à l'Allemagne des réparations, des pertes territoriales et la clause de 'culpabilité de guerre'." },
];

const BANQUE_H1_N2 = [
  { enonce: "Quel peuple subit un génocide dans l'Empire ottoman pendant la Première Guerre mondiale ?", options: ["Les Kurdes", "Les Grecs", "Les Arméniens", "Les Slaves"], correcte: "Les Arméniens", explication: "Entre 1915 et 1916, l'Empire ottoman organise le massacre et la déportation des Arméniens : c'est le premier génocide du XXe siècle (800 000 à 1,5 million de morts)." },
  { enonce: "Comment appelle-t-on les soldats qui refusent de combattre et sont fusillés pour l'exemple ?", options: ["Les mutins", "Les déserteurs", "Les embusqués", "Les réformés"], correcte: "Les mutins", explication: "En 1917, des mutineries éclatent dans l'armée française. Des soldats refusent de monter en ligne. Certains mutins sont fusillés pour l'exemple afin de rétablir la discipline." },
  { enonce: "Qu'est-ce que l'Union sacrée, proclamée en France en août 1914 ?", options: ["Une alliance militaire avec le Royaume-Uni", "L'union de tous les partis politiques français derrière le gouvernement pour l'effort de guerre", "Un traité de paix", "Un groupement de résistance civile"], correcte: "L'union de tous les partis politiques français derrière le gouvernement pour l'effort de guerre", explication: "L'Union sacrée (1914) suspend les conflits politiques intérieurs : socialistes, républicains et conservateurs s'unissent pour défendre la France." },
  { enonce: "Quel rôle jouent les femmes dans la société française pendant la Grande Guerre ?", options: ["Elles restent exclusivement au foyer", "Elles remplacent les hommes dans les usines, les transports et les champs", "Elles n'ont aucun rôle particulier", "Elles sont mobilisées comme soldates"], correcte: "Elles remplacent les hommes dans les usines, les transports et les champs", explication: "Les femmes deviennent indispensables à l'arrière : usines d'armement, agriculture, transports, soins aux blessés — c'est une transformation sociale majeure." },
  { enonce: "Qu'est-ce qu'un 'poilu' ?", options: ["Un officier de haut rang", "Un soldat français de la Première Guerre mondiale", "Un espion infiltré dans les tranchées", "Un ouvrier des usines d'armement"], correcte: "Un soldat français de la Première Guerre mondiale", explication: "'Poilu' est le surnom populaire donné aux soldats français de la Grande Guerre, qui vivaient plusieurs semaines en tranchée sans pouvoir se raser." },
  { enonce: "Qui prend le pouvoir en Russie lors de la révolution d'octobre 1917 ?", options: ["Le Tsar Nicolas II", "Trotsky seul", "Lénine et les Bolcheviks", "Le gouvernement républicain provisoire"], correcte: "Lénine et les Bolcheviks", explication: "La révolution d'octobre 1917 (nouveau style) amène les Bolcheviks (communistes) au pouvoir en Russie, sous la direction de Lénine." },
  { enonce: "Qu'est-ce que le 'bourrage de crâne' pendant la Première Guerre mondiale ?", options: ["Une technique de combat rapproché", "La propagande diffusée dans la presse pour maintenir le moral et cacher la réalité des tranchées", "L'entraînement militaire intensif", "La censure des lettres des soldats"], correcte: "La propagande diffusée dans la presse pour maintenir le moral et cacher la réalité des tranchées", explication: "Le 'bourrage de crâne' désigne la propagande de guerre : les journaux présentaient la guerre de manière héroïque et cachaient les défaites et conditions réelles." },
  { enonce: "Pourquoi parle-t-on de 'guerre totale' pour la Première Guerre mondiale ?", options: ["Car elle se déroule sur tous les continents", "Car toute la société est mobilisée : soldats, civils, économie, industrie", "Car elle dure en tout 10 ans", "Car les armes chimiques y sont massives"], correcte: "Car toute la société est mobilisée : soldats, civils, économie, industrie", explication: "La 'guerre totale' mobilise l'ensemble de la nation : l'économie est reconvertie, les civils contribuent, les femmes travaillent — la frontière arrière/front s'efface." },
];

const BANQUE_H1_N3 = [
  { enonce: "Quel empire disparaît à la suite de la Première Guerre mondiale, dont l'Empire austro-hongrois ?", options: ["Les empires coloniaux français et britannique", "Les empires allemand, austro-hongrois, ottoman et russe", "L'empire japonais et l'empire américain", "Uniquement l'Empire ottoman"], correcte: "Les empires allemand, austro-hongrois, ottoman et russe", explication: "La guerre précipite l'effondrement des quatre grands empires : allemand (Guillaume II abdique), austro-hongrois (éclaté en États), ottoman et russe (révolution)." },
  { enonce: "Quelle clause du traité de Versailles impose à l'Allemagne la responsabilité de la guerre ?", options: ["La clause de démilitarisation", "L'article 231 (clause de culpabilité)", "Le droit à l'autodétermination des peuples", "La clause de reddition sans conditions"], correcte: "L'article 231 (clause de culpabilité)", explication: "L'article 231 du traité de Versailles impose à l'Allemagne d'accepter la responsabilité de la guerre, justifiant ainsi les réparations exigées." },
  { enonce: "Quel bilan humain approximatif est attribué à la Première Guerre mondiale ?", options: ["500 000 morts en tout", "5 millions de morts militaires en France seulement", "Environ 10 millions de soldats morts et autant de civils en Europe", "2 millions de morts en Europe"], correcte: "Environ 10 millions de soldats morts et autant de civils en Europe", explication: "La Grande Guerre a fait environ 10 millions de militaires morts et des millions de civils victimes (famine, maladies, dont la grippe espagnole en 1918)." },
  { enonce: "Comment s'appelle la conférence internationale où sont définis les termes de paix après la guerre ?", options: ["Le congrès de Vienne", "La conférence de la paix de Paris (1919-1920)", "Le sommet de Genève", "La conférence de Yalta"], correcte: "La conférence de la paix de Paris (1919-1920)", explication: "La conférence de Paris (1919) réunit les vainqueurs pour redessiner la carte de l'Europe et imposer les conditions de paix aux vaincus (traités de Versailles, Saint-Germain, etc.)." },
  { enonce: "Qu'est-ce que la SDN, créée après la guerre ?", options: ["Un syndicat international d'armement", "La Société des Nations, première organisation internationale visant à maintenir la paix", "Une alliance militaire franco-britannique", "Un tribunal international pour juger les crimes de guerre"], correcte: "La Société des Nations, première organisation internationale visant à maintenir la paix", explication: "La SDN (Société des Nations), proposée par Wilson, est fondée en 1920 pour prévenir les futurs conflits. Elle échoue face à la montée des totalitarismes dans les années 1930." },
  { enonce: "Pourquoi la Grande Guerre est-elle qualifiée de 'guerre industrielle' ?", options: ["Car elle est financée par les banques", "Car les usines font des bénéfices records", "Car les armes sont fabriquées en série et l'industrie est au cœur du conflit", "Car elle commence dans une ville industrielle"], correcte: "Car les armes sont fabriquées en série et l'industrie est au cœur du conflit", explication: "Obus, gaz, chars, avions, mitrailleuses : la guerre industrielle repose sur la capacité de production. L'arrière (usines) est aussi vital que le front." },
  { enonce: "Quelle arme nouvelle et interdite par la suite est utilisée pour la première fois massivement pendant la PGM ?", options: ["La bombe atomique", "Les gaz de combat (chlore, ypérite)", "Les missiles balistiques", "Les sous-marins nucléaires"], correcte: "Les gaz de combat (chlore, ypérite)", explication: "Les Allemands utilisent le chlore en avril 1915 à Ypres. L'ypérite (gaz moutarde) apparaît en 1917. Ces armes chimiques causent des souffrances terribles et sont interdites en 1925." },
];

function genH1(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_H1_N1);
  if (niveau === 2) return genFromBank(BANQUE_H1_N2);
  return genFromBank(BANQUE_H1_N3);
}

// ==========================================================================
// H2 — Les régimes totalitaires des années 1930
// ==========================================================================

const BANQUE_H2_N1 = [
  { enonce: "Quel chef d'État dirige l'URSS à partir de la fin des années 1920 ?", options: ["Lénine", "Trotsky", "Staline", "Khrouchtchev"], correcte: "Staline", explication: "Staline prend le contrôle de l'URSS après la mort de Lénine (1924) et impose une dictature totalitaire jusqu'en 1953." },
  { enonce: "Comment appelle-t-on les camps de travail forcé en URSS sous Staline ?", options: ["Les Stalags", "Les Ghettos", "Le Goulag", "Les Kolkhozes"], correcte: "Le Goulag", explication: "Le Goulag (Glavnoye Upravleniye Lagerei) est le réseau de camps de travail forcé soviétique où des millions de personnes sont envoyées et meurent." },
  { enonce: "En quelle année Hitler arrive-t-il légalement au pouvoir en Allemagne ?", options: ["1919", "1929", "1933", "1939"], correcte: "1933", explication: "Le 30 janvier 1933, le président Hindenburg nomme Adolf Hitler chancelier de la République de Weimar, dans un cadre légal. Hitler transforme ensuite le régime en dictature." },
  { enonce: "Comment appelle-t-on le régime instauré par Hitler en Allemagne ?", options: ["Le fascisme", "Le nazisme (national-socialisme)", "Le stalinisme", "L'autoritarisme conservateur"], correcte: "Le nazisme (national-socialisme)", explication: "Le nazisme (NSDAP = Parti national-socialiste des travailleurs allemands) est le régime totalitaire d'Hitler, fondé sur le racisme, l'antisémitisme et l'expansion territoriale." },
  { enonce: "Qui dirige l'Italie fasciste à partir des années 1920 ?", options: ["Hitler", "Franco", "Mussolini", "Pétain"], correcte: "Mussolini", explication: "Benito Mussolini, fondateur du fascisme, prend le pouvoir en Italie en 1922 (Marche sur Rome) et instaure une dictature jusqu'en 1943." },
  { enonce: "Comment appelle-t-on la police secrète nazie, redoutée pour ses arrestations et ses tortures ?", options: ["La NKVD", "La Gestapo", "La SS seule", "La Wehrmacht"], correcte: "La Gestapo", explication: "La Gestapo (Geheime Staatspolizei) est la police secrète du régime nazi, chargée de traquer et éliminer les opposants, Juifs et résistants." },
  { enonce: "Comment appelle-t-on le système de collectivisation des terres en URSS sous Staline ?", options: ["Les Koulaks", "Les Kolkhozes", "Les Goulags", "Les Soviets"], correcte: "Les Kolkhozes", explication: "Les kolkhozes sont des fermes collectives où l'État réquisitionne les terres des paysans. La résistance des koulaks (paysans aisés) est réprimée violemment." },
  { enonce: "Qu'est-ce que la propagande dans un régime totalitaire ?", options: ["La liberté de la presse garantie par l'État", "Un ensemble de techniques pour contrôler l'information et formater les esprits au service du régime", "Un parti politique d'opposition autorisé", "Un tribunal indépendant"], correcte: "Un ensemble de techniques pour contrôler l'information et formater les esprits au service du régime", explication: "Affiches, radio, cinéma, école : tous les médias sont utilisés pour glorifier le chef et le régime, et effacer toute opinion divergente." },
];

const BANQUE_H2_N2 = [
  { enonce: "Quels sont les trois traits communs aux régimes totalitaires des années 1930 ?", options: ["Multipartisme, liberté de la presse, élections libres", "Parti unique, culte du chef, terreur et propagande omniprésentes", "Constitution écrite, séparation des pouvoirs, droits de l'homme", "Alliance militaire, expansion coloniale, libre-échange"], correcte: "Parti unique, culte du chef, terreur et propagande omniprésentes", explication: "Tous les totalitarismes partagent : un parti unique qui contrôle tout, un chef adoré (Führer, Duce, Staline), une terreur policière et une propagande permanente." },
  { enonce: "Qu'est-ce que la 'nuit de Cristal' (Kristallnacht) en novembre 1938 ?", options: ["Un accord international sur les armes chimiques", "Un pogrom organisé contre les Juifs en Allemagne et Autriche (synagogues brûlées, magasins détruits)", "La prise du pouvoir par Hitler", "Une purge interne au parti nazi"], correcte: "Un pogrom organisé contre les Juifs en Allemagne et Autriche (synagogues brûlées, magasins détruits)", explication: "Dans la nuit du 9 au 10 novembre 1938, les SA brisent les vitrines de magasins juifs, brûlent des synagogues et arrêtent des milliers de Juifs : c'est une étape clé vers la Shoah." },
  { enonce: "Qu'est-ce que la 'Grande Terreur' en URSS (1936-1938) ?", options: ["Une guerre civile entre Staline et ses rivaux", "Des purges massives : procès truqués, exécutions et déportations de millions de Soviétiques", "Une famine provoquée par la désorganisation des kolkhozes", "Une série de grèves ouvrières réprimées"], correcte: "Des purges massives : procès truqués, exécutions et déportations de millions de Soviétiques", explication: "Les 'Grandes Purges' ou Grande Terreur (1936-1938) visent les opposants réels ou supposés, y compris les généraux de l'armée rouge et les anciens compagnons de Lénine." },
  { enonce: "Quels Jeux Olympiques servent de vitrine de propagande au régime nazi ?", options: ["Les JO de Paris 1924", "Les JO de Berlin 1936", "Les JO de Rome 1932", "Les JO de Los Angeles 1932"], correcte: "Les JO de Berlin 1936", explication: "Les Jeux Olympiques de Berlin (1936) sont utilisés par Hitler pour montrer la 'supériorité' allemande au monde. L'athlète noir américain Jesse Owens y remporte 4 médailles d'or, démentant la théorie raciale nazie." },
  { enonce: "Qu'est-ce que le 'lebensraum' ('espace vital') dans l'idéologie nazie ?", options: ["Un programme de protection de la nature", "L'idée que l'Allemagne doit conquérir des territoires à l'Est pour s'étendre", "La politique sociale d'aide aux familles nombreuses", "La création de colonies en Afrique"], correcte: "L'idée que l'Allemagne doit conquérir des territoires à l'Est pour s'étendre", explication: "Le Lebensraum est un concept central du nazisme : Hitler veut conquérir l'Europe de l'Est (URSS, Pologne) pour y installer les Allemands et éliminer les populations slaves." },
  { enonce: "Comment s'appelle l'idéologie politique de Mussolini en Italie ?", options: ["Le nazisme", "Le bolchevisme", "Le fascisme", "Le conservatisme"], correcte: "Le fascisme", explication: "Le fascisme (du latin 'fasces', faisceau de licteur) est né en Italie avec Mussolini. Il valorise nation, violence, chef charismatique et s'oppose au marxisme comme au libéralisme." },
  { enonce: "Qu'est-ce que le 'Mein Kampf' ('Mon Combat') d'Hitler ?", options: ["Le traité de paix signé après la WW1", "Le livre écrit par Hitler en prison, exposant son idéologie raciste et ses projets", "La constitution du IIIe Reich", "Un manuel de propagande officiel du parti nazi"], correcte: "Le livre écrit par Hitler en prison, exposant son idéologie raciste et ses projets", explication: "'Mein Kampf' (1925) est rédigé par Hitler pendant son emprisonnement après le putsch raté de Munich (1923). Il y expose l'antisémitisme, le lebensraum et la supériorité aryenne." },
];

const BANQUE_H2_N3 = [
  { enonce: "Qu'est-ce qui distingue un régime autoritaire d'un régime totalitaire ?", options: ["Le totalitarisme s'arrête à la vie politique ; l'autoritarisme contrôle tous les aspects de la société", "Le régime autoritaire contrôle uniquement le politique, sans chercher à transformer toute la société ; le totalitarisme veut contrôler TOUT (privé, famille, art, sport, pensée)", "Ce sont des synonymes exacts", "L'autoritarisme interdit les élections, le totalitarisme les maintient"], correcte: "Le régime autoritaire contrôle uniquement le politique, sans chercher à transformer toute la société ; le totalitarisme veut contrôler TOUT (privé, famille, art, sport, pensée)", explication: "Un régime autoritaire (ex. Franco) supprime les libertés politiques mais laisse des espaces privés. Le totalitarisme (nazisme, stalinisme) vise à contrôler la totalité de la vie humaine." },
  { enonce: "Quel événement déclenche la marche vers la guerre en Europe dans les années 1930 ?", options: ["La création de la SDN", "Les politiques d'apaisement face aux expansions nazies (annexion Autriche 1938, Sudètes 1938)", "La révolution russe de 1917", "L'entrée en vigueur du traité de Versailles"], correcte: "Les politiques d'apaisement face aux expansions nazies (annexion Autriche 1938, Sudètes 1938)", explication: "Les démocraties (France, Royaume-Uni) pratiquent l'apaisement : aux accords de Munich (1938), elles cèdent les Sudètes à Hitler pour éviter la guerre. Cela ne fait qu'encourager ses ambitions." },
  { enonce: "Comment se nomme la doctrine raciste qui est au cœur de l'idéologie nazie ?", options: ["Le darwinisme social appliqué à tous", "L'antisémitisme et la théorie de la race aryenne supérieure", "Le nationalisme pan-européen", "La théorie du complot judéo-bolchevique seule"], correcte: "L'antisémitisme et la théorie de la race aryenne supérieure", explication: "Le nazisme repose sur l'idée d'une 'race aryenne' supérieure et désigne les Juifs, Tziganes, Slaves et handicapés comme des 'races inférieures' à éliminer ou réduire en esclavage." },
  { enonce: "Quelles lois de 1935 excluent les Juifs de la citoyenneté allemande ?", options: ["Les lois de Nuremberg", "Les décrets de Kristallnacht", "Le Reichstag Ermächtigungsgesetz", "Les lois de Weimar"], correcte: "Les lois de Nuremberg", explication: "Les lois de Nuremberg (1935) retirent la citoyenneté aux Juifs allemands, leur interdisent les mariages avec des non-Juifs et les excluent de nombreuses professions." },
  { enonce: "Quel pacte de non-agression est signé en 1939 entre l'Allemagne nazie et l'URSS, qui stupéfie le monde ?", options: ["Le pacte de l'Axe", "Le pacte Briand-Kellogg", "Le pacte germano-soviétique (pacte Molotov-Ribbentrop)", "Le traité de Rapallo"], correcte: "Le pacte germano-soviétique (pacte Molotov-Ribbentrop)", explication: "Le pacte Molotov-Ribbentrop (août 1939) engage l'Allemagne et l'URSS à ne pas s'attaquer. Il contient des clauses secrètes de partage de l'Europe de l'Est. Il est brisé en juin 1941 quand Hitler envahit l'URSS." },
  { enonce: "Pourquoi la crise de 1929 favorise-t-elle la montée des régimes totalitaires ?", options: ["Elle enrichit les classes moyennes qui soutiennent alors les partis extrêmes", "La misère économique et le chômage de masse poussent des populations désespérées vers des partis promettant ordre et grandeur nationale", "Elle renforce les démocraties par la solidarité", "Elle est sans lien avec la montée du nazisme ou du fascisme"], correcte: "La misère économique et le chômage de masse poussent des populations désespérées vers des partis promettant ordre et grandeur nationale", explication: "La Grande Dépression (après 1929) ruine les classes moyennes et crée des millions de chômeurs en Allemagne : Hitler promet travail, ordre et revanche nationale — et gagne des millions d'électeurs." },
];

function genH2(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_H2_N1);
  if (niveau === 2) return genFromBank(BANQUE_H2_N2);
  return genFromBank(BANQUE_H2_N3);
}

// ==========================================================================
// H3 — Seconde Guerre mondiale : France, Occupation, Résistance, Shoah
// ==========================================================================

const BANQUE_H3_N1 = [
  { enonce: "Qui dirige le régime de Vichy à partir de juillet 1940 ?", options: ["Charles de Gaulle", "Pierre Laval", "Philippe Pétain", "Jean Moulin"], correcte: "Philippe Pétain", explication: "Le maréchal Philippe Pétain, héros de Verdun, prend la tête de l'État français (régime de Vichy) après l'armistice et la défaite de juin 1940." },
  { enonce: "Quelle date correspond à l'Appel du 18 juin, lancé par le général de Gaulle depuis Londres ?", options: ["14 juin 1940", "18 juin 1940", "6 juin 1944", "8 mai 1945"], correcte: "18 juin 1940", explication: "Le 18 juin 1940, depuis la BBC à Londres, de Gaulle appelle les Français à refuser la défaite et à continuer le combat. C'est l'acte fondateur de la France Libre." },
  { enonce: "Que désigne le terme 'Shoah' ?", options: ["La bataille de Stalingrad", "Le débarquement en Normandie", "L'extermination systématique des Juifs d'Europe par les nazis", "La déportation des seuls résistants"], correcte: "L'extermination systématique des Juifs d'Europe par les nazis", explication: "La Shoah ('catastrophe' en hébreu) désigne le génocide des Juifs orchestré par les nazis : environ 6 millions de Juifs sont assassinés entre 1941 et 1945." },
  { enonce: "Quelle est la date du débarquement allié en Normandie ?", options: ["8 novembre 1942", "6 juin 1944", "8 mai 1945", "2 septembre 1945"], correcte: "6 juin 1944", explication: "Le 6 juin 1944 (D-Day), les Alliés débarquent en Normandie sur cinq plages (Utah, Omaha, Gold, Juno, Sword) : c'est le début de la Libération de la France." },
  { enonce: "En quelle année la France est-elle envahie par l'Allemagne nazie et signe-t-elle l'armistice ?", options: ["1939", "1940", "1942", "1944"], correcte: "1940", explication: "L'Allemagne envahit la France en mai 1940 et la bat en 6 semaines. L'armistice est signé le 22 juin 1940 à Rethondes, divisant la France en zone occupée et zone libre." },
  { enonce: "Qui est Jean Moulin ?", options: ["Le chef du gouvernement de Vichy", "Le général qui commande les troupes alliées", "Le résistant chargé par de Gaulle d'unifier la Résistance intérieure française", "L'ambassadeur de France à Londres"], correcte: "Le résistant chargé par de Gaulle d'unifier la Résistance intérieure française", explication: "Jean Moulin, envoyé par de Gaulle, réunit les mouvements de résistance au Conseil National de la Résistance (CNR, 1943). Il est arrêté, torturé et meurt en déportation en 1943." },
  { enonce: "Comment appelle-t-on la politique de collaboration du régime de Vichy avec l'Allemagne nazie ?", options: ["La résistance passive", "La collaboration", "La neutralité", "L'armistice perpétuel"], correcte: "La collaboration", explication: "La collaboration est la politique du régime de Vichy, qui coopère avec l'occupant nazi : livraison de Juifs, travailleurs forcés (STO), répression des résistants." },
  { enonce: "Quelle ville allemande donne son nom aux lois raciales anti-juives de 1935 ?", options: ["Berlin", "Munich", "Nuremberg", "Hambourg"], correcte: "Nuremberg", explication: "Les lois de Nuremberg (1935) privent les Juifs de citoyenneté allemande et interdisent les mariages mixtes. Cette ville accueillera aussi les procès des criminels nazis en 1945-46." },
];

const BANQUE_H3_N2 = [
  { enonce: "Qu'est-ce que la 'Solution finale' décidée lors de la conférence de Wannsee (1942) ?", options: ["La capitulation de l'Allemagne", "L'organisation systématique et industrielle de l'extermination de tous les Juifs d'Europe", "La déportation des prisonniers de guerre alliés", "Un plan de paix séparée avec l'URSS"], correcte: "L'organisation systématique et industrielle de l'extermination de tous les Juifs d'Europe", explication: "La conférence de Wannsee (janvier 1942) est une réunion de hauts responsables nazis qui planifient la 'Solution finale' : l'extermination industrielle de tous les Juifs (centres de mise à mort, chambres à gaz)." },
  { enonce: "Quel rôle joue la police française sous Vichy dans la déportation des Juifs ?", options: ["Elle refuse systématiquement d'exécuter les ordres nazis", "Elle participe activement aux rafles, comme la rafle du Vél d'Hiv (juillet 1942)", "Elle protège les Juifs en secret", "Elle n'a aucun rôle dans ces événements"], correcte: "Elle participe activement aux rafles, comme la rafle du Vél d'Hiv (juillet 1942)", explication: "La rafle du Vél d'Hiv (16-17 juillet 1942) est organisée par la police française : 13 000 Juifs (dont 4 000 enfants) sont arrêtés à Paris et déportés vers les camps d'extermination." },
  { enonce: "Comment appelle-t-on les personnes qui ont risqué leur vie pour cacher et sauver des Juifs pendant la Shoah ?", options: ["Les résistants armés", "Les collaborateurs", "Les 'Justes parmi les nations'", "Les exilés"], correcte: "Les 'Justes parmi les nations'", explication: "Yad Vashem (mémorial israélien) décerne le titre de 'Juste parmi les nations' aux non-Juifs qui ont sauvé des Juifs au péril de leur vie. Certains Français, comme Oskar Schindler en Allemagne, sont honorés." },
  { enonce: "Qu'est-ce que le STO (Service du Travail Obligatoire) instauré par Vichy ?", options: ["Un programme de formation professionnelle", "L'envoi forcé de travailleurs français en Allemagne pour les usines de guerre", "Un service civil volontaire", "La mobilisation des femmes dans les usines françaises"], correcte: "L'envoi forcé de travailleurs français en Allemagne pour les usines de guerre", explication: "Le STO (1943) réquisitionne des centaines de milliers de Français pour travailler dans les usines allemandes. Beaucoup refusent et rejoignent le maquis." },
  { enonce: "Quand et où la capitulation de l'Allemagne est-elle signée, mettant fin à la guerre en Europe ?", options: ["6 juin 1944 à Paris", "8 mai 1945 à Reims (puis Berlin)", "2 septembre 1945 à Tokyo", "25 avril 1945 à Milan"], correcte: "8 mai 1945 à Reims (puis Berlin)", explication: "Le 8 mai 1945, l'Allemagne nazie signe sa capitulation sans conditions à Reims, puis à Berlin. C'est le V-E Day (Victory in Europe Day), célébré comme fête nationale en France." },
  { enonce: "Qu'est-ce qu'un camp d'extermination (distinct d'un camp de concentration) ?", options: ["Un camp de prisonniers de guerre", "Un camp dont la fonction principale est de tuer immédiatement les déportés (chambres à gaz)", "Un camp où les détenus travaillent jusqu'à l'épuisement", "Un centre de rééducation idéologique"], correcte: "Un camp dont la fonction principale est de tuer immédiatement les déportés (chambres à gaz)", explication: "Auschwitz-Birkenau, Treblinka, Sobibor, Belzec sont des centres de mise à mort : les Juifs y arrivent et sont gazés en quelques heures. Ils diffèrent des camps de concentration (travail forcé)." },
  { enonce: "Comment appelle-t-on les résistants qui se cachent en forêt ou en zone rurale pour combattre l'occupant ?", options: ["Les partisans urbains", "Les maquisards", "Les FFI (Forces françaises de l'intérieur) seulement", "Les STO"], correcte: "Les maquisards", explication: "Les 'maquisards' (du mot 'maquis', végétation dense) fuient le STO et s'organisent en groupes armés dans les campagnes, les forêts et les montagnes pour combattre l'occupant." },
];

const BANQUE_H3_N3 = [
  { enonce: "Qu'est-ce que le Conseil National de la Résistance (CNR) créé en 1943 ?", options: ["Le gouvernement de Vichy en exil", "L'organe unifié de la Résistance intérieure, réunissant tous les mouvements sous l'autorité de de Gaulle", "Un tribunal militaire secret", "Une alliance diplomatique franco-britannique"], correcte: "L'organe unifié de la Résistance intérieure, réunissant tous les mouvements sous l'autorité de de Gaulle", explication: "Jean Moulin réunit le 27 mai 1943 les représentants de tous les mouvements de résistance au CNR, reconnaissant l'autorité du général de Gaulle (France Libre à Londres)." },
  { enonce: "Quels procès jugent les principaux criminels de guerre nazis après 1945 ?", options: ["Le tribunal de La Haye", "Les procès de Nuremberg (1945-1946)", "Le tribunal de Genève", "Les tribunaux de Tokyo uniquement"], correcte: "Les procès de Nuremberg (1945-1946)", explication: "Les procès de Nuremberg (1945-46) sont les premiers grands procès pour crimes contre la paix, crimes de guerre et crimes contre l'humanité. 12 dirigeants nazis sont condamnés à mort." },
  { enonce: "Pourquoi parle-t-on de 'résistance civile' aux côtés de la résistance armée ?", options: ["Car la résistance civile est uniquement féminine", "Car des civils aident la résistance en hébergeant, fabriquant de faux papiers, imprimant des journaux clandestins", "Car les civils remplacent les armées", "Car la résistance civile remplace totalement la résistance armée"], correcte: "Car des civils aident la résistance en hébergeant, fabriquant de faux papiers, imprimant des journaux clandestins", explication: "La résistance civile englobe toutes les formes non armées d'opposition : presse clandestine, filières d'évasion, fabrication de faux papiers, hébergement de clandestins." },
  { enonce: "Que signifie le terme 'génocide' tel qu'il est défini après la Shoah ?", options: ["Un massacre de soldats pendant la guerre", "L'extermination intentionnelle et systématique d'un groupe humain en raison de son identité (nationale, ethnique, religieuse)", "Une épidémie liée à la guerre", "L'expulsion forcée d'une population de son territoire"], correcte: "L'extermination intentionnelle et systématique d'un groupe humain en raison de son identité (nationale, ethnique, religieuse)", explication: "Le terme 'génocide' est créé par Raphael Lemkin en 1944 et codifié par la convention de l'ONU de 1948 pour désigner la destruction délibérée d'un groupe humain." },
  { enonce: "Quelle déclaration internationale, adoptée en 1948, est directement inspirée des horreurs de la Seconde Guerre mondiale ?", options: ["La charte de l'ONU (1945)", "La Déclaration Universelle des Droits de l'Homme (DUDH, 1948)", "Le traité de Versailles", "La SDN"], correcte: "La Déclaration Universelle des Droits de l'Homme (DUDH, 1948)", explication: "La DUDH (10 décembre 1948) est adoptée par l'ONU en réponse aux crimes nazis : elle proclame des droits fondamentaux inaliénables pour tous les êtres humains." },
  { enonce: "Comment Jacques Chirac reconnaît-il en 1995 la responsabilité de la France dans la déportation des Juifs ?", options: ["Par une loi d'amnistie", "Par un discours reconnaissant la responsabilité de l'État français dans la rafle du Vél d'Hiv et les déportations", "Par le versement de réparations aux survivants", "En refusant de commémorer ces événements"], correcte: "Par un discours reconnaissant la responsabilité de l'État français dans la rafle du Vél d'Hiv et les déportations", explication: "Le 16 juillet 1995, Jacques Chirac prononce un discours historique reconnaissant que la France — et non seulement les nazis — porte une responsabilité dans la Shoah commise sur son sol." },
];

function genH3(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_H3_N1);
  if (niveau === 2) return genFromBank(BANQUE_H3_N2);
  return genFromBank(BANQUE_H3_N3);
}

// ==========================================================================
// H4 — La France depuis 1945 : Ve République et décolonisation
// ==========================================================================

const BANQUE_H4_N1 = [
  { enonce: "En quelle année est fondée la Ve République ?", options: ["1945", "1952", "1958", "1962"], correcte: "1958", explication: "La Ve République est fondée en 1958 : de Gaulle revient au pouvoir suite à la crise algérienne et une nouvelle constitution est approuvée par référendum." },
  { enonce: "Qui est le fondateur et premier président de la Ve République ?", options: ["Georges Pompidou", "François Mitterrand", "Charles de Gaulle", "Valéry Giscard d'Estaing"], correcte: "Charles de Gaulle", explication: "Charles de Gaulle, héros de la Résistance, fonde la Ve République et en est le premier président de 1959 à 1969." },
  { enonce: "Depuis quelle date le président de la République française est-il élu au suffrage universel direct ?", options: ["1945", "1958", "1962", "1974"], correcte: "1962", explication: "En 1962, de Gaulle fait adopter par référendum l'élection du président au suffrage universel direct (auparavant élu par le Parlement et grands électeurs)." },
  { enonce: "Quels accords mettent fin à la guerre d'Algérie en 1962 ?", options: ["Les accords de Genève", "Les accords d'Évian", "Le traité de Versailles", "Les accords de Munich"], correcte: "Les accords d'Évian", explication: "Les accords d'Évian (18 mars 1962) mettent fin à la guerre d'Algérie et accordent l'indépendance à l'Algérie après 8 ans de conflit (1954-1962)." },
  { enonce: "Quel mouvement de révolte sociale et étudiante secoue la France en 1968 ?", options: ["La Commune de Paris", "Le Front Populaire", "Mai 68", "La Résistance"], correcte: "Mai 68", explication: "Mai 68 est un mouvement étudiant et ouvrier qui paralyse la France : grèves générales, occupations d'usines et de facultés. C'est une crise sociale et culturelle majeure." },
  { enonce: "Quel président français est élu en 1981, première alternance de gauche sous la Ve République ?", options: ["Georges Pompidou", "Valéry Giscard d'Estaing", "François Mitterrand", "Jacques Chirac"], correcte: "François Mitterrand", explication: "François Mitterrand (PS) bat Giscard d'Estaing en 1981 : c'est la première alternance de la gauche au pouvoir sous la Ve République." },
  { enonce: "Quel pays africain, ancienne colonie française, devient indépendant en premier en 1960 ?", options: ["L'Algérie", "Le Maroc", "De nombreux pays d'Afrique subsaharienne en 1960 (l'année de l'Afrique)", "La Tunisie"], correcte: "De nombreux pays d'Afrique subsaharienne en 1960 (l'année de l'Afrique)", explication: "1960 est appelée 'l'année de l'Afrique' : 17 pays africains anciennement colonisés (dont le Sénégal, la Côte d'Ivoire, le Cameroun...) accèdent à l'indépendance." },
  { enonce: "Quel traité, signé en 1992, approfondit la construction européenne et crée l'Union européenne ?", options: ["Le traité de Rome (1957)", "Le traité de Maastricht (1992)", "Le traité de Lisbonne (2007)", "L'accord de Schengen (1985)"], correcte: "Le traité de Maastricht (1992)", explication: "Le traité de Maastricht (7 février 1992) fonde l'Union européenne, instaure la citoyenneté européenne et prépare l'euro comme monnaie commune." },
];

const BANQUE_H4_N2 = [
  { enonce: "Quelle est la principale institution qui distingue la Ve République des républiques précédentes ?", options: ["Un Parlement plus puissant", "Un président fort, élu au suffrage universel direct, avec des pouvoirs étendus", "Un système proportionnel pur", "L'absence de premier ministre"], correcte: "Un président fort, élu au suffrage universel direct, avec des pouvoirs étendus", explication: "Contrairement aux IIIe et IVe Républiques (parlementaristes), la Ve République donne au président un pouvoir exécutif fort : dissolution de l'Assemblée, article 16, chef des armées." },
  { enonce: "Qu'est-ce que la 'cohabitation' sous la Ve République ?", options: ["Une alliance entre deux partis au gouvernement", "La situation où le président et le premier ministre appartiennent à des partis politiques opposés", "L'union de la gauche et de la droite contre une menace extérieure", "Un accord parlementaire en cas de crise"], correcte: "La situation où le président et le premier ministre appartiennent à des partis politiques opposés", explication: "La cohabitation survient quand la majorité parlementaire est d'un bord opposé au président : ex. Mitterrand/Chirac (1986-88), Chirac/Jospin (1997-2002)." },
  { enonce: "Pour quelle raison les mouvements de décolonisation s'accélèrent-ils après 1945 ?", options: ["Les colonies sont trop coûteuses à administrer uniquement", "La défaite des empires colonisateurs pendant la guerre affaiblit leur prestige ; les idéaux de liberté proclamés contredisent la colonisation", "Les États-Unis imposent la décolonisation par la force", "Les populations colonisées ont obtenu le droit de vote universel"], correcte: "La défaite des empires colonisateurs pendant la guerre affaiblit leur prestige ; les idéaux de liberté proclamés contredisent la colonisation", explication: "Après 1945, les nations colonisées invoquent les principes de liberté et d'autodétermination proclamés par les Alliés. Les colonisateurs, affaiblis, ne peuvent maintenir leur domination." },
  { enonce: "En combien d'années la plupart des colonies françaises d'Afrique noire obtiennent-elles leur indépendance ?", options: ["Entre 1945 et 1950", "Entre 1956 et 1965 environ, avec un pic en 1960", "Après 1970 seulement", "Elles n'ont jamais été indépendantes"], correcte: "Entre 1956 et 1965 environ, avec un pic en 1960", explication: "La loi-cadre Defferre (1956) amorce l'autonomie ; en 1960 ('Année de l'Afrique'), la quasi-totalité des colonies subsahariennes accèdent à l'indépendance." },
  { enonce: "Quelles sont les principales revendications du mouvement de mai 1968 en France ?", options: ["L'unification de l'Europe et la paix mondiale", "Plus de liberté individuelle, contre la société de consommation, pour l'émancipation des femmes et des étudiants", "La restauration de la monarchie", "L'application du programme communiste"], correcte: "Plus de liberté individuelle, contre la société de consommation, pour l'émancipation des femmes et des étudiants", explication: "Mai 68 mêle contestation de l'autorité universitaire, critique du capitalisme et de la société de consommation, féminisme naissant et rejet des conventions sociales." },
  { enonce: "Quel référendum de 1969 entraîne la démission de De Gaulle ?", options: ["Le référendum sur l'élection présidentielle au suffrage universel (1962)", "Le référendum sur la régionalisation et la réforme du Sénat (1969)", "Le référendum sur l'entrée dans l'UE (1972)", "Le référendum sur le traité de Maastricht (1992)"], correcte: "Le référendum sur la régionalisation et la réforme du Sénat (1969)", explication: "Le 27 avril 1969, de Gaulle perd le référendum sur la réforme régionale et du Sénat. Fidèle à sa parole, il démissionne immédiatement de la présidence." },
];

const BANQUE_H4_N3 = [
  { enonce: "Qu'est-ce que la décolonisation et quelle en est la principale cause idéologique ?", options: ["La prise de contrôle d'un pays par une puissance étrangère ; cause = mondialisation économique", "Le processus par lequel les peuples colonisés accèdent à l'indépendance ; cause principale = les idéaux de liberté et d'autodétermination", "La vente de colonies entre puissances européennes ; cause = crise économique", "L'expulsion des colons ; cause = racisme anti-européen"], correcte: "Le processus par lequel les peuples colonisés accèdent à l'indépendance ; cause principale = les idéaux de liberté et d'autodétermination", explication: "La décolonisation (surtout 1945-1975) est portée par les idéaux des droits de l'homme, l'affaiblissement des empires européens et les mouvements nationalistes locaux." },
  { enonce: "En quoi la guerre d'Algérie (1954-1962) est-elle particulièrement douloureuse pour la France ?", options: ["Car l'Algérie est une île et difficile à atteindre", "Car l'Algérie est un département français où vivent un million d'Européens (pieds-noirs) et 8 millions de musulmans", "Car c'est la première guerre coloniale perdue par la France", "Car elle implique des armes nucléaires"], correcte: "Car l'Algérie est un département français où vivent un million d'Européens (pieds-noirs) et 8 millions de musulmans", explication: "L'Algérie n'est pas une simple colonie mais un département français : sa décolonisation déchire la société française, oppose colons (pieds-noirs), armée, gouvernement et opposants à la guerre." },
  { enonce: "Comment a évolué la construction européenne depuis le traité de Rome (1957) jusqu'à Maastricht (1992) ?", options: ["Elle a uniquement créé une zone de libre-échange commerciale", "Elle est passée d'une CEE (marché commun économique) à une Union européenne avec citoyenneté, monnaie et politiques communes", "Elle n'a pas évolué fondamentalement", "Elle s'est élargie uniquement en superficie sans approfondir l'intégration"], correcte: "Elle est passée d'une CEE (marché commun économique) à une Union européenne avec citoyenneté, monnaie et politiques communes", explication: "1957 = CEE (marché commun). 1986 = Acte unique (marché intérieur). 1992 = Maastricht (UE, euro futur, citoyenneté). 2002 = introduction de l'euro. L'intégration s'est approfondie étape par étape." },
  { enonce: "Quel événement symbolise le début de la Guerre froide qui succède à la Seconde Guerre mondiale ?", options: ["La bombe atomique sur Hiroshima (1945)", "Le blocus de Berlin (1948-1949) et la division du monde en deux blocs", "La révolution culturelle chinoise (1966)", "La décolonisation de l'Inde (1947)"], correcte: "Le blocus de Berlin (1948-1949) et la division du monde en deux blocs", explication: "La Guerre froide oppose le bloc occidental (USA) et le bloc soviétique (URSS). Le blocus de Berlin (1948-49) est la première crise majeure. La France y joue un rôle en s'alignant sur l'OTAN (1949)." },
  { enonce: "Quel impact a eu la loi Veil de 1975 sur la société française ?", options: ["Elle a interdit l'avortement", "Elle a légalisé l'interruption volontaire de grossesse (IVG), permettant aux femmes de décider librement", "Elle a instauré la parité hommes-femmes en politique", "Elle a créé la Sécurité Sociale"], correcte: "Elle a légalisé l'interruption volontaire de grossesse (IVG), permettant aux femmes de décider librement", explication: "La loi Veil (17 janvier 1975), portée par Simone Veil, légalise l'IVG. C'est une avancée majeure des droits des femmes, adoptée dans un contexte de vifs débats parlementaires." },
  { enonce: "Qu'est-ce que la 'décentralisation' en France et quand a-t-elle été mise en œuvre ?", options: ["Le déplacement de la capitale vers une autre ville", "Le transfert de compétences de l'État vers les collectivités territoriales (régions, départements, communes), initié par les lois Defferre de 1982", "La suppression des régions administratives", "L'indépendance accordée aux DOM-TOM"], correcte: "Le transfert de compétences de l'État vers les collectivités territoriales (régions, départements, communes), initié par les lois Defferre de 1982", explication: "Les lois Defferre (1982-1983) donnent aux régions, départements et communes une autonomie réelle : éducation (lycées → régions), routes, action sociale. C'est une rupture avec la tradition centralisatrice française héritée de Napoléon." },
];

function genH4(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_H4_N1);
  if (niveau === 2) return genFromBank(BANQUE_H4_N2);
  return genFromBank(BANQUE_H4_N3);
}

// ==========================================================================
// G1 — Les aires urbaines en France
// ==========================================================================

const BANQUE_G1_N1 = [
  { enonce: "Quel pourcentage approximatif de la population française vit dans une aire urbaine ?", options: ["Environ 30%", "Environ 50%", "Plus de 80%", "Exactement 100%"], correcte: "Plus de 80%", explication: "Plus de 80% des Français vivent dans une aire urbaine (ville + communes environnantes). La France est une société majoritairement urbaine." },
  { enonce: "Comment appelle-t-on les déplacements quotidiens domicile-travail entre la couronne périurbaine et le pôle urbain ?", options: ["Les flux migratoires", "L'exode rural", "Les migrations pendulaires", "Le nomadisme urbain"], correcte: "Les migrations pendulaires", explication: "Les 'migrations pendulaires' (ou navettes domicile-travail) désignent les allers-retours quotidiens entre lieu de résidence (périurbain) et lieu de travail (pôle urbain)." },
  { enonce: "De quoi est composé le pôle urbain au sein d'une aire urbaine ?", options: ["Uniquement de la ville-centre", "La ville-centre et sa banlieue", "La couronne périurbaine seule", "Les communes rurales isolées"], correcte: "La ville-centre et sa banlieue", explication: "Le pôle urbain = ville-centre + banlieue (communes contiguës et fortement urbanisées). La couronne périurbaine l'entoure (communes dont habitants travaillent majoritairement dans le pôle)." },
  { enonce: "Quelle est la plus grande aire urbaine de France ?", options: ["Lyon", "Marseille", "Paris", "Toulouse"], correcte: "Paris", explication: "L'aire urbaine de Paris (Île-de-France) est de loin la plus grande de France avec environ 12 millions d'habitants, soit 1/5 de la population française." },
  { enonce: "Comment appelle-t-on le phénomène d'extension progressive de la ville sur les espaces ruraux environnants ?", options: ["La métropolisation", "La rurbanisation / l'étalement urbain", "La désindustrialisation", "L'exode rural"], correcte: "La rurbanisation / l'étalement urbain", explication: "L'étalement urbain (ou périurbanisation, rurbanisation) est la croissance des villes qui 'grignote' les campagnes environnantes, créant des zones pavillonnaires et des zones commerciales en périphérie." },
  { enonce: "Qu'est-ce qu'une métropole en géographie française ?", options: ["N'importe quelle grande ville", "Une ville qui rayonne à l'échelle nationale ou internationale par ses fonctions économiques, politiques et culturelles", "Un département français", "Un ensemble de communes rurales groupées"], correcte: "Une ville qui rayonne à l'échelle nationale ou internationale par ses fonctions économiques, politiques et culturelles", explication: "Une métropole (Paris, Lyon, Marseille...) concentre des fonctions de commandement économique, culturel et politique à grande échelle. Paris est la seule métropole mondiale de France." },
  { enonce: "Qu'est-ce que la 'couronne périurbaine' dans une aire urbaine ?", options: ["La zone industrielle à la périphérie", "Les communes rurales dont une majorité des actifs travaille dans le pôle urbain", "Le centre historique de la ville", "Les parcs naturels autour des villes"], correcte: "Les communes rurales dont une majorité des actifs travaille dans le pôle urbain", explication: "La couronne périurbaine entoure le pôle urbain : ce sont des communes encore rurales dans leur paysage, mais dont les habitants travaillent principalement en ville." },
];

const BANQUE_G1_N2 = [
  { enonce: "Quels sont les principaux problèmes liés à l'étalement urbain ?", options: ["Réduction de la circulation automobile", "Artificialisation des terres agricoles, dépendance à la voiture, augmentation des coûts des services publics", "Amélioration automatique de la qualité de l'air", "Densification du tissu urbain"], correcte: "Artificialisation des terres agricoles, dépendance à la voiture, augmentation des coûts des services publics", explication: "L'étalement urbain consomme des terres agricoles et naturelles, impose la voiture comme seul moyen de transport, et coûte cher en infrastructures (routes, réseaux)." },
  { enonce: "Comment expliquer la croissance des zones périurbaines depuis les années 1970 ?", options: ["Par la recherche d'espaces verts, d'une maison individuelle moins chère, malgré des trajets plus longs", "Par l'offre de transports en commun excellente en banlieue", "Par la désindustrialisation des centres-villes", "Par des politiques de décentralisation imposant le déménagement des administrations"], correcte: "Par la recherche d'espaces verts, d'une maison individuelle moins chère, malgré des trajets plus longs", explication: "Les ménages quittent les centres-villes coûteux pour le périurbain : maisons avec jardin, loyers accessibles — au prix de migrations pendulaires plus longues et d'une dépendance à la voiture." },
  { enonce: "Qu'est-ce que la métropolisation à l'échelle nationale ?", options: ["La création de nouvelles métropoles rurales", "La concentration des richesses, des emplois qualifiés et du pouvoir dans un petit nombre de grandes métropoles au détriment du reste du territoire", "La fusion de toutes les villes françaises en une seule entité", "La décroissance des métropoles au profit des villes moyennes"], correcte: "La concentration des richesses, des emplois qualifiés et du pouvoir dans un petit nombre de grandes métropoles au détriment du reste du territoire", explication: "La métropolisation accentue les inégalités territoriales : Paris et quelques grandes métropoles concentrent entreprises, universités et services, laissant les villes moyennes et espaces ruraux en marge." },
  { enonce: "Pourquoi les 'villes moyennes' sont-elles en difficulté en France ?", options: ["Elles sont trop peuplées", "Elles perdent des emplois et des services au profit des métropoles et voient leur centre-ville se dépeuplement", "Elles accueillent trop d'immigrants", "Elles sont mal connectées à internet"], correcte: "Elles perdent des emplois et des services au profit des métropoles et voient leur centre-ville se dépeuplement", explication: "Les villes moyennes (ex. Épinal, Alençon, Vierzon) souffrent de la fermeture de commerces, d'hôpitaux et d'administrations qui se concentrent dans les métropoles." },
  { enonce: "Qu'est-ce qu'un 'espace à dominante rurale' en France ?", options: ["Une commune ayant moins de 100 habitants", "L'ensemble des communes n'appartenant pas à une aire urbaine, incluant les bourgs ruraux et espaces naturels", "Une zone agricole intensive", "Un parc naturel régional"], correcte: "L'ensemble des communes n'appartenant pas à une aire urbaine, incluant les bourgs ruraux et espaces naturels", explication: "L'espace rural (environ 20% de la population) regroupe les communes éloignées des pôles urbains. Certains espaces ruraux se 'rurbainisent' (accueil de périurbains), d'autres se vident." },
  { enonce: "Comment l'aménagement du territoire tente-t-il de rééquilibrer les inégalités régionales en France ?", options: ["En interdisant l'installation d'entreprises dans les métropoles", "Par des politiques de décentralisation, de soutien aux régions défavorisées (ex. politique de la ville, DATAR)", "En créant de nouvelles capitales régionales", "En supprimant les transports entre Paris et la province"], correcte: "Par des politiques de décentralisation, de soutien aux régions défavorisées (ex. politique de la ville, DATAR)", explication: "L'État aménage le territoire par la décentralisation (lois de 1982), les contrats de plan État-Région, les zones franches urbaines, et les politiques de revitalisation des centres-villes." },
];

const BANQUE_G1_N3 = [
  { enonce: "Quels sont les enjeux environnementaux liés à la croissance des métropoles françaises ?", options: ["Les métropoles améliorent toujours la qualité de l'air", "Pollution, îlots de chaleur urbains, imperméabilisation des sols, consommation énergétique croissante", "Les métropoles n'ont aucun impact sur l'environnement", "La croissance urbaine diminue la consommation d'énergie per capita"], correcte: "Pollution, îlots de chaleur urbains, imperméabilisation des sols, consommation énergétique croissante", explication: "Les grandes villes génèrent pollution de l'air et de l'eau, îlots de chaleur (béton = stockage thermique), artificialisation des sols et forte empreinte carbone liée aux transports et au chauffage." },
  { enonce: "Qu'est-ce que la 'politique de la ville' en France ?", options: ["Une politique générale d'urbanisme pour toutes les communes", "Des mesures spécifiques ciblant les quartiers défavorisés des banlieues (zones prioritaires, rénovation, éducation)", "L'interdiction de construire en zone agricole", "Le financement des transports en commun"], correcte: "Des mesures spécifiques ciblant les quartiers défavorisés des banlieues (zones prioritaires, rénovation, éducation)", explication: "La 'politique de la ville' (depuis les années 1980) cible les quartiers en difficulté : Zones Urbaines Sensibles (ZUS), rénovation urbaine (ANRU), présence renforcée de services publics, éducation prioritaire (REP)." },
  { enonce: "Comment expliquer que l'Île-de-France concentre plus de 30% du PIB national ?", options: ["Par la présence de nombreuses usines industrielles", "Par la concentration des sièges sociaux, des services financiers, des universités et des institutions politiques dans Paris et sa région", "Par une population plus nombreuse que le reste de la France", "Par des avantages fiscaux spécifiques à la région"], correcte: "Par la concentration des sièges sociaux, des services financiers, des universités et des institutions politiques dans Paris et sa région", explication: "L'Île-de-France est une métropole mondiale : elle concentre la Bourse de Paris, les sièges sociaux du CAC 40, les grandes universités, les médias nationaux et les institutions de l'État." },
  { enonce: "Quelles solutions sont avancées pour réduire la dépendance à la voiture dans les zones périurbaines ?", options: ["Supprimer les logements périurbains", "Développer les transports en commun (TER, car express régional), créer des espaces de coworking en périphérie, densifier les bourgs-centres", "Obliger les habitants à déménager en ville", "Interdire les voitures dans les centres-villes uniquement"], correcte: "Développer les transports en commun (TER, car express régional), créer des espaces de coworking en périphérie, densifier les bourgs-centres", explication: "Pour réduire les migrations pendulaires en voiture, on propose des transports améliorés (TER, vélos), le télétravail, les tiers-lieux (coworking rural) et la mixité fonctionnelle (emplois en périphérie)." },
  { enonce: "Quelle est la principale inégalité territoriale entre Paris et le reste de la France ?", options: ["Paris manque d'infrastructures routières", "Paris et sa région concentrent richesses, emplois qualifiés et décisions économiques, creusant un fossé avec les villes moyennes et espaces ruraux", "Les villes de province sont plus riches que Paris", "Il n'existe pas d'inégalité territoriale significative en France"], correcte: "Paris et sa région concentrent richesses, emplois qualifiés et décisions économiques, creusant un fossé avec les villes moyennes et espaces ruraux", explication: "La macrocéphalie parisienne : Paris = 19% de la population mais ~30% du PIB. Les 'villes moyennes' (50 000-100 000 hab) et les espaces ruraux peinent à attirer entreprises et services publics." },
  { enonce: "Qu'est-ce que le 'droit à la ville' et pourquoi ce concept émerge-t-il face à la métropolisation ?", options: ["Le droit de chaque citoyen à construire sa propre maison en ville", "L'idée que tous les habitants doivent pouvoir accéder aux services, espaces publics et décisions urbaines, quelle que soit leur condition sociale", "Un règlement interdisant aux ruraux de s'installer en ville", "Un statut juridique accordé aux seules grandes métropoles"], correcte: "L'idée que tous les habitants doivent pouvoir accéder aux services, espaces publics et décisions urbaines, quelle que soit leur condition sociale", explication: "Le 'droit à la ville' (Henri Lefebvre) dénonce la gentrification et l'exclusion des populations précaires des centres urbains. Face à la métropolisation, les politiques cherchent à garantir la mixité sociale et l'accès de tous aux aménités urbaines." },
];

function genG1(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_G1_N1);
  if (niveau === 2) return genFromBank(BANQUE_G1_N2);
  return genFromBank(BANQUE_G1_N3);
}

// ==========================================================================
// G2 — Les espaces productifs et leurs évolutions
// ==========================================================================

const BANQUE_G2_N1 = [
  { enonce: "Comment appelle-t-on le déplacement d'une activité de production vers un pays à coûts salariaux plus bas ?", options: ["La périurbanisation", "La métropolisation", "La délocalisation", "La nationalisation"], correcte: "La délocalisation", explication: "La délocalisation consiste à transférer tout ou partie d'une activité dans un autre pays, généralement pour réduire les coûts de production (salaires, normes sociales, fiscalité)." },
  { enonce: "Lequel de ces espaces est un espace productif agricole majeur en France ?", options: ["La Côte d'Azur", "Le Bassin parisien", "La Bretagne industrielle", "Le Val de Loire touristique"], correcte: "Le Bassin parisien", explication: "Le Bassin parisien est l'un des greniers céréaliers de France : grandes exploitations, agriculture intensive (blé, betterave sucrière) liée à la PAC et à l'exportation." },
  { enonce: "Quelle est la principale caractéristique des espaces productifs touristiques ?", options: ["Ils sont exclusivement situés à la montagne", "Ils attirent des flux de visiteurs et développent des activités liées aux loisirs et à l'hébergement", "Ils sont réservés aux Français uniquement", "Ils ne génèrent pas d'emplois"], correcte: "Ils attirent des flux de visiteurs et développent des activités liées aux loisirs et à l'hébergement", explication: "Un espace touristique (Côte d'Azur, Alpes, Loire, Paris) génère des emplois dans l'hôtellerie, la restauration, le commerce et les transports grâce aux flux de visiteurs." },
  { enonce: "Qu'est-ce qu'un 'technopôle' (ou parc technologique) ?", options: ["Une grande centrale électrique", "Un espace regroupant entreprises, centres de recherche et universités dans des secteurs de haute technologie", "Un centre commercial en périphérie", "Une zone de stockage logistique"], correcte: "Un espace regroupant entreprises, centres de recherche et universités dans des secteurs de haute technologie", explication: "Ex : Sophia Antipolis (Côte d'Azur), la Silicon Sentier (Paris), Grenoble. Les technopôles favorisent l'innovation par la proximité entre universités, labo de R&D et start-ups." },
  { enonce: "Quel est le premier port de marchandises de France ?", options: ["Marseille", "Le Havre", "Nantes-Saint-Nazaire", "Calais"], correcte: "Marseille", explication: "Marseille-Fos est le premier port de France en tonnage de marchandises (pétrole, vrac). Le Havre est premier pour les conteneurs (commerce avec l'Asie)." },
  { enonce: "Qu'est-ce que la 'littoralisation' des activités économiques ?", options: ["La concentration des activités dans les zones montagneuses", "La tendance des activités industrielles, logistiques et touristiques à se concentrer sur les zones côtières", "L'abandon des régions littorales", "La création de ports de pêche artisanale"], correcte: "La tendance des activités industrielles, logistiques et touristiques à se concentrer sur les zones côtières", explication: "La littoralisation est mondiale : les littoraux concentrent ports, industries (raffineries, chantiers navals), zones franches et tourisme — car ils offrent accès aux flux maritimes mondiaux." },
  { enonce: "Qu'est-ce que la 'PAC' (Politique Agricole Commune) de l'Union européenne ?", options: ["Un accord de libre-échange agricole avec les États-Unis", "Un ensemble de subventions et de règles européennes soutenant l'agriculture des États membres", "Un traité de protection de l'environnement uniquement", "Un programme de délocalisation agricole"], correcte: "Un ensemble de subventions et de règles européennes soutenant l'agriculture des États membres", explication: "La PAC (depuis 1962) finance les agriculteurs européens par des aides directes et régule les marchés agricoles. Elle représente environ 40% du budget de l'UE." },
];

const BANQUE_G2_N2 = [
  { enonce: "Qu'est-ce que la 'mondialisation' des espaces productifs ?", options: ["La localisation de toutes les usines dans un seul pays", "L'intégration croissante des économies nationales dans un marché mondial de production, d'échange et de consommation", "La fermeture des frontières commerciales", "La nationalisation des grandes entreprises"], correcte: "L'intégration croissante des économies nationales dans un marché mondial de production, d'échange et de consommation", explication: "La mondialisation = libre circulation accrue des marchandises, capitaux et informations. Un smartphone est conçu en Californie, assemblé en Chine, avec des composants coréens et japonais." },
  { enonce: "Quels espaces sont qualifiés d'espaces productifs 'en reconversion' en France ?", options: ["Les zones viticoles bordelaises", "Les anciennes régions industrielles (Nord, Lorraine, bassin minier) qui perdent leurs industries traditionnelles et cherchent de nouvelles activités", "Les grandes métropoles", "Les espaces touristiques littoraux"], correcte: "Les anciennes régions industrielles (Nord, Lorraine, bassin minier) qui perdent leurs industries traditionnelles et cherchent de nouvelles activités", explication: "Le Nord-Pas-de-Calais (charbon, textile), la Lorraine (acier) et les bassins miniers ont connu des crises industrielles. Ils se reconvertissent vers le tertiaire, la logistique, le tourisme mémoriel." },
  { enonce: "Quel phénomène menace les espaces agricoles en France ?", options: ["La surproduction mondiale", "L'artificialisation des sols (urbanisation qui consomme des terres agricoles)", "Le vieillissement des tracteurs", "L'excès de précipitations"], correcte: "L'artificialisation des sols (urbanisation qui consomme des terres agricoles)", explication: "Chaque année, des milliers d'hectares de terres agricoles sont bétonnées (lotissements, zones commerciales, routes). La France cherche à atteindre le 'zéro artificialisation nette' (ZAN)." },
  { enonce: "Comment les espaces touristiques contribuent-ils au développement local ?", options: ["Ils n'ont aucun effet sur l'emploi local", "Ils créent des emplois (hôtellerie, restauration, transports), génèrent des revenus fiscaux et financent des infrastructures", "Ils appauvrissent systématiquement les populations locales", "Seuls les touristes étrangers y contribuent"], correcte: "Ils créent des emplois (hôtellerie, restauration, transports), génèrent des revenus fiscaux et financent des infrastructures", explication: "Le tourisme génère 7 à 8% du PIB français. La France est le pays le plus visité au monde (~90 millions de touristes/an). Cela finance routes, patrimoine, équipements culturels." },
  { enonce: "Qu'est-ce que l'agriculture intensive et quels en sont les problèmes environnementaux ?", options: ["Une agriculture qui vise à produire beaucoup avec peu d'intrants ; aucun problème", "Une agriculture maximisant la production par l'usage massif d'engrais, pesticides et machines ; problèmes = pollution des eaux et sols, perte de biodiversité", "Une agriculture biologique par définition", "Une agriculture de subsistance pour auto-consommation"], correcte: "Une agriculture maximisant la production par l'usage massif d'engrais, pesticides et machines ; problèmes = pollution des eaux et sols, perte de biodiversité", explication: "L'agriculture intensive (blé, maïs, élevage industriel) pollue les nappes phréatiques (nitrates, pesticides), homogénéise les paysages et réduit la biodiversité des insectes, oiseaux et plantes." },
  { enonce: "Qu'est-ce qu'un pôle de compétitivité (cluster) en France ?", options: ["Un centre commercial régional", "Un regroupement d'entreprises, de centres de recherche et d'universités dans un même secteur pour stimuler l'innovation", "Une zone agricole protégée", "Un dispositif fiscal réservé aux PME"], correcte: "Un regroupement d'entreprises, de centres de recherche et d'universités dans un même secteur pour stimuler l'innovation", explication: "Exemple : Aerospace Valley (Toulouse, aéronautique), Mov'eo (Normandie, automobile). Les pôles de compétitivité favorisent les synergies entre acteurs du même secteur et renforcent la compétitivité française à l'international." },
];

const BANQUE_G2_N3 = [
  { enonce: "Comment les entreprises françaises s'adaptent-elles à la compétition mondiale ?", options: ["En fermant toutes leurs usines et en réduisant leurs activités", "En se spécialisant dans des produits à haute valeur ajoutée (luxe, aéronautique, agroalimentaire) et en innovant", "En baissant les salaires à des niveaux comparables aux pays émergents", "En demandant des subventions permanentes à l'État"], correcte: "En se spécialisant dans des produits à haute valeur ajoutée (luxe, aéronautique, agroalimentaire) et en innovant", explication: "Face aux délocalisations, la France mise sur le 'made in France' de qualité (LVMH, Airbus, Michelin), l'innovation et la recherche-développement, plutôt que la concurrence par les prix bas." },
  { enonce: "Qu'est-ce qu'une 'zone franche' et quel est son rôle économique ?", options: ["Un espace sans législation du tout", "Une zone où des avantages fiscaux sont accordés pour attirer des entreprises (réduction ou suppression d'impôts pendant une période)", "Un espace naturel protégé", "Une zone industrielle polluée mise en quarantaine"], correcte: "Une zone où des avantages fiscaux sont accordés pour attirer des entreprises (réduction ou suppression d'impôts pendant une période)", explication: "Les zones franches (zones franches urbaines en France, zones économiques spéciales en Chine) offrent des exonérations fiscales pour attirer les investissements dans des territoires défavorisés." },
  { enonce: "Quelle est la place de la France dans le commerce mondial ?", options: ["1ère puissance exportatrice mondiale", "Parmi les 5-7 premières puissances commerciales mondiales, excédentaire en services et déficitaire en biens manufacturés", "Pays en développement économiquement marginalisé", "Pays uniquement importateur"], correcte: "Parmi les 5-7 premières puissances commerciales mondiales, excédentaire en services et déficitaire en biens manufacturés", explication: "La France est une grande puissance commerciale (6e/7e rang mondial). Elle exporte surtout des services (tourisme, finance, aéronautique, luxe) mais importe plus de biens industriels qu'elle n'en exporte." },
  { enonce: "Comment l'agriculture française tente-t-elle de concilier production et durabilité environnementale ?", options: ["En abandonnant complètement les engrais et machines agricoles", "Par l'agroécologie, l'agriculture biologique, les circuits courts et les cahiers des charges environnementaux", "En se délocalisant vers des pays moins regardants sur l'environnement", "En abandonnant les grandes cultures céréalières"], correcte: "Par l'agroécologie, l'agriculture biologique, les circuits courts et les cahiers des charges environnementaux", explication: "La transition agroécologique vise à produire durablement : agriculture biologique, haies bocagères, rotation des cultures, réduction des pesticides, circuits courts pour réduire le transport." },
  { enonce: "Qu'appelle-t-on la 'désindustrialisation' en France ?", options: ["La création de nouvelles usines en zone rurale", "Le recul de l'industrie manufacturière au profit des services, accompagné de fermetures d'usines et de pertes d'emplois industriels", "L'interdiction d'importer des produits industriels", "La nationalisation des grandes entreprises industrielles"], correcte: "Le recul de l'industrie manufacturière au profit des services, accompagné de fermetures d'usines et de pertes d'emplois industriels", explication: "Depuis les années 1970, la France a perdu des millions d'emplois industriels (textile, acier, charbon) au profit de délocalisations et de l'automatisation. Le secteur tertiaire (services) représente aujourd'hui plus de 75% des emplois." },
  { enonce: "Qu'est-ce que la 'valeur ajoutée' et pourquoi la France cherche-t-elle à la maximiser ?", options: ["Le prix brut d'un produit avant transformation", "La richesse créée à chaque étape de production, qui rémunère travail et capital : la France se spécialise dans les activités à forte valeur ajoutée (luxe, aéronautique) pour rester compétitive malgré des coûts élevés", "La taxe prélevée par l'État sur les exportations", "La différence entre les importations et les exportations totales"], correcte: "La richesse créée à chaque étape de production, qui rémunère travail et capital : la France se spécialise dans les activités à forte valeur ajoutée (luxe, aéronautique) pour rester compétitive malgré des coûts élevés", explication: "La valeur ajoutée = prix de vente - coût des consommations intermédiaires. La France ne peut concurrencer les pays à bas salaires sur les produits basiques : elle mise sur la qualité, le savoir-faire et l'innovation." },
  { enonce: "Comment les mutations numériques transforment-elles les espaces productifs ?", options: ["Le numérique n'a aucun impact sur les espaces de production", "L'e-commerce, les plateformes numériques et l'automatisation redistribuent l'activité économique : nouvelles zones logistiques, essor des data centers, télétravail redessinant les flux entre métropoles et espaces ruraux", "Le numérique supprime uniquement les emplois agricoles", "Le numérique favorise exclusivement les grandes métropoles, sans aucun bénéfice pour les zones rurales"], correcte: "L'e-commerce, les plateformes numériques et l'automatisation redistribuent l'activité économique : nouvelles zones logistiques, essor des data centers, télétravail redessinant les flux entre métropoles et espaces ruraux", explication: "Amazon, data centers, robots industriels, télétravail post-Covid : le numérique bouleverse la géographie productive. Des entrepôts géants s'implantent en périphérie des grandes villes, et le télétravail permet à certains de quitter les métropoles." },
];

function genG2(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_G2_N1);
  if (niveau === 2) return genFromBank(BANQUE_G2_N2);
  return genFromBank(BANQUE_G2_N3);
}

// ==========================================================================
// E1 — Valeurs, principes et symboles de la République
// ==========================================================================

const BANQUE_E1_N1 = [
  { enonce: "Quelle est la devise de la République française ?", options: ["Unité, Travail, Progrès", "Liberté, Égalité, Fraternité", "Ordre et Progrès", "Paix, Justice, Liberté"], correcte: "Liberté, Égalité, Fraternité", explication: "'Liberté, Égalité, Fraternité' est inscrite dans la Constitution et sur les frontons des bâtiments publics. Héritée de la Révolution française (1789)." },
  { enonce: "Quel est le drapeau de la République française ?", options: ["Blanc et rouge", "Bleu, blanc, rouge", "Tricolore rouge, blanc, vert", "Bleu et or étoilé"], correcte: "Bleu, blanc, rouge", explication: "Le drapeau tricolore bleu-blanc-rouge date de la Révolution française. Il est un symbole de la République, inscrit dans l'article 2 de la Constitution." },
  { enonce: "Comment s'appelle l'hymne national français ?", options: ["Le Chant du Départ", "L'Internationale", "La Marseillaise", "Le Sacre du Printemps"], correcte: "La Marseillaise", explication: "La Marseillaise, composée en 1792 par Rouget de Lisle, est l'hymne national français depuis 1795 (et à nouveau depuis 1879). Elle est inscrite dans la Constitution." },
  { enonce: "Quel buste de femme symbolise la République française ?", options: ["Jeanne d'Arc", "Marie-Antoinette", "Marianne", "Liberté guidant le peuple"], correcte: "Marianne", explication: "Marianne (prénom populaire symbolique) est le buste féminin figurant dans toutes les mairies et sur les timbres français. Elle incarne la République française depuis la Révolution." },
  { enonce: "En quelle année est votée la loi de séparation des Églises et de l'État, fondatrice de la laïcité ?", options: ["1789", "1882", "1905", "1958"], correcte: "1905", explication: "La loi de 1905 sépare officiellement les Églises de l'État : l'État ne finance aucun culte et garantit la liberté de conscience. C'est le fondement de la laïcité à la française." },
  { enonce: "Quel est le principe fondamental exprimé par 'la France est une République indivisible' ?", options: ["La France peut être divisée en États fédéraux", "Il ne peut y avoir de droits ou statuts différents selon les régions : la loi s'applique de façon identique sur tout le territoire", "Les régions ont leur propre constitution", "La France est interdite de tout accord international"], correcte: "Il ne peut y avoir de droits ou statuts différents selon les régions : la loi s'applique de façon identique sur tout le territoire", explication: "'Indivisible' signifie qu'il n'existe qu'un seul État, une seule loi applicable partout en France — s'opposant au fédéralisme et garantissant l'égalité entre citoyens quelle que soit leur région." },
  { enonce: "Quelle journée nationale commémore la prise de la Bastille (1789), symbole de la Révolution française ?", options: ["Le 8 mai", "Le 11 novembre", "Le 14 juillet", "Le 1er mai"], correcte: "Le 14 juillet", explication: "Le 14 juillet est la Fête nationale française, commémorant la prise de la Bastille (1789) et la Fête de la Fédération (1790). Elle est célébrée par un défilé militaire et des feux d'artifice." },
];

const BANQUE_E1_N2 = [
  { enonce: "Que garantit le principe de laïcité tel qu'il est défini en France ?", options: ["L'interdiction de toute pratique religieuse", "La neutralité de l'État en matière religieuse et la liberté de conscience et de culte de chacun", "La religion d'État officielle", "L'obligation de déclarer sa religion à l'état civil"], correcte: "La neutralité de l'État en matière religieuse et la liberté de conscience et de culte de chacun", explication: "La laïcité ne combat pas la religion — elle garantit que l'État ne favorise ni ne combat aucune religion. Chacun est libre de croire ou non, en privé comme en public." },
  { enonce: "Quels sont les quatre adjectifs qualifiant la République française dans l'article 1er de la Constitution ?", options: ["Grande, laïque, libre et juste", "Indivisible, laïque, démocratique et sociale", "Une, forte, égale et fraternelle", "Libre, républicaine, universelle et solidaire"], correcte: "Indivisible, laïque, démocratique et sociale", explication: "L'article 1er dispose : 'La France est une République indivisible, laïque, démocratique et sociale.' Ces quatre adjectifs définissent les fondements de la République française." },
  { enonce: "Pourquoi la fraternité est-elle une valeur républicaine difficile à définir juridiquement ?", options: ["Car elle est trop récente pour être codifiée", "Car c'est une valeur morale et sociale (solidarité, aide aux autres) qui dépasse le cadre strictement légal, contrairement à la liberté et à l'égalité plus facilement codifiables", "Car elle concerne uniquement la famille", "Car elle a été supprimée de la Constitution en 1958"], correcte: "Car c'est une valeur morale et sociale (solidarité, aide aux autres) qui dépasse le cadre strictement légal, contrairement à la liberté et à l'égalité plus facilement codifiables", explication: "La liberté (droits individuels) et l'égalité (droit) sont codifiées. La fraternité est plutôt un idéal : solidarité entre citoyens, aide aux plus démunis — mais le Conseil constitutionnel en a récemment reconnu la valeur juridique (2018, affaire Cédric Herrou)." },
  { enonce: "Qu'est-ce que le principe d'égalité en République française ?", options: ["Tous les citoyens ont exactement les mêmes revenus", "Tous les citoyens ont les mêmes droits et obligations devant la loi, sans discrimination", "L'État impose une égalité de résultats dans tous les domaines", "Les femmes ont des droits supérieurs aux hommes"], correcte: "Tous les citoyens ont les mêmes droits et obligations devant la loi, sans discrimination", explication: "L'égalité républicaine est une égalité de droits (et non de résultats) : nul ne peut être discriminé en raison de son origine, sexe, religion ou opinion. C'est le fondement de la citoyenneté." },
  { enonce: "Quel texte fondateur de 1789 proclame les droits naturels et inaliénables des hommes ?", options: ["La Constitution de 1958", "La loi de 1905 sur la laïcité", "La Déclaration des Droits de l'Homme et du Citoyen (DDHC)", "Le Code Napoléon"], correcte: "La Déclaration des Droits de l'Homme et du Citoyen (DDHC)", explication: "La DDHC (26 août 1789) proclame les droits naturels et imprescriptibles : liberté, propriété, sûreté, résistance à l'oppression. Elle fait partie du bloc de constitutionnalité actuel." },
  { enonce: "Que signifie le principe du 'suffrage universel' dans une démocratie ?", options: ["Seuls les hommes peuvent voter", "Tous les citoyens adultes ont le droit de voter, sans distinction de sexe, d'origine ou de fortune", "Seuls les propriétaires ont le droit de vote", "Le vote est réservé aux plus diplômés"], correcte: "Tous les citoyens adultes ont le droit de voter, sans distinction de sexe, d'origine ou de fortune", explication: "Le suffrage universel (masculin en 1848, féminin en France en 1944) donne à chaque citoyen une voix égale. C'est le fondement de la légitimité démocratique." },
];

const BANQUE_E1_N3 = [
  { enonce: "En quoi la laïcité à la française diffère-t-elle de celle d'autres pays démocratiques ?", options: ["La France est le seul pays au monde à avoir une constitution", "La France a une vision 'séparatiste stricte' : l'État ne reconnaît et ne subventionne aucun culte, contrairement au modèle 'coopératif' de certains pays européens", "La laïcité française interdit toute expression religieuse même en privé", "La laïcité française est identique au modèle américain"], correcte: "La France a une vision 'séparatiste stricte' : l'État ne reconnaît et ne subventionne aucun culte, contrairement au modèle 'coopératif' de certains pays européens", explication: "En Allemagne ou au Royaume-Uni, l'État coopère avec les Églises (enseignement religieux public, financement de l'entretien d'édifices cultuels). En France (loi 1905), séparation stricte : zéro subvention directe." },
  { enonce: "Qu'est-ce que la 'citoyenneté' au sens républicain français ?", options: ["Simplement posséder la nationalité française", "Un statut juridique (droits et devoirs) mais aussi une pratique civique : voter, respecter la loi, s'engager dans la vie collective", "Uniquement l'obligation du service militaire", "Le droit d'obtenir des services publics"], correcte: "Un statut juridique (droits et devoirs) mais aussi une pratique civique : voter, respecter la loi, s'engager dans la vie collective", explication: "La citoyenneté républicaine est un contrat social : droits (voter, être candidat, liberté) mais aussi devoirs (payer ses impôts, respecter la loi, s'informer et participer à la vie démocratique)." },
  { enonce: "Pourquoi l'égalité des droits ne suffit-elle pas à garantir une égalité réelle dans la société ?", options: ["Parce que l'égalité des droits est une notion fausse", "Parce que des inégalités économiques, sociales et culturelles empêchent certains groupes d'exercer leurs droits formels autant que d'autres", "Parce que l'égalité réelle est déjà parfaitement atteinte", "Parce que l'égalité des chances est interdite par la Constitution"], correcte: "Parce que des inégalités économiques, sociales et culturelles empêchent certains groupes d'exercer leurs droits formels autant que d'autres", explication: "On distingue l'égalité formelle (même droit pour tous) et l'égalité réelle : une personne pauvre a formellement le droit d'accéder aux études supérieures, mais des obstacles économiques la freinent. La République tente de réduire ces écarts (bourses, discrimination positive, éducation prioritaire)." },
  { enonce: "Quel débat illustre les tensions entre liberté individuelle et laïcité à l'école ?", options: ["Le débat sur les horaires scolaires", "Le débat sur le port de signes religieux ostensibles à l'école (loi de 2004)", "Le débat sur la taille des classes", "Le débat sur les manuels scolaires"], correcte: "Le débat sur le port de signes religieux ostensibles à l'école (loi de 2004)", explication: "La loi du 15 mars 2004 interdit le port de signes religieux ostensibles (voile, croix de grande taille, kippah) à l'école publique. Elle illustre la tension entre liberté de conscience et neutralité de l'espace scolaire républicain." },
  { enonce: "Quel est le rôle du Conseil constitutionnel dans la République française ?", options: ["Il gouverne la France en cas de crise", "Il veille à la conformité des lois avec la Constitution et protège les droits fondamentaux des citoyens", "Il élit le président de la République", "Il est l'équivalent du Parlement pour les questions locales"], correcte: "Il veille à la conformité des lois avec la Constitution et protège les droits fondamentaux des citoyens", explication: "Le Conseil constitutionnel contrôle que les lois votées par le Parlement respectent la Constitution. Depuis 2008, tout citoyen peut saisir le Conseil via une Question Prioritaire de Constitutionnalité (QPC) si ses droits sont menacés par une loi." },
  { enonce: "Qu'est-ce que la 'séparation des pouvoirs' dans une République démocratique ?", options: ["La division du territoire national en régions autonomes", "La répartition du pouvoir entre trois organes indépendants : exécutif (gouverner), législatif (voter les lois), judiciaire (rendre la justice) — pour éviter qu'un seul ne concentre tout le pouvoir", "L'interdiction aux partis politiques de gouverner ensemble", "Le principe que chaque citoyen peut exercer un pouvoir égal"], correcte: "La répartition du pouvoir entre trois organes indépendants : exécutif (gouverner), législatif (voter les lois), judiciaire (rendre la justice) — pour éviter qu'un seul ne concentre tout le pouvoir", explication: "Montesquieu (De l'Esprit des Lois, 1748) théorise la séparation des pouvoirs : exécutif (président, gouvernement), législatif (Assemblée nationale, Sénat), judiciaire (tribunaux) — chacun contrôle les autres (checks and balances)." },
];

function genE1(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_E1_N1);
  if (niveau === 2) return genFromBank(BANQUE_E1_N2);
  return genFromBank(BANQUE_E1_N3);
}

// ==========================================================================
// E2 — Citoyenneté, médias et engagement démocratique
// ==========================================================================

const BANQUE_E2_N1 = [
  { enonce: "À partir de quel âge un citoyen français peut-il voter ?", options: ["16 ans", "18 ans", "21 ans", "25 ans"], correcte: "18 ans", explication: "La majorité électorale est fixée à 18 ans en France depuis 1974 (elle était à 21 ans auparavant). À 18 ans, tout citoyen français peut voter et être candidat à certaines élections." },
  { enonce: "Qu'est-ce que la démocratie représentative ?", options: ["Un système où chaque citoyen vote directement toutes les lois", "Un système où les citoyens élisent des représentants (députés, sénateurs, présidents) qui décident en leur nom", "Un système où une seule personne prend toutes les décisions", "Un système où les entreprises prennent les décisions politiques"], correcte: "Un système où les citoyens élisent des représentants (députés, sénateurs, présidents) qui décident en leur nom", explication: "La démocratie représentative délègue le pouvoir à des élus : les citoyens votent mais ne décident pas directement des lois (contrairement à la démocratie directe, type référendum)." },
  { enonce: "Qu'est-ce que la liberté de la presse ?", options: ["L'interdiction de critiquer le gouvernement", "Le droit des journalistes et des médias de publier des informations sans censure préalable de l'État", "Le droit de tout citoyen d'avoir son propre journal télévisé", "L'obligation pour les médias d'être gratuits"], correcte: "Le droit des journalistes et des médias de publier des informations sans censure préalable de l'État", explication: "La liberté de la presse protège les journalistes de la censure d'État. En France, la loi de 1881 sur la liberté de la presse est fondatrice. Elle est garantie par la DDHC et la Déclaration de 1948." },
  { enonce: "Qu'est-ce que l'esprit critique face à une information ?", options: ["Rejeter systématiquement toutes les informations des médias", "Accepter immédiatement toutes les informations", "Vérifier la source, croiser avec d'autres médias fiables, distinguer faits et opinions avant de croire", "Ne lire que les informations qui confirment ses opinions"], correcte: "Vérifier la source, croiser avec d'autres médias fiables, distinguer faits et opinions avant de croire", explication: "L'esprit critique est une compétence clé : on vérifie QUI dit QUOI, POURQUOI, avec quelles PREUVES — et on croise les sources avant de croire ou de partager une information." },
  { enonce: "Qu'est-ce qu'une 'fake news' (infox) ?", options: ["Une publicité commerciale", "Une fausse information délibérément diffusée pour tromper ou manipuler", "Un article satirique humoristique", "Une opinion personnelle exprimée en ligne"], correcte: "Une fausse information délibérément diffusée pour tromper ou manipuler", explication: "Une infox (fake news) est une information fausse présentée comme vraie, souvent diffusée massivement sur les réseaux sociaux pour manipuler l'opinion. Elle peut être involontaire (rumeur) ou délibérée (désinformation)." },
  { enonce: "Qu'est-ce qu'un referendum ?", options: ["Une élection pour choisir un représentant", "Un vote direct par lequel les citoyens se prononcent sur une question ou un texte", "Un sondage d'opinion non contraignant", "Une consultation des représentants élus uniquement"], correcte: "Un vote direct par lequel les citoyens se prononcent sur une question ou un texte", explication: "Le référendum est une forme de démocratie directe : les citoyens votent OUI ou NON sur une question. En France, le président peut organiser un référendum sur certains sujets (Constitution, grandes réformes)." },
];

const BANQUE_E2_N2 = [
  { enonce: "Qu'est-ce qu'un 'budget participatif' dans une commune ?", options: ["Un budget voté par les entreprises locales", "Un dispositif où les habitants proposent et votent des projets financés par la collectivité", "Le budget alloué aux associations uniquement", "Un prêt de la banque à la mairie"], correcte: "Un dispositif où les habitants proposent et votent des projets financés par la collectivité", explication: "Le budget participatif (ex : Paris, Grenoble) permet aux habitants de proposer des projets (jardin, piste cyclable, aire de jeux) et de voter pour ceux qui seront réalisés avec de l'argent public." },
  { enonce: "Pourquoi la pluralité des médias est-elle essentielle à la démocratie ?", options: ["Pour offrir plus de divertissement aux citoyens", "Car des médias multiples et indépendants permettent la confrontation des points de vue et empêchent un seul groupe de contrôler l'information", "Car cela stimule la concurrence économique entre journaux", "Pour que les partis politiques aient chacun leur journal officiel"], correcte: "Car des médias multiples et indépendants permettent la confrontation des points de vue et empêchent un seul groupe de contrôler l'information", explication: "La concentration des médias (un seul actionnaire pour de nombreux journaux, TV, radios) menace le pluralisme. La démocratie nécessite des médias diversifiés pour que les citoyens aient accès à différentes perspectives." },
  { enonce: "Qu'est-ce que le 'droit à l'information' garanti par l'État de droit ?", options: ["L'obligation pour chaque citoyen de s'informer", "Le droit d'accéder librement à des informations fiables, sans censure, et d'exprimer ses opinions", "Le droit de l'État de filtrer les informations dangereuses", "L'obligation des médias d'être gratuits"], correcte: "Le droit d'accéder librement à des informations fiables, sans censure, et d'exprimer ses opinions", explication: "Le droit à l'information inclut la liberté d'expression (Article 19 de la DUDH) : chacun peut chercher, recevoir et répandre des informations. L'État ne peut pas censurer préalablement les publications." },
  { enonce: "Que désigne le 'conflit d'intérêts' dans le domaine médiatique ?", options: ["Quand deux journaux traitent le même sujet différemment", "Quand un propriétaire de médias a des intérêts économiques dans des secteurs qu'il est censé couvrir objectivement", "Quand un journaliste change de rédaction", "Quand un média public et un média privé traitent le même sujet"], correcte: "Quand un propriétaire de médias a des intérêts économiques dans des secteurs qu'il est censé couvrir objectivement", explication: "Ex : un industriel de l'armement qui possède un journal risque d'influencer le traitement des sujets militaires. C'est un conflit d'intérêts menaçant l'indépendance journalistique." },
  { enonce: "Quelle est la différence entre un fait et une opinion dans un article de presse ?", options: ["Les opinions sont toujours vraies, les faits sont souvent faux", "Un fait est vérifiable objectivement (date, chiffre, événement) ; une opinion est un jugement personnel ou interprétatif", "Ils sont strictement identiques", "Les faits viennent des scientifiques, les opinions des politiques"], correcte: "Un fait est vérifiable objectivement (date, chiffre, événement) ; une opinion est un jugement personnel ou interprétatif", explication: "Distinguer fait et opinion est essentiel pour l'esprit critique : 'La réunion a eu lieu le 5 mai' (fait) vs 'Cette décision était stupide' (opinion). Les deux peuvent coexister dans un article, mais doivent être identifiés." },
  { enonce: "Comment peut-on s'engager dans la vie démocratique sans être élu ?", options: ["C'est impossible sans mandat électif", "En votant, adhérant à une association ou un syndicat, signant des pétitions, participant à des manifestations pacifiques", "En regardant les actualités uniquement", "En écrivant des lettres au président"], correcte: "En votant, adhérant à une association ou un syndicat, signant des pétitions, participant à des manifestations pacifiques", explication: "La démocratie ne se limite pas aux élections : les associations (loi 1901), les syndicats, les pétitions, les grèves légales, les manifestations sont des formes légitimes d'engagement civique." },
];

const BANQUE_E2_N3 = [
  { enonce: "En quoi les réseaux sociaux transforment-ils l'espace public démocratique ?", options: ["Ils n'ont aucun impact sur la démocratie", "Ils permettent une expression directe de masse mais favorisent aussi les chambres d'écho, la désinformation et la manipulation électorale", "Ils remplacent entièrement les élections", "Ils renforcent uniquement le rôle des journalistes professionnels"], correcte: "Ils permettent une expression directe de masse mais favorisent aussi les chambres d'écho, la désinformation et la manipulation électorale", explication: "Les réseaux sociaux démocratisent la parole (chacun peut s'exprimer) mais créent des 'bulles de filtre' (on ne voit que ce qui confirme ses opinions) et facilitent la diffusion de désinformation à grande échelle." },
  { enonce: "Qu'est-ce que la 'démocratie participative' et en quoi complète-t-elle la démocratie représentative ?", options: ["Elle remplace totalement les élus", "Elle invite les citoyens à contribuer directement aux décisions (consultations, budgets participatifs, jurys citoyens) entre les élections", "Elle ne concerne que les questions locales", "C'est le droit de vote ordinaire"], correcte: "Elle invite les citoyens à contribuer directement aux décisions (consultations, budgets participatifs, jurys citoyens) entre les élections", explication: "La démocratie participative (grands débats, conventions citoyennes, budgets participatifs) complète la démocratie représentative en associant les citoyens aux décisions entre les scrutins." },
  { enonce: "Qu'est-ce que la 'démocratie délibérative' (ex : Convention Citoyenne pour le Climat) ?", options: ["Un système où seuls les experts décident", "Un processus où un panel de citoyens tirés au sort débat, s'informe et produit des recommandations sur une question complexe", "Un référendum classique", "Une commission parlementaire ordinaire"], correcte: "Un processus où un panel de citoyens tirés au sort débat, s'informe et produit des recommandations sur une question complexe", explication: "La Convention Citoyenne pour le Climat (2019-2020) réunit 150 citoyens tirés au sort qui délibèrent pendant plusieurs mois et proposent des mesures pour réduire les émissions de CO2. C'est une forme innovante de démocratie délibérative." },
  { enonce: "Pourquoi l'abstention est-elle un problème pour la démocratie ?", options: ["Car les abstentionnistes paient plus d'impôts", "Car un faible taux de participation peut fragiliser la légitimité des élus et traduire une défiance envers les institutions", "Car l'abstention est un délit punissable", "Car les résultats ne peuvent être validés si moins de 80% des inscrits votent"], correcte: "Car un faible taux de participation peut fragiliser la légitimité des élus et traduire une défiance envers les institutions", explication: "En France, l'abstention est en hausse (parfois +50% aux législatives). Cela signifie que les élus sont choisis par une minorité des inscrits — ce qui interroge leur représentativité et la vitalité de la démocratie." },
  { enonce: "Qu'est-ce que le 'droit à l'oubli' numérique et pourquoi est-il important pour la citoyenneté ?", options: ["Le droit de ne pas voter sans être sanctionné", "Le droit pour un citoyen de demander la suppression de données personnelles obsolètes ou inexactes le concernant sur internet", "L'interdiction pour les médias de mentionner le passé judiciaire d'une personnalité publique", "Le droit d'accéder anonymement aux réseaux sociaux"], correcte: "Le droit pour un citoyen de demander la suppression de données personnelles obsolètes ou inexactes le concernant sur internet", explication: "Le 'droit à l'oubli' (RGPD, arrêt Google Spain 2014) permet de demander la déréférencement de données personnelles sur les moteurs de recherche. C'est un droit fondamental à l'ère numérique, reconnu en Europe mais non universel." },
  { enonce: "Pourquoi la pétition citoyenne est-elle une forme d'engagement démocratique reconnue ?", options: ["Car elle remplace le vote", "Car elle permet aux citoyens d'alerter les élus sur un problème ou de demander l'examen d'une mesure sans attendre une élection", "Car elle est juridiquement contraignante dès la première signature", "Car elle est réservée aux associations officielles"], correcte: "Car elle permet aux citoyens d'alerter les élus sur un problème ou de demander l'examen d'une mesure sans attendre une élection", explication: "La pétition (papier ou numérique) est un droit civique : elle peut forcer un débat parlementaire si elle atteint un seuil de signatures. En France, une pétition à l'Assemblée nationale peut être examinée si elle dépasse 500 000 signatures." },
];

function genE2(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_E2_N1);
  if (niveau === 2) return genFromBank(BANQUE_E2_N2);
  return genFromBank(BANQUE_E2_N3);
}

// ==========================================================================
// E3 — La sensibilité : respect d'autrui et lutte contre le harcèlement
// ==========================================================================

const BANQUE_E3_N1 = [
  { enonce: "Quels sont les trois critères qui définissent une situation de harcèlement scolaire ?", options: ["Violence, répétition, isolement de la victime", "Tristesse, mauvaises notes, manque d'amis", "Conflit ponctuel, dispute, réconciliation", "Violence physique uniquement"], correcte: "Violence, répétition, isolement de la victime", explication: "Le harcèlement se distingue par sa nature répétée (ce n'est pas un conflit ponctuel), la relation de domination, et l'isolement progressif de la victime qui ne peut pas se défendre seule." },
  { enonce: "Que désigne le terme 'cyberharcèlement' ?", options: ["Un piratage informatique d'une entreprise", "Un harcèlement prolongé via les réseaux sociaux, messageries ou plateformes numériques", "Un jeu vidéo contenant de la violence", "Une cyberattaque visant des données personnelles"], correcte: "Un harcèlement prolongé via les réseaux sociaux, messageries ou plateformes numériques", explication: "Le cyberharcèlement est le harcèlement commis via les outils numériques (Instagram, TikTok, WhatsApp) : insultes, faux profils, exclusion de groupes, diffusion de photos sans accord." },
  { enonce: "Si tu es témoin d'une situation de harcèlement, quelle est l'attitude civique recommandée ?", options: ["Ne rien faire pour ne pas être visé à son tour", "Filmer la scène pour la partager sur les réseaux", "En parler à un adulte de confiance (enseignant, parent, CPE)", "Attendre que la victime se défende seule"], correcte: "En parler à un adulte de confiance (enseignant, parent, CPE)", explication: "Le rôle du témoin est crucial : en parler à un adulte (professeur, CPE, parent), c'est briser la loi du silence qui permet au harcèlement de continuer. Ne pas agir, c'est cautionner." },
  { enonce: "Quel numéro national peut-on appeler en cas de harcèlement scolaire ?", options: ["15 (SAMU)", "17 (Police)", "3020 (Non au harcèlement)", "3114 (Prévention suicide)"], correcte: "3020 (Non au harcèlement)", explication: "Le 3020 est le numéro national de prévention et de lutte contre le harcèlement scolaire, disponible pour élèves, parents et personnels éducatifs. Gratuit, disponible du lundi au vendredi." },
  { enonce: "Le harcèlement scolaire est-il un délit punissable par la loi ?", options: ["Non, c'est uniquement une affaire interne à l'école", "Oui, la loi française punit le harcèlement scolaire de peines de prison et d'amendes", "Oui, mais uniquement si des coups physiques sont portés", "Non, seul le cyberharcèlement est interdit par la loi"], correcte: "Oui, la loi française punit le harcèlement scolaire de peines de prison et d'amendes", explication: "La loi de 2022 renforce la lutte contre le harcèlement scolaire : jusqu'à 10 ans d'emprisonnement si le harcèlement entraîne le suicide ou une tentative de suicide de la victime (loi du 2 mars 2022)." },
  { enonce: "Quelle est la différence entre un conflit et du harcèlement ?", options: ["Il n'y a aucune différence", "Un conflit est ponctuel entre personnes de force égale ; le harcèlement est répété, avec déséquilibre de pouvoir et impossibilité pour la victime de se défendre", "Le harcèlement se passe uniquement en ligne", "Un conflit implique toujours des adultes"], correcte: "Un conflit est ponctuel entre personnes de force égale ; le harcèlement est répété, avec déséquilibre de pouvoir et impossibilité pour la victime de se défendre", explication: "Deux amis qui se disputent, c'est un conflit — normal dans la vie sociale. Le harcèlement implique une répétition, un rapport de domination et une victime qui ne peut pas se défendre ni se sortir de la situation." },
];

const BANQUE_E3_N2 = [
  { enonce: "Quelles sont les conséquences psychologiques du harcèlement sur les victimes ?", options: ["Aucune conséquence durable", "Anxiété, dépression, phobies scolaires, troubles du sommeil, isolement et dans les cas extrêmes, pensées suicidaires", "Uniquement de la timidité passagère", "Des bénéfices à long terme en termes de résilience"], correcte: "Anxiété, dépression, phobies scolaires, troubles du sommeil, isolement et dans les cas extrêmes, pensées suicidaires", explication: "Le harcèlement a des conséquences graves et durables : refus d'aller à l'école, perte de confiance en soi, dépression clinique, risques suicidaires. C'est pourquoi la prévention et la réaction rapide sont essentielles." },
  { enonce: "Comment les réseaux sociaux amplifient-ils les effets du cyberharcèlement ?", options: ["Ils permettent aux victimes de se défendre facilement", "Ils donnent au harcèlement une audience potentiellement illimitée et permanente : les messages, photos ou vidéos peuvent être vus par des milliers de personnes et restent accessibles longtemps", "Ils réduisent l'impact en dispersant les agresseurs", "Ils n'ont aucun effet particulier sur le harcèlement"], correcte: "Ils donnent au harcèlement une audience potentiellement illimitée et permanente : les messages, photos ou vidéos peuvent être vus par des milliers de personnes et restent accessibles longtemps", explication: "Contrairement au harcèlement en face-à-face, le cyber-harcèlement est visible par une audience illimitée, accessible 24h/24 et difficile à effacer. L'humiliation peut être amplifiée à l'infini." },
  { enonce: "Qu'est-ce que l'empathie et pourquoi est-elle fondamentale dans la prévention du harcèlement ?", options: ["L'empathie est la capacité à se mettre à la place de l'autre et à ressentir ce qu'il vit — elle permet de comprendre la souffrance de la victime et d'agir", "L'empathie est une faiblesse qui expose à la manipulation", "L'empathie est une technique d'interrogatoire policier", "L'empathie concerne uniquement les professionnels de santé"], correcte: "L'empathie est la capacité à se mettre à la place de l'autre et à ressentir ce qu'il vit — elle permet de comprendre la souffrance de la victime et d'agir", explication: "Développer l'empathie en classe (débats sur le ressenti, jeux de rôle) permet aux élèves de comprendre l'impact de leurs actes. C'est un outil clé de prévention du harcèlement." },
  { enonce: "Pourquoi les auteurs de harcèlement ont-ils eux aussi besoin d'aide ?", options: ["Car ils sont toujours des victimes de harcèlement à leur tour", "Car leurs comportements révèlent souvent un mal-être personnel ou des difficultés relationnelles qui nécessitent un accompagnement", "Car ils risquent d'être expulsés de l'école", "Car ils sont responsables des problèmes financiers de leurs familles"], correcte: "Car leurs comportements révèlent souvent un mal-être personnel ou des difficultés relationnelles qui nécessitent un accompagnement", explication: "Le harceleur n'est pas 'né mauvais' : ses comportements peuvent résulter d'une violence subie, d'un manque de repères ou d'une faible estime de soi. L'éducation et le suivi psychologique peuvent transformer ces comportements." },
  { enonce: "Qu'est-ce que la 'charte de l'écolier' ou le règlement intérieur scolaire en lien avec le harcèlement ?", options: ["Un document purement administratif sans effet réel", "Un cadre de règles collectives rappelant les droits et devoirs de chacun, servant de référence pour sanctionner et prévenir les comportements harcelants", "Une liste de punitions imposées par les enseignants", "Un formulaire que seuls les parents doivent signer"], correcte: "Un cadre de règles collectives rappelant les droits et devoirs de chacun, servant de référence pour sanctionner et prévenir les comportements harcelants", explication: "Le règlement intérieur définit les comportements acceptables et ceux qui sont sanctionnés. En lien avec la loi, il protège les élèves et pose un cadre clair : le respect de l'autre est une exigence, pas une option." },
  { enonce: "Quelle est l'importance du signalement par les adultes face au harcèlement scolaire ?", options: ["Les adultes ne doivent pas s'impliquer dans les conflits entre jeunes", "Les adultes (enseignants, CPE, parents) ont l'obligation morale et légale de signaler et d'agir dès qu'ils ont connaissance d'une situation de harcèlement", "Les adultes peuvent signaler, mais uniquement la direction de l'établissement a le droit d'agir", "Le signalement par les adultes empire souvent la situation pour la victime"], correcte: "Les adultes (enseignants, CPE, parents) ont l'obligation morale et légale de signaler et d'agir dès qu'ils ont connaissance d'une situation de harcèlement", explication: "Depuis la loi de 2022, les personnels éducatifs ont une obligation de signalement. Ne pas agir peut engager leur responsabilité. Les parents peuvent aussi saisir directement le chef d'établissement, le recteur ou la police." },
];

const BANQUE_E3_N3 = [
  { enonce: "Qu'est-ce que la 'loi du silence' et pourquoi est-elle néfaste dans les situations de harcèlement ?", options: ["Une loi officielle interdisant de parler d'un crime", "La tendance des témoins à ne pas rapporter le harcèlement par peur d'être à leur tour victimes — elle permet au harcèlement de durer", "Un accord entre parents pour ne pas médiatiser l'affaire", "Une stratégie recommandée par les psychologues pour protéger la victime"], correcte: "La tendance des témoins à ne pas rapporter le harcèlement par peur d'être à leur tour victimes — elle permet au harcèlement de durer", explication: "La 'loi du silence' (ou omerta) empêche les témoins d'intervenir ou de prévenir les adultes. Elle est l'alliée principale du harceleur et doit être brisée pour protéger les victimes." },
  { enonce: "En quoi le respect de la dignité humaine est-il fondamental dans la lutte contre le harcèlement ?", options: ["Il oblige à tolérer tous les comportements au nom de la liberté d'expression", "La dignité humaine interdit de traiter une personne comme inférieure, de l'humilier ou de la soumettre : le harcèlement la viole systématiquement", "Il n'a aucun rapport avec le harcèlement scolaire", "Il signifie que seuls les adultes ont des droits à protéger"], correcte: "La dignité humaine interdit de traiter une personne comme inférieure, de l'humilier ou de la soumettre : le harcèlement la viole systématiquement", explication: "La dignité humaine (article 1er de la DUDH) est le fondement de tous les droits. Le harcèlement, qui humilie et dégrade la victime, en est une violation directe — c'est pourquoi il est à la fois immoral et illégal." },
  { enonce: "Quel rôle peut jouer la médiation par les pairs dans la prévention du harcèlement ?", options: ["Elle est inutile car seuls les adultes peuvent résoudre les conflits", "Elle forme des élèves 'médiateurs' qui aident à désamorcer les conflits entre pairs avant qu'ils ne dégénèrent en harcèlement", "Elle remplace entièrement le rôle des adultes", "Elle concerne uniquement les conflits entre enseignants"], correcte: "Elle forme des élèves 'médiateurs' qui aident à désamorcer les conflits entre pairs avant qu'ils ne dégénèrent en harcèlement", explication: "Des programmes forment des élèves médiateurs (souvent en CM2, 6e, 5e) pour identifier les tensions et aider à les résoudre. La médiation par les pairs est une approche préventive efficace car les pairs sont plus accessibles que les adultes pour d'autres élèves." },
  { enonce: "Comment le cadre juridique français évolue-t-il pour mieux lutter contre le harcèlement scolaire ?", options: ["Il s'affaiblit depuis 2010 sous pression des associations de parents", "Il se renforce : loi de 2022, qualification pénale spécifique, peines alourdies si le harcèlement entraîne des conséquences graves", "Il ne bouge pas depuis 1985", "Le harcèlement scolaire n'est toujours pas reconnu comme une infraction pénale spécifique"], correcte: "Il se renforce : loi de 2022, qualification pénale spécifique, peines alourdies si le harcèlement entraîne des conséquences graves", explication: "La loi du 2 mars 2022 crée un délit spécifique de 'harcèlement scolaire', avec jusqu'à 10 ans d'emprisonnement si le harcèlement conduit à un suicide ou une tentative de suicide. Elle renforce aussi l'obligation de signalement pour les établissements." },
  { enonce: "Qu'est-ce que le 'programme pHARe' mis en place dans les écoles françaises ?", options: ["Un programme de lutte contre la pollution dans les établissements scolaires", "Un programme national de prévention du harcèlement à l'école, incluant formation des équipes, sensibilisation des élèves et protocoles de traitement", "Un programme de soutien psychologique uniquement pour les enseignants", "Un programme informatique de surveillance des réseaux sociaux des élèves"], correcte: "Un programme national de prévention du harcèlement à l'école, incluant formation des équipes, sensibilisation des élèves et protocoles de traitement", explication: "Le programme pHARe (2021-) est déployé dans toutes les écoles primaires et collèges : il forme les équipes à repérer le harcèlement, sensibilise les élèves et instaure des protocoles de traitement obligatoires." },
  { enonce: "Comment l'identité numérique d'un élève peut-elle être exploitée dans le cyberharcèlement ?", options: ["L'identité numérique ne peut jamais être utilisée contre quelqu'un", "Des harceleurs peuvent créer de faux profils, diffuser des photos privées ou usurper l'identité d'une victime pour l'humilier devant un large public", "L'identité numérique n'existe que sur les réseaux professionnels comme LinkedIn", "Seuls les adultes ont une identité numérique exploitable"], correcte: "Des harceleurs peuvent créer de faux profils, diffuser des photos privées ou usurper l'identité d'une victime pour l'humilier devant un large public", explication: "L'usurpation d'identité numérique, la diffusion non consentie d'images intimes ('revenge porn') et les faux profils sont des formes de cyberharcèlement punies par la loi. Ils amplifient l'humiliation au-delà du cercle scolaire." },
];

function genE3(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_E3_N1);
  if (niveau === 2) return genFromBank(BANQUE_E3_N2);
  return genFromBank(BANQUE_E3_N3);
}

// ==========================================================================
// S1 — Génétique : Chromosomes & Caractères
// ==========================================================================

const BANQUE_S1_N1 = [
  { enonce: "Où se situent les chromosomes dans la cellule ?", options: ["Dans la membrane cellulaire", "Dans le cytoplasme", "Dans le noyau", "Dans les mitochondries"], correcte: "Dans le noyau", explication: "Les chromosomes (porteurs de l'ADN) sont situés dans le noyau des cellules. Lors de la division cellulaire, ils deviennent visibles sous forme de bâtonnets." },
  { enonce: "Combien de chromosomes possède une cellule humaine ordinaire (somatique) ?", options: ["23", "44", "46", "48"], correcte: "46", explication: "Les cellules humaines (sauf les gamètes) contiennent 46 chromosomes, soit 23 paires. Cette double dotation est le caryotype diploïde (2n = 46)." },
  { enonce: "Quelle est la paire de chromosomes sexuels d'un individu de sexe masculin ?", options: ["XX", "XO", "YY", "XY"], correcte: "XY", explication: "Les hommes ont 2 chromosomes sexuels : X et Y (paire XY). Les femmes ont 2 chromosomes X (paire XX). C'est le chromosome Y qui détermine le sexe masculin." },
  { enonce: "Comment nomme-t-on les différentes versions d'un même gène ?", options: ["Les phénotypes", "Les génotypes", "Les allèles", "Les mutations"], correcte: "Les allèles", explication: "Un gène peut exister sous différentes versions appelées allèles. Par exemple, pour le groupe sanguin ABO, les allèles sont A, B et O. Chaque individu en possède deux (un par chromosome)." },
  { enonce: "Qu'est-ce que l'ADN ?", options: ["Une hormone produite dans le noyau", "La molécule qui porte l'information génétique héréditaire dans les chromosomes", "Un type de cellule sanguine", "Une protéine musculaire"], correcte: "La molécule qui porte l'information génétique héréditaire dans les chromosomes", explication: "L'ADN (Acide DésoxyriboNucléique) est le support de l'information génétique. Il est organisé en chromosomes dans le noyau et contient les gènes qui déterminent nos caractères." },
  { enonce: "Comment appelle-t-on les cellules reproductrices (spermatozoïdes et ovules) ?", options: ["Les cellules somatiques", "Les gamètes", "Les neurones", "Les leucocytes"], correcte: "Les gamètes", explication: "Les gamètes (spermatozoïde et ovule) sont des cellules reproductrices haploïdes (n = 23 chromosomes). Leur fusion lors de la fécondation donne un œuf diploïde (2n = 46)." },
  { enonce: "Qu'est-ce que la fécondation ?", options: ["La division d'une cellule en deux cellules identiques", "La fusion d'un spermatozoïde et d'un ovule donnant un œuf (zygote) à 46 chromosomes", "La fabrication de protéines à partir de l'ADN", "La mue de la peau lors de la croissance"], correcte: "La fusion d'un spermatozoïde et d'un ovule donnant un œuf (zygote) à 46 chromosomes", explication: "La fécondation réunit le gamète mâle (23 chromosomes) et le gamète femelle (23 chromosomes) pour former un œuf (23 + 23 = 46 chromosomes) qui se développera en nouvel individu." },
];

const BANQUE_S1_N2 = [
  { enonce: "Quelle est la différence entre le génotype et le phénotype d'un individu ?", options: ["Ce sont des synonymes", "Le génotype est l'ensemble des allèles (constitution génétique) ; le phénotype est l'ensemble des caractères observables", "Le phénotype est héréditaire, le génotype ne l'est pas", "Le génotype se voit à l'œil nu, pas le phénotype"], correcte: "Le génotype est l'ensemble des allèles (constitution génétique) ; le phénotype est l'ensemble des caractères observables", explication: "Le génotype (AA, Aa, aa) est invisible. Le phénotype (taille, couleur des yeux, groupe sanguin) est observable. Le phénotype résulte du génotype mais aussi de l'environnement (alimentation, température)." },
  { enonce: "Qu'est-ce qu'une mutation génétique ?", options: ["Le passage d'un caractère d'un parent à un enfant", "Une modification accidentelle de la séquence d'ADN, pouvant être héréditaire si elle touche les gamètes", "La division cellulaire normale", "Un saut générationnel d'un caractère"], correcte: "Une modification accidentelle de la séquence d'ADN, pouvant être héréditaire si elle touche les gamètes", explication: "Une mutation est un changement dans la séquence d'ADN (ajout, suppression, substitution de nucléotides). Souvent sans effet, elle peut être bénéfique (moteur de l'évolution) ou nocive (maladie génétique)." },
  { enonce: "Comment se nomme la division cellulaire qui produit des cellules identiques à la cellule mère, assurant la croissance ?", options: ["La méiose", "La mitose", "La fécondation", "La duplication"], correcte: "La mitose", explication: "La mitose est la division cellulaire 'ordinaire' : une cellule mère diploïde (2n=46) donne deux cellules filles identiques (2n=46). Elle assure la croissance, le renouvellement et la cicatrisation." },
  { enonce: "Quelle division cellulaire spéciale produit les gamètes (spermatozoïdes et ovules) avec seulement 23 chromosomes ?", options: ["La mitose", "La multiplication", "La méiose", "La cytokinèse"], correcte: "La méiose", explication: "La méiose est une double division cellulaire qui réduit de moitié le nombre de chromosomes (2n=46 → n=23). Elle produit des gamètes haploïdes, assurant que la fécondation redonne 46 chromosomes." },
  { enonce: "Qu'est-ce qu'un caractère héréditaire ?", options: ["Un caractère acquis par l'éducation", "Un caractère codé par les gènes et transmissible des parents aux enfants par les gamètes", "Un caractère visible uniquement après 20 ans", "Un caractère modifié par l'alimentation"], correcte: "Un caractère codé par les gènes et transmissible des parents aux enfants par les gamètes", explication: "Les caractères héréditaires (groupe sanguin, couleur des yeux, certaines maladies) sont portés par les chromosomes transmis via les gamètes. À distinguer des caractères acquis (cicatrice, bronzage)." },
  { enonce: "Qu'est-ce qu'un allèle dominant ?", options: ["L'allèle le plus fréquent dans la population", "L'allèle qui s'exprime dans le phénotype même en présence d'un seul exemplaire (à l'état hétérozygote)", "L'allèle qui n'apparaît jamais dans le phénotype", "L'allèle situé sur les chromosomes sexuels"], correcte: "L'allèle qui s'exprime dans le phénotype même en présence d'un seul exemplaire (à l'état hétérozygote)", explication: "Un allèle est dominant (noté A) si sa présence suffit à s'exprimer : genotype Aa → phénotype A. L'allèle récessif (a) ne s'exprime que si l'individu possède deux exemplaires (aa)." },
];

const BANQUE_S1_N3 = [
  { enonce: "Comment expliquer qu'un enfant puisse avoir les yeux bleus alors que ses deux parents ont les yeux marron ?", options: ["C'est une mutation spontanée", "Les parents sont hétérozygotes (Aa) : chacun transmet l'allèle récessif (a), donnant un enfant (aa) aux yeux bleus", "Les yeux bleus sont dominants sur les yeux marron", "Cela est impossible en génétique"], correcte: "Les parents sont hétérozygotes (Aa) : chacun transmet l'allèle récessif (a), donnant un enfant (aa) aux yeux bleus", explication: "Si les deux parents Aa (yeux marron car A dominant) transmettent chacun leur allèle récessif a, l'enfant aa aura les yeux bleus — probabilité 1/4 (croix de Punnett)." },
  { enonce: "Qu'est-ce qu'une maladie génétique héréditaire comme la mucoviscidose ?", options: ["Une maladie causée par un virus génétiquement modifié", "Une maladie due à la présence de deux allèles récessifs mutés (aa) — les parents porteurs sains (Aa) ne sont pas malades", "Une maladie uniquement transmise par la mère", "Une maladie causée par l'environnement et non par les gènes"], correcte: "Une maladie due à la présence de deux allèles récessifs mutés (aa) — les parents porteurs sains (Aa) ne sont pas malades", explication: "La mucoviscidose est récessive : pour être malade, il faut avoir deux allèles mutés (aa). Les parents Aa sont 'porteurs sains'. Si deux Aa ont un enfant, risque 1/4 d'enfant malade." },
  { enonce: "En quoi l'environnement influence-t-il l'expression des gènes (épigénétique) ?", options: ["L'environnement n'influence jamais les gènes", "Alimentation, stress, exposition à des toxiques peuvent activer ou désactiver certains gènes sans modifier la séquence d'ADN — c'est l'épigénétique", "L'environnement remplace entièrement le rôle des gènes", "Seule la température affecte les gènes, pas les autres facteurs"], correcte: "Alimentation, stress, exposition à des toxiques peuvent activer ou désactiver certains gènes sans modifier la séquence d'ADN — c'est l'épigénétique", explication: "L'épigénétique montre que l'expression des gènes est influencée par l'environnement (méthylation de l'ADN). Fumer pendant la grossesse peut modifier l'expression génique du fœtus de manière durable." },
  { enonce: "Qu'est-ce que le caryotype et à quoi sert-il ?", options: ["Un test sanguin pour mesurer les globules rouges", "La représentation ordonnée des chromosomes d'une cellule, permettant de détecter des anomalies chromosomiques", "Un type de mutation génétique", "Une technique de clonage cellulaire"], correcte: "La représentation ordonnée des chromosomes d'une cellule, permettant de détecter des anomalies chromosomiques", explication: "Le caryotype est réalisé à partir d'une cellule : les chromosomes sont photographiés, ordonnés par paires et analysés. Il permet de détecter la trisomie 21 (3 chromosomes 21 au lieu de 2) ou d'autres anomalies." },
  { enonce: "Qu'est-ce que la trisomie 21 et comment se détecte-t-elle ?", options: ["Une infection virale transmissible", "Une anomalie chromosomique due à la présence d'un 3e chromosome 21 au lieu de 2, détectable par caryotype ou test prénatal", "Une maladie héréditaire liée au chromosome X", "Un trouble de la croissance lié à l'alimentation"], correcte: "Une anomalie chromosomique due à la présence d'un 3e chromosome 21 au lieu de 2, détectable par caryotype ou test prénatal", explication: "La trisomie 21 (syndrome de Down) résulte d'une non-disjonction lors de la méiose : l'enfant reçoit 3 chromosomes 21 (47 chromosomes au total). Le caryotype prénatal (amniocentèse) ou les tests ADN permettent de la détecter." },
  { enonce: "Pourquoi la diversité génétique est-elle essentielle à la survie des espèces ?", options: ["Elle ralentit la reproduction et favorise l'extinction", "Elle permet à certains individus de survivre aux maladies, aux changements climatiques ou à d'autres pressions environnementales, assurant la continuité de l'espèce", "Elle est uniquement avantageuse pour les plantes, pas pour les animaux", "Elle n'a aucun lien avec la survie d'une espèce"], correcte: "Elle permet à certains individus de survivre aux maladies, aux changements climatiques ou à d'autres pressions environnementales, assurant la continuité de l'espèce", explication: "Plus une population est génétiquement diversifiée, plus elle est résiliente face aux pandémies, changements d'habitat ou parasites. Les populations génétiquement homogènes (consanguinité) sont plus vulnérables à l'extinction." },
];

function genS1(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_S1_N1);
  if (niveau === 2) return genFromBank(BANQUE_S1_N2);
  return genFromBank(BANQUE_S1_N3);
}

// ==========================================================================
// S2 — Forces, Gravitation & Mouvements
// ==========================================================================

const BANQUE_S2_N1 = [
  { enonce: "Quelle est l'unité internationale (SI) de mesure d'une force ?", options: ["Le kilogramme (kg)", "Le joule (J)", "Le newton (N)", "Le watt (W)"], correcte: "Le newton (N)", explication: "La force se mesure en newtons (N), en hommage à Isaac Newton. La masse se mesure en kilogrammes (kg). Attention : le poids est une force (N), pas une masse (kg) !" },
  { enonce: "Quelle est l'unité de mesure de la masse d'un objet ?", options: ["Le newton (N)", "Le kilogramme (kg)", "Le joule (J)", "Le pascal (Pa)"], correcte: "Le kilogramme (kg)", explication: "La masse se mesure en kilogrammes (kg) avec une balance. C'est une propriété intrinsèque de l'objet (ne varie pas selon l'endroit). Le poids, lui, est une force qui varie selon la gravité locale." },
  { enonce: "Sur la Lune, la masse d'un astronaute est-elle différente de sa masse sur Terre ?", options: ["Oui, elle est 6 fois plus faible", "Non, la masse reste identique partout dans l'univers", "Oui, elle est nulle dans l'espace", "Cela dépend de la taille de l'astronaute"], correcte: "Non, la masse reste identique partout dans l'univers", explication: "La masse est une propriété intrinsèque : elle ne change pas selon le lieu (Terre, Lune, espace). En revanche, le poids change : sur la Lune (g ≈ 1,6 N/kg), il est 6 fois plus faible que sur Terre (g ≈ 10 N/kg)." },
  { enonce: "Qu'est-ce que le poids d'un objet ?", options: ["La même chose que sa masse", "La force exercée par la gravité sur l'objet, dépendant de la masse et de g", "La résistance de l'objet au mouvement", "La pression qu'exerce l'objet sur le sol"], correcte: "La force exercée par la gravité sur l'objet, dépendant de la masse et de g", explication: "Le poids P = m × g est une force gravitationnelle (en N). Sur Terre, g ≈ 10 N/kg. Un objet de 5 kg a un poids de 5 × 10 = 50 N sur Terre, mais 5 × 1,6 = 8 N sur la Lune." },
  { enonce: "Qu'est-ce qu'un mouvement rectiligne uniforme (MRU) ?", options: ["Un mouvement en courbe à vitesse constante", "Un mouvement en ligne droite à vitesse constante", "Un mouvement en ligne droite avec accélération", "Un mouvement circulaire à vitesse variable"], correcte: "Un mouvement en ligne droite à vitesse constante", explication: "Le MRU (mouvement rectiligne uniforme) est un mouvement en ligne droite (rectiligne) à vitesse constante (uniforme). Il résulte d'une situation où les forces qui s'exercent sur l'objet se compensent (résultante nulle)." },
  { enonce: "Qu'est-ce que la gravitation universelle (selon Newton) ?", options: ["La force qui fait tourner les électrons autour du noyau", "La force d'attraction mutuelle entre tout corps possédant une masse", "La force électromagnétique entre corps chargés", "La force qui propulse les fusées"], correcte: "La force d'attraction mutuelle entre tout corps possédant une masse", explication: "La loi de gravitation universelle de Newton stipule que tout corps massif attire tous les autres corps massifs. La Terre attire la pomme, mais la pomme attire aussi la Terre (bien qu'on ne le perçoive pas)." },
  { enonce: "Quelle est l'unité de mesure de la vitesse dans le système international ?", options: ["Le km/h", "Le m/s", "Le nœud", "Le Mach"], correcte: "Le m/s", explication: "La vitesse se mesure en mètres par seconde (m/s) dans le système SI. La vitesse en km/h est courante dans la vie quotidienne : 1 m/s = 3,6 km/h." },
];

const BANQUE_S2_N2 = [
  { enonce: "Comment appelle-t-on un mouvement en ligne droite dont la vitesse augmente ?", options: ["Mouvement rectiligne uniforme", "Mouvement circulaire", "Mouvement rectiligne accéléré", "Mouvement oscillatoire"], correcte: "Mouvement rectiligne accéléré", explication: "Le mouvement rectiligne accéléré est un mouvement en ligne droite avec augmentation de la vitesse au cours du temps (ex : une voiture qui démarre)." },
  { enonce: "Que se passe-t-il pour le mouvement d'un objet si la résultante des forces qui s'exercent sur lui est nulle ?", options: ["Il s'arrête immédiatement", "Il conserve son état de repos ou de mouvement rectiligne uniforme (principe d'inertie)", "Il accélère indéfiniment", "Il suit une trajectoire circulaire"], correcte: "Il conserve son état de repos ou de mouvement rectiligne uniforme (principe d'inertie)", explication: "C'est le principe d'inertie (1re loi de Newton) : si la résultante des forces est nulle, un objet au repos reste au repos, et un objet en mouvement continue en ligne droite à vitesse constante." },
  { enonce: "Qu'est-ce que la poussée d'Archimède ?", options: ["La résistance de l'eau à la pénétration d'un corps", "La force verticale vers le haut exercée par un fluide sur tout corps qui y est immergé", "La friction de l'eau sur la coque d'un bateau", "La pression exercée par un corps sur le fond d'un récipient"], correcte: "La force verticale vers le haut exercée par un fluide sur tout corps qui y est immergé", explication: "La poussée d'Archimède (P_A = ρ × V × g) est une force dirigée vers le haut, égale au poids du fluide déplacé. Elle explique pourquoi les bateaux flottent et pourquoi les corps semblent plus légers dans l'eau." },
  { enonce: "Pourquoi les astronautes sont-ils en apesanteur dans la Station Spatiale Internationale (SSI) ?", options: ["Parce qu'il n'y a pas de gravité dans l'espace", "Parce que la SSI est en chute libre permanente autour de la Terre (orbite), et les astronautes tombent avec elle", "Parce que la SSI produit une anti-gravité artificielle", "Parce que les astronautes pèsent moins de 10 kg en orbite"], correcte: "Parce que la SSI est en chute libre permanente autour de la Terre (orbite), et les astronautes tombent avec elle", explication: "L'apesanteur en orbite n'est pas une absence de gravité (g ≈ 9 N/kg à 400 km d'altitude) mais un état de chute libre continue : la station et ses occupants 'tombent' vers la Terre à la même vitesse, en permanence." },
  { enonce: "Quelle est la différence entre vitesse instantanée et vitesse moyenne ?", options: ["Ce sont des synonymes", "La vitesse moyenne est la distance totale divisée par le temps total ; la vitesse instantanée est la vitesse à un instant précis", "La vitesse instantanée est toujours supérieure à la vitesse moyenne", "La vitesse moyenne s'obtient avec un chronomètre, la vitesse instantanée avec un radar"], correcte: "La vitesse moyenne est la distance totale divisée par le temps total ; la vitesse instantanée est la vitesse à un instant précis", explication: "Vitesse moyenne v_m = d/t. Vitesse instantanée : valeur à un moment donné (mesurée par un tachymètre). On peut rouler à 90 km/h en moyenne mais avoir eu 130 km/h à un instant donné." },
  { enonce: "Qu'est-ce que la friction (ou frottement) et quel est son effet sur le mouvement ?", options: ["Une force qui accélère toujours les objets", "Une force qui s'oppose au mouvement d'un objet en contact avec une surface, tendant à ralentir ou arrêter ce mouvement", "Une force uniquement présente dans l'eau", "La même chose que la gravité"], correcte: "Une force qui s'oppose au mouvement d'un objet en contact avec une surface, tendant à ralentir ou arrêter ce mouvement", explication: "La friction (frottement) est une force de contact qui s'oppose au déplacement relatif de deux surfaces. Elle est utile (freinage de voiture, marche) mais aussi une cause de perte d'énergie (moteurs, machines)." },
];

function genS2_n3_calcul() {
  const m = pick([1, 2, 3, 4, 5, 10, 15, 20, 50]);
  const g = 10;
  const P = m * g;
  const enonce = `Un objet a une masse de ${m} kg. En prenant g = 10 N/kg, quel est son poids sur Terre ?`;
  const correcte = `${P} N`;
  const distracteurs = [`${m} N`, `${P / 2} N`, `${P * 2} N`];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genS2_n3_calcul();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `P = m × g = ${m} × 10 = ${P} N. Attention : la masse est en kg, le poids en newtons (N).`
  };
}

function genS2(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_S2_N1);
  if (niveau === 2) return genFromBank(BANQUE_S2_N2);
  return genS2_n3_calcul();
}

// ==========================================================================
// S3 — Électricité : circuits et grandeurs
// ==========================================================================

const BANQUE_S3_N1 = [
  { enonce: "Quelle est l'unité de l'intensité du courant électrique ?", options: ["Le volt (V)", "L'ampère (A)", "L'ohm (Ω)", "Le watt (W)"], correcte: "L'ampère (A)", explication: "L'intensité (I) est la quantité de charges électriques qui circulent par seconde. Elle se mesure en ampères (A) avec un ampèremètre branché en série dans le circuit." },
  { enonce: "Quelle est l'unité de la tension électrique (différence de potentiel) ?", options: ["L'ampère (A)", "L'ohm (Ω)", "Le volt (V)", "Le watt (W)"], correcte: "Le volt (V)", explication: "La tension (U) est la 'pression électrique' qui fait circuler le courant. Elle se mesure en volts (V) avec un voltmètre branché en parallèle." },
  { enonce: "Quelle est l'unité de la résistance électrique ?", options: ["Le volt (V)", "L'ampère (A)", "Le watt (W)", "L'ohm (Ω)"], correcte: "L'ohm (Ω)", explication: "La résistance (R) mesure l'opposition d'un composant au passage du courant. Elle se mesure en ohms (Ω). Plus R est grande, plus le courant passe difficilement." },
  { enonce: "Dans un circuit en série, comment se comporte l'intensité du courant électrique ?", options: ["Elle est différente à chaque point du circuit", "Elle est la même en tout point du circuit", "Elle diminue après chaque dipôle", "Elle s'annule après le dernier dipôle"], correcte: "Elle est la même en tout point du circuit", explication: "Loi de l'intensité en série : I est identique partout dans un circuit série. Il n'y a qu'un seul chemin pour le courant, donc I₁ = I₂ = I₃ = I_total." },
  { enonce: "Dans un circuit en dérivation (parallèle), comment se comporte la tension ?", options: ["Elle est nulle sur toutes les branches", "La tension est la même aux bornes de chaque branche en dérivation", "Elle est différente sur chaque branche", "Elle s'additionne dans chaque branche"], correcte: "La tension est la même aux bornes de chaque branche en dérivation", explication: "Loi de la tension en dérivation : U est identique pour toutes les branches branchées en parallèle. C'est pourquoi dans une maison (circuit en dérivation), chaque appareil reçoit 230 V." },
  { enonce: "Qu'est-ce qu'un court-circuit ?", options: ["Un circuit trop long pour faire passer le courant", "Un chemin de faible résistance qui court-circuite un composant, pouvant provoquer un échauffement dangereux", "Un circuit en série avec beaucoup de résistances", "Un circuit sans interrupteur"], correcte: "Un chemin de faible résistance qui court-circuite un composant, pouvant provoquer un échauffement dangereux", explication: "Un court-circuit crée un chemin de résistance quasi-nulle : l'intensité devient très élevée (loi d'Ohm : I = U/R), provoquant un échauffement et un risque d'incendie. C'est pourquoi les fusibles et disjoncteurs existent." },
  { enonce: "Que mesure un voltmètre et comment doit-il être branché ?", options: ["Il mesure l'intensité et se branche en série", "Il mesure la tension et se branche en parallèle (aux bornes du composant)", "Il mesure la résistance et se branche n'importe comment", "Il mesure la puissance et se branche en série"], correcte: "Il mesure la tension et se branche en parallèle (aux bornes du composant)", explication: "Le voltmètre mesure la tension (différence de potentiel) entre deux points. Il doit être branché en parallèle (aux bornes du composant mesuré). Il a une résistance interne très élevée pour ne pas modifier le circuit." },
];

const BANQUE_S3_N2 = [
  { enonce: "Comment les tensions s'ajoutent-elles dans un circuit en série ?", options: ["La tension totale est celle du générateur uniquement", "La tension totale est nulle", "La tension totale est la somme des tensions aux bornes de chaque dipôle : U_total = U₁ + U₂ + ...", "La tension se divise en parts égales quoi qu'il arrive"], correcte: "La tension totale est la somme des tensions aux bornes de chaque dipôle : U_total = U₁ + U₂ + ...", explication: "Loi des tensions en série (loi des mailles) : la tension du générateur est partagée entre les différents dipôles. U = U₁ + U₂ + U₃. Si deux résistances identiques sont en série avec 12 V : 6 V + 6 V." },
  { enonce: "Comment les intensités se répartissent-elles dans un circuit en dérivation ?", options: ["L'intensité est nulle sur les branches parallèles", "L'intensité se répartit dans les branches : I_total = I₁ + I₂ + ...", "L'intensité totale est celle de la branche la plus résistante", "Les intensités des branches sont toutes nulles sauf une"], correcte: "L'intensité se répartit dans les branches : I_total = I₁ + I₂ + ...", explication: "Loi des intensités en dérivation (loi des nœuds) : l'intensité totale sortant du générateur se divise dans les branches parallèles. I_total = I₁ + I₂ + I₃. La branche la moins résistante reçoit le plus de courant." },
  { enonce: "Qu'est-ce que la puissance électrique et quelle est son unité ?", options: ["C'est la tension multipliée par la résistance, en ohms", "C'est l'énergie dissipée par unité de charge, en joules", "C'est la tension multipliée par l'intensité (P = U × I), en watts (W)", "C'est la résistance divisée par l'intensité, en ampères"], correcte: "C'est la tension multipliée par l'intensité (P = U × I), en watts (W)", explication: "La puissance électrique P = U × I (en watts). Ex : une ampoule de 60 W branchée sur 230 V consomme I = P/U = 60/230 ≈ 0,26 A." },
  { enonce: "Qu'est-ce que la loi d'Ohm et à quoi sert-elle ?", options: ["Elle donne la relation entre masse et poids : P = mg", "Elle relie tension, intensité et résistance : U = R × I", "Elle décrit le mouvement des charges dans un champ magnétique", "Elle définit la puissance électrique d'un circuit"], correcte: "Elle relie tension, intensité et résistance : U = R × I", explication: "La loi d'Ohm (U = R × I) permet de calculer n'importe laquelle des trois grandeurs si les deux autres sont connues : R = U/I, I = U/R. Elle s'applique aux résistances (dipôles ohmiques)." },
  { enonce: "Si on double la résistance dans un circuit à tension constante, que se passe-t-il pour l'intensité ?", options: ["Elle double", "Elle reste identique", "Elle est divisée par deux", "Elle s'annule"], correcte: "Elle est divisée par deux", explication: "D'après la loi d'Ohm : I = U/R. Si U est constante et R double, I = U/(2R) = (1/2) × U/R : l'intensité est divisée par deux. Plus la résistance augmente, moins le courant passe." },
  { enonce: "Pourquoi les maisons utilisent-elles des circuits en dérivation plutôt qu'en série ?", options: ["Car les circuits en série sont trop coûteux à installer", "Car en dérivation, chaque appareil reçoit la même tension (230 V) et peut fonctionner indépendamment des autres", "Car les circuits en série consomment trop peu d'électricité", "Car les circuits en série font griller les fusibles immédiatement"], correcte: "Car en dérivation, chaque appareil reçoit la même tension (230 V) et peut fonctionner indépendamment des autres", explication: "En série, si un appareil tombe en panne, tout le circuit est coupé. En dérivation, chaque appareil reçoit les 230 V du réseau et fonctionne indépendamment. C'est le seul schéma pratique pour une habitation." },
];

function genS3_n3_ohm() {
  const R = pick([10, 20, 50, 100, 200, 500]);
  const I_num = pick([1, 2, 4, 5, 10]);
  const I_den = pick([10, 100]);
  const I = I_num / I_den;
  const U = Math.round(R * I * 100) / 100;
  const enonce = `Un dipôle ohmique a une résistance R = ${R} Ω. L'intensité qui le traverse est I = ${I} A. Quelle est la tension à ses bornes (U = R × I) ?`;
  const correcte = `${U} V`;
  const distracteurs = [`${R + I} V`, `${Math.round((R / I) * 100) / 100} V`, `${U * 2} V`];
  const options = uniqueOptionsFromList(distracteurs, correcte);
  if (!options) return genS3_n3_ohm();
  return {
    enonce,
    options,
    bonne_reponse: options.indexOf(correcte),
    explication: `U = R × I = ${R} × ${I} = ${U} V (loi d'Ohm).`
  };
}

function genS3(niveau) {
  if (niveau === 1) return genFromBank(BANQUE_S3_N1);
  if (niveau === 2) return genFromBank(BANQUE_S3_N2);
  return genS3_n3_ohm();
}

// ==========================================================================
// EXPORT pour Node.js (tests) — sera retiré lors de l'intégration dans app.js
// ==========================================================================

// Pilote Maths : 7 chapitres branchés sur des générateurs procéduraux.
// 20 cellules niveau×chapitre sur 21 sont purement génératives (calcul aléatoire
// ou banque large) ; seule m2-n1 (Pythagore/trigo : type de triangle requis) reste
// partiellement statique, avec 2-3 reformulations écrites à la main (cf. fonction
// genM2_n1 dans la section MOTEUR DE GÉNÉRATION — PILOTE MATHS ci-dessus).
const GENERATEURS_MATHS = {
  m1: genM1, m2: genM2, m3: genM3, m4: genM4, m5: genM5, m6: genM6, m7: genM7,
  f1: genF1, f2: genF2, f3: genF3, f4: genF4,
  h1: genH1, h2: genH2, h3: genH3, h4: genH4,
  g1: genG1, g2: genG2,
  e1: genE1, e2: genE2, e3: genE3,
  s1: genS1, s2: genS2, s3: genS3
};

function lancerQuiz(niveau) {
  AppState.quiz.chapitreId = currentChapitreSelected.id;
  AppState.quiz.idx = 0;
  AppState.quiz.score = 0;
  AppState.quiz.isAutomatisme = false;
  AppState.quiz.niveauFiltre = niveau;

  const generateurChapitre = GENERATEURS_MATHS[currentChapitreSelected.id];
  if (generateurChapitre) {
    // Chapitre piloté : 5 questions générées à la volée, dédupliquées au sein
    // de la session (sac à malice). Plus jamais la même question figée.
    AppState.quiz.questions = genererSessionSansDoublon(() => generateurChapitre(niveau), 5);
  } else {
    // FIX v6.0 : chapitre non encore piloté (français, histoire-géo, emc, sciences) —
    // repli sur la banque JSON statique existante, intacte, comme filet de sécurité.
    let pool = currentChapitreSelected.questions ? currentChapitreSelected.questions.filter(q => q.niveau === niveau) : [];
    AppState.quiz.questions = obtenirQuestionsFiltrees(pool, 3);
  }

  if (AppState.quiz.questions.length === 0) {
    alert("Aucune question de ce niveau n'est disponible pour ce chapitre.");
    return;
  }

  if ($('quiz-support-toggle')) {
    if (currentChapitreSelected.support_texte) {
      $('quiz-support-toggle').classList.remove('hidden');
      $('quiz-support-text-box').textContent = currentChapitreSelected.support_texte;
      $('quiz-support-text-box').classList.add('hidden');
      $('quiz-support-toggle').onclick = () => $('quiz-support-text-box').classList.toggle('hidden');
    } else {
      $('quiz-support-toggle').classList.add('hidden');
      $('quiz-support-text-box').classList.add('hidden');
    }
  }

  $('pre-quiz-screen').classList.add('hidden');
  $('quiz-screen').classList.remove('hidden');
  afficherQuestion();
}

$('btn-mode-automatismes').onclick = () => {
  currentChapitreSelected = null;
  AppState.quiz.chapitreId = "automatismes_global";
  AppState.quiz.idx = 0;
  AppState.quiz.score = 0;
  AppState.quiz.isAutomatisme = true;
  AppState.quiz.questions = Array.from({ length: 10 }, () => genererQuestionAutomatisme());

  if ($('quiz-support-toggle')) $('quiz-support-toggle').classList.add('hidden');
  if ($('quiz-support-text-box')) $('quiz-support-text-box').classList.add('hidden');

  $('home-screen').classList.add('hidden');
  $('quiz-screen').classList.remove('hidden');
  afficherQuestion();
};

function afficherQuestion() {
  clearInterval(timerInterval);
  $('quiz-explanation-box').className = "explanation-box hidden";
  $('quiz-next').disabled = true;

  const totalQs = AppState.quiz.questions.length;
  const currentQ = AppState.quiz.questions[AppState.quiz.idx];

  $('quiz-progress-text').textContent = `Question ${AppState.quiz.idx + 1} / ${totalQs}`;
  $('quiz-progress-bar').style.width = `${((AppState.quiz.idx + 1) / totalQs) * 100}%`;
  $('quiz-question-text').textContent = currentQ.enonce;

  const optionsContainer = $('quiz-options-container');
  optionsContainer.innerHTML = "";

  currentQ.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.onclick = () => soumettreReponse(index, btn);
    optionsContainer.appendChild(btn);
  });

  if (AppState.quiz.isAutomatisme) lancerTimer();
  else $('quiz-timer').style.display = 'none';
}

function soumettreReponse(indexChoisi, boutonClique) {
  clearInterval(timerInterval);
  const currentQ = AppState.quiz.questions[AppState.quiz.idx];
  const boutons = document.querySelectorAll('.option-btn');
  boutons.forEach(b => b.disabled = true);

  const estCorrect = (indexChoisi === currentQ.bonne_reponse);
  if (estCorrect) {
    AppState.quiz.score++;
    boutonClique.style.background = "#DCFCE7";
    boutonClique.style.borderColor = "var(--color-success)";
    boutonClique.style.color = "#15803D";
    $('quiz-explanation-box').className = "explanation-box visible good";
    $('explanation-status').textContent = "✅ EXCELLENT";
  } else {
    boutonClique.style.background = "#FEE2E2";
    boutonClique.style.borderColor = "var(--color-danger)";
    boutonClique.style.color = "#B91C1C";
    if (boutons[currentQ.bonne_reponse]) {
      boutons[currentQ.bonne_reponse].style.background = "#DCFCE7";
      boutons[currentQ.bonne_reponse].style.borderColor = "var(--color-success)";
      boutons[currentQ.bonne_reponse].style.color = "#15803D";
    }
    $('quiz-explanation-box').className = "explanation-box visible bad";
    $('explanation-status').textContent = "❌ COMPLÉMENT DE COURS";
  }

  $('explanation-text').textContent = currentQ.explication || "";
  $('quiz-next').disabled = false;

  const cleConcernee = currentChapitreSelected ? currentChapitreSelected.id : "automatismes_global";
  const labelConcerne = currentChapitreSelected ? currentChapitreSelected.titre : "Automatismes";
  enregistrerLacune(cleConcernee, estCorrect, labelConcerne);
}

$('quiz-next').onclick = () => {
  AppState.quiz.idx++;
  if (AppState.quiz.idx < AppState.quiz.questions.length) {
    afficherQuestion();
  } else {
    alert(`🏁 Fin de session ! Score : ${AppState.quiz.score} / ${AppState.quiz.questions.length}`);
    goHome();
  }
};

$('quiz-close').onclick = () => {
  if (confirm("Voulez-vous quitter l'entraînement en cours ?")) goHome();
};

function ouvrirExerciceOuvert() {
  $('pre-quiz-screen').classList.add('hidden');
  $('open-exercise-screen').classList.remove('hidden');

  $('open-ex-title').textContent = currentChapitreSelected.titre;
  $('open-ex-enonce').textContent = currentChapitreSelected.exercice_ouvert.enonce;
  $('open-ex-textarea').value = "";
  $('open-ex-correction-box').classList.add('hidden');
  $('btn-validate-open-ex').classList.remove('hidden');

  $('btn-close-exercise').onclick = () => {
    $('open-exercise-screen').classList.add('hidden');
    $('pre-quiz-screen').classList.remove('hidden');
  };

  $('btn-validate-open-ex').onclick = () => {
    if ($('open-ex-textarea').value.trim().length < 5) {
      alert("Saisissez votre réflexion au brouillon avant d'afficher les critères de validation.");
      return;
    }
    $('btn-validate-open-ex').classList.add('hidden');
    $('open-ex-correction-box').classList.remove('hidden');

    const containerCriteres = $('open-ex-critere-list');
    containerCriteres.innerHTML = "";
    if (currentChapitreSelected.exercice_ouvert.criteres) {
      currentChapitreSelected.exercice_ouvert.criteres.forEach((critere, index) => {
        const label = document.createElement('label');
        label.style.cssText = "display:flex; align-items:start; gap:10px; font-size:.85rem; background:white; padding:12px; border-radius:10px; cursor:pointer; border:1px solid var(--border-color); font-weight:500;";
        label.innerHTML = `<input type="checkbox" class="critere-cb" value="${index}" style="margin-top:2px;"> <span>${critere}</span>`;
        containerCriteres.appendChild(label);
      });
    }
  };

  $('btn-finish-open-ex').onclick = () => {
    const total = document.querySelectorAll('.critere-cb').length;
    const coches = document.querySelectorAll('.critere-cb:checked').length;
    alert(`Auto-évaluation enregistrée.`);
    enregistrerLacune(currentChapitreSelected.id, total > 0 ? (coches / total) >= 0.6 : true, currentChapitreSelected.titre);
    construireMenuMatieres();
    goHome();
  };
}

// ==========================================================================
// 🎤 ORAL DE SOUTENANCE — méthode, banque de questions jury, chronomètre 15 min
// ==========================================================================

let oralTimerInterval = null;
let oralTimerSecondes = 15 * 60;
let oralQuestionsRestantes = [];

function ouvrirOral() {
  $('home-screen').classList.add('hidden');
  $('pre-quiz-screen').classList.add('hidden');
  $('quiz-screen').classList.add('hidden');
  if ($('open-exercise-screen')) $('open-exercise-screen').classList.add('hidden');
  $('flashcards-screen').classList.add('hidden');
  $('oral-screen').classList.remove('hidden');

  const dataToUse = AppState.data || DATA_SECOURS;
  const oral = dataToUse.oral_soutenance;
  if (!oral) return;

  const methodeContainer = $('oral-methode-list');
  methodeContainer.innerHTML = "";
  (oral.methode || []).forEach(etape => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.cssText = "margin-bottom:10px; padding:14px 16px;";
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
        <span style="width:24px; height:24px; border-radius:50%; background:var(--color-primary); color:white; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; flex-shrink:0;">${etape.etape}</span>
        <b style="font-size:0.85rem; color:var(--text-primary);">${etape.titre}</b>
      </div>
      <p style="margin:0 0 0 34px; font-size:0.8rem; color:var(--text-secondary); line-height:1.5;">${etape.conseil}</p>
    `;
    methodeContainer.appendChild(item);
  });

  oralQuestionsRestantes = shuffleArr(oral.questions_jury || []);
  $('oral-question-text').textContent = "Appuie sur « Tirer une question » pour t'entraîner à l'oral.";

  resetOralTimer();
}

function tirerQuestionJury() {
  const dataToUse = AppState.data || DATA_SECOURS;
  const oral = dataToUse.oral_soutenance;
  if (!oral || !oral.questions_jury || oral.questions_jury.length === 0) return;
  if (oralQuestionsRestantes.length === 0) oralQuestionsRestantes = shuffleArr(oral.questions_jury);
  const q = oralQuestionsRestantes.pop();
  $('oral-question-text').textContent = `🎤 ${q}`;
}

function resetOralTimer() {
  clearInterval(oralTimerInterval);
  oralTimerInterval = null;
  oralTimerSecondes = 15 * 60;
  majAffichageOralTimer();
  if ($('btn-oral-timer-toggle')) $('btn-oral-timer-toggle').textContent = "▶️ Démarrer la simulation (15 min)";
}

function majAffichageOralTimer() {
  const m = Math.floor(oralTimerSecondes / 60);
  const s = oralTimerSecondes % 60;
  if ($('oral-timer-display')) $('oral-timer-display').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toggleOralTimer() {
  if (oralTimerInterval) {
    clearInterval(oralTimerInterval);
    oralTimerInterval = null;
    $('btn-oral-timer-toggle').textContent = "▶️ Reprendre";
    return;
  }
  $('btn-oral-timer-toggle').textContent = "⏸️ En cours… (toucher pour pause)";
  oralTimerInterval = setInterval(() => {
    oralTimerSecondes--;
    majAffichageOralTimer();
    if (oralTimerSecondes <= 0) {
      clearInterval(oralTimerInterval);
      oralTimerInterval = null;
      $('oral-timer-display').textContent = "Terminé !";
      $('btn-oral-timer-toggle').textContent = "🔁 Recommencer";
      alert("⏰ Temps écoulé ! C'est exactement la durée réelle de ton oral de soutenance.");
      resetOralTimer();
    }
  }, 1000);
}

// ==========================================================================
// 🧭 NAVIGATION (Cours / Flashcards / Oral)
// ==========================================================================

let flashcardsPool = [];
let currentFlashcardIdx = 0;

function configurerNavigation() {
  if ($('nav-home')) {
    $('nav-home').onclick = () => goHome();
  }

  if ($('nav-flashcards')) {
    $('nav-flashcards').onclick = () => {
      genererFlashcardsPool();
      if (flashcardsPool.length === 0) {
        alert("Ajoutez des fiches de cours ou pièges dans votre catalogue pour générer les flashcards.");
        return;
      }
      currentFlashcardIdx = 0;
      $('home-screen').classList.add('hidden');
      $('pre-quiz-screen').classList.add('hidden');
      $('quiz-screen').classList.add('hidden');
      if ($('open-exercise-screen')) $('open-exercise-screen').classList.add('hidden');
      if ($('oral-screen')) $('oral-screen').classList.add('hidden');
      $('flashcards-screen').classList.remove('hidden');
      activerNav('nav-flashcards');
      afficherFlashcard();
    };
  }

  if ($('nav-oral')) {
    $('nav-oral').onclick = () => {
      activerNav('nav-oral');
      ouvrirOral();
    };
  }

  if ($('btn-oral-tirer-question')) {
    $('btn-oral-tirer-question').onclick = () => tirerQuestionJury();
  }

  if ($('btn-oral-timer-toggle')) {
    $('btn-oral-timer-toggle').onclick = () => toggleOralTimer();
  }

  const cardBox = $('flashcard-card-box');
  if (cardBox) {
    cardBox.onclick = (e) => {
      e.stopPropagation();
      cardBox.classList.toggle('flipped');
    };
  }

  if ($('flashcard-next')) {
    $('flashcard-next').onclick = (e) => {
      e.stopPropagation();
      currentFlashcardIdx++;
      if (currentFlashcardIdx >= flashcardsPool.length) {
        alert("🎉 Bravo ! Toutes les flashcards actives ont été consultées.");
        goHome();
      } else {
        afficherFlashcard();
      }
    };
  }
}

function genererFlashcardsPool() {
  flashcardsPool = [];
  const dataToUse = AppState.data || DATA_SECOURS;

  dataToUse.matieres.forEach(m => {
    if (!m.chapitres) return;
    m.chapitres.forEach(c => {
      if (c.cours && c.cours.trim() !== "") {
        flashcardsPool.push({
          matiere: m.label || m.id,
          chapitre: c.titre,
          recto: `Que faut-il impérativement retenir sur le chapitre :\n\n"${c.titre}" ?`,
          verso: c.cours
        });
      }
      if (c.piege && c.piege.trim() !== "") {
        flashcardsPool.push({
          matiere: m.label || m.id,
          chapitre: c.titre,
          recto: `Quel piège classique les correcteurs du Brevet cachent-ils sur :\n\n"${c.titre}" ?`,
          verso: c.piege
        });
      }
    });
  });

  flashcardsPool = shuffleArr(flashcardsPool);
}

function afficherFlashcard() {
  if (flashcardsPool.length === 0) return;
  const card = flashcardsPool[currentFlashcardIdx];
  $('flashcard-card-box').classList.remove('flipped');

  $('flashcard-meta').textContent = `${card.matiere} • ${card.chapitre} (${currentFlashcardIdx + 1}/${flashcardsPool.length})`;
  $('flashcard-front-text').textContent = card.recto;
  $('flashcard-back-text').textContent = card.verso;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

document.addEventListener('DOMContentLoaded', initialiserApp);
