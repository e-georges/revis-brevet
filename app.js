// ============================================================
// RévisBrevet 2026 — app.js (Version Blindée & Pop-up Fixé)
// Génération locale illimitée, Carnet d'Erreurs & Indices
// ============================================================

// ── ÉTAT GLOBAL DE L'APPLICATION ─────────────────────────────
const AppState = {
  data: null,
  progress: {},
  adaptive: {},
  carnetErreurs: [],
  quiz: { matId: null, chapitreId: null, matLabel: '', questions: [], index: 0, score: 0, infini: false, estRattrapage: false }
};

// Banque de secours imbattable en cas de latence ou problème de chargement du JSON
const SECOURS = [
  { enonce: "Calculer 20% de 60 (sans calculatrice).", options: ["A) 10", "B) 12", "C) 15", "D) 8"], bonne_reponse: 1, explication: "10% de 60 = 6, donc 20% = 12.", niveau: 1 },
  { enonce: "'Ses yeux étaient deux étoiles' — Quelle est la figure de style ?", options: ["A) Comparaison", "B) Métaphore", "C) Hyperbole", "D) Personnification"], bonne_reponse: 1, explication: "Métaphore : comparaison directe sans outil de comparaison (comme, tel que...).", niveau: 3, indice: "Regarde s'il y a un mot de liaison comparatif." },
  { enonce: "En quelle année l'ONU a-t-elle été fondée ?", options: ["A) 1918", "B) 1939", "C) 1945", "D) 1962"], bonne_reponse: 2, explication: "L'ONU a été créée en 1945 juste après la Seconde Guerre Mondiale.", niveau: 2 },
  { enonce: "Soit la fonction f(x) = 3x − 5. Quelle est l'image de 4 ?", options: ["A) 7", "B) 12", "C) 2", "D) -1"], bonne_reponse: 0, explication: "f(4) = 3 × 4 − 5 = 12 − 5 = 7.", niveau: 3, indice: "Remplace la variable x par la valeur 4 dans la fonction." }
];

// ── MOTEUR DE MUTATIONS (Génération procédurale locale infinie) ──
const Mutations = {
  pourcentage() {
    const pcts = [10, 20, 25, 50, 75], p = pcts[Math.floor(Math.random() * pcts.length)];
    const bases = [40, 60, 80, 120, 160, 200], b = bases[Math.floor(Math.random() * bases.length)];
    const r = b * p / 100;
    return { enonce: `Calculer ${p}% de ${b} (sans calculatrice).`, options: [`A) ${r}`, `B) ${r + p}`, `C) ${b - r}`, `D) ${r * 2}`], bonne_reponse: 0, explication: `${p}% de ${b} = ${b} × (${p}/100) = ${r}.`, niveau: 1, theme_auto: "Maths : Pourcentages" };
  },
  equation() {
    const a = Math.floor(Math.random() * 4) + 2, x = Math.floor(Math.random() * 8) + 1, b = Math.floor(Math.random() * 9) + 1, c = a * x + b;
    return { enonce: `Résoudre l'équation suivante : ${a}x + ${b} = ${c}`, options: [`A) x = ${x}`, `B) x = ${x + 2}`, `C) x = ${c}`, `D) x = ${x - 1}`], bonne_reponse: 0, explication: `${a}x = ${c} - ${b} → ${a}x = ${c - b} → x = ${x}.`, niveau: 3, indice: `Isole l'inconnue x en soustrayant d'abord ${b} des deux côtés.`, theme_auto: "Maths : Équations" };
  },
  pythagore() {
    const triplets = [[3,4,5], [5,12,13], [6,8,10]], [a, b, c] = triplets[Math.floor(Math.random() * triplets.length)];
    return { enonce: `Un triangle rectangle possède des côtés de ${a} cm et ${b} cm. Combien mesure son hypoténuse ?`, options: [`A) ${c} cm`, `B) ${a + b} cm`, `C) ${c + 2} cm`, `D) ${c * c} cm`], bonne_reponse: 0, explication: `D'après le théorème de Pythagore : l'hypoténuse au carré vaut la somme des carrés des autres côtés. ${a}² + ${b}² = ${a*a} + ${b*b} = ${c*c}. Donc sa racine carrée est ${c} cm.`, niveau: 3, indice: "L'hypoténuse est le côté le plus long opposé à l'angle droit. Applique la formule.", theme_auto: "Maths : Pythagore" };
  },
  puissances() {
    const n = Math.floor(Math.random() * 5) + 2, m = Math.floor(Math.random() * 4) + 2;
    return { enonce: `Écrire sous la forme d'une unique puissance de 10 le produit suivant : 10^${n} × 10^${m}`, options: [`A) 10^${n+m}`, `B) 10^${n*m}`, `C) 10^${n-m}`, `D) 100^${n+m}`], bonne_reponse: 0, explication: `Propriété mathématique des exposants : 10^a × 10^b = 10^(a+b). Ici, 10^${n} × 10^${m} = 10^(${n}+${m}) = 10^${n+m}.`, niveau: 2, theme_auto: "Maths : Puissances" };
  },
  fractions() {
    const num = [1, 3, 5, 7][Math.floor(Math.random() * 4)], den = [2, 4, 3][Math.floor(Math.random() * 3)], prod = num * 2;
    return { enonce: `Calculer et donner le résultat de l'opération suivante : 2 × (${num}/${den})`, options: [`A) ${prod}/${den}`, `B) ${num}/${den*2}`, `C) ${num+2}/${den}`, `D) ${num}/${den}`], bonne_reponse: 0, explication: `Pour multiplier un nombre entier par une fraction, on multiplie uniquement le numérateur : 2 × ${num}/${den} = (2 × ${num})/${den} = ${prod}/${den}.`, niveau: 2, theme_auto: "Maths : Fractions" };
  }
};

