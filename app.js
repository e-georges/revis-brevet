// ============================================================
// RévisBrevet 2026 — app.js (Version Augmentée)
// Intègre : Carnet d'erreurs, Bouton Indice & Améliorations UX
// ============================================================

// ── ÉTAT GLOBAL ──────────────────────────────────────────────
const AppState = {
  data: null,
  progress: {},
  adaptive: {},
  carnetErreurs: [], // Stockage des questions échouées
  quiz: { chapitreId: null, questions: [], index: 0, score: 0, infini: false, estRattrapage: false }
};

// Banque de secours si le JSON ne charge pas
const SECOURS = [
  { enonce: "20% de 60 = ?", options: ["A) 10", "B) 12", "C) 15", "D) 8"], bonne_reponse: 1, explication: "10% de 60 = 6, donc 20% = 12.", niveau: 1 },
  { enonce: "'Ses yeux étaient deux étoiles' — figure de style ?", options: ["A) Comparaison", "B) Métaphore", "C) Hyperbole", "D) Personnification"], bonne_reponse: 1, explication: "Métaphore : comparaison sans 'comme'.", niveau: 3, indice: "Regarde s'il y a un mot de comparaison comme 'comme' ou 'semblable à'." },
  { enonce: "L'ONU est fondée en ?", options: ["A) 1918", "B) 1939", "C) 1945", "D) 1962"], bonne_reponse: 2, explication: "L'ONU est créée en 1945 juste après la Seconde Guerre Mondiale.", niveau: 2 },
  { enonce: "f(x) = 3x − 5. Image de 4 ?", options: ["A) 7", "B) 12", "C) 2", "D) -1"], bonne_reponse: 0, explication: "f(4) = 12 − 5 = 7.", niveau: 3, indice: "Remplace simplement la lettre x par le nombre 4 dans l'expression." },
  { enonce: "Triangle rectangle cathètes 3 et 4 cm. Hypoténuse ?", options: ["A) 7 cm", "B) 5 cm", "C) 6 cm", "D) 12 cm"], bonne_reponse: 1, explication: "3²+4²=25, √25=5.", niveau: 2 }
];

// ── MUTATIONS MATHS ──────────────────────────────────────────
const Mutations = {
  pourcentage() {
    const pcts = [10, 20, 25, 50];
    const p = pcts[Math.floor(Math.random() * pcts.length)];
    const bases = [40, 60, 80, 100, 120, 160, 200];
    const b = bases[Math.floor(Math.random() * bases.length)];
    const r = b * p / 100;
    const opts = shuffleArr([r, r + p, b / p, r * 2]).slice(0, 4).map((v, i) => `${['A','B','C','D'][i]}) ${v}`);
    const bon = opts.findIndex(o => o.includes(`) ${r}`));
    return { id: `mut_pct_${Date.now()}`, enonce: `Calculer ${p}% de ${b} (sans calculatrice).`, options: bon >= 0 ? opts : [`A) ${r}`, `B) ${r+p}`, `C) ${r*2}`, `D) ${b/p}`], bonne_reponse: bon >= 0 ? bon : 0, explication: `${p}% de ${b} = ${b}×${p}/100 = ${r}.`, niveau: 1, _mute: true, theme_auto: "Automatismes : Pourcentages" };
  },
  equation() {
    const a = Math.floor(Math.random() * 5) + 2;
    const x = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const c = a * x + b;
    const opts = [`A) x = ${x}`, `B) x = ${x + 1}`, `C) x = ${c}`, `D) x = ${x - 1}`];
    return { id: `mut_equ_${Date.now()}`, enonce: `Résoudre : ${a}x + ${b} = ${c}`, options: opts, bonne_reponse: 0, explication: `${a}x = ${c - b} → x = ${x}.`, niveau: 3, indice: `Isole les x. Commence par soustraire ${b} des deux côtés du signe égal.`, _mute: true, theme_auto: "Algèbre : Équations" };
  },
  pythagore() {
    const triplets = [[3,4,5],[5,12,13],[6,8,10]];
    const [a, b, c] = triplets[Math.floor(Math.random() * triplets.length)];
    const opts = [`A) ${c} cm`, `B) ${a + b} cm`, `C) ${c + 1} cm`, `D) ${c - 1} cm`];
    return { id: `mut_pyt_${Date.now()}`, enonce: `Triangle rectangle, cathètes ${a} cm et ${b} cm. Hypoténuse ?`, options: opts, bonne_reponse: 0, explication: `c² = ${a}² + ${b}² = ${a*a+b*b}. c = ${c} cm.`, niveau: 3, indice: "Applique le théorème de Pythagore : le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés.", _mute: true, theme_auto: "Géométrie : Pythagore" };
  }
};

