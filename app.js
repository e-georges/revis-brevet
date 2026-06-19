// ============================================================
// RévisBrevet 2026 — app.js (Anti-Répétition Strict & Flashcards)
// ============================================================

const AppState = {
  data: null,
  progress: {},
  adaptive: {}, 
  historiqueQuestions: [], // Stocke les IDs ou énoncés des questions posées pour l'anti-répétition
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

// ── DOUBLE ALGORITHME DE RENOUVELEMENT (Anti-Répétition & Mutation) ──

function genererQuestionMutationMaths() {
  const pList = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90];
  const vList = [30, 40, 50, 60, 80, 100, 120, 150, 200, 300, 500];
  const hList = [0.5, 1, 1.25, 1.5, 1.75, 2, 2.5, 3.5];
  
  let enonce = "", bonneReponse = "", explication = "";
  const types = ['pourcentage', 'conversion', 'calcul_mental', 'fraction'];
  const randType = types[Math.floor(Math.random() * types.length)];
  
  if (randType === 'pourcentage') {
    const p = pList[Math.floor(Math.random() * pList.length)];
    const v = vList[Math.floor(Math.random() * vList.length)];
    const res = (p * v) / 100;
    enonce = `Calculer ${p}% de ${v} €.`;
    bonneReponse = `${res} €`;
    explication = `Prendre ${p}%, c'est faire (${p} × ${v}) / 100 = ${res} €.`;
  } else if (randType === 'conversion') {
    const h = hList[Math.floor(Math.random() * hList.length)];
    const res = h * 60;
    enonce = `Convertir ${h} heure(s) en minutes.`;
    bonneReponse = `${res} minutes`;
    explication = `1 heure = 60 min. Donc ${h}h × 60 = ${res} minutes.`;
  } else if (randType === 'fraction') {
    const num = [1, 3, 5, 7][Math.floor(Math.random() * 4)];
    enonce = `Quelle est la valeur décimale de la fraction ${num}/2 ?`;
    bonneReponse = `${num / 2}`;
    explication = `Diviser par 2 revient à prendre la moitié : ${num} ÷ 2 = ${num / 2}.`;
  } else {
    const a = Math.floor(Math.random() * 9) + 4;
    const b = [9, 11, 19, 21][Math.floor(Math.random() * 4)];
    const res = a * b;
    enonce = `Calculer rapidement de tête : ${a} × ${b}`;
    bonneReponse = `${res}`;
    explication = `Astuce de calcul mental : ${a} × ${b} = ${res}.`;
  }

  const valNum = parseFloat(bonneReponse);
  const options = [
    bonneReponse,
    isNaN(valNum) ? "Aucune" : `${valNum + 5} ${enonce.includes('€') ? '€' : enonce.includes('minutes') ? 'minutes' : ''}`.trim(),
    isNaN(valNum) ? "10" : `${valNum - 2 > 0 ? valNum - 2 : valNum + 12} ${enonce.includes('€') ? '€' : enonce.includes('minutes') ? 'minutes' : ''}`.trim(),
    isNaN(valNum) ? "42" : `${valNum * 2} ${enonce.includes('€') ? '€' : enonce.includes('minutes') ? 'minutes' : ''}`.trim()
  ];
  
  const shuffled = shuffleArr([...new Set(options)]);
  return { enonce, options: shuffled, bonne_reponse: shuffled.indexOf(bonneReponse), explication };
}

// Sélection intelligente des questions textuelles avec filtrage de l'historique
function obtenirQuestionsFiltrees(pool, quantite) {
  // Filtrer pour enlever les questions stockées dans l'historique récent
  let questionsDisponibles = pool.filter(q => !AppState.historiqueQuestions.includes(q.enonce));
  
  // Si on a épuisé toutes les questions, on vide l'historique de cette matière pour pouvoir recommencer
  if (questionsDisponibles.length < quantite) {
    AppState.historiqueQuestions = AppState.historiqueQuestions.filter(enonce => !pool.some(q => q.enonce === enonce));
    questionsDisponibles = pool;
  }
  
  // Mélanger et extraire le nombre demandé
  const selectionnees = shuffleArr(questionsDisponibles).slice(0, quantite);
  
  // Enregistrer dans l'historique global pour les prochaines sessions
  selectionnees.forEach(q => AppState.historiqueQuestions.push(q.enonce));
  if (AppState.historiqueQuestions.length > 50) AppState.historiqueQuestions.shift(); // Limite la taille de l'historique
  localStorage.setItem('dnb_history_anti_repeat', JSON.stringify(AppState.historiqueQuestions));
  
  return selectionnees;
}

