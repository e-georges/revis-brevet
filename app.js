// ============================================================
// RévisBrevet 2026 — app.js v3.0
// Moteur 100% autonome — Génération procédurale infinie
// Automatismes MEN respectés intégralement (42 questions)
// Zéro API payante — Zéro dépendance réseau
// ============================================================

const AppState = {
  data: null,
  progress: {},
  carnetErreurs: [],
  quiz: {
    matId: null, chapitreId: null, matLabel: '',
    questions: [], index: 0, score: 0,
    infini: false, estRattrapage: false, serieTerminee: false
  },
  derniereSession: null
};

// ─────────────────────────────────────────────────────────────
// MOTEUR DE GÉNÉRATION PROCÉDURALE — 13 factories
// Chaque factory retourne une question UNIQUE avec valeurs
// aléatoires et distracteurs cognitifs plausibles
// ─────────────────────────────────────────────────────────────
const GenerateurProcedural = {

  pourcentage() {
    const pcts=[10,20,25,50,30,75], p=pcts[~~(Math.random()*pcts.length)];
    const bases=[40,60,80,120,200,150,48,90], b=bases[~~(Math.random()*bases.length)];
    const r=b*p/100;
    return {
      enonce:`Calculer ${p}% de ${b} (sans calculatrice).`,
      options:shuffleOpts([r, r+p, b-r, r*2]),
      explication:`${p}% de ${b} : diviser ${b} par 100 puis multiplier par ${p} → ${r}.`,
      niveau:1, theme_auto:"Pourcentages"
    };
  },

  equation() {
    const a=~~(Math.random()*4)+2, x=~~(Math.random()*8)+1, b=~~(Math.random()*10)+1, c=a*x+b;
    return {
      enonce:`Résoudre : ${a}x + ${b} = ${c}`,
      options:shuffleOpts([x, x+2, Math.round(c/a*10)/10, -x]),
      explication:`${a}x = ${c}−${b} = ${c-b}. Donc x = ${c-b}÷${a} = ${x}.`,
      niveau:2, theme_auto:"Équations du 1er degré"
    };
  },

  pythagore() {
    const triplets=[[3,4,5],[5,12,13],[6,8,10],[8,15,17],[9,40,41]];
    const [a,b,c]=triplets[~~(Math.random()*triplets.length)];
    const k=~~(Math.random()*3)+1, [A,B,C]=[a*k,b*k,c*k];
    return {
      enonce:`Triangle rectangle. Les deux côtés de l'angle droit mesurent ${A} cm et ${B} cm. Longueur de l'hypoténuse ?`,
      options:shuffleOpts([C, A+B, Math.round(Math.sqrt(A*A-B*B)*10)/10||C-1, C+k]),
      explication:`Pythagore : hyp² = ${A}²+${B}² = ${A*A}+${B*B} = ${C*C} → hyp = ${C} cm.`,
      niveau:2, theme_auto:"Théorème de Pythagore",
      indice:"L'hypoténuse est le côté OPPOSÉ à l'angle droit — c'est le plus long."
    };
  },

  fraction() {
    const denoms=[2,3,4,5,6,8,10], d=denoms[~~(Math.random()*denoms.length)];
    const n=~~(Math.random()*(d-1))+1;
    const bases=[12,18,20,24,30,36,40,48,60], base=bases[~~(Math.random()*bases.length)];
    const r=(base*n)/d;
    if(!Number.isInteger(r)) return GenerateurProcedural.fraction();
    return {
      enonce:`Calculer ${n}/${d} de ${base}.`,
      options:shuffleOpts([r, base*d, r+d, r*2]),
      explication:`${n}/${d} de ${base} = (${base}÷${d})×${n} = ${base/d}×${n} = ${r}.`,
      niveau:1, theme_auto:"Fractions d'un nombre"
    };
  },

  proportionnalite() {
    const pu=[3,4,5,6,8,9,12][~~(Math.random()*7)];
    const q1=[6,7,8,9,10,11,12,15][~~(Math.random()*8)];
    const t1=pu*q1, q2=q1+~~(Math.random()*5)+1, t2=pu*q2;
    return {
      enonce:`${q1} cahiers coûtent ${t1} €. Quel est le prix de ${q2} cahiers au même tarif ?`,
      options:shuffleOpts([t2, t1+q2, t2+pu, t1*q2 > 9999 ? t2+10 : t1*q2]),
      explication:`Prix unitaire : ${t1}÷${q1} = ${pu} €. Donc ${q2} × ${pu} = ${t2} €.`,
      niveau:2, theme_auto:"Proportionnalité"
    };
  },

  probabilite() {
    function pgcd(a,b){return b===0?a:pgcd(b,a%b);}
    const configs=[{t:'rouge',n:3,tot:10},{t:'bleu',n:2,tot:8},{t:'vert',n:4,tot:12},{t:'jaune',n:1,tot:5}];
    const {t,n,tot}=configs[~~(Math.random()*configs.length)];
    const autre=tot-n, g=pgcd(n,tot), numS=n/g, denS=tot/g;
    return {
      enonce:`Un sac contient ${tot} boules : ${n} ${t}s et ${autre} autres. Probabilité de tirer une boule ${t} ?`,
      options:shuffleOpts([`${numS}/${denS}`, `${n+1}/${tot}`, `${autre}/${tot}`, `${n}/${n+1}`]),
      explication:`P(${t}) = ${n}/${tot}${g>1?' = '+numS+'/'+denS:''}.`,
      niveau:3, theme_auto:"Probabilités",
      indice:"Probabilité = (cas favorables) ÷ (nombre total de cas possibles)."
    };
  },

  notation_scientifique() {
    const ms=[1.5,2.3,3.0,4.7,6.2,9.1,1.8], m=ms[~~(Math.random()*ms.length)];
    const es=[3,4,5,6,-2,-3], e=es[~~(Math.random()*es.length)];
    const val=(m*Math.pow(10,e)).toLocaleString('fr-FR');
    return {
      enonce:`Écrire ${val} en notation scientifique.`,
      options:shuffleOpts([`${m} × 10^${e}`, `${m+1} × 10^${e}`, `${m} × 10^${e+1}`, `${m} × 10^${e-1}`]),
      explication:`${val} = ${m} × 10^${e}. La mantisse doit être comprise entre 1 et 10.`,
      niveau:2, theme_auto:"Notation scientifique"
    };
  },

  aire_volume() {
    const f=['rectangle','triangle','disque','cube','cylindre'][~~(Math.random()*5)];
    if(f==='rectangle'){
      const L=~~(Math.random()*8)+3, l=~~(Math.random()*5)+2, A=L*l;
      return{enonce:`Aire d'un rectangle ${L} cm × ${l} cm ?`,options:shuffleOpts([A,L+l,2*(L+l),A+L]),explication:`Aire = L×l = ${L}×${l} = ${A} cm².`,niveau:2,theme_auto:"Aires & Volumes"};
    }else if(f==='triangle'){
      const b=(~~(Math.random()*6)+2)*2, h=~~(Math.random()*8)+3, A=b*h/2;
      return{enonce:`Aire d'un triangle base ${b} cm, hauteur ${h} cm ?`,options:shuffleOpts([A,b*h,A+b,A-h]),explication:`Aire = (b×h)÷2 = (${b}×${h})÷2 = ${A} cm².`,niveau:2,theme_auto:"Aires & Volumes"};
    }else if(f==='cube'){
      const c=~~(Math.random()*5)+2, V=c*c*c;
      return{enonce:`Volume d'un cube d'arête ${c} cm ?`,options:shuffleOpts([V,c*c,6*c*c,V+c]),explication:`Volume = arête³ = ${c}³ = ${V} cm³.`,niveau:2,theme_auto:"Aires & Volumes"};
    }else if(f==='cylindre'){
      const r=~~(Math.random()*4)+2, h=~~(Math.random()*6)+3, V=Math.round(Math.PI*r*r*h);
      return{enonce:`Volume d'un cylindre r=${r} cm, h=${h} cm ? (π≈3,14)`,options:shuffleOpts([V,r*r*h,Math.round(2*Math.PI*r*h),V+r*2]),explication:`V = π×r²×h ≈ 3,14×${r}²×${h} ≈ ${V} cm³.`,niveau:2,theme_auto:"Aires & Volumes"};
    }else{
      const r=~~(Math.random()*5)+2, A=Math.round(Math.PI*r*r);
      return{enonce:`Aire d'un disque de rayon ${r} cm ? (π≈3,14)`,options:shuffleOpts([A,2*Math.round(Math.PI*r),A*2,r*r]),explication:`Aire = π×r² ≈ 3,14×${r}² ≈ ${A} cm².`,niveau:2,theme_auto:"Aires & Volumes"};
    }
  },

  figure_de_style() {
    const figures=[
      {phrase:"Ses mains étaient des serres d'aigle.",figure:"Métaphore",autres:["Comparaison","Hyperbole","Personnification"],exp:"Métaphore = comparaison SANS outil ('comme'). Assimilation directe.",indice:"Y a-t-il un 'comme' ? Si non, c'est une métaphore."},
      {phrase:"Il pleuvait des cordes.",figure:"Métaphore",autres:["Comparaison","Litote","Oxymore"],exp:"Expression figée = métaphore. Image directe sans outil de comparaison.",indice:"Cherche si la comparaison est directe (métaphore) ou avec outil ('comme')."},
      {phrase:"Je meurs de faim !",figure:"Hyperbole",autres:["Métaphore","Litote","Antithèse"],exp:"Hyperbole = exagération volontaire pour intensifier un sentiment.",indice:"L'auteur exagère-t-il volontairement ?"},
      {phrase:"Le soleil se levait, souriant sur la vallée.",figure:"Personnification",autres:["Métaphore","Comparaison","Allitération"],exp:"Personnification = caractéristiques humaines (sourire) attribuées au soleil.",indice:"Un être inanimé se comporte-t-il comme un humain ?"},
      {phrase:"Il était rapide comme l'éclair.",figure:"Comparaison",autres:["Métaphore","Hyperbole","Personnification"],exp:"Comparaison = outil présent ('comme'). Sans 'comme' ce serait une métaphore.",indice:"Y a-t-il un mot de comparaison ('comme', 'tel', 'semblable à') ?"},
      {phrase:"Ce n'est pas sans mérite.",figure:"Litote",autres:["Métaphore","Euphémisme","Ironie"],exp:"Litote = dire moins pour suggérer plus. Signifie en réalité 'c'est très bien'.",indice:"L'auteur dit-il moins que ce qu'il pense ?"},
    ];
    const f=figures[~~(Math.random()*figures.length)];
    return{enonce:`Identifie la figure de style : « ${f.phrase} »`,options:shuffleOpts([f.figure,...f.autres]),explication:f.exp,niveau:3,theme_auto:"Figures de style",indice:f.indice};
  },

  accord_participe() {
    const cas=[
      {phrase:"Les fleurs que j'ai ___ hier sont magnifiques.",verbe:"cueillir",accord:"cueillies",autres:["cueilli","cueillie","cueillis"],exp:"COD 'que' = les fleurs (fém. plur.) AVANT 'avoir' → cueillies.",indice:"Le COD est-il placé AVANT l'auxiliaire avoir ?"},
      {phrase:"Elle s'est ___ vers la sortie.",verbe:"tourner",accord:"tournée",autres:["tourné","tournés","tournées"],exp:"Verbe pronominal → accord avec le sujet. Elle (fém. sing.) → tournée.",indice:"Avec un verbe pronominal, le participe s'accorde avec le sujet."},
      {phrase:"Les lettres qu'il a ___ sont claires.",verbe:"écrire",accord:"écrites",autres:["écrit","écrite","écrits"],exp:"COD 'que' = les lettres (fém. plur.) avant 'avoir' → écrites.",indice:"Cherche un COD féminin pluriel AVANT l'auxiliaire."},
      {phrase:"Elle a ___ toute la nuit.",verbe:"travailler",accord:"travaillé",autres:["travaillée","travaillés","travaillées"],exp:"Pas de COD avant 'avoir' → pas d'accord. Reste invariable : travaillé.",indice:"Cherche un COD AVANT l'auxiliaire 'avoir'. S'il n'y en a pas, pas d'accord."},
    ];
    const c=cas[~~(Math.random()*cas.length)];
    return{enonce:`Conjugue '${c.verbe}' : « ${c.phrase} »`,options:shuffleOpts([c.accord,...c.autres]),explication:c.exp,niveau:2,theme_auto:"Accord du participe passé",indice:c.indice};
  },

  conjugaison() {
    const verbes=[
      {inf:"FINIR",pers:"nous",temps:"imparfait",forme:"finissions",autres:["finisions","finissons","finirions"],exp:"Imparfait : radical 'finiss-' + '-ions'. Attention au double 's' !"},
      {inf:"VENIR",pers:"ils",temps:"conditionnel présent",forme:"viendraient",autres:["viendront","veniraient","vendraient"],exp:"Conditionnel : radical futur 'viendr-' + '-aient'."},
      {inf:"SAVOIR",pers:"tu",temps:"subjonctif présent",forme:"saches",autres:["sais","sauras","sachais"],exp:"Subjonctif présent de savoir : radical irrégulier 'sach-' + '-es'."},
      {inf:"ÊTRE",pers:"vous",temps:"passé simple",forme:"fûtes",autres:["étiez","aviez été","êtes"],exp:"Passé simple d'être : je fus, tu fus, il fut, nous fûmes, vous fûtes, ils furent."},
      {inf:"TENIR",pers:"nous",temps:"futur simple",forme:"tiendrons",autres:["tenons","tiendrons pas","tenirions"],exp:"Futur de TENIR : radical irrégulier 'tiendr-' + '-ons'."},
    ];
    const v=verbes[~~(Math.random()*verbes.length)];
    return{enonce:`Conjugue ${v.inf} (${v.pers}, ${v.temps}) : '${v.pers} ___'`,options:shuffleOpts([v.forme,...v.autres]),explication:v.exp,niveau:2,theme_auto:"Conjugaison",indice:`Mode : ${v.temps.includes('subjonctif')?'Subjonctif (que '+v.pers+'...)':v.temps.includes('conditionnel')?'Conditionnel (radical futur + terminaisons imparfait)':'Applique les règles du '+v.temps+'.'}`};
  },

  vitesse_distance_temps() {
    const vs=[60,80,90,100,120,50,72], v=vs[~~(Math.random()*vs.length)];
    const ts=[0.5,1,1.5,2,2.5,3], t=ts[~~(Math.random()*ts.length)];
    const d=v*t;
    const typ=['d','v','t'][~~(Math.random()*3)];
    if(typ==='d') return{enonce:`Un véhicule roule à ${v} km/h pendant ${t} h. Distance parcourue ?`,options:shuffleOpts([d,v+t,d+v,d*2]),explication:`d = v×t = ${v}×${t} = ${d} km.`,niveau:2,theme_auto:"Vitesse / Distance / Temps"};
    if(typ==='v') return{enonce:`Un cycliste parcourt ${d} km en ${t} h. Vitesse moyenne ?`,options:shuffleOpts([d/t,d*t,d/2,(d/t)+10]),explication:`v = d÷t = ${d}÷${t} = ${d/t} km/h.`,niveau:2,theme_auto:"Vitesse / Distance / Temps"};
    return{enonce:`Une voiture parcourt ${d} km à ${v} km/h. Durée du trajet ?`,options:shuffleOpts([`${t} h`,`${t+1} h`,`${t+0.5} h`,`${d} h`]),explication:`t = d÷v = ${d}÷${v} = ${t} h.`,niveau:2,theme_auto:"Vitesse / Distance / Temps"};
  },

  electricite() {
    const loi=['U','I','R'][~~(Math.random()*3)];
    if(loi==='U'){const I2=[0.5,1,2,3][~~(Math.random()*4)],R2=[10,20,50,100][~~(Math.random()*4)],U2=I2*R2;return{enonce:`Loi d'Ohm : R=${R2} Ω, I=${I2} A. Calculer U.`,options:shuffleOpts([`${U2} V`,`${R2/I2} V`,`${U2+R2} V`,`${U2*2} V`]),explication:`U = R×I = ${R2}×${I2} = ${U2} V.`,niveau:2,theme_auto:"Loi d'Ohm"};}
    if(loi==='I'){const U=[6,9,12,24][~~(Math.random()*4)],R=[10,15,20,30,50][~~(Math.random()*5)],I=Math.round(U/R*1000)/1000;return{enonce:`Loi d'Ohm : U=${U} V, R=${R} Ω. Calculer I.`,options:shuffleOpts([`${I} A`,`${U*R} A`,`${U+R} A`,`${Math.round(I*2*100)/100} A`]),explication:`I = U÷R = ${U}÷${R} = ${I} A.`,niveau:2,theme_auto:"Loi d'Ohm"};}
    const I3=[0.5,1,2][~~(Math.random()*3)],U3=[6,9,12,24][~~(Math.random()*4)],R3=U3/I3;
    return{enonce:`Loi d'Ohm : U=${U3} V, I=${I3} A. Calculer R.`,options:shuffleOpts([`${R3} Ω`,`${U3*I3} Ω`,`${U3+I3} Ω`,`${R3*2} Ω`]),explication:`R = U÷I = ${U3}÷${I3} = ${R3} Ω.`,niveau:2,theme_auto:"Loi d'Ohm"};
  }
};

