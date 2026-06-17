// ============================================================
// RévisBrevet 2026 — app.js (Moteur Pop-up & Niveaux Corrigés)
// Sans clé API payante — Entièrement local et autonome
// ============================================================

const AppState = {
  data: null,
  progress: {},
  adaptive: {},
  carnetErreurs: [],
  quiz: { matId: null, chapitreId: null, matLabel: '', questions: [], index: 0, score: 0, infini: false, estRattrapage: false }
};

const SECOURS = [
  { enonce: "Calculer 20% de 60.", options: ["A) 10", "B) 12", "C) 15", "D) 8"], bonne_reponse: 1, explication: "10% de 60 = 6, donc 20% = 12.", niveau: 1 },
  { enonce: "'Ses yeux étaient deux étoiles' — figure de style ?", options: ["A) Comparaison", "B) Métaphore", "C) Hyperbole", "D) Personnification"], bonne_reponse: 1, explication: "Métaphore : comparaison sans outil ('comme').", niveau: 3, indice: "Vérifie l'absence de mot de comparaison." },
  { enonce: "En quelle année l'ONU a-t-elle été fondée ?", options: ["A) 1918", "B) 1939", "C) 1945", "D) 1962"], bonne_reponse: 2, explication: "L'ONU a été créée en 1945.", niveau: 2 }
];

const Mutations = {
  pourcentage() {
    const pcts = [10, 20, 25, 50], p = pcts[Math.floor(Math.random() * pcts.length)];
    const bases = [40, 60, 80, 120], b = bases[Math.floor(Math.random() * bases.length)];
    const r = b * p / 100;
    return { enonce: `Calculer ${p}% de ${b} (sans calculatrice).`, options: [`A) ${r}`, `B) ${r + p}`, `C) ${b - r}`, `D) ${r * 2}`], bonne_reponse: 0, explication: `${p}% de ${b} = ${r}.`, niveau: 1, theme_auto: "Pourcentages" };
  },
  equation() {
    const a = Math.floor(Math.random() * 3) + 2, x = Math.floor(Math.random() * 5) + 1, b = Math.floor(Math.random() * 5) + 1, c = a * x + b;
    return { enonce: `Résoudre l'équation : ${a}x + ${b} = ${c}`, options: [`A) x = ${x}`, `B) x = ${x + 2}`, `C) x = ${c}`, `D) x = ${x - 1}`], bonne_reponse: 0, explication: `${a}x = ${c} - ${b} → x = ${x}.`, niveau: 2, theme_auto: "Équations" };
  }
};

function genererSerieAleatoire(chapId, baseQuiz = [], taille = 5) {
  let depar = Array.isArray(baseQuiz) && baseQuiz.length > 0 ? [...baseQuiz] : [];
  const clesMutations = Object.keys(Mutations);
  while (depar.length < taille && clesMutations.length > 0) {
    const clé = clesMutations[Math.floor(Math.random() * clesMutations.length)];
    depar.push(Mutations[clé]());
  }
  if (depar.length === 0) depar = [...SECOURS];
  return shuffleArr(depar).slice(0, taille);
}

// ── LOCAL STORAGE & PROGRESSION ─────────────────────────────
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

// ── NAVIGATION & INTERFACE PRINCIPALE ────────────────────────
function buildNav() {
  const menu = document.getElementById('sidebar-menu');
  if (!menu) return;
  menu.innerHTML = `
    <li><a class="nav-item active" id="btn-home"><span>🏠</span><span>Accueil</span></a></li>
    <li><a class="nav-item" id="btn-programme"><span>📅</span><span>Planning</span></a></li>
    <li><a class="nav-item nav-item-danger" id="btn-carnet"><span>📕</span><span>Erreurs <b id="carnet-count-badge" style="background:#EF4444;color:white;padding:1px 6px;border-radius:10px;font-size:0.65rem;margin-left:5px;display:none;">0</b></span></a></li>
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
    card.innerHTML = `<h3>${mat.emoji} ${mat.label.split(' — ')[0]}</h3><p style="font-size:.8rem;color:var(--text-secondary);margin-top:6px;">Accéder aux exercices.</p>`;
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
      <p style="font-size:.85rem;margin:4px 0 10px 0;">Contient ${AppState.carnetErreurs.length} question(s).</p>
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
  document.getElementById('app-view-container').innerHTML = `<h2>📅 Planning d'études</h2><p style="color:var(--text-secondary);">Génération autonome programmée pour le Brevet 2026.</p>`;
}