function genererSerieAleatoire(chapId, baseQuiz = [], taille = 5) {
  let depar = Array.isArray(baseQuiz) && baseQuiz.length > 0 ? [...baseQuiz] : [];
  const clesMutations = Object.keys(Mutations);
  while (depar.length < taille) {
    const clé = clesMutations[Math.floor(Math.random() * clesMutations.length)];
    depar.push(Mutations[clé]());
  }
  return shuffleArr(depar).slice(0, taille);
}

// ── LOCAL STORAGE & CARNET D'ERREURS ─────────────────────────
function chargerCarnetErreurs() {
  try { AppState.carnetErreurs = JSON.parse(localStorage.getItem('rb_carnet_erreurs') || '[]'); } catch { AppState.carnetErreurs = []; }
}
function ajouterAuCarnet(q) {
  if (!AppState.carnetErreurs.some(e => e.enonce === q.enonce)) {
    AppState.carnetErreurs.push(q);
    localStorage.setItem('rb_carnet_erreurs', JSON.stringify(AppState.carnetErreurs));
    updateBadgesMenu();
  }
}
function retirerDuCarnet(enonce) {
  AppState.carnetErreurs = AppState.carnetErreurs.filter(e => e.enonce !== enonce);
  localStorage.setItem('rb_carnet_erreurs', JSON.stringify(AppState.carnetErreurs));
  updateBadgesMenu();
}
function loadProgress() {
  try { AppState.progress = JSON.parse(localStorage.getItem('rb_progress') || '{}'); } catch { AppState.progress = {}; }
}
function saveProgress() { localStorage.setItem('rb_progress', JSON.stringify(AppState.progress)); }