const CLE_FACTORIES = Object.keys(GenerateurProcedural);

// ─────────────────────────────────────────────────────────────
// Helper : construire 4 options A/B/C/D + bonne_reponse
// Le 1er élément du tableau est TOUJOURS la bonne réponse
// ─────────────────────────────────────────────────────────────
function shuffleOpts(vals) {
  const strs = vals.map(String);
  const unique = [...new Set(strs)];
  // Assurer 4 options distinctes
  while (unique.length < 4) unique.push(String(unique.length * 17 + 3));
  const s = shuffleArr(unique.slice(0, 4));
  const bonneStr = strs[0];
  let idx = s.indexOf(bonneStr);
  if (idx === -1) { s[0] = bonneStr; idx = 0; }
  return {
    options: s.map((v, i) => `${['A','B','C','D'][i]}) ${v}`),
    bonne_reponse: idx
  };
}

// ─────────────────────────────────────────────────────────────
// STRATÉGIE DE GÉNÉRATION PAR TYPE DE CHAPITRE
//
// 3 modes distincts :
//  1. Chapitre "riche" (≥5 questions JSON, ex: automatismes MEN 42q)
//     → 5 questions 100% du JSON, mélangées aléatoirement
//     → Garantit que TOUTES les 42 questions MEN sont accessibles
//
//  2. Chapitre "pauvre" (1–4 questions JSON)
//     → On utilise TOUTES les questions JSON + on complète avec les factories
//
//  3. Chapitre vide (0 questions JSON, ex: examen blanc)
//     → 100% procédural, 5 factories différentes tirées aléatoirement
// ─────────────────────────────────────────────────────────────
function genererSerieAleatoire(chapId, baseQuiz = [], taille = 5) {
  const pool = Array.isArray(baseQuiz) ? [...baseQuiz] : [];

  if (pool.length >= taille) {
    // Mode 1 : chapitre riche → 100% JSON, tirage aléatoire sans remise
    return shuffleArr(pool).slice(0, taille);
  }

  if (pool.length > 0) {
    // Mode 2 : chapitre pauvre → tout le JSON + complétion procédurale
    const serie = [...pool];
    const factoriesDispos = shuffleArr([...CLE_FACTORIES]);
    let fi = 0;
    while (serie.length < taille && fi < factoriesDispos.length) {
      serie.push(GenerateurProcedural[factoriesDispos[fi]]());
      fi++;
    }
    return serie.slice(0, taille);
  }

  // Mode 3 : chapitre vide → 100% procédural, factories sans répétition
  const serie = [];
  const factoriesDispos = shuffleArr([...CLE_FACTORIES]);
  for (let i = 0; i < Math.min(taille, factoriesDispos.length); i++) {
    serie.push(GenerateurProcedural[factoriesDispos[i]]());
  }
  return serie;
}