// ── GESTION DU CARNET D'ERREURS (LOCALSTORAGE) ────────────────
function chargerCarnetErreurs() {
  try {
    AppState.carnetErreurs = JSON.parse(localStorage.getItem('rb_carnet_erreurs') || '[]');
  } catch { AppState.carnetErreurs = []; }
}

function ajouterAuCarnet(question) {
  // Éviter les doublons dans le carnet d'erreurs
  const existe = AppState.carnetErreurs.some(q => q.enonce === question.enonce);
  if (!existe) {
    AppState.carnetErreurs.push(question);
    localStorage.setItem('rb_carnet_erreurs', JSON.stringify(AppState.carnetErreurs));
    updateBadgesMenu();
  }
}

function retirerDuCarnet(questionEnonce) {
  AppState.carnetErreurs = AppState.carnetErreurs.filter(q => q.enonce !== questionEnonce);
  localStorage.setItem('rb_carnet_erreurs', JSON.stringify(AppState.carnetErreurs));
  updateBadgesMenu();
}

// ── MOTEUR ADAPTATIF ──────────────────────────────────────────
function getAdaptiveState(chapId) {
  if (!AppState.adaptive[chapId]) {
    const saved = JSON.parse(localStorage.getItem('rb_adaptive') || '{}');
    AppState.adaptive[chapId] = saved[chapId] || { niveau: 1, hist: [], vus: [] };
  }
  return AppState.adaptive[chapId];
}

function saveAdaptiveState() {
  localStorage.setItem('rb_adaptive', JSON.stringify(AppState.adaptive));
}

function updateAdaptif(chapId, correct) {
  if (chapId === 'examen_blanc' || chapId === 'carnet_erreurs') return { niveau: 1 };
  const s = getAdaptiveState(chapId);
  s.hist.push(correct);
  if (s.hist.length > 3) s.hist.shift();
  let montee = false, descente = false;
  if (s.hist.length === 3 && s.hist.every(v => v)) { if (s.niveau < 3) { s.niveau++; s.hist = []; montee = true; } }
  const mauvaises = s.hist.filter(v => !v).length;
  if (mauvaises >= 2) { if (s.niveau > 1) { s.niveau--; s.hist = []; descente = true; } }
  saveAdaptiveState();
  return { montee, descente, niveau: s.niveau };
}

function selectionnerQuestions(chapId, questionsBase, nb = 5) {
  const s = getAdaptiveState(chapId);
  const pool = [...questionsBase];
  const selection = shuffleArr(pool).slice(0, nb).map(q => melangerOptions(q));
  return selection;
}

function melangerOptions(q) {
  if (!q.options || q.options.length === 0) return q;
  const optionsNettoyees = q.options.map(opt => opt.replace(/^[A-D]\)\s*/, ''));
  const texteBonneOption = optionsNettoyees[q.bonne_reponse];
  const optionsMelangees = shuffleArr([...optionsNettoyees]);
  const nouvelIndex = optionsMelangees.indexOf(texteBonneOption);
  const optionsFormatees = optionsMelangees.map((opt, idx) => `${['A', 'B', 'C', 'D'][idx]}) ${opt}`);
  return { ...q, options: optionsFormatees, bonne_reponse: nouvelIndex >= 0 ? nouvelIndex : 0 };
}

