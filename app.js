// ============================================================
// RévisBrevet 2026 — app.js (Version 100% Autonome sans API)
// Génération locale illimitée, Carnet d'Erreurs & Indices
// ============================================================

// ── ÉTAT GLOBAL ──────────────────────────────────────────────
const AppState = {
  data: null,
  progress: {},
  adaptive: {},
  carnetErreurs: [],
  quiz: { chapitreId: null, matLabel: '', questions: [], index: 0, score: 0, infini: false, estRattrapage: false }
};

// Banque de secours si le JSON principal ne charge pas
const SECOURS = [
  { enonce: "20% de 60 = ?", options: ["A) 10", "B) 12", "C) 15", "D) 8"], bonne_reponse: 1, explication: "10% de 60 = 6, donc 20% = 12.", niveau: 1 },
  { enonce: "'Ses yeux étaient deux étoiles' — figure de style ?", options: ["A) Comparaison", "B) Métaphore", "C) Hyperbole", "D) Personnification"], bonne_reponse: 1, explication: "Métaphore : comparaison sans outil de comparaison.", niveau: 3, indice: "Regarde s'il y a un mot de liaison comme 'comme' ou 'tel que'." },
  { enonce: "L'ONU est fondée en ?", options: ["A) 1918", "B) 1939", "C) 1945", "D) 1962"], bonne_reponse: 2, explication: "L'ONU est créée en 1945 après la Seconde Guerre Mondiale.", niveau: 2 },
  { enonce: "f(x) = 3x − 5. Image de 4 ?", options: ["A) 7", "B) 12", "C) 2", "D) -1"], bonne_reponse: 0, explication: "f(4) = 3×4 − 5 = 12 − 5 = 7.", niveau: 3, indice: "Remplace la variable x par la valeur 4 dans la fonction." }
];

// ── MOTEUR DE MUTATIONS EXTENSIBLE (Génération Infinie Locale) ──
const Mutations = {
  pourcentage() {
    const pcts = [10, 20, 25, 50, 75];
    const p = pcts[Math.floor(Math.random() * pcts.length)];
    const bases = [40, 60, 80, 120, 160, 200];
    const b = bases[Math.floor(Math.random() * bases.length)];
    const r = b * p / 100;
    const opts = [`A) ${r}`, `B) ${r + p}`, `C) ${b - r}`, `D) ${r * 2}`];
    return { enonce: `Calculer ${p}% de ${b} (sans calculatrice).`, options: opts, bonne_reponse: 0, explication: `${p}% de ${b} = ${b} × (${p}/100) = ${r}.`, niveau: 1, theme_auto: "Maths : Pourcentages" };
  },
  equation() {
    const a = Math.floor(Math.random() * 4) + 2;
    const x = Math.floor(Math.random() * 8) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const c = a * x + b;
    const opts = [`A) x = ${x}`, `B) x = ${x + 2}`, `C) x = ${c}`, `D) x = ${x - 1}`];
    return { enonce: `Résoudre l'équation : ${a}x + ${b} = ${c}`, options: opts, bonne_reponse: 0, explication: `${a}x = ${c} - ${b} → ${a}x = ${c - b} → x = ${x}.`, niveau: 3, indice: `Isole l'inconnue x en soustrayant d'abord ${b} de chaque côté.`, theme_auto: "Maths : Équations" };
  },
  pythagore() {
    const triplets = [[3,4,5], [5,12,13], [6,8,10], [9,12,15]];
    const [a, b, c] = triplets[Math.floor(Math.random() * triplets.length)];
    const opts = [`A) ${c} cm`, `B) ${a + b} cm`, `C) ${c + 2} cm`, `D) ${c * c} cm`];
    return { enonce: `Un triangle rectangle possède des côtés de ${a} cm et ${b} cm. Combien mesure son hypoténuse ?`, options: opts, bonne_reponse: 0, explication: `D'après Pythagore : c² = ${a}² + ${b}² = ${a*a} + ${b*b} = ${c*c}. Donc c = √${c*c} = ${c} cm.`, niveau: 3, indice: "L'hypoténuse est le côté le plus long opposé à l'angle droit. Applique la formule de la somme des carrés.", theme_auto: "Maths : Pythagore" };
  },
  loi_ohm() {
    const r = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
    const i = [1, 2, 0.5, 3][Math.floor(Math.random() * 4)];
    const u = r * i;
    const opts = [`A) ${u} V`, `B) ${r + i} V`, `C) ${(r/i).toFixed(1)} V`, `D) ${u * 2} V`];
    return { enonce: `Un conducteur ohmique a une résistance R = ${r} Ω et est traversé par un courant I = ${i} A. Quelle est la tension U à ses bornes ?`, options: opts, bonne_reponse: 0, explication: `Formule de la loi d'Ohm : U = R × I. Ici U = ${r} × ${i} = ${u} V.`, niveau: 2, theme_auto: "Physique : Électricité" };
  },
  grammaire() {
    const phrases = [
      { t: "Bien qu'il ___ fatigué, il continue de travailler.", r: "soit", o: ["soit", "est", "était", "sera"], e: "Après la conjonction 'bien que', on utilise obligatoirement le mode subjonctif.", n: 2 },
      { t: "Les pommes que j'ai ___ étaient délicieuses.", r: "cueillies", o: ["cueillies", "cueilli", "cueillis", "cueillie"], e: "Le participe passé conjugué avec 'avoir' s'accorde avec le COD ('que', mis pour les pommes) placé avant le verbe.", n: 3, i: "Trouve le COD de l'action et regarde où il se situe par rapport au verbe." }
    ];
    const p = phrases[Math.floor(Math.random() * phrases.length)];
    return { enonce: `Complète la phrase correctement : "${p.t}"`, options: p.o.map((o, idx) => `${o}`), bonne_reponse: p.o.indexOf(p.r), explication: p.e, niveau: p.n, indice: p.i || null, theme_auto: "Français : Syntaxe" };
  }
};