// Normalise une question : résout le sous-objet {options, bonne_reponse} si présent
function normaliserQuestion(q) {
  if (q.options && !Array.isArray(q.options) && q.options.options) {
    return { ...q, options: q.options.options, bonne_reponse: q.options.bonne_reponse };
  }
  return q;
}

// ─────────────────────────────────────────────────────────────
// LOCAL STORAGE & PROGRESSION
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// VUES
// ─────────────────────────────────────────────────────────────
function renderDashboard() {
  const container = document.getElementById('app-view-container');
  if (!container) return;

  // Bandeau "reprendre" si une session terminée existe
  let bandeauHtml = '';
  const ds = AppState.derniereSession;
  if (ds) {
    const pct = Math.round(ds.score / ds.total * 100);
    bandeauHtml = `
      <div style="background:linear-gradient(135deg,#EEF2FF,#E0E7FF);border:1px solid #C7D2FE;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <b style="color:#3730A3;">✅ Série précédente terminée !</b>
          <p style="margin:4px 0 0;font-size:.82rem;color:#4338CA;">${ds.matLabel} — Score : ${ds.score}/${ds.total} (${pct}%)</p>
        </div>
        <button id="btn-relancer-bandeau" class="btn-primary" style="font-size:.82rem;padding:8px 14px;">🔄 Nouvelle série</button>
      </div>`;
  }

  container.innerHTML = `${bandeauHtml}<h2>Mes matières de révision</h2><div class="matieres-grid" id="matieres-grid"></div>`;

  if (ds) {
    document.getElementById('btn-relancer-bandeau')?.addEventListener('click', relancerDerniereSession);
  }

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
    const nQ = (chap.quiz || []).length;
    const niveaux = {};
    (chap.quiz || []).forEach(q => { const nv=q.niveau||1; niveaux[nv]=(niveaux[nv]||0)+1; });
    const status = AppState.progress[chap.id];

    // Badge source
    let badgeSource = '';
    if (nQ >= 5) {
      badgeSource = `<span style="background:#EEF2FF;color:#3D5A99;border:1px solid #C7D2FE;padding:2px 8px;font-size:.65rem;border-radius:10px;font-weight:700;">📋 ${nQ} questions officielles MEN</span>`;
    } else if (nQ > 0) {
      badgeSource = `<span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;padding:2px 8px;font-size:.65rem;border-radius:10px;font-weight:700;">📝 ${nQ} questions + génération</span>`;
    } else {
      badgeSource = `<span style="background:#F0FDF4;color:#166534;border:1px solid #BBF7D0;padding:2px 8px;font-size:.65rem;border-radius:10px;font-weight:700;">⚡ Génération procédurale</span>`;
    }

    // Badges niveaux
    const badgesNiv = Object.entries(niveaux).map(([nv, cnt]) => {
      const couleur = nv==1?'#10B981':nv==2?'#F59E0B':'#EF4444';
      const label = nv==1?'Facile':nv==2?'Intermédiaire':'Difficile';
      return `<span style="background:${couleur};color:white;padding:2px 7px;font-size:.6rem;border-radius:8px;font-weight:700;">${label} ×${cnt}</span>`;
    }).join(' ');

    // Badge de statut
    const statusBadge = status === 'acquis'
      ? `<span style="background:#D1FAE5;color:#064E3B;padding:2px 8px;font-size:.65rem;border-radius:10px;font-weight:700;float:right;">✅ Acquis</span>`
      : '';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <h4 style="margin:0 0 6px;">${chap.titre}</h4>
        ${statusBadge}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">
        ${badgeSource} ${badgesNiv}
      </div>
      <p style="font-size:.78rem;color:var(--text-secondary);margin:0 0 10px;line-height:1.4;">${(chap.fiche||'').slice(0,120)}${(chap.fiche||'').length>120?'…':''}</p>
      <button class="btn-primary id-trigger-btn">🎯 Commencer la série (5 questions)</button>
    `;
    card.querySelector('.id-trigger-btn').addEventListener('click', e => {
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
    container.innerHTML = `<div style="text-align:center;padding:40px;"><span style="font-size:3rem;">🎉</span><h3>Carnet d'erreurs vide !</h3><p style="color:var(--text-secondary);">Toutes tes erreurs sont corrigées.</p></div>`;
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
    const theme = q.theme_auto ? `<span style="background:var(--bg-card-hover);color:var(--color-primary);padding:2px 8px;font-size:.7rem;border-radius:10px;font-weight:700;display:inline-block;margin-bottom:6px;">⚡ ${escHtml(q.theme_auto)}</span>` : '';
    div.innerHTML = `${theme}<p style="font-weight:600;margin:0 0 4px;">${escHtml(q.enonce)}</p><p style="font-size:.8rem;color:var(--text-secondary);margin:0;">💡 ${escHtml(q.explication)}</p>`;
    document.getElementById('liste-erreurs').appendChild(div);
  });
}

