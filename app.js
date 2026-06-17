// ============================================================
// RévisBrevet 2026 — app.js
// Version autonome : AUCUN module ES6, tout à la racine
// JSON chargé depuis troisieme.json (même dossier)
// ============================================================

// ── ÉTAT GLOBAL ──────────────────────────────────────────────
const AppState = {
  data: null,
  progress: {},
  adaptive: {},
  quiz: { chapitreId: null, questions: [], index: 0, score: 0, infini: false }
};

// Banque de secours si le JSON ne charge pas
const SECOURS = [
  { enonce: "20% de 60 = ?", options: ["A) 10", "B) 12", "C) 15", "D) 8"], bonne_reponse: 1, explication: "10% de 60 = 6, donc 20% = 12.", niveau: 1 },
  { enonce: "'Ses yeux étaient deux étoiles' — figure de style ?", options: ["A) Comparaison", "B) Métaphore", "C) Hyperbole", "D) Personnification"], bonne_reponse: 1, explication: "Métaphore : comparaison sans 'comme'.", niveau: 1 },
  { enonce: "L'ONU est fondée en ?", options: ["A) 1918", "B) 1939", "C) 1945", "D) 1962"], bonne_reponse: 2, explication: "L'ONU est créée en 1945 après la WWII.", niveau: 1 },
  { enonce: "f(x) = 3x − 5. Image de 4 ?", options: ["A) 7", "B) 12", "C) 2", "D) -1"], bonne_reponse: 0, explication: "f(4) = 12 − 5 = 7.", niveau: 1 },
  { enonce: "Triangle rectangle cathètes 3 et 4 cm. Hypoténuse ?", options: ["A) 7 cm", "B) 5 cm", "C) 6 cm", "D) 12 cm"], bonne_reponse: 1, explication: "3²+4²=25, √25=5.", niveau: 1 }
];

// ── MUTATIONS MATHS (questions générées dynamiquement) ────────
const Mutations = {
  pourcentage() {
    const pcts = [10, 20, 25, 50];
    const p = pcts[Math.floor(Math.random() * pcts.length)];
    const bases = [40, 60, 80, 100, 120, 160, 200];
    const b = bases[Math.floor(Math.random() * bases.length)];
    const r = b * p / 100;
    const opts = shuffleArr([r, r + p, b / p, r * 2]).slice(0, 4).map((v, i) => `${['A','B','C','D'][i]}) ${v}`);
    const bon = opts.findIndex(o => o.includes(`) ${r}`));
    return { enonce: `Calculer ${p}% de ${b} (sans calculatrice).`, options: bon >= 0 ? opts : [`A) ${r}`, `B) ${r+p}`, `C) ${r*2}`, `D) ${b/p}`], bonne_reponse: bon >= 0 ? bon : 0, explication: `${p}% de ${b} = ${b}×${p}/100 = ${r}.`, niveau: 1, _mute: true };
  },
  angles() {
    const a = Math.floor(Math.random() * 60) + 20;
    const b = Math.floor(Math.random() * (140 - a - 10)) + 10;
    const c = 180 - a - b;
    const opts = [`A) ${c}°`, `B) ${a + b}°`, `C) ${c + 10}°`, `D) ${360 - a - b}°`];
    return { enonce: `Triangle : angles ${a}° et ${b}°. Le 3e angle vaut ?`, options: opts, bonne_reponse: 0, explication: `Somme = 180°. 3e angle = 180 − ${a} − ${b} = ${c}°.`, niveau: 1, _mute: true };
  },
  equation() {
    const a = Math.floor(Math.random() * 5) + 2;
    const x = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const c = a * x + b;
    const opts = [`A) x = ${x}`, `B) x = ${x + 1}`, `C) x = ${c}`, `D) x = ${x - 1}`];
    return { enonce: `Résoudre : ${a}x + ${b} = ${c}`, options: opts, bonne_reponse: 0, explication: `${a}x = ${c - b} → x = ${x}. Vérif : ${a}×${x}+${b}=${c} ✓`, niveau: 2, _mute: true };
  },
  pythagore() {
    const triplets = [[3,4,5],[5,12,13],[6,8,10],[8,15,17],[9,12,15]];
    const [a, b, c] = triplets[Math.floor(Math.random() * triplets.length)];
    const opts = [`A) ${c} cm`, `B) ${a + b} cm`, `C) ${c + 1} cm`, `D) ${c - 1} cm`];
    return { enonce: `Triangle rectangle, cathètes ${a} cm et ${b} cm. Hypoténuse ?`, options: opts, bonne_reponse: 0, explication: `c² = ${a}² + ${b}² = ${a*a+b*b}. c = ${c} cm.`, niveau: 2, _mute: true };
  },
  moyenne() {
    const n = Math.floor(Math.random() * 3) + 4;
    const notes = Array.from({length: n}, () => Math.floor(Math.random() * 14) + 4);
    const somme = notes.reduce((s, v) => s + v, 0);
    const moy = Math.round(somme / n * 10) / 10;
    const opts = [`A) ${moy}`, `B) ${moy + 1}`, `C) ${somme}`, `D) ${moy - 0.5}`];
    return { enonce: `Notes : ${notes.join(', ')}. Moyenne ?`, options: opts, bonne_reponse: 0, explication: `(${notes.join('+')} ) ÷ ${n} = ${somme} ÷ ${n} = ${moy}.`, niveau: 1, _mute: true };
  },
  loi_ohm() {
    const cas = [
      { enonce: `R = 10 Ω, I = 2 A. Tension U = ?`, r: 20, opts: ['A) 20 V','B) 5 V','C) 12 V','D) 8 V'], expl: 'U = R×I = 10×2 = 20 V.' },
      { enonce: `U = 12 V, R = 4 Ω. Intensité I = ?`, r: 3, opts: ['A) 3 A','B) 8 A','C) 48 A','D) 1 A'], expl: 'I = U/R = 12/4 = 3 A.' },
      { enonce: `U = 15 V, I = 3 A. Résistance R = ?`, r: 5, opts: ['A) 5 Ω','B) 18 Ω','C) 45 Ω','D) 0,2 Ω'], expl: 'R = U/I = 15/3 = 5 Ω.' }
    ];
    const c = cas[Math.floor(Math.random() * cas.length)];
    return { enonce: c.enonce, options: c.opts, bonne_reponse: 0, explication: c.expl, niveau: 1, _mute: true };
  },
  probabilite() {
    const rouge = Math.floor(Math.random() * 5) + 2;
    const bleu = Math.floor(Math.random() * 5) + 2;
    const tot = rouge + bleu;
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const g = gcd(rouge, tot);
    const rs = `${rouge/g}/${tot/g}`;
    const opts = [`A) ${rs}`, `B) ${bleu}/${tot}`, `C) ${rouge}/${rouge}`, `D) 1/${rouge}`];
    return { enonce: `Sac : ${rouge} billes rouges et ${bleu} bleues. P(rouge) = ?`, options: opts, bonne_reponse: 0, explication: `P = ${rouge}/${tot}${g > 1 ? ' = ' + rs : ''}.`, niveau: 1, _mute: true };
  }
};