// ── INTERFACE & DESIGN (RENDU GÉNÉRAL) ────────────────────────
function buildNav() {
  const menu = document.getElementById('sidebar-menu');
  if (!menu) return;
  menu.innerHTML = `
    <li><a class="nav-item active" id="btn-home"><span>🏠</span><span>Accueil</span></a></li>
    <li><a class="nav-item" id="btn-programme"><span>📅</span><span>Programme</span></a></li>
    <li><a class="nav-item nav-item-danger" id="btn-carnet"><span>📕</span><span>Carnet d'erreurs <b id="carnet-count-badge" style="background:#EF4444;color:white;padding:1px 6px;border-radius:10px;font-size:0.65rem;margin-left:5px;display:none;">0</b></span></a></li>
    <li><a class="nav-item" id="btn-infini" style="background:linear-gradient(135deg,#E84855,#3D5A99);color:white;border-radius:6px;font-weight:700;margin-top:8px;"><span>🔥</span><span>Examen blanc</span></a></li>
  `;
  document.getElementById('btn-home').addEventListener('click', () => { setNav('btn-home'); renderDashboard(); });
  document.getElementById('btn-programme').addEventListener('click', () => { setNav('btn-programme'); renderProgramme(); });
  document.getElementById('btn-carnet').addEventListener('click', () => { setNav('btn-carnet'); renderCarnetVue(); });
  document.getElementById('btn-infini').addEventListener('click', startExamenBlanc);
  updateBadgesMenu();
}

function setNav(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const t = document.getElementById(id); if (t) t.classList.add('active');
}

function updateBadgesMenu() {
  const b = document.getElementById('carnet-count-badge');
  if (b) { b.textContent = AppState.carnetErreurs.length; b.style.display = AppState.carnetErreurs.length > 0 ? 'inline-block' : 'none'; }
}

function updateProgressRing() {
  const circle = document.getElementById('global-progress-circle'), pctEl = document.getElementById('global-progress-percent');
  if (!circle || !pctEl) return;
  const vals = Object.values(AppState.progress), total = vals.length, acquis = vals.filter(v => v === 'acquis').length;
  const pct = total > 0 ? Math.round(acquis / total * 100) : 0, circ = 52 * 2 * Math.PI;
  circle.style.strokeDasharray = `${circ} ${circ}`;
  circle.style.strokeDashoffset = circ - (pct / 100) * circ;
  pctEl.textContent = pct;
}

function renderDashboard() {
  const container = document.getElementById('app-view-container');
  if (!container) return;
  container.innerHTML = `<h2>Mes matières de révision</h2><div class="matieres-grid" id="matieres-grid"></div>`;
  
  if (!AppState.data || !AppState.data.matieres) return;
  AppState.data.matieres.forEach(mat => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `5px solid ${mat.couleur}`;
    card.style.cursor = 'pointer';
    card.innerHTML = `<h3>${mat.emoji} ${mat.label.split(' — ')[0]}</h3><p style="font-size:.8rem;color:var(--text-secondary);">Accéder aux fiches de cours et exercices associés.</p>`;
    card.addEventListener('click', () => renderMatiere(mat.id));
    document.getElementById('matieres-grid').appendChild(card);
  });
}

function renderMatiere(matId) {
  const mat = AppState.data?.matieres?.find(m => m.id === matId), container = document.getElementById('app-view-container');
  if (!mat || !container) return;
  container.innerHTML = `
    <button onclick="renderDashboard()" style="background:none;border:1px solid var(--border-color);padding:6px 12px;border-radius:6px;cursor:pointer;margin-bottom:14px;color:var(--text-primary);">← Retour</button>
    <h2>${mat.emoji} ${mat.label}</h2>
    <div class="chapitres-list" id="chapitres-list" style="margin-top:14px;display:flex;flex-direction:column;gap:12px;"></div>
  `;
  
  mat.chapitres.forEach(chap => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${chap.titre}</h4>
      <p style="font-size:.8rem;color:var(--text-secondary);margin:4px 0 10px 0;">${chap.fiche}</p>
      <button class="btn-primary id-trigger-btn">🎯 Commencer la série</button>
    `;
    
    card.querySelector('.id-trigger-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      lancerQuizDepuisChapitre(mat.id, chap.id);
    });
    
    document.getElementById('chapitres-list').appendChild(card);
  });
}

function renderCarnetVue() {
  const container = document.getElementById('app-view-container');
  if (!container) return;
  if (AppState.carnetErreurs.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;"><span style="font-size:3rem;">🎉</span><h3>Carnet d'erreurs vide !</h3></div>`;
    return;
  }
  container.innerHTML = `
    <div style="background:var(--color-danger);color:white;padding:16px;border-radius:8px;margin-bottom:14px;">
      <h3>📕 Carnet d'erreurs Actif</h3>
      <p style="font-size:.85rem;margin:4px 0 10px 0;">Contient ${AppState.carnetErreurs.length} question(s) à retravailler.</p>
      <button class="btn-primary" style="background:white;color:var(--color-danger);" onclick="startQuizRattrapage()">🚀 Corriger mes erreurs</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;" id="liste-erreurs"></div>
  `;
  AppState.carnetErreurs.forEach(q => {
    const div = document.createElement('div'); div.className = 'card';
    div.innerHTML = `<p style="font-weight:600;margin:0;">${escHtml(q.enonce)}</p><p style="font-size:.8rem;color:var(--text-secondary);margin-top:4px;">Explication : ${escHtml(q.explication)}</p>`;
    document.getElementById('liste-erreurs').appendChild(div);
  });
}