function renderProgramme() {
  document.getElementById('app-view-container').innerHTML = `<h2>📅 Planning d'études</h2><p style="color:var(--text-secondary);">Génération autonome programmée pour le Brevet 2026.</p>`;
}

// ─────────────────────────────────────────────────────────────
// LANCEMENT DES QUIZ
// ─────────────────────────────────────────────────────────────
function lancerQuizDepuisChapitre(matId, chapId) {
  const mat = AppState.data?.matieres?.find(m => m.id === matId);
  const chap = mat?.chapitres?.find(c => c.id === chapId);
  const baseQuiz = chap?.quiz || [];
  const nomMatiere = mat ? mat.label.split(' — ')[0] : "Révision";

  const questions = genererSerieAleatoire(chapId, baseQuiz, 5)
    .map(q => normaliserQuestion(melangerOptions(q)));

  AppState.quiz = {
    matId, chapitreId: chapId, matLabel: nomMatiere,
    questions, index: 0, score: 0,
    infini: false, estRattrapage: false, serieTerminee: false
  };
  afficherQuestion();
  ouvrirPopUp();
}

function startQuizRattrapage() {
  if (AppState.carnetErreurs.length === 0) return;
  const questions = shuffleArr([...AppState.carnetErreurs]).slice(0, 5)
    .map(q => normaliserQuestion(melangerOptions(q)));
  AppState.quiz = {
    matId: null, chapitreId: 'carnet_erreurs', matLabel: 'Rattrapage',
    questions, index: 0, score: 0,
    infini: false, estRattrapage: true, serieTerminee: false
  };
  afficherQuestion();
  ouvrirPopUp();
}