// ── CHARGEMENT & PROGRESSION ──────────────────────────────────
function loadProgress() {
  try { AppState.progress = JSON.parse(localStorage.getItem('rb_progress') || '{}'); } catch { AppState.progress = {}; }
}
function saveProgress() { localStorage.setItem('rb_progress', JSON.stringify(AppState.progress)); }

function updateProgressRing() {
  const circle = document.getElementById('global-progress-circle');
  const pctEl  = document.getElementById('global-progress-percent');
  if (!circle || !pctEl) return;
  const vals  = Object.values(AppState.progress);
  const total  = vals.length;
  const acquis = vals.filter(v => v === 'acquis').length;
  const pct    = total > 0 ? Math.round(acquis / total * 100) : 0;
  const circ   = 52 * 2 * Math.PI;
  circle.style.strokeDasharray  = `${circ} ${circ}`;
  circle.style.strokeDashoffset = circ - (pct / 100) * circ;
  pctEl.textContent = pct;
}

function updateBadgesMenu() {
  const badge = document.getElementById('carnet-count-badge');
  if (badge) {
    badge.textContent = AppState.carnetErreurs.length;
    badge.style.display = AppState.carnetErreurs.length > 0 ? 'inline-block' : 'none';
  }
}

// ── NAVIGATION ────────────────────────────────────────────────
function buildNav() {
  const menu = document.getElementById('sidebar-menu');
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

// ── VUE : LE CARNET D'ERREURS ─────────────────────────────────
function renderCarnetVue() {
  const container = document.getElementById('app-view-container');
  const count = AppState.carnetErreurs.length;

  if (count === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <span style="font-size:4rem;">🎉</span>
        <h2 style="color:var(--text-primary);margin-top:10px;">Ton carnet d'erreurs est vide !</h2>
        <p style="color:var(--text-secondary);font-size:0.88rem;max-width:40px;margin:8px auto 20px auto;">C'est parfait. Quand tu feras une erreur dans un quiz, la question viendra se placer ici pour que tu puisses la retravailler.</p>
        <button onclick="renderDashboard();setNav('btn-home')" class="btn-primary">Faire un quiz</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#EF4444,#F43F5E);color:white;padding:20px;border-radius:12px;margin-bottom:20px;">
      <h2 style="margin:0;font-size:1.3rem;">📕 Mon Carnet d'erreurs ("Le Bouton Rouge")</h2>
      <p style="margin:6px 0 14px 0;font-size:0.85rem;opacity:0.9;">Tu as <b>${count} question${count > 1 ? 's' : ''}</b> à corriger. C'est en retravaillant tes erreurs qu'on progresse le plus !</p>
      <button id="btn-lancer-rattrapage" class="btn-primary" style="background:white;color:#EF4444;border:none;box-shadow:0 4px 6px rgba(0,0,0,0.1);">🚀 Lancer le quiz de rattrapage</button>
    </div>
    <h3 style="color:var(--text-primary);margin-bottom:12px;font-size:1rem;">Questions en attente de correction :</h3>
    <div style="display:flex;flex-direction:column;gap:10px;" id="liste-erreurs-container"></div>
  `;

  document.getElementById('btn-lancer-rattrapage').addEventListener('click', startQuizRattrapage);

  const listEl = document.getElementById('liste-erreurs-container');
  AppState.carnetErreurs.forEach((q, index) => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.borderLeft = '4px solid #EF4444';
    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <p style="font-size:0.88rem;font-weight:600;color:var(--text-primary);margin:0;">${escHtml(q.enonce)}</p>
        <button class="btn-suppr-erreur" data-index="${index}" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:0.8rem;font-weight:bold;">Supprimer</button>
      </div>
      <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:6px;background:var(--bg-app);padding:6px;border-radius:4px;">💡 <b>Rappel de l'explication :</b> ${escHtml(q.explication)}</p>
    `;
    item.querySelector('.btn-suppr-erreur').addEventListener('click', (e) => {
      const idx = e.target.dataset.index;
      retirerDuCarnet(AppState.carnetErreurs[idx].enonce);
      renderCarnetVue();
      showToast('Question retirée du carnet.');
    });
    listEl.appendChild(item);
  });
}