// ── GESTION DU CHRONOMÈTRE ──
let timerInterval = null;
let tempsRestant = 45;

function lancerTimer() {
  clearInterval(timerInterval);
  tempsRestant = 45;
  $('quiz-timer').style.display = 'block';
  $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
  $('quiz-timer').style.color = 'var(--text-primary)';

  timerInterval = setInterval(() => {
    tempsRestant--;
    $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
    if (tempsRestant <= 10) $('quiz-timer').style.color = 'var(--color-danger)';
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
  $('explanation-text').textContent = "Les 45 secondes imparties pour cet automatisme sont écoulées.";
  $('quiz-next').disabled = false;
  enregistrerLacune("Automatismes");
}

// ── SUIVI ADAPTATIF DES LACUNES ──
function enregistrerLacune(theme, estSucces = false) {
  if (!AppState.adaptive[theme]) AppState.adaptive[theme] = { echecs: 0, total: 0 };
  AppState.adaptive[theme].total++;
  if (!estSucces) AppState.adaptive[theme].echecs++;
  localStorage.setItem('dnb_adaptive_analytics', JSON.stringify(AppState.adaptive));
  analyserLacunes();
}

function analyserLacunes() {
  let pireTheme = null;
  let maxEchecs = 0;
  for (const theme in AppState.adaptive) {
    const stat = AppState.adaptive[theme];
    if (stat.echecs > maxEchecs && (stat.echecs / stat.total) >= 0.4) {
      maxEchecs = stat.echecs;
      pireTheme = theme;
    }
  }
  if (pireTheme) {
    $('lacunes-box').classList.remove('hidden');
    $('lacunes-text').innerHTML = `🚨 **Alerte Diagnostic :** Tu as rencontré plusieurs erreurs sur le thème **${pireTheme}**. Prends le temps de relire la fiche de cours ou utilise le mode **Flashcards** pour mémoriser les notions clés !`;
  } else {
    $('lacunes-box').classList.add('hidden');
  }
}

// ── CORE LOGIC APPLICATION ──
async function initialiserApp() {
  const savedAdaptive = localStorage.getItem('dnb_adaptive_analytics');
  if (savedAdaptive) AppState.adaptive = JSON.parse(savedAdaptive);
  
  const savedHistory = localStorage.getItem('dnb_history_anti_repeat');
  if (savedHistory) AppState.historiqueQuestions = JSON.parse(savedHistory);
  
  try {
    const res = await fetch('troisieme.json');
    if (res.ok) AppState.data = await res.json();
  } catch (e) {
    console.error("Erreur de chargement du fichier JSON", e);
  }
  
  construireMenuMatieres();
  analyserLacunes();
  configurerFlashcardsMenu();
}

function construireMenuMatieres() {
  const container = $('matieres-container');
  container.innerHTML = "";
  if (!AppState.data || !AppState.data.matieres) return;

  AppState.data.matieres.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '16px';
    
    let chapitresHTML = m.chapitres.map(c => `
      <div class="chapitre-item" style="padding:10px; margin-top:8px; background:var(--bg-app); border-radius:8px; display:flex; justify-content:space-between; align-items:center;" onclick="ouvrirPreQuiz('${m.id}', '${c.id}', event)">
        <span style="font-weight:600; font-size:.9rem;">${c.titre}</span>
        <span style="font-size:.8rem; color:var(--text-secondary); background:white; padding:2px 8px; border-radius:10px;">${c.theme}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
        <span style="font-size:1.5rem;">${m.emoji}</span>
        <h3 style="margin:0; font-size:1.1rem;">${m.label}</h3>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px;">${chapitresHTML}</div>
    `;
    container.appendChild(card);
  });
}

// ── NAVIGATION & SESSIONS DE QUIZ ──
let currentMatiereSelected = null;
let currentChapitreSelected = null;

function ouvrirPreQuiz(matiereId, chapitreId, event) {
  if (event) event.stopPropagation();
  currentMatiereSelected = AppState.data.matieres.find(m => m.id === matiereId);
  currentChapitreSelected = currentMatiereSelected.chapitres.find(c => c.id === chapitreId);
  
  $('home-screen').classList.add('hidden');
  $('pre-quiz-screen').classList.remove('hidden');
  
  $('pre-quiz-title').textContent = currentChapitreSelected.titre;
  $('pre-quiz-theme').textContent = currentChapitreSelected.theme;
  $('pre-quiz-cours-text').textContent = currentChapitreSelected.cours;
  $('pre-quiz-piege-text').textContent = currentChapitreSelected.piege;

  $('btn-lvl-1').onclick = () => lancerQuiz(1);
  $('btn-lvl-2').onclick = () => lancerQuiz(2);
  $('btn-lvl-3').onclick = () => lancerQuiz(3);
  $('btn-open-exercice').onclick = () => ouvrirExerciceOuvert();
}

function goHome() {
  $('pre-quiz-screen').classList.add('hidden');
  $('open-exercise-screen').classList.add('hidden');
  $('quiz-screen').classList.add('hidden');
  $('flashcards-screen').classList.add('hidden');
  $('home-screen').classList.remove('hidden');
  clearInterval(timerInterval);
  $('quiz-timer').style.display = 'none';
}

function lancerQuiz(niveau) {
  AppState.quiz.chapitreId = currentChapitreSelected.id;
  AppState.quiz.idx = 0;
  AppState.quiz.score = 0;
  AppState.quiz.isAutomatisme = false;
  AppState.quiz.niveauFiltre = niveau;
  
  let pool = currentChapitreSelected.questions.filter(q => q.niveau === niveau);
  
  if (currentMatiereSelected.id === 'maths') {
    // Les mathématiques génèrent de pures mutations à la volée (toujours uniques)
    AppState.quiz.questions = [genererQuestionMutationMaths(), genererQuestionMutationMaths(), genererQuestionMutationMaths(), genererQuestionMutationMaths(), genererQuestionMutationMaths()];
  } else {
    // Les autres matières appliquent le filtre strict anti-répétition basé sur l'historique
    AppState.quiz.questions = obtenirQuestionsFiltrees(pool, 3);
  }
  
  if(AppState.quiz.questions.length === 0) {
    alert("Aucune question disponible pour ce niveau. Essayez un autre niveau !");
    return;
  }

  $('pre-quiz-screen').classList.add('hidden');
  $('quiz-screen').classList.remove('hidden');
  afficherQuestion();
}

// MODE AUTOMATISMES 2026
$('btn-mode-automatismes').onclick = () => {
  AppState.quiz.chapitreId = "automatismes_global";
  AppState.quiz.idx = 0;
  AppState.quiz.score = 0;
  AppState.quiz.isAutomatisme = true;
  AppState.quiz.questions = [];
  
  for (let i = 0; i < 10; i++) {
    AppState.quiz.questions.push(genererQuestionMutationMaths());
  }
  
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
    boutonClique.style.borderColor = "#22C55E";
    $('quiz-explanation-box').className = "explanation-box visible good";
    $('explanation-status').textContent = "✅ Excellente réponse !";
  } else {
    boutonClique.style.background = "#FEE2E2";
    boutonClique.style.borderColor = "#EF4444";
    boutons[currentQ.bonne_reponse].style.background = "#DCFCE7";
    boutons[currentQ.bonne_reponse].style.borderColor = "#22C55E";
    $('quiz-explanation-box').className = "explanation-box visible bad";
    $('explanation-status').textContent = "❌ Erreur";
  }
  
  $('explanation-text').textContent = currentQ.explication;
  $('quiz-next').disabled = false;
  
  const themeConcerne = currentChapitreSelected ? currentChapitreSelected.theme : "Automatismes";
  enregistrerLacune(themeConcerne, estCorrect);
}