function startExamenBlanc() {
  let toutes = [];
  if (AppState.data && AppState.data.matieres) {
    AppState.data.matieres.forEach(m => m.chapitres.forEach(c => { toutes = toutes.concat(c.quiz || []); }));
  }
  // Examen blanc : mélange JSON + procédural, 10 questions
  const questions = genererSerieAleatoire('blanc', toutes, 10)
    .map(q => normaliserQuestion(melangerOptions(q)));
  AppState.quiz = {
    matId: null, chapitreId: 'examen_blanc', matLabel: 'Examen Blanc',
    questions, index: 0, score: 0,
    infini: true, estRattrapage: false, serieTerminee: false
  };
  afficherQuestion();
  ouvrirPopUp();
}

function relancerDerniereSession() {
  const ds = AppState.derniereSession;
  if (!ds) return;
  AppState.derniereSession = null;
  if (ds.chapId === 'carnet_erreurs') startQuizRattrapage();
  else if (ds.chapId === 'examen_blanc') startExamenBlanc();
  else lancerQuizDepuisChapitre(ds.matId, ds.chapId);
}

function ouvrirPopUp() {
  const mq = document.getElementById('quiz-modal');
  if (mq) { mq.classList.remove('hidden'); mq.classList.add('active'); }
}
function fermerModaleQuiz() {
  const mq = document.getElementById('quiz-modal');
  if (mq) { mq.classList.remove('active'); mq.classList.add('hidden'); }
}