const MUTATEURS_PAR_CHAPITRE = {
  maths_01: ['pourcentage','angles','equation','pythagore','moyenne'],
  maths_02: ['equation','pythagore'],
  maths_03: ['equation'],
  maths_04: ['pythagore','angles'],
  maths_06: ['moyenne','probabilite'],
  pc_01:    ['loi_ohm'],
  default:  ['pourcentage','moyenne','angles']
};

function genererMutations(chapId, nb = 3) {
  const disponibles = MUTATEURS_PAR_CHAPITRE[chapId] || MUTATEURS_PAR_CHAPITRE.default;
  const questions = [];
  for (let i = 0; i < nb; i++) {
    const nom = disponibles[Math.floor(Math.random() * disponibles.length)];
    try {
      const fn = Mutations[nom] || Mutations.pourcentage;
      questions.push({ id: `mut_${nom}_${Date.now()}_${i}`, ...fn() });
    } catch(e) { /* ignorer */ }
  }
  return questions;
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
  const niveau = s.niveau;

  // 1. Questions en cache IA
  const cache = getCacheIA(chapId);

  // 2. Mutations dynamiques (3 questions fraîches)
  const mutees = genererMutations(chapId, 3);

  // 3. Questions JSON de base avec options mélangées, filtrées par niveau
  const baseNiveau = questionsBase.filter(q => (q.niveau || 2) === niveau).map(q => melangerOptions(q));
  const baseTout   = questionsBase.map(q => melangerOptions(q));

  // Assembler et dédoublonner
  const pool = [...cache, ...mutees, ...baseNiveau, ...baseTout];
  const vus = s.vus || [];
  const nonVus = pool.filter(q => !vus.includes(q.id));
  const final = nonVus.length >= nb ? nonVus : pool;

  const selection = shuffleArr(final).slice(0, nb);

  // Mémoriser les ids vus (max 15)
  selection.forEach(q => { if (q.id && !vus.includes(q.id)) vus.push(q.id); });
  if (vus.length > 15) vus.splice(0, vus.length - 15);
  s.vus = vus;
  saveAdaptiveState();

  return selection;
}

function melangerOptions(q) {
  const bonne = q.options[q.bonne_reponse];
  const opts = shuffleArr([...q.options]);
  return { ...q, options: opts, bonne_reponse: opts.indexOf(bonne) };
}

// ── CACHE QUESTIONS IA ────────────────────────────────────────
function getCacheIA(chapId) {
  try {
    const cache = JSON.parse(localStorage.getItem('rb_ia_cache') || '{}');
    return cache[chapId]?.questions || [];
  } catch { return []; }
}

function setCacheIA(chapId, questions) {
  try {
    const cache = JSON.parse(localStorage.getItem('rb_ia_cache') || '{}');
    if (!cache[chapId]) cache[chapId] = { questions: [] };
    cache[chapId].questions.push(...questions);
    cache[chapId].date = new Date().toISOString();
    localStorage.setItem('rb_ia_cache', JSON.stringify(cache));
  } catch(e) { console.warn('Cache IA plein', e); }
}