function genererSerieAleatoire(chapId, baseQuiz = [], taille = 5) {
  let depar = [...baseQuiz];
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

// ── NAVIGATION & INTERFACE ────────────────────────────────────
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

function setNav(id, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (id) { const t = document.getElementById(id); if (t) t.classList.add('active'); }
  else if (el) el.classList.add('active');
}

function updateBadgesMenu() {
  const b = document.getElementById('carnet-count-badge');
  if (b) { b.textContent = AppState.carnetErreurs.length; b.style.display = AppState.carnetErreurs.length > 0 ? 'inline-block' : 'none'; }
}

function updateProgressRing() {
  const circle = document.getElementById('global-progress-circle');
  const pctEl  = document.getElementById('global-progress-percent');
  if (!circle || !pctEl) return;
  const vals = Object.values(AppState.progress), total = vals.length, acquis = vals.filter(v => v === 'acquis').length;
  const pct = total > 0 ? Math.round(acquis / total * 100) : 0, circ = 52 * 2 * Math.PI;
  circle.style.strokeDasharray = `${circ} ${circ}`;
  circle.style.strokeDashoffset = circ - (pct / 100) * circ;
  pctEl.textContent = pct;
}

// ── GESTION DES STRUCTURES DE RENDU ───────────────────────────
function renderDashboard() {
  const container = document.getElementById('app-view-container');
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="color:var(--text-primary);">Mes matières de révision</h2>
    </div>
    <div class="matieres-grid" id="matieres-grid"></div>
  `;
  AppState.data.matieres.forEach(mat => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `5px solid ${mat.couleur}`;
    card.innerHTML = `<h3>${mat.emoji} ${mat.label.split(' — ')[0]}</h3><p style="font-size:.8rem;color:var(--text-secondary);">Accéder aux fiches et exercices autonomes.</p>`;
    card.addEventListener('click', () => renderMatiere(mat.id));
    document.getElementById('matieres-grid').appendChild(card);
  });
}

function renderMatiere(matId) {
  const mat = AppState.data.matieres.find(m => m.id === matId);
  const container = document.getElementById('app-view-container');
  if (!mat || !container) return;

  container.innerHTML = `
    <button onclick="renderDashboard()" style="background:none;border:1px solid var(--border-color);padding:6px 12px;border-radius:6px;cursor:pointer;margin-bottom:14px;">← Retour</button>
    <h2>${mat.emoji} ${mat.label}</h2>
    <div class="chapitres-list" id="chapitres-list" style="margin-top:14px;display:flex;flex-direction:column;gap:12px;"></div>
  `;

  mat.chapitres.forEach(chap => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${chap.titre}</h4>
      <p style="font-size:.8rem;color:var(--text-secondary);margin:4px 0 10px 0;">${chap.fiche}</p>
      <button class="btn-primary" onclick="lancerQuizDepuisChapitre('${mat.id}', '${chap.id}')">🎯 Commencer la série</button>
    `;
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
      <p style="font-size:.85rem;margin:4px 0 10px 0;">Contient ${AppState.carnetErreurs.length} question(s) à corriger.</p>
      <button class="btn-primary" style="background:white;color:var(--color-danger);" onclick="startQuizRattrapage()">🚀 Corriger mes erreurs</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;" id="liste-erreurs"></div>
  `;
  AppState.carnetErreurs.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<p style="font-weight:600;margin:0;">${escHtml(q.enonce)}</p><p style="font-size:.8rem;color:var(--text-secondary);margin-top:4px;">Explication : ${escHtml(q.explication)}</p>`;
    document.getElementById('liste-erreurs').appendChild(div);
  });
}