// ── ENCLENCHEMENT DES QUIZ ────────────────────────────────────
function startQuizRattrapage() {
  // On prend max 5 erreurs au hasard pour ne pas la décourager
  const erreursMelangees = shuffleArr([...AppState.carnetErreurs]).slice(0, 5);
  AppState.quiz = {
    chapitreId: 'carnet_erreurs',
    matLabel: "Rattrapage",
    questions: erreursMelangees.map(q => melangerOptions(q)),
    index: 0,
    score: 0,
    infini: false,
    estRattrapage: true
  };
  afficherQuestion();
  document.getElementById('quiz-modal').classList.add('active');
}

function startQuizAdaptatif(chap, mat) {
  const baseQuiz = chap.quiz || [];
  if (baseQuiz.length === 0) return showToast('Pas de questions disponibles.');
  const questions = selectionnerQuestions(chap.id, baseQuiz, 5);
  AppState.quiz = { chapitreId: chap.id, matLabel: mat?.label || '', questions, index: 0, score: 0, infini: false, estRattrapage: false };
  afficherQuestion();
  document.getElementById('quiz-modal').classList.add('active');
}

function startExamenBlanc() {
  let toutes = [];
  AppState.data.matieres.forEach(m => m.chapitres.forEach(c => { toutes = toutes.concat(c.quiz || []); }));
  if (!toutes.length) return;
  toutes = shuffleArr(toutes).slice(0, 20);
  AppState.quiz = { chapitreId: 'examen_blanc', matLabel: 'Examen Blanc', questions: toutes.map(q => melangerOptions(q)), index: 0, score: 0, infini: true, estRattrapage: false };
  afficherQuestion();
  document.getElementById('quiz-modal').classList.add('active');
}

// ── MOTEUR DE QUESTION & BOUTON INDICE ───────────────────────
function afficherQuestion() {
  const quiz = AppState.quiz;
  const q    = quiz.questions[quiz.index];
  const pct  = Math.round(quiz.index / quiz.questions.length * 100);

  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-progress').innerHTML = `Question ${quiz.index + 1}/${quiz.questions.length} · Score : ${quiz.score}`;

  // Réinitialisation de la boîte de dialogue de la modale de quiz
  const qTextContainer = document.getElementById('quiz-question-text');
  qTextContainer.innerHTML = escHtml(q.enonce);

  // INTERFACE UX & BOUTON INDICE (POUR LES NIVEAUX 3 UNIQUEMENT)
  if (parseInt(q.level || q.niveau) === 3) {
    const btnIndice = document.createElement('button');
    btnIndice.className = 'btn-indice';
    btnIndice.innerHTML = `💡 Besoin d'un indice ?`;
    
    const indiceBox = document.createElement('div');
    indiceBox.className = 'indice-box hidden';
    // Fabrication de l'indice s'il n'existe pas explicitement
    const texteIndice = q.indice || q.explication.split('.')[0] + ".";
    indiceBox.textContent = texteIndice;

    btnIndice.addEventListener('click', () => {
      indiceBox.classList.toggle('hidden');
      btnIndice.textContent = indiceBox.classList.contains('hidden') ? `💡 Besoin d'un indice ?` : `🙈 Cacher l'indice`;
    });

    qTextContainer.appendChild(document.createElement('br'));
    qTextContainer.appendChild(btnIndice);
    qTextContainer.appendChild(indiceBox);
  }

  document.getElementById('quiz-explanation').classList.add('hidden');
  document.getElementById('quiz-next-btn').classList.add('hidden');

  const optsEl = document.getElementById('quiz-options-container');
  optsEl.innerHTML = '';
  optsEl.classList.remove('shake'); // Reset animation UX

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => repondre(btn, i, q, optsEl));
    optsEl.appendChild(btn);
  });
}