async function genererQuestionsIA(chapId, titre, matiere, niveau, apiKey) {
  const prompt = `Tu es un professeur expert du DNB 2026 (Brevet des collèges français).
Génère exactement 12 questions QCM ORIGINALES et VARIÉES sur :
- Matière : ${matiere}
- Chapitre : ${titre}
- Niveau : ${niveau}/3

Chaque question doit tester un aspect différent. Les formulations doivent varier.
Réponds UNIQUEMENT avec ce JSON valide (sans backticks, sans texte avant ou après) :
{"questions":[{"enonce":"...","options":["A) ...","B) ...","C) ...","D) ..."],"bonne_reponse":0,"explication":"...","niveau":${niveau}}]}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur API (${res.status})`);
  }

  const data = await res.json();
  const text = (data.content?.find(b => b.type === 'text')?.text || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(text);

  const questions = parsed.questions.map((q, i) => ({
    ...q, id: `ia_${chapId}_${Date.now()}_${i}`, _source: 'claude'
  }));

  setCacheIA(chapId, questions);
  return questions;
}

// ── PROGRESSION ───────────────────────────────────────────────
function loadProgress() {
  try {
    const s = localStorage.getItem('rb_progress');
    if (s) AppState.progress = JSON.parse(s);
  } catch { AppState.progress = {}; }
}

function saveProgress() {
  localStorage.setItem('rb_progress', JSON.stringify(AppState.progress));
}

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

// ── CHARGEMENT JSON ───────────────────────────────────────────
async function loadData() {
  // Essayer plusieurs chemins
  const chemins = ['troisieme.json', './troisieme.json', 'data/troisieme.json'];
  for (const chemin of chemins) {
    try {
      const res = await fetch(chemin);
      if (!res.ok) continue;
      const text = await res.text();
      AppState.data = JSON.parse(text);
      console.log('✅ JSON chargé :', chemin);
      return true;
    } catch(e) {
      console.warn('Chemin raté :', chemin, e.message);
    }
  }
  return false;
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadProgress();
  updateCountdown();

  const ok = await loadData();

  if (!ok) {
    // Utiliser la banque de secours
    AppState.data = {
      matieres: [
        { id: 'maths',   label: 'Mathématiques', emoji: '📐', couleur: '#3D5A99', chapitres: [{ id: 'secours_maths', titre: 'Questions de secours', fiche: 'Quelques questions de base.', quiz: SECOURS.slice(0,3), priorite: 'haute' }] },
        { id: 'francais',label: 'Français',       emoji: '📖', couleur: '#9B5DE5', chapitres: [{ id: 'secours_fr',   titre: 'Questions de secours', fiche: 'Quelques questions de base.', quiz: SECOURS.slice(1,4), priorite: 'haute' }] }
      ]
    };
    showToast('⚠️ troisieme.json introuvable — mode secours activé');
  }

  // Initialiser la progression
  AppState.data.matieres.forEach(m => {
    m.chapitres.forEach(c => {
      if (!AppState.progress[c.id]) AppState.progress[c.id] = 'a_reviser';
    });
  });
  saveProgress();

  buildNav();
  renderDashboard();
  updateProgressRing();
  setupEvents();
});

// ── NAVIGATION ────────────────────────────────────────────────
function buildNav() {
  const menu = document.getElementById('sidebar-menu');
  menu.innerHTML = `
    <li><a class="nav-item active" id="btn-home"><span>🏠</span><span>Accueil</span></a></li>
    <li><a class="nav-item" id="btn-programme"><span>📅</span><span>Programme</span></a></li>
    <li><a class="nav-item" id="btn-infini" style="background:linear-gradient(135deg,#E84855,#3D5A99);color:white;border-radius:6px;font-weight:700;margin-top:8px;"><span>🔥</span><span>Examen blanc</span></a></li>
  `;

  document.getElementById('btn-home').addEventListener('click', () => { setNav('btn-home'); renderDashboard(); });
  document.getElementById('btn-programme').addEventListener('click', () => { setNav('btn-programme'); renderProgramme(); });
  document.getElementById('btn-infini').addEventListener('click', startExamenBlanc);

  AppState.data.matieres.forEach(mat => {
    const li = document.createElement('li');
    li.innerHTML = `<a class="nav-item" data-id="${mat.id}"><span>${mat.emoji}</span><span>${mat.label.split(' — ')[0]}</span></a>`;
    li.querySelector('a').addEventListener('click', (e) => { setNav(null, e.currentTarget); renderMatiere(mat.id); });
    menu.appendChild(li);
  });
}