function renderProgramme() {
  document.getElementById('app-view-container').innerHTML = `<h2>📅 Programme d'études</h2><p style="color:var(--text-secondary);">Le planning d'entraînement automatisé s'adapte à ton rythme.</p>`;
}

// ── CONTRÔLEUR DE QUIZ ET VERROUILLAGE PÉDAGOGIQUE ──────────────
function lancerQuizDepuisChapitre(matId, chapId) {
  const mat = AppState.data.matieres.find(m => m.id === matId);
  const chap = mat?.chapitres.find(c => c.id === chapId);
  const baseQuiz = chap?.quiz || [];

  AppState.quiz = {
    chapitreId: chapId,
    matLabel: mat?.label || '',
    questions: genererSerieAleatoire(chapId, baseQuiz, 5),
    index: 0,
    score: 0,
    infini: false,
    estRattrapage: false
  };

  afficherQuestion();
  document.getElementById('quiz-modal').classList.add('active');
}

function startQuizRattrapage() {
  AppState.quiz = {
    chapitreId: 'carnet_erreurs',
    matLabel: 'Rattrapage',
    questions: shuffleArr([...AppState.carnetErreurs]).slice(0, 5).map(q => melangerOptions(q)),
    index: 0,
    score: 0,
    infini: false,
    estRattrapage: true
  };
  afficherQuestion();
  document.getElementById('quiz-modal').classList.add('active');
}

function startExamenBlanc() {
  let toutes = [];
  AppState.data.matieres.forEach(m => m.chapitres.forEach(c => { toutes = toutes.concat(c.quiz || []); }));
  AppState.quiz = {
    chapitreId: 'examen_blanc',
    matLabel: 'Examen Blanc',
    questions: genererSerieAleatoire('blanc', toutes, 10).map(q => melangerOptions(q)),
    index: 0,
    score: 0,
    infini: true,
    estRattrapage: false
  };
  afficherQuestion();
  document.getElementById('quiz-modal').classList.add('active');
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
  const pct = Math.round((quiz.index / quiz.questions.length) * 100);

  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-progress').innerHTML = `${quiz.matLabel} — Question ${quiz.index + 1}/${quiz.questions.length}`;

  const qContainer = document.getElementById('quiz-question-text');
  qContainer.innerHTML = (q.theme_auto ? `<span style="background:#FEF3C7;color:#92400E;padding:2px 6px;font-size:.7rem;border-radius:4px;font-weight:700;display:inline-block;margin-bottom:6px;">⚡ ${q.theme_auto}</span><br>` : '') + escHtml(q.enonce);

  if (parseInt(q.niveau) === 3) {
    const btnInd = document.createElement('button');
    btnInd.className = 'btn-indice';
    btnInd.style.cssText = "background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;padding:4px 10px;border-radius:12px;font-size:.75rem;cursor:pointer;margin-top:8px;display:block;";
    btnInd.textContent = "💡 Demander un indice";

    const boxInd = document.createElement('div');
    boxInd.className = 'hidden';
    boxInd.style.cssText = "background:#FFFBEB;border-left:3px solid #F59E0B;padding:8px;font-size:.8rem;color:#78350F;margin-top:6px;border-radius:4px;";
    boxInd.textContent = q.indice || "Observe bien la syntaxe ou isole les valeurs connues pour avancer.";

    btnInd.addEventListener('click', () => {
      boxInd.classList.toggle('hidden');
      btnInd.textContent = boxInd.classList.contains('hidden') ? "💡 Demander un indice" : "🙈 Masquer l'indice";
    });
    qContainer.appendChild(btnInd);
    qContainer.appendChild(boxInd);
  }

  document.getElementById('quiz-explanation').classList.add('hidden');
  document.getElementById('quiz-next-btn').classList.add('hidden');

  const optsEl = document.getElementById('quiz-options-container');
  optsEl.innerHTML = '';
  optsEl.classList.remove('shake');

  q.options.forEach((opt, idx) => {
    const b = document.createElement('button');
    b.className = 'btn-option';
    b.textContent = opt;
    b.addEventListener('click', () => verifierReponse(b, idx, q, optsEl));
    optsEl.appendChild(b);
  });
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

  document.getElementById('explanation-text').textContent = q.explication;
  document.getElementById('quiz-explanation').classList.remove('hidden');
  document.getElementById('quiz-next-btn').classList.remove('hidden');
}