$('quiz-next').onclick = () => {
  AppState.quiz.idx++;
  if (AppState.quiz.idx < AppState.quiz.questions.length) {
    afficherQuestion();
  } else {
    alert(`🏁 Session terminée ! Votre score : ${AppState.quiz.score} / ${AppState.quiz.questions.length}`);
    goHome();
  }
};

$('quiz-close').onclick = () => { if (confirm("Quitter le quiz ?")) goHome(); };

// ── DISPOSITIF : EXERCICE OUVERT ──
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
    if ($('open-ex-textarea').value.trim().length < 6) {
      alert("Veuillez inscrire vos arguments ou votre démarche avant d'afficher le corrigé.");
      return;
    }
    $('btn-validate-open-ex').classList.add('hidden');
    $('open-ex-correction-box').classList.remove('hidden');
    
    const containerCriteres = $('open-ex-critere-list');
    containerCriteres.innerHTML = "";
    currentChapitreSelected.exercice_ouvert.criteres.forEach((critere, index) => {
      const label = document.createElement('label');
      label.style.cssText = "display:flex; align-items:start; gap:10px; font-size:.9rem; background:var(--bg-app); padding:8px; border-radius:6px; cursor:pointer;";
      label.innerHTML = `<input type="checkbox" class="critere-cb" value="${index}"> <span>${critere}</span>`;
      containerCriteres.appendChild(label);
    });
  };

  $('btn-finish-open-ex').onclick = () => {
    const total = document.querySelectorAll('.critere-cb').length;
    const coches = document.querySelectorAll('.critere-cb:checked').length;
    alert(`Auto-évaluation enregistrée : ${coches} / ${total} critères validés.`);
    enregistrerLacune(currentChapitreSelected.theme, (coches / total) >= 0.6);
    goHome();
  };
}