function repondre(btn, idx, q, optsEl) {
  Array.from(optsEl.children).forEach(b => b.disabled = true);
  const correct = idx === q.bonne_reponse;

  if (correct) {
    btn.style.cssText += 'background:#D1FAE5;border-color:#10B981;color:#064E3B;font-weight:700;';
    AppState.quiz.score++;
    
    // Si on est dans le carnet d'erreurs et qu'elle a vu juste, on nettoie sa bêtise passée !
    if (AppState.quiz.estRattrapage) {
      retirerDuCarnet(q.enonce);
    }
  } else {
    // EFFET VISUEL EN CAS D'ERREUR : L'élément tremble
    optsEl.classList.add('shake');
    btn.style.cssText += 'background:#FEE2E2;border-color:#EF4444;color:#7F1D1D;';
    
    const bonneBtn = optsEl.children[q.bonne_reponse];
    if (bonneBtn) bonneBtn.style.cssText += 'background:#D1FAE5;border-color:#10B981;color:#064E3B;font-weight:700;';

    // AUTOMATION : "LE BOUTON ROUGE" Enregistre la question ratée
    if (!AppState.quiz.estRattrapage) {
      ajouterAuCarnet(q);
    }
  }

  updateAdaptif(AppState.quiz.chapitreId, correct);
  document.getElementById('explanation-text').textContent = q.explication;
  document.getElementById('quiz-explanation').classList.remove('hidden');
  document.getElementById('quiz-next-btn').classList.remove('hidden');
}

// ── LE RESTE DU MOTEUR (LANCEMENT CLASSIQUE) ──────────────────
document.getElementById('quiz-next-btn').addEventListener('click', () => {
  AppState.quiz.index++;
  if (AppState.quiz.index < AppState.quiz.questions.length) {
    afficherQuestion();
  } else {
    finQuiz();
  }
});

document.getElementById('quiz-close-btn').addEventListener('click', () => {
  document.getElementById('quiz-modal').classList.remove('active');
  if (AppState.quiz.estRattrapage) renderCarnetVue(); else renderDashboard();
});

function finQuiz() {
  const quiz = AppState.quiz;
  document.getElementById('quiz-modal').classList.remove('active');

  const container = document.getElementById('app-view-container');
  
  if (quiz.estRattrapage) {
    container.innerHTML = `
      <div style="text-align:center;padding:30px 10px;">
        <span style="font-size:3.5rem;">🎯</span>
        <h2 style="color:var(--text-primary);">Fin du rattrapage !</h2>
        <p style="font-size:1.5rem;font-weight:bold;color:var(--color-primary);margin:10px 0;">Score : ${quiz.score} / ${quiz.questions.length}</p>
        <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:20px;">Toutes les questions correctement résolues ont été enlevées de ton carnet d'erreurs.</p>
        <button onclick="renderCarnetVue()" class="btn-primary">Retour au carnet</button>
      </div>
    `;
  } else {
    // Code de fin de quiz standard
    const pct = Math.round(quiz.score / quiz.questions.length * 100);
    if (pct >= 80 && quiz.chapitreId !== 'examen_blanc') { AppState.progress[quiz.chapitreId] = 'acquis'; saveProgress(); }
    container.innerHTML = `
      <div style="text-align:center;padding:30px 10px;">
        <h2>Quiz Terminé ! Score : ${quiz.score} / ${quiz.questions.length}</h2>
        <button onclick="renderDashboard()" class="btn-primary" style="margin-top:15px;">Retour à l'accueil</button>
      </div>
    `;
  }
  updateProgressRing();
}

async function loadData() {
  try {
    const res = await fetch('troisieme.json');
    if (res.ok) { AppState.data = await res.json(); return true; }
  } catch {}
  AppState.data = { matieres: [{ id: 'maths', label: 'Mathématiques', emoji: '📐', couleur: '#3D5A99', chapitres: [{ id: 'm1', titre: 'Fractions', fiche: 'Fiche fractions', quiz: SECOURS }] }] };
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  loadProgress();
  chargerCarnetErreurs();
  await loadData();
  buildNav();
  renderDashboard();
  updateProgressRing();
});

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
window.renderDashboard = () => { /* Ton code de rendu dashboard initial */ };