document.getElementById('quiz-next-btn').addEventListener('click', () => {
  AppState.quiz.index++;
  if (AppState.quiz.index < AppState.quiz.questions.length) {
    afficherQuestion();
  } else {
    terminerSessionQuiz();
  }
});

function terminerSessionQuiz() {
  const quiz = AppState.quiz;
  document.getElementById('quiz-modal').classList.remove('active');

  const pct = Math.round((quiz.score / quiz.questions.length) * 100);
  if (pct >= 80 && quiz.chapitreId !== 'examen_blanc' && quiz.chapitreId !== 'carnet_erreurs') {
    AppState.progress[quiz.chapitreId] = 'acquis';
    saveProgress();
  }

  const container = document.getElementById('app-view-container');
  container.innerHTML = `
    <div style="max-width:500px;margin:20px auto;text-align:center;background:var(--bg-card);padding:24px;border-radius:12px;box-shadow:var(--shadow-card);">
      <span style="font-size:3.5rem;">${pct >= 70 ? '🏆' : '💪'}</span>
      <h2 style="color:var(--text-primary);margin-top:10px;">Série terminée !</h2>
      <div style="font-size:2.5rem;font-weight:800;color:var(--color-primary);margin:14px 0;">${quiz.score} / ${quiz.questions.length}</div>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">Tu as validé ${pct}% des objectifs sur cette session.</p>
      
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
    if (quiz.chapitreId === 'carnet_erreurs') {
      startQuizRattrapage();
    } else if (quiz.chapitreId === 'examen_blanc') {
      startExamenBlanc();
    } else {
      let baseQuiz = [];
      for (const m of AppState.data.matieres) {
        const c = m.chapitres.find(ch => ch.id === quiz.chapitreId);
        if (c) { baseQuiz = c.quiz || []; break; }
      }
      AppState.quiz = {
        chapitreId: quiz.chapitreId,
        matLabel: quiz.matLabel,
        questions: genererSerieAleatoire(quiz.chapitreId, baseQuiz, 5),
        index: 0,
        score: 0,
        infini: false,
        estRattrapage: false
      };
      afficherQuestion();
      document.getElementById('quiz-modal').classList.add('active');
    }
  });

  updateProgressRing();
}

// ── INITIALISATION GÉNÉRALE ──────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('troisieme.json');
    if (res.ok) { AppState.data = await res.json(); return true; }
  } catch {}
  AppState.data = {
    matieres: [
      { id: 'maths', label: 'Mathématiques', emoji: '📐', couleur: '#3D5A99', chapitres: [{ id: 'maths_01', titre: 'Automatismes numériques', fiche: 'Entraînement aux calculs de brevets.', quiz: SECOURS }] },
      { id: 'fr', label: 'Français', emoji: '📖', couleur: '#9B5DE5', chapitres: [{ id: 'fr_01', titre: 'Grammaire et syntaxe', fiche: 'Maîtriser les accords complexes.', quiz: [] }] }
    ]
  };
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  loadProgress();
  chargerCarnetErreurs();
  await loadData();
  buildNav();
  renderDashboard();
  updateProgressRing();
  
  // ── FIX DES BOUTONS DE COMPORTEMENT (MODALES & THEME) ──
  
  // Forcer le masquage initial de la modale explicative
  const modalApi = document.getElementById('modal-api');
  if (modalApi) {
    modalApi.classList.add('hidden');
    modalApi.classList.remove('active');
  }

  // Lier le bouton "Paramètres" (engrenage) à l'affichage des infos du moteur local
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    document.getElementById('modal-api')?.classList.remove('hidden');
  });

  // Gestion du Mode Sombre global
  const toggleTheme = () => document.body.classList.toggle('dark-mode');
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('theme-toggle-mobile')?.addEventListener('click', toggleTheme);

  // Écouteurs de fermeture des boîtes de dialogue
  document.getElementById('quiz-close-btn')?.addEventListener('click', () => {
    document.getElementById('quiz-modal').classList.remove('active');
  });
  document.getElementById('close-modal-api')?.addEventListener('click', () => document.getElementById('modal-api').classList.add('hidden'));
  document.getElementById('btn-skip-api')?.addEventListener('click', () => document.getElementById('modal-api').classList.add('hidden'));
});

function shuffleArr(arr) {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
}
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