// ── DISPOSITIF C : MODE FLASHCARDS INTERACTIF ──
let flashcardsPool = [];
let currentFlashcardIdx = 0;

function configurerFlashcardsMenu() {
  // Ajout du déclencheur dans la sidebar ou menu supérieur
  $('theme-toggle').insertAdjacentHTML('beforebegin', `<button id="btn-nav-flashcards" class="btn-primary" style="font-size:0.78rem; padding:6px 10px; margin-right:8px; background:var(--color-accent);">🎴 Flashcards</button>`);
  
  $('btn-nav-flashcards').onclick = () => {
    genererFlashcardsPool();
    if(flashcardsPool.length === 0) {
      alert("Fichier de données manquant ou incomplet pour générer les Flashcards.");
      return;
    }
    currentFlashcardIdx = 0;
    $('home-screen').classList.add('hidden');
    $('pre-quiz-screen').classList.add('hidden');
    $('quiz-screen').classList.add('hidden');
    $('flashcards-screen').classList.remove('hidden');
    afficherFlashcard();
  };

  $('flashcard-card-box').onclick = () => {
    $('flashcard-card-box').classList.toggle('flipped');
  };

  $('flashcard-next').onclick = () => {
    currentFlashcardIdx++;
    if(currentFlashcardIdx >= flashcardsPool.length) {
      alert("Bravo ! Vous avez passé en revue toutes les Flashcards de notions.");
      goHome();
    } else {
      afficherFlashcard();
    }
  };
}

function genererFlashcardsPool() {
  flashcardsPool = [];
  if (!AppState.data || !AppState.data.matieres) return;
  
  AppState.data.matieres.forEach(m => {
    m.chapitres.forEach(c => {
      // Éléments fondamentaux de mémorisation active : Fiche de Cours et Pièges à éviter
      flashcardsPool.push({
        matiere: m.label,
        chapitre: c.titre,
        recto: `Que faut-il retenir impérativement sur le chapitre :\n"${c.titre}" ?`,
        verso: c.cours
      });
      flashcardsPool.push({
        matiere: m.label,
        chapitre: c.titre,
        recto: `Quel est le piège classique des correcteurs au Brevet concernant :\n"${c.titre}" ?`,
        verso: `⚠️ ATTENTION :\n${c.piege}`
      });
    });
  });
  flashcardsPool = shuffleArr(flashcardsPool);
}

function afficherFlashcard() {
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