function setNav(id, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (id) { const t = document.getElementById(id); if (t) t.classList.add('active'); }
  else if (el) el.classList.add('active');
}

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  const prog = AppState.data.programme_progression;
  const sem  = getSemaineActive();
  const container = document.getElementById('app-view-container');

  container.innerHTML = `
    ${prog ? `
    <div style="background:linear-gradient(135deg,#3D5A99,#5A78B5);color:white;padding:14px 18px;border-radius:12px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-size:.72rem;opacity:.8;text-transform:uppercase;letter-spacing:.05em;">Programme en cours</div>
        <div style="font-size:.95rem;font-weight:700;margin-top:3px;">${sem ? sem.label : '🎉 Programme terminé !'}</div>
        ${sem ? `<div style="font-size:.78rem;opacity:.85;margin-top:3px;">${sem.conseil}</div>` : ''}
      </div>
      <button onclick="renderProgramme();setNav('btn-programme')" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.4);padding:7px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.82rem;">Voir le planning →</button>
    </div>` : ''}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <h2 style="color:var(--text-primary);">Mes matières</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="renderProgramme();setNav('btn-programme')" style="background:#EEF2FF;color:#3D5A99;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.82rem;">📅 Programme</button>
        <button id="btn-blanc-dash" style="background:linear-gradient(135deg,#E84855,#3D5A99);color:white;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.82rem;">🔥 Examen blanc</button>
      </div>
    </div>
    <div class="matieres-grid" id="matieres-grid"></div>
  `;

  document.getElementById('btn-blanc-dash').addEventListener('click', startExamenBlanc);

  AppState.data.matieres.forEach(mat => {
    const total  = mat.chapitres?.length || 0;
    const acquis = mat.chapitres?.filter(c => AppState.progress[c.id] === 'acquis').length || 0;
    const pct    = total > 0 ? Math.round(acquis / total * 100) : 0;
    const semaine = sem?.chapitres_prioritaires?.some(id => mat.chapitres?.some(c => c.id === id));

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `5px solid ${mat.couleur}`;
    if (semaine) card.style.boxShadow = `0 0 0 2px ${mat.couleur}50, var(--shadow-card)`;

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <h3 style="color:var(--text-primary);font-size:1rem;">${mat.emoji} ${mat.label.split(' — ')[0]}</h3>
        ${semaine ? '<span style="font-size:.68rem;background:#FEF3C7;color:#92400E;padding:2px 7px;border-radius:10px;font-weight:700;">📅 Cette semaine</span>' : ''}
      </div>
      <p style="font-size:.78rem;color:var(--text-secondary);margin-bottom:10px;">${total} chapitres · ${acquis} acquis</p>
      <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;background:${mat.couleur};"></div></div>
      <div style="font-size:.72rem;color:var(--text-secondary);text-align:right;margin-top:4px;">${pct}%</div>
    `;
    card.addEventListener('click', () => renderMatiere(mat.id));
    document.getElementById('matieres-grid').appendChild(card);
  });
}

// ── PROGRAMME ─────────────────────────────────────────────────
function getSemaineActive() {
  const prog = AppState.data?.programme_progression;
  if (!prog) return null;
  const jours = Math.ceil((new Date('2026-06-30') - new Date()) / 86400000);
  if (jours >= 14) return prog.semaines[0];
  if (jours >= 10) return prog.semaines[1];
  if (jours >= 7)  return prog.semaines[2];
  if (jours >= 0)  return prog.semaines[3];
  return null;
}

function renderProgramme() {
  const container = document.getElementById('app-view-container');
  const prog = AppState.data?.programme_progression;
  if (!prog) {
    container.innerHTML = '<p style="color:var(--text-secondary);padding:20px;">Programme non disponible dans ce fichier JSON.</p>';
    return;
  }
  const sem = getSemaineActive();
  const jours = Math.max(0, Math.ceil((new Date('2026-06-30') - new Date()) / 86400000));

  container.innerHTML = `
    <h2 style="color:var(--text-primary);margin-bottom:6px;">📅 Programme de révision DNB 2026</h2>
    <p style="color:var(--text-secondary);font-size:.88rem;margin-bottom:16px;">${prog.description || ''}</p>
    <div style="display:inline-block;background:#FDEAEA;border:1px solid var(--color-danger);color:var(--color-danger);padding:5px 14px;border-radius:20px;font-weight:700;font-size:.82rem;margin-bottom:20px;">⏳ J-${jours} avant les épreuves de maths</div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${(prog.semaines || []).map((s, idx) => {
        const active = sem?.numero === s.numero;
        const chapLabels = (s.chapitres_prioritaires || []).map(id => {
          for (const m of AppState.data.matieres) {
            const c = m.chapitres.find(ch => ch.id === id);
            if (c) return `<span style="font-size:.72rem;background:var(--bg-app);padding:2px 8px;border-radius:5px;color:var(--text-secondary);">${m.emoji} ${c.titre.substring(0,28)}</span>`;
          }
          return '';
        }).join('');
        return `
        <div style="border:2px solid ${active ? 'var(--color-primary)' : 'var(--border-color)'};border-radius:12px;padding:16px;background:${active ? '#EEF2FF' : 'var(--bg-card)'};">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
            <div style="width:26px;height:26px;border-radius:50%;background:${active ? 'var(--color-primary)' : 'var(--border-color)'};color:${active ? 'white' : 'var(--text-secondary)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;flex-shrink:0;">${s.numero}</div>
            <strong style="color:${active ? 'var(--color-primary)' : 'var(--text-primary)'};font-size:.92rem;">${s.label}</strong>
            ${active ? '<span style="font-size:.68rem;background:var(--color-primary);color:white;padding:2px 8px;border-radius:10px;font-weight:700;">EN COURS</span>' : ''}
            <span style="margin-left:auto;font-size:.72rem;color:var(--text-secondary);">Seuil : ${Math.round(s.seuil_passage * 100)}%</span>
          </div>
          <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:8px;">${s.objectif}</p>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${chapLabels}</div>
          <div style="background:rgba(0,0,0,.04);border-radius:7px;padding:9px;font-size:.78rem;color:var(--text-secondary);">💡 ${s.conseil}</div>
          ${active ? `<button onclick="lancerSemaine(${idx})" style="margin-top:10px;background:var(--color-primary);color:white;border:none;padding:7px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.82rem;">🚀 Lancer cette semaine</button>` : ''}
        </div>`;
      }).join('')}
    </div>
  `;
}

window.lancerSemaine = function(idx) {
  const sem = AppState.data?.programme_progression?.semaines?.[idx];
  if (!sem) return;
  for (const id of sem.chapitres_prioritaires) {
    for (const m of AppState.data.matieres) {
      const c = m.chapitres.find(ch => ch.id === id);
      if (c) { startQuizAdaptatif(c); return; }
    }
  }
};

// ── VUE MATIÈRE ───────────────────────────────────────────────
function renderMatiere(matId) {
  const mat = AppState.data.matieres.find(m => m.id === matId);
  if (!mat) return;
  const container = document.getElementById('app-view-container');

  container.innerHTML = `
    <button id="btn-retour" style="background:none;border:1px solid var(--border-color);color:var(--text-primary);padding:6px 12px;border-radius:6px;cursor:pointer;margin-bottom:18px;font-size:.85rem;">← Retour</button>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <span style="font-size:2rem;">${mat.emoji}</span>
      <div>
        <h2 style="color:var(--text-primary);">${mat.label.split(' — ')[0]}</h2>
        <p style="font-size:.78rem;color:var(--text-secondary);">${mat.duree_epreuve || ''} · coeff. ${mat.coeff || 2} · ${mat.chapitres.length} chapitres</p>
      </div>
    </div>
    ${mat.conseil_strategique ? `<div style="background:#EEF2FF;border-left:4px solid var(--color-primary);padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:18px;font-size:.82rem;color:#1E3A8A;line-height:1.6;">💡 <strong>Stratégie :</strong> ${mat.conseil_strategique}</div>` : ''}
    <div class="chapitres-list" id="chapitres-list"></div>
  `;

  document.getElementById('btn-retour').addEventListener('click', renderDashboard);

  mat.chapitres.forEach(chap => {
    const stat  = AppState.progress[chap.id] || 'a_reviser';
    const s     = getAdaptiveState(chap.id);
    const niv   = s.niveau;
    const nivCfg = { 1: ['🟢','Consolidation','#EAF6EA','#166534'], 2: ['🟡','Standard','#FFF3E8','#7C2D12'], 3: ['🔴','Brevet','#FDEAEA','#7F1D1D'] }[niv];
    const cacheIA = getCacheIA(chap.id);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = stat === 'acquis' ? '4px solid var(--color-accent)' : '4px solid var(--border-color)';

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <span class="status-badge status-${stat}">${stat === 'acquis' ? '✅ Acquis' : stat === 'en_cours' ? '⏳ En cours' : '○ À réviser'}</span>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:.7rem;padding:2px 8px;border-radius:10px;font-weight:600;background:${nivCfg[2]};color:${nivCfg[3]};">${nivCfg[0]} Niv. ${niv} — ${nivCfg[1]}</span>
          <span style="font-size:.7rem;color:var(--text-secondary);">${chap.quiz.length} QCM${cacheIA.length > 0 ? ` + ${cacheIA.length} IA` : ''}</span>
        </div>
      </div>
      <h4 style="color:var(--text-primary);margin-bottom:6px;">${chap.titre}</h4>
      <p style="font-size:.8rem;color:var(--text-secondary);line-height:1.5;margin-bottom:10px;">${chap.fiche}</p>
      ${chap.conseil_strategique ? `<div style="background:#F0FDF4;border-left:3px solid #22C55E;padding:7px 12px;border-radius:0 6px 6px 0;font-size:.78rem;color:#166534;margin-bottom:10px;line-height:1.5;">💡 ${chap.conseil_strategique}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-quiz btn-primary" style="font-size:.83rem;padding:8px 16px;">🎯 Quiz adaptatif</button>
        <button class="btn-ia" style="background:none;border:1.5px solid #7C3AED;color:#7C3AED;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:600;">🤖 +IA</button>
        ${stat !== 'acquis' ? '<button class="btn-acquis" style="background:none;border:1.5px solid var(--color-accent);color:var(--color-accent);padding:7px 12px;border-radius:8px;cursor:pointer;font-size:.78rem;">✓ Acquis</button>' : ''}
      </div>
    `;

    card.querySelector('.btn-quiz').addEventListener('click', () => startQuizAdaptatif(chap, mat));

    card.querySelector('.btn-ia').addEventListener('click', (e) => {
      e.stopPropagation();
      const apiKey = localStorage.getItem('rb_claude_key');
      if (!apiKey) { ouvrirModaleAPI(chap.id, chap.titre, mat.label, e.currentTarget); return; }
      lancerGenerationIA(chap.id, chap.titre, mat.label, apiKey, e.currentTarget);
    });

    card.querySelector('.btn-acquis')?.addEventListener('click', (e) => {
      e.stopPropagation();
      AppState.progress[chap.id] = 'acquis';
      saveProgress();
      renderMatiere(matId);
      updateProgressRing();
    });

    document.getElementById('chapitres-list').appendChild(card);
  });
}

async function lancerGenerationIA(chapId, titre, matiere, apiKey, btn) {
  const original = btn.textContent;
  btn.textContent = '⏳...';
  btn.disabled = true;
  try {
    const niveau = getAdaptiveState(chapId).niveau;
    const qs = await genererQuestionsIA(chapId, titre, matiere, niveau, apiKey);
    showToast(`✅ ${qs.length} questions IA ajoutées !`);
    btn.textContent = `🤖 +${qs.length}`;
    btn.disabled = false;
  } catch(err) {
    if (err.message.includes('401') || err.message.includes('invalid')) {
      localStorage.removeItem('rb_claude_key');
      ouvrirModaleAPI(chapId, titre, matiere, btn);
    } else {
      showToast(`❌ ${err.message}`);
    }
    btn.textContent = original;
    btn.disabled = false;
  }
}

// ── QUIZ ──────────────────────────────────────────────────────
function startQuizAdaptatif(chap, mat) {
  if (!chap.quiz?.length) return showToast('Pas de questions pour ce chapitre.');
  const questions = selectionnerQuestions(chap.id, chap.quiz, 5);
  AppState.quiz = { chapitreId: chap.id, matLabel: mat?.label || '', questions, index: 0, score: 0, infini: false };
  afficherQuestion();
  document.getElementById('quiz-modal').classList.add('active');
}

function startExamenBlanc() {
  let toutes = [];
  AppState.data.matieres.forEach(m => m.chapitres.forEach(c => { toutes = toutes.concat(c.quiz || []); }));
  if (!toutes.length) return;
  toutes = shuffleArr(toutes).slice(0, 20);
  AppState.quiz = { chapitreId: 'examen_blanc', matLabel: 'Toutes matières', questions: toutes, index: 0, score: 0, infini: true };
  afficherQuestion();
  document.getElementById('quiz-modal').classList.add('active');
}

function afficherQuestion() {
  const quiz = AppState.quiz;
  const q    = quiz.questions[quiz.index];
  const pct  = Math.round(quiz.index / quiz.questions.length * 100);
  const s    = getAdaptiveState(quiz.chapitreId);
  const nCfg = { 1: '🟢 Consolidation', 2: '🟡 Standard', 3: '🔴 Brevet' };

  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-progress').innerHTML = quiz.infini
    ? `🔥 Examen blanc — Q${quiz.index + 1}/${quiz.questions.length} · Score : ${quiz.score}`
    : `Q${quiz.index + 1}/${quiz.questions.length} · ${nCfg[s.niveau]} · Score : ${quiz.score}`;

  document.getElementById('quiz-question-text').innerHTML =
    (q.theme_auto ? `<span style="font-size:.7rem;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:5px;display:inline-block;margin-bottom:8px;">⚡ ${q.theme_auto}</span><br>` : '') +
    escHtml(q.enonce) +
    (q.annale ? `<br><span style="font-size:.68rem;color:var(--text-secondary);background:var(--bg-app);padding:2px 7px;border-radius:4px;display:inline-block;margin-top:6px;">📋 ${q.annale}</span>` : '');

  document.getElementById('quiz-explanation').classList.add('hidden');
  document.getElementById('quiz-next-btn').classList.add('hidden');

  const optsEl = document.getElementById('quiz-options-container');
  optsEl.innerHTML = '';
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
  } else {
    btn.style.cssText += 'background:#FEE2E2;border-color:#EF4444;color:#7F1D1D;';
    const bonneBtn = optsEl.children[q.bonne_reponse];
    if (bonneBtn) bonneBtn.style.cssText += 'background:#D1FAE5;border-color:#10B981;color:#064E3B;font-weight:700;';
  }

  if (!AppState.quiz.infini) {
    const r = updateAdaptif(AppState.quiz.chapitreId, correct);
    if (r.montee)   showToast('🚀 Niveau supérieur débloqué !');
    if (r.descente) showToast('📖 Retour en consolidation — relis la fiche !');
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
    finQuiz();
  }
});

document.getElementById('quiz-close-btn').addEventListener('click', () => {
  document.getElementById('quiz-modal').classList.remove('active');
  renderDashboard();
  updateProgressRing();
});

function finQuiz() {
  const quiz  = AppState.quiz;
  const pct   = Math.round(quiz.score / quiz.questions.length * 100);
  const mention = pct >= 90 ? '🏆 Excellent !' : pct >= 70 ? '👍 Bien joué !' : pct >= 50 ? '💪 Continue !' : '📖 À retravailler';
  const couleur = pct >= 70 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626';

  document.getElementById('quiz-modal').classList.remove('active');

  if (!quiz.infini) {
    if (pct >= 80) {
      AppState.progress[quiz.chapitreId] = 'acquis';
      saveProgress();
    } else if (pct >= 50 && AppState.progress[quiz.chapitreId] !== 'acquis') {
      AppState.progress[quiz.chapitreId] = 'en_cours';
      saveProgress();
    }
  }

  const c = document.getElementById('app-view-container');
  c.innerHTML = `
    <div style="max-width:480px;margin:0 auto;text-align:center;padding:24px 0;">
      <div style="font-size:4rem;margin-bottom:12px;">${pct>=90?'🏆':pct>=70?'🎉':pct>=50?'💪':'📖'}</div>
      <h2 style="color:var(--text-primary);margin-bottom:8px;">${mention}</h2>
      <div style="font-size:2.8rem;font-weight:800;color:${couleur};margin:12px 0;">${quiz.score} / ${quiz.questions.length}</div>
      <div style="background:var(--border-color);height:8px;border-radius:4px;overflow:hidden;margin:12px 0;">
        <div style="width:${pct}%;height:8px;background:${couleur};border-radius:4px;transition:width .5s;"></div>
      </div>
      <p style="color:var(--text-secondary);margin-bottom:20px;">${pct}% de bonnes réponses</p>
      ${!quiz.infini && pct >= 80 ? '<div style="background:#D1FAE5;color:#064E3B;padding:10px;border-radius:8px;margin-bottom:14px;font-weight:600;">✅ Chapitre marqué comme acquis !</div>' : ''}
      ${!quiz.infini && pct < 50 ? '<div style="background:#FEF3C7;color:#78350F;padding:10px;border-radius:8px;margin-bottom:14px;font-size:.82rem;">Relis la fiche de révision et réessaie. Le moteur adaptatif va ajuster la difficulté.</div>' : ''}
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button onclick="renderDashboard()" class="btn-primary">🏠 Tableau de bord</button>
        <button onclick="relancerQuiz()" style="background:var(--bg-card);color:var(--text-primary);border:1.5px solid var(--border-color);padding:10px 18px;border-radius:8px;cursor:pointer;font-weight:600;">🔄 Recommencer</button>
      </div>
    </div>
  `;
  updateProgressRing();
}

window.relancerQuiz = function() {
  const id = AppState.quiz.chapitreId;
  for (const m of AppState.data.matieres) {
    const c = m.chapitres.find(ch => ch.id === id);
    if (c) { startQuizAdaptatif(c, m); return; }
  }
  startExamenBlanc();
};

// ── PARAMÈTRES ────────────────────────────────────────────────
function renderSettings() {
  const hasKey = !!localStorage.getItem('rb_claude_key');
  const key    = localStorage.getItem('rb_claude_key') || '';
  const masked = key ? key.substring(0, 8) + '••••••••' + key.slice(-4) : 'Aucune clé';
  const cacheRaw = JSON.parse(localStorage.getItem('rb_ia_cache') || '{}');
  const nbCache  = Object.values(cacheRaw).reduce((s, v) => s + (v.questions?.length || 0), 0);
  const nbChap   = Object.keys(cacheRaw).length;

  const c = document.getElementById('app-view-container');
  c.innerHTML = `
    <h2 style="color:var(--text-primary);margin-bottom:20px;">⚙️ Paramètres</h2>

    <div class="card" style="margin-bottom:14px;">
      <h3 style="font-size:.95rem;margin-bottom:6px;">🤖 Clé API Claude</h3>
      <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.5;">Permet de générer des questions illimitées et variées. Stockée uniquement sur cet appareil.</p>
      <div style="background:var(--bg-app);border-radius:7px;padding:8px 12px;font-family:monospace;font-size:.82rem;color:${hasKey?'#166534':'var(--text-secondary)'};margin-bottom:12px;">${hasKey ? '✅' : '❌'} ${masked}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="btn-edit-key" class="btn-primary" style="font-size:.82rem;padding:7px 14px;">${hasKey ? '✏️ Modifier' : '➕ Ajouter une clé'}</button>
        ${hasKey ? '<button id="btn-del-key" style="background:none;border:1.5px solid var(--color-danger);color:var(--color-danger);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:.82rem;">🗑️ Supprimer</button>' : ''}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" style="padding:7px 14px;border-radius:8px;border:1.5px solid var(--border-color);color:var(--text-secondary);font-size:.82rem;text-decoration:none;">Créer un compte →</a>
      </div>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <h3 style="font-size:.95rem;margin-bottom:6px;">💾 Cache questions IA</h3>
      <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px;">${nbCache} questions sur ${nbChap} chapitres</p>
      <button id="btn-clear-cache" style="background:none;border:1.5px solid var(--border-color);color:var(--text-secondary);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:.82rem;">🗑️ Vider le cache</button>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <h3 style="font-size:.95rem;margin-bottom:6px;">📊 Progression</h3>
      <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px;">Remet tous les chapitres à "À réviser".</p>
      <button id="btn-reset" style="background:none;border:1.5px solid var(--color-danger);color:var(--color-danger);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:.82rem;">⚠️ Remettre à zéro</button>
    </div>

    <div style="background:#FEF9C3;border:1px solid #FCD34D;border-radius:10px;padding:14px;font-size:.8rem;color:#713F12;line-height:1.6;">
      💡 Sans clé API, l'app fonctionne à 100% avec les questions intégrées + les mutations automatiques (nombres aléatoires générés localement).
    </div>
  `;

  document.getElementById('btn-edit-key').addEventListener('click', () => ouvrirModaleAPI());
  document.getElementById('btn-del-key')?.addEventListener('click', () => {
    if (confirm('Supprimer la clé API ?')) { localStorage.removeItem('rb_claude_key'); renderSettings(); showToast('Clé supprimée.'); }
  });
  document.getElementById('btn-clear-cache').addEventListener('click', () => {
    if (confirm('Vider le cache IA ?')) { localStorage.removeItem('rb_ia_cache'); renderSettings(); showToast('Cache vidé.'); }
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Remettre toute la progression à zéro ?')) {
      localStorage.removeItem('rb_progress');
      localStorage.removeItem('rb_adaptive');
      AppState.progress = {};
      AppState.adaptive = {};
      AppState.data.matieres.forEach(m => m.chapitres.forEach(c => { AppState.progress[c.id] = 'a_reviser'; }));
      saveProgress();
      updateProgressRing();
      renderSettings();
      showToast('Progression réinitialisée.');
    }
  });
}

// ── MODALE API KEY ────────────────────────────────────────────
function ouvrirModaleAPI(chapId, titre, matLabel, btn) {
  const modale = document.getElementById('modal-api');
  modale.dataset.chapId   = chapId   || '';
  modale.dataset.titre    = titre    || '';
  modale.dataset.matLabel = matLabel || '';
  modale._btn = btn || null;

  const input = document.getElementById('api-key-input');
  input.value = localStorage.getItem('rb_claude_key') || '';
  document.getElementById('api-key-error').style.display = 'none';
  modale.classList.add('active');
  modale.classList.remove('hidden');
  setTimeout(() => input.focus(), 100);
}

function fermerModaleAPI() {
  document.getElementById('modal-api').classList.remove('active');
}

// ── COUNTDOWN ─────────────────────────────────────────────────
function updateCountdown() {
  const badge = document.getElementById('countdown-badge');
  if (!badge) return;
  const jours = Math.max(0, Math.ceil((new Date('2026-06-30') - new Date()) / 86400000));
  badge.textContent = jours === 0 ? "📅 C'est aujourd'hui !" : `⏳ J-${jours} avant les maths`;
}

// ── EVENTS ────────────────────────────────────────────────────
function setupEvents() {
  const toggle = () => document.body.classList.toggle('dark-mode');
  document.getElementById('theme-toggle')?.addEventListener('click', toggle);
  document.getElementById('theme-toggle-mobile')?.addEventListener('click', toggle);
  document.getElementById('btn-settings')?.addEventListener('click', () => { setNav(null, document.getElementById('btn-settings')); renderSettings(); });

  // Modale API
  document.getElementById('show-key-toggle').addEventListener('change', e => {
    document.getElementById('api-key-input').type = e.target.checked ? 'text' : 'password';
  });
  document.getElementById('close-modal-api').addEventListener('click', fermerModaleAPI);
  document.getElementById('btn-skip-api').addEventListener('click', fermerModaleAPI);
  document.getElementById('modal-api').addEventListener('click', e => { if (e.target === e.currentTarget) fermerModaleAPI(); });

  document.getElementById('btn-save-api-key').addEventListener('click', async () => {
    const key = document.getElementById('api-key-input').value.trim();
    const errEl = document.getElementById('api-key-error');
    if (!key.startsWith('sk-')) {
      errEl.textContent = 'La clé doit commencer par "sk-".';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    localStorage.setItem('rb_claude_key', key);

    const modale  = document.getElementById('modal-api');
    const chapId  = modale.dataset.chapId;
    const titre   = modale.dataset.titre;
    const matLabel= modale.dataset.matLabel;
    const btn     = modale._btn;

    if (chapId) {
      const btnSave = document.getElementById('btn-save-api-key');
      btnSave.textContent = '⏳ Génération...';
      btnSave.disabled = true;
      try {
        await lancerGenerationIA(chapId, titre, matLabel, key, btn || { textContent: '', disabled: false });
        fermerModaleAPI();
      } catch(e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
      }
      btnSave.textContent = '✅ Enregistrer';
      btnSave.disabled = false;
    } else {
      fermerModaleAPI();
      showToast('✅ Clé API enregistrée !');
    }
  });
}

// ── UTILS ─────────────────────────────────────────────────────
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// Exposer pour onclick inline
window.renderDashboard = renderDashboard;
window.renderProgramme = renderProgramme;
window.setNav = setNav;