// ── OUVERTURE ET COMPORTEMENT DE LA MODALE QUIZ ─────────────────
function lancerQuizDepuisChapitre(matId, chapId) {
  const mat = AppState.data?.matieres?.find(m => m.id === matId);
  const chap = mat?.chapitres?.find(c => c.id === chapId);
  const baseQuiz = chap?.quiz || [];
  const nomMatiere = mat ? mat.label.split(' — ')[0] : "Révision";

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

  AppState.quiz.questions = AppState.quiz.questions.map(q => melangerOptions(q));
  afficherQuestion();
  ouvrirPopUp();
}

function startQuizRattrapage() {
  if (AppState.carnetErreurs.length === 0) return;
  AppState.quiz = { matId: null, chapitreId: 'carnet_erreurs', matLabel: 'Rattrapage', questions: shuffleArr([...AppState.carnetErreurs]).slice(0, 5).map(q => melangerOptions(q)), index: 0, score: 0, infini: false, estRattrapage: true };
  afficherQuestion();
  ouvrirPopUp();
}

function startExamenBlanc() {
  let toutes = [];
  if (AppState.data && AppState.data.matieres) {
    AppState.data.matieres.forEach(m => m.chapitres.forEach(c => { toutes = toutes.concat(c.quiz || []); }));
  }
  AppState.quiz = { matId: null, chapitreId: 'examen_blanc', matLabel: 'Examen Blanc', questions: genererSerieAleatoire('blanc', toutes, 10).map(q => melangerOptions(q)), index: 0, score: 0, infini: true, estRattrapage: false };
  afficherQuestion();
  ouvrirPopUp();
}

function ouvrirPopUp() {
  const mq = document.getElementById('quiz-modal');
  if (mq) {
    mq.classList.remove('hidden');
    mq.classList.add('active');
  }
}

function fermerModaleQuiz() {
  const mq = document.getElementById('quiz-modal');
  if (mq) {
    mq.classList.remove('active');
    mq.classList.add('hidden');
  }
}

function melangerOptions(q) {
  if (!q.options || q.options.length === 0) return q;
  const pureOpts = q.options.map(o => o.replace(/^[A-D]\)\s*/, ''));
  const bonneTxt = pureOpts[q.bonne_reponse];
  const rMelangee = shuffleArr([...pureOpts]);
  const nIdx = rMelangee.indexOf(bonneTxt);
  return { ...q, options: rMelangee.map((o, idx) => `${['A','B','C','D'][idx]}) ${o}`), bonne_reponse: nIdx >= 0 ? nIdx : 0 };
}