function renderProgramme() {
  document.getElementById('app-view-container').innerHTML = `<h2>📅 Programme d'études</h2><p style="color:var(--text-secondary);">Générateur d'exercices synchrone configuré pour la session 2026.</p>`;
}

// ── FONCTION CENTRALE DE DÉBLOCAGE ET D'OUVERTURE DU POP-UP ───
function lancerQuizDepuisChapitre(matId, chapId) {
  const mat = AppState.data?.matieres?.find(m => m.id === matId);
  const chap = mat?.chapitres?.find(c => c.id === chapId);
  const baseQuiz = chap?.quiz || [];
  const nomMatiere = mat ? mat.label : "Révision";

  // Initialisation complète de l'objet de session
  AppState.quiz = {
    matId: matId,
    chapitreId: chapId,
    matLabel: nomMatiere,
    questions: genererSerieAleatoire(chapId, baseQuiz, 5),
    index: 0,
    score: 0,
    infini: false,
    estRattrapage: false
  };

  // Sécurité anti-redondance cognitive : mixage des propositions
  AppState.quiz.questions = AppState.quiz.questions.map(q => melangerOptions(q));

  // Affichage immédiat de la première question
  afficherQuestion();
  
  // COMMANDE DE FORÇAGE DU POP-UP (Supprime les conflits CSS et force l'affichage)
  const modalQuiz = document.getElementById('quiz-modal');
  if (modalQuiz) {
    modalQuiz.classList.remove('hidden'); 
    modalQuiz.classList.add('active');
    // Force l'affichage au-dessus de tout écran et neutralise le 'display: none !important'
    modalQuiz.setAttribute("style", "display: flex !important;"); 
  }
}

function startQuizRattrapage() {
  if (AppState.carnetErreurs.length === 0) return;
  AppState.quiz = { matId: null, chapitreId: 'carnet_erreurs', matLabel: 'Rattrapage', questions: shuffleArr([...AppState.carnetErreurs]).slice(0, 5).map(q => melangerOptions(q)), index: 0, score: 0, infini: false, estRattrapage: true };
  afficherQuestion();
  const mq = document.getElementById('quiz-modal');
  if (mq) { mq.classList.remove('hidden'); mq.classList.add('active'); mq.setAttribute("style", "display: flex !important;"); }
}

function startExamenBlanc() {
  let toutes = [];
  if (AppState.data && AppState.data.matieres) {
    AppState.data.matieres.forEach(m => m.chapitres.forEach(c => { toutes = toutes.concat(c.quiz || []); }));
  }
  AppState.quiz = { matId: null, chapitreId: 'examen_blanc', matLabel: 'Examen Blanc', questions: genererSerieAleatoire('blanc', toutes, 10).map(q => melangerOptions(q)), index: 0, score: 0, infini: true, estRattrapage: false };
  afficherQuestion();
  const mq = document.getElementById('quiz-modal');
  if (mq) { mq.classList.remove('hidden'); mq.classList.add('active'); mq.setAttribute("style", "display: flex !important;"); }
}

