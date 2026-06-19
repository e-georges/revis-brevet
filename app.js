function configurerFlashcardsMenu() {
  // Gestion de la Bottom Navigation Bar Mobile
  $('nav-home').onclick = () => {
    $('nav-home').classList.add('active');
    $('nav-flashcards').classList.remove('active');
    goHome();
  };

  $('nav-flashcards').onclick = () => {
    $('nav-flashcards').classList.add('active');
    $('nav-home').classList.remove('active');
    
    genererFlashcardsPool();
    if(flashcardsPool.length === 0) {
      alert("Fichier de données manquant ou incomplet.");
      return;
    }
    currentFlashcardIdx = 0;
    $('home-screen').classList.add('hidden');
    $('pre-quiz-screen').classList.add('hidden');
    $('quiz-screen').classList.add('hidden');
    $('open-exercise-screen').classList.add('hidden');
    $('flashcards-screen').classList.remove('hidden');
    afficherFlashcard();
  };

  // Clic sur le corps de la carte pour effet de bascule tactile
  $('flashcard-card-box').onclick = () => {
    $('flashcard-card-box').classList.toggle('flipped');
  };

  $('flashcard-next').onclick = () => {
    currentFlashcardIdx++;
    if(currentFlashcardIdx >= flashcardsPool.length) {
      alert("Bravo ! Tu as révisé toutes les cartes de mémorisation active !");
      $('nav-home').click();
    } else {
      afficherFlashcard();
    }
  };
}