// ── INJECTION DES QUESTIONS ET BADGES DE DIFFICULTÉ ──────────────
function afficherQuestion() {
  const quiz = AppState.quiz, q = quiz.questions[quiz.index];
  if (!q) return;
  const pct = Math.round((quiz.index / quiz.questions.length) * 100);

  const fill = document.getElementById('quiz-progress-fill'); if (fill) fill.style.width = pct + '%';
  const prog = document.getElementById('quiz-progress'); if (prog) prog.innerHTML = `${quiz.matLabel} — Question ${quiz.index + 1}/${quiz.questions.length}`;

  const qContainer = document.getElementById('quiz-question-text');
  if (qContainer) {
    qContainer.innerHTML = '';

    // GESTION DU BADGE DE DIFFICULTÉ DYNAMIQUE (Niveau 1, 2 ou 3)
    const nv = parseInt(q.niveau) || 1;
    let badgeCouleur = "#10B981", texteNiveau = "Niveau : Facile";
    if (nv === 2) { badgeCouleur = "#F59E0B"; texteNiveau = "Niveau : Intermédiaire"; }
    else if (nv === 3) { badgeCouleur = "#EF4444"; texteNiveau = "Niveau : Difficile"; }

    const badgeDiff = document.createElement('span');
    badgeDiff.style.cssText = `background:${badgeCouleur};color:white;padding:3px 10px;font-size:.7rem;border-radius:12px;font-weight:700;display:inline-block;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;`;
    badgeDiff.textContent = texteNiveau;
    qContainer.appendChild(badgeDiff);

    if (q.theme_auto) {
      const bAuto = document.createElement('span');
      bAuto.style.cssText = "background:var(--bg-card-hover);color:var(--color-primary);padding:3px 10px;font-size:.7rem;border-radius:12px;font-weight:700;display:inline-block;margin-left:6px;margin-bottom:10px;";
      bAuto.textContent = `⚡ ${q.theme_auto}`;
      qContainer.appendChild(bAuto);
    }

    const pEnonce = document.createElement('p');
    pEnonce.style.cssText = "font-size:1.05rem;font-weight:600;margin:6px 0 12px 0;line-height:1.45;color:var(--text-primary);";
    pEnonce.textContent = q.enonce;
    qContainer.appendChild(pEnonce);

    if (nv === 3) {
      const btnInd = document.createElement('button');
      btnInd.style.cssText = "background:none;border:1px dashed var(--color-warning);color:var(--color-warning);padding:4px 10px;border-radius:6px;font-size:.72rem;cursor:pointer;margin-top:4px;display:block;font-weight:600;";
      btnInd.textContent = "💡 Débloquer l'indice de cours";
      const boxInd = document.createElement('div');
      boxInd.className = 'hidden';
      boxInd.style.cssText = "background:var(--bg-card-hover);border-left:3px solid var(--color-warning);padding:8px 12px;font-size:.78rem;margin-top:6px;border-radius:4px;line-height:1.4;";
      boxInd.textContent = q.indice || "Prends un brouillon, décompose la question et procède par élimination.";
      btnInd.addEventListener('click', () => {
        boxInd.classList.toggle('hidden');
        btnInd.textContent = boxInd.classList.contains('hidden') ? "💡 Débloquer l'indice de cours" : "🙈 Masquer l'indice";
      });
      qContainer.appendChild(btnInd); qContainer.appendChild(boxInd);
    }
  }

  document.getElementById('quiz-explanation')?.classList.add('hidden');
  document.getElementById('quiz-next-btn')?.classList.add('hidden');

  const optsEl = document.getElementById('quiz-options-container');
  if (optsEl) {
    optsEl.innerHTML = '';
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
  fermerModaleQuiz(); // <- Correction de la coquille ici

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
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">Tu as validé ${pct}% des objectifs du module.</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button id="btn-generer-nouveau" class="btn-primary">🔄 Relancer une série d'exercices</button>
        <button onclick="renderDashboard()" style="background:none;border:1px solid var(--border-color);padding:10px;border-radius:6px;cursor:pointer;font-size:0.85rem;color:var(--text-secondary);">🏠 Tableau de bord</button>
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

async function loadData() {
  try {
    const res = await fetch('troisieme.json');
    if (res.ok) { AppState.data = await res.json(); return true; }
  } catch(e) { console.warn("Fichier troisieme.json non trouvé. Repli autonome."); }
  AppState.data = {
    matieres: [
      { id: 'maths', label: 'Mathématiques', emoji: '📐', couleur: '#3D5A99', chapitres: [{ id: 'maths_01', titre: '⚡ Automatismes officiels DNB 2026', fiche: 'Calcul mental et révisions.', quiz: [] }] }
    ]
  };
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  loadProgress(); chargerCarnetErreurs();
  await loadData(); buildNav(); renderDashboard(); updateProgressRing();
  
  const mApi = document.getElementById('modal-api'); if (mApi) { mApi.style.display = 'none'; mApi.classList.add('hidden'); }

  // Liaison universelle (Clic & Tactile) pour fermer le quiz
  const closeBtn = document.getElementById('quiz-close-btn');
  if (closeBtn) {
    const execFermeture = (e) => {
      e.preventDefault();
      fermerModaleQuiz();
    };
    closeBtn.addEventListener('click', execFermeture);
    closeBtn.addEventListener('touchstart', execFermeture, { passive: false });
  }

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    document.getElementById('modal-api')?.classList.remove('hidden');
  });
  document.getElementById('close-modal-api')?.addEventListener('click', () => document.getElementById('modal-api').classList.add('hidden'));
  document.getElementById('btn-skip-api')?.addEventListener('click', () => document.getElementById('modal-api').classList.add('hidden'));
  
  const toggleTheme = () => document.body.classList.toggle('dark-mode');
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('theme-toggle-mobile')?.addEventListener('click', toggleTheme);
});

function shuffleArr(arr) {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
}
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