function melangerOptions(q) {
  if (!q.options || q.options.length === 0) return q;
  const pureOpts = q.options.map(o => o.replace(/^[A-D]\)\s*/, ''));
  const bonneTxt = pureOpts[q.bonne_reponse];
  const rMelangee = shuffleArr([...pureOpts]);
  const nIdx = rMelangee.indexOf(bonneTxt);
  return { ...q, options: rMelangee.map((o, idx) => `${['A','B','C','D'][idx]}) ${o}`), bonne_reponse: nIdx >= 0 ? nIdx : 0 };
}

function afficherQuestion() {
  const quiz = AppState.quiz, q = quiz.questions[quiz.index];
  if (!q) return;
  const pct = Math.round((quiz.index / quiz.questions.length) * 100);

  const fill = document.getElementById('quiz-progress-fill'); if (fill) fill.style.width = pct + '%';
  const prog = document.getElementById('quiz-progress'); if (prog) prog.innerHTML = `${quiz.matLabel} — Question ${quiz.index + 1}/${quiz.questions.length}`;

  const qContainer = document.getElementById('quiz-question-text');
  if (qContainer) {
    qContainer.innerHTML = (q.theme_auto ? `<span style="background:#FEF3C7;color:#92400E;padding:2px 6px;font-size:.7rem;border-radius:4px;font-weight:700;display:inline-block;margin-bottom:6px;">⚡ ${q.theme_auto}</span><br>` : '') + escHtml(q.enonce);

    if (parseInt(q.niveau) === 3) {
      const btnInd = document.createElement('button');
      btnInd.style.cssText = "background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;padding:4px 10px;border-radius:12px;font-size:.75rem;cursor:pointer;margin-top:8px;display:block;";
      btnInd.textContent = "💡 Demander un indice";
      const boxInd = document.createElement('div');
      boxInd.className = 'hidden';
      boxInd.style.cssText = "background:#FFFBEB;border-left:3px solid #F59E0B;padding:8px;font-size:.8rem;color:#78350F;margin-top:6px;border-radius:4px;";
      boxInd.textContent = q.indice || "Observe attentivement la structure ou les valeurs de l'énoncé.";
      btnInd.addEventListener('click', () => {
        boxInd.classList.toggle('hidden');
        btnInd.textContent = boxInd.classList.contains('hidden') ? "💡 Demander un indice" : "🙈 Masquer l'indice";
      });
      qContainer.appendChild(btnInd); qContainer.appendChild(boxInd);
    }
  }

  document.getElementById('quiz-explanation')?.classList.add('hidden');
  document.getElementById('quiz-next-btn')?.classList.add('hidden');

  const optsEl = document.getElementById('quiz-options-container');
  if (optsEl) {
    optsEl.innerHTML = ''; optsEl.classList.remove('shake');
    q.options.forEach((opt, idx) => {
      const b = document.createElement('button'); b.className = 'btn-option'; b.textContent = opt;
      b.addEventListener('click', () => verifierReponse(b, idx, q, optsEl));
      optsEl.appendChild(b);
    });
  }
}

function verifierReponse(btn, idx, q, optsEl) {
  Array.from(optsEl.children).forEach(b => b.disabled = true);
  const correct = (idx === q.bonne_reponse);

  if (correct) {
    btn.style.cssText += 'background:#D1FAE5;border-color:#10B981;color:#064E3B;font-weight:700;';
    AppState.quiz.score++;
    if (AppState.quiz.estRattrapage) retirerDuCarnet(q.enonce);
  } else {
    optsEl.classList.add('shake');
    btn.style.cssText += 'background:#FEE2E2;border-color:#EF4444;color:#7F1D1D;';
    const bonne = optsEl.children[q.bonne_reponse];
    if (bonne) bonne.style.cssText += 'background:#D1FAE5;border-color:#10B981;color:#064E3B;font-weight:700;';
    if (!AppState.quiz.estRattrapage) ajouterAuCarnet(q);
  }

  const expTxt = document.getElementById('explanation-text'); if (expTxt) expTxt.textContent = q.explication;
  document.getElementById('quiz-explanation')?.classList.remove('hidden');
  document.getElementById('quiz-next-btn')?.classList.remove('hidden');
}