// ─────────────────────────────────────────────────────────────
// AFFICHAGE D'UNE QUESTION
// ─────────────────────────────────────────────────────────────
function melangerOptions(q) {
  if (!q.options || q.options.length === 0) return q;
  const pureOpts = q.options.map(o => String(o).replace(/^[A-D]\)\s*/, ''));
  const bonneTxt = pureOpts[q.bonne_reponse];
  const rMelangee = shuffleArr([...pureOpts]);
  let nIdx = rMelangee.indexOf(bonneTxt);
  if (nIdx === -1) { rMelangee[0] = bonneTxt; nIdx = 0; }
  return { ...q, options: rMelangee.map((o, i) => `${['A','B','C','D'][i]}) ${o}`), bonne_reponse: nIdx };
}

function afficherQuestion() {
  const quiz = AppState.quiz, q = quiz.questions[quiz.index];
  if (!q) return;
  const pct = Math.round((quiz.index / quiz.questions.length) * 100);

  const fill = document.getElementById('quiz-progress-fill'); if (fill) fill.style.width = pct + '%';
  const prog = document.getElementById('quiz-progress'); if (prog) prog.innerHTML = `${quiz.matLabel} — Question ${quiz.index + 1}/${quiz.questions.length}`;

  const qContainer = document.getElementById('quiz-question-text');
  if (qContainer) {
    qContainer.innerHTML = '';

    const nv = parseInt(q.niveau) || 1;
    let badgeCouleur = "#10B981", texteNiveau = "Facile";
    if (nv === 2) { badgeCouleur = "#F59E0B"; texteNiveau = "Intermédiaire"; }
    else if (nv === 3) { badgeCouleur = "#EF4444"; texteNiveau = "Difficile"; }

    const badgeDiff = document.createElement('span');
    badgeDiff.style.cssText = `background:${badgeCouleur};color:white;padding:3px 10px;font-size:.7rem;border-radius:12px;font-weight:700;display:inline-block;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;`;
    badgeDiff.textContent = `Niveau : ${texteNiveau}`;
    qContainer.appendChild(badgeDiff);

    if (q.theme_auto) {
      const bAuto = document.createElement('span');
      bAuto.style.cssText = "background:var(--bg-card-hover);color:var(--color-primary);padding:3px 10px;font-size:.7rem;border-radius:12px;font-weight:700;display:inline-block;margin-left:6px;margin-bottom:10px;";
      bAuto.textContent = `⚡ ${q.theme_auto}`;
      qContainer.appendChild(bAuto);
    }

    // Badge "Automatisme MEN" pour les questions officielles
    if (q.annale) {
      const bMEN = document.createElement('span');
      bMEN.style.cssText = "background:#EEF2FF;color:#3D5A99;border:1px solid #C7D2FE;padding:3px 10px;font-size:.65rem;border-radius:12px;font-weight:700;display:inline-block;margin-left:6px;margin-bottom:10px;";
      bMEN.textContent = `📋 Automatisme MEN`;
      qContainer.appendChild(bMEN);
    }

    const pEnonce = document.createElement('p');
    pEnonce.style.cssText = "font-size:1.05rem;font-weight:600;margin:6px 0 12px 0;line-height:1.45;color:var(--text-primary);";
    pEnonce.textContent = q.enonce;
    qContainer.appendChild(pEnonce);

    // Bouton indice : niveaux 2 ET 3, si un indice est fourni
    if (nv >= 2 && q.indice) {
      const btnInd = document.createElement('button');
      btnInd.style.cssText = "background:none;border:1px dashed var(--color-warning);color:var(--color-warning);padding:4px 10px;border-radius:6px;font-size:.72rem;cursor:pointer;margin-top:4px;display:block;font-weight:600;";
      btnInd.textContent = "💡 Débloquer l'indice de cours";
      const boxInd = document.createElement('div');
      boxInd.className = 'hidden';
      boxInd.style.cssText = "background:var(--bg-card-hover);border-left:3px solid var(--color-warning);padding:8px 12px;font-size:.78rem;margin-top:6px;border-radius:4px;line-height:1.4;";
      boxInd.textContent = q.indice;
      btnInd.addEventListener('click', () => {
        boxInd.classList.toggle('hidden');
        btnInd.textContent = boxInd.classList.contains('hidden') ? "💡 Débloquer l'indice de cours" : "🙈 Masquer l'indice";
      });
      qContainer.appendChild(btnInd);
      qContainer.appendChild(boxInd);
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

// ─────────────────────────────────────────────────────────────
// FIN DE SESSION
// Le bouton "Nouvelle série" n'existe QUE ici → contrainte structurelle
// ─────────────────────────────────────────────────────────────
function terminerSessionQuiz() {
  const quiz = AppState.quiz;
  quiz.serieTerminee = true;

  AppState.derniereSession = {
    matId: quiz.matId, chapId: quiz.chapitreId,
    matLabel: quiz.matLabel, score: quiz.score, total: quiz.questions.length
  };

  fermerModaleQuiz();

  const pct = Math.round((quiz.score / quiz.questions.length) * 100);
  if (pct >= 80 && quiz.chapitreId !== 'examen_blanc' && quiz.chapitreId !== 'carnet_erreurs') {
    AppState.progress[quiz.chapitreId] = 'acquis'; saveProgress();
  }

  const container = document.getElementById('app-view-container');
  if (!container) return;

  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📖';
  const message = pct >= 80 ? 'Excellent travail !' : pct >= 50 ? 'Continue comme ça !' : 'Ne lâche rien, révise le cours !';
  const barColor = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';

  container.innerHTML = `
    <div style="max-width:500px;margin:20px auto;text-align:center;background:var(--bg-card);padding:28px 24px;border-radius:14px;box-shadow:var(--shadow-card);">
      <span style="font-size:3.5rem;">${emoji}</span>
      <h2 style="color:var(--text-primary);margin-top:10px;">Série terminée !</h2>
      <p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:4px;">${message}</p>
      <div style="font-size:2.8rem;font-weight:800;color:var(--color-primary);margin:14px 0;">${quiz.score} / ${quiz.questions.length}</div>
      <div style="background:var(--bg-card-hover);border-radius:8px;padding:10px 14px;margin-bottom:20px;">
        <div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width .6s;"></div>
        </div>
        <p style="font-size:.78rem;color:var(--text-secondary);margin:6px 0 0;">${pct}% de réussite</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button id="btn-generer-nouveau" class="btn-primary" style="font-size:1rem;padding:13px;">
          🔄 Générer une nouvelle série inédite
        </button>
        ${AppState.carnetErreurs.length > 0 ? `<button id="btn-rattrapage-fin" style="background:none;border:1px solid #EF4444;color:#EF4444;padding:10px;border-radius:6px;cursor:pointer;font-size:.85rem;font-weight:600;">📕 Corriger mes ${AppState.carnetErreurs.length} erreur(s)</button>` : ''}
        <button onclick="renderDashboard()" style="background:none;border:1px solid var(--border-color);padding:10px;border-radius:6px;cursor:pointer;font-size:.85rem;color:var(--text-secondary);">🏠 Tableau de bord</button>
      </div>
    </div>
  `;

  document.getElementById('btn-generer-nouveau')?.addEventListener('click', () => {
    AppState.derniereSession = null;
    if (quiz.chapitreId === 'carnet_erreurs') startQuizRattrapage();
    else if (quiz.chapitreId === 'examen_blanc') startExamenBlanc();
    else lancerQuizDepuisChapitre(quiz.matId, quiz.chapitreId);
  });

  document.getElementById('btn-rattrapage-fin')?.addEventListener('click', () => {
    AppState.derniereSession = null;
    startQuizRattrapage();
  });

  updateProgressRing();
}

// ─────────────────────────────────────────────────────────────
// CHARGEMENT DES DONNÉES
// ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('troisieme.json');
    if (res.ok) { AppState.data = await res.json(); return true; }
  } catch(e) { console.warn("troisieme.json non trouvé. Mode autonome."); }
  AppState.data = {
    matieres: [{
      id:'maths', label:'Mathématiques', emoji:'📐', couleur:'#3D5A99',
      chapitres:[{id:'maths_01', titre:'⚡ Exercices variés DNB 2026', fiche:'Maths, Physique, Français.', quiz:[]}]
    }]
  };
  return true;
}

// ─────────────────────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadProgress(); chargerCarnetErreurs();
  await loadData(); buildNav(); renderDashboard(); updateProgressRing();

  const mApi = document.getElementById('modal-api');
  if (mApi) { mApi.style.display = 'none'; mApi.classList.add('hidden'); }

  const closeBtn = document.getElementById('quiz-close-btn');
  if (closeBtn) {
    const execFermeture = e => { e.preventDefault(); fermerModaleQuiz(); };
    closeBtn.addEventListener('click', execFermeture);
    closeBtn.addEventListener('touchstart', execFermeture, { passive: false });
  }

  document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
    AppState.quiz.index++;
    if (AppState.quiz.index < AppState.quiz.questions.length) afficherQuestion();
    else terminerSessionQuiz();
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => document.getElementById('modal-api')?.classList.remove('hidden'));
  document.getElementById('close-modal-api')?.addEventListener('click', () => document.getElementById('modal-api').classList.add('hidden'));
  document.getElementById('btn-skip-api')?.addEventListener('click', () => document.getElementById('modal-api').classList.add('hidden'));

  const toggleTheme = () => document.body.classList.toggle('dark-mode');
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('theme-toggle-mobile')?.addEventListener('click', toggleTheme);
});

// ─────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = ~~(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
