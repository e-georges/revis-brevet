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

// Pilote Maths : 7 chapitres branchés sur des générateurs procéduraux.
// 20 cellules niveau×chapitre sur 21 sont purement génératives (calcul aléatoire
// ou banque large) ; seule m2-n1 (Pythagore/trigo : type de triangle requis) reste
// partiellement statique, avec 2-3 reformulations écrites à la main (cf. fonction
// genM2_n1 dans la section MOTEUR DE GÉNÉRATION — PILOTE MATHS ci-dessus).
const GENERATEURS_MATHS = {
  m1: genM1, m2: genM2, m3: genM3, m4: genM4, m5: genM5, m6: genM6, m7: genM7
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