document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
  AppState.quiz.index++;
  if (AppState.quiz.index < AppState.quiz.questions.length) { afficherQuestion(); } 
  else { terminerSessionQuiz(); }
});

function terminerSessionQuiz() {
  const quiz = AppState.quiz;
  const mq = document.getElementById('quiz-modal');
  if (mq) { mq.classList.remove('active'); mq.style.display = 'none'; mq.removeAttribute('style'); }

  const pct = Math.round((quiz.score / quiz.questions.length) * 100);
  if (pct >= 80 && quiz.chapitreId !== 'examen_blanc' && quiz.chapitreId !== 'carnet_erreurs') {
    AppState.progress[quiz.chapitreId] = 'acquis'; saveProgress();
  }

  const container = document.getElementById('app-view-container');
  if (!container) return;
  container.innerHTML = `
    <div style="max-width:500px;margin:20px auto;text-align:center;background:var(--bg-card);padding:24px;border-radius:12px;box-shadow:var(--shadow-card);">
      <span style="font-size:3.5rem;">${pct >= 70 ? '🏆' : '💪'}</span>
      <h2 style="color:var(--text-primary);margin-top:10px;">Série terminée !</h2>
      <div style="font-size:2.5rem;font-weight:800;color:var(--color-primary);margin:14px 0;">${quiz.score} / ${quiz.questions.length}</div>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">Tu as validé ${pct}% des objectifs requis.</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button id="btn-generer-nouveau" class="btn-primary" style="background:linear-gradient(135deg,#2EC4B6,#3D5A99);border:none;padding:12px;font-size:0.95rem;">
          🔄 Générer un nouveau quiz inédit (Illimité)
        </button>
        <button onclick="renderDashboard()" style="background:none;border:1px solid var(--border-color);padding:10px;border-radius:6px;cursor:pointer;font-size:0.85rem;color:var(--text-secondary);">
          🏠 Retour au tableau de bord
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-generer-nouveau').addEventListener('click', () => {
    if (quiz.chapitreId === 'carnet_erreurs') startQuizRattrapage();
    else if (quiz.chapitreId === 'examen_blanc') startExamenBlanc();
    else lancerQuizDepuisChapitre(quiz.matId, quiz.chapitreId);
  });
  updateProgressRing();
}

// ── INTÉGRATION SÉCURISÉE DU REPLI JSON ───────────────────────
async function loadData() {
  try {
    const res = await fetch('troisieme.json');
    if (res.ok) { AppState.data = await res.json(); return true; }
  } catch(e) { console.warn("Serveur local absent ou JSON inacessible. Utilisation du moteur autonome local."); }
  
  // Banque de données de repli si le fichier externe subit un blocage CORS ou réseau
  AppState.data = {
    matieres: [
      { id: 'maths', label: 'Mathématiques — Automatismes', emoji: '📐', couleur: '#3D5A99', chapitres: [{ id: 'maths_01', titre: '⚡ Automatismes officiels DNB 2026', fiche: 'Calcul local, pourcentages, fractions, équations.', quiz: [] }] }
    ]
  };
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  loadProgress(); chargerCarnetErreurs();
  await loadData(); buildNav(); renderDashboard(); updateProgressRing();
  
  // Suppression définitive de la fenêtre de configuration API qui parasitait l'app
  const mApi = document.getElementById('modal-api'); if (mApi) { mApi.style.display = 'none'; mApi.classList.add('hidden'); }

  document.getElementById('quiz-close-btn')?.addEventListener('click', () => {
    const mq = document.getElementById('quiz-modal'); if (mq) { mq.classList.remove('active'); mq.style.display = 'none'; mq.removeAttribute('style'); }
  });
  
  const toggleTheme = () => document.body.classList.toggle('dark-mode');
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('theme-toggle-mobile')?.addEventListener('click', toggleTheme);
});

function shuffleArr(arr) {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
}
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
