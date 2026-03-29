import { getRandomMovie, getMovieImages } from '../services/tmdb.js';
import { initGameState, resetGameState, startRound, buyClue, checkGuess, getClues, canBuyClue, getClueCost } from '../services/gameEngine.js';
import { autocompleteMovies } from '../services/autocomplete.js';
import { TMDB_IMAGE_BASE } from '../config.js';

const clueTypes = ['year', 'genre', 'synopsis', 'image', 'actors'];

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function renderClueList(state, clueHolder, messageEl) {
  clueHolder.innerHTML = '';
  const clues = getClues(state);
  clues.forEach((clue) => {
    const row = createElement('div', 'clue-item');
    const title = createElement('strong', null, `${clue.label}: `);
    row.appendChild(title);
    if (clue.value) {
      if (clue.type === 'image') {
        const images = Array.isArray(clue.value) ? clue.value : [];
        if (images.length) {
          const container = createElement('div', 'clue-images');
          images.forEach((backdrop) => {
            const img = document.createElement('img');
            img.src = `${TMDB_IMAGE_BASE}${backdrop.file_path}`;
            img.alt = 'Image du film';
            img.className = 'clue-image';
            container.appendChild(img);
          });
          row.appendChild(container);
        } else {
          row.appendChild(createElement('span', null, 'Pas d’images disponibles'));
        }
      } else {
        row.appendChild(createElement('span', null, clue.value || 'N/A'));
      }
    } else {
      row.appendChild(createElement('span', null, 'Indice non débloqué'));
    }
    clueHolder.appendChild(row);
  });
}

function buildAutoComplete(inputEl, listEl, onSelect) {
  let currentSuggestions = [];

  inputEl.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (!query) {
      listEl.innerHTML = '';
      return;
    }
    try {
      const movies = await autocompleteMovies(query);
      currentSuggestions = movies;
      listEl.innerHTML = '';
      movies.forEach((movie) => {
        const item = createElement('button', 'autocomplete-item', `${movie.title} (${(movie.release_date || '').slice(0, 4)})`);
        item.type = 'button';
        item.addEventListener('click', () => {
          onSelect(movie);
          listEl.innerHTML = '';
        });
        listEl.appendChild(item);
      });
    } catch (error) {
      listEl.innerHTML = '';
      console.error(error);
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.autocomplete')) {
      listEl.innerHTML = '';
    }
  });
}

export async function initGameUI() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const state = initGameState();

  const title = createElement('h1', null, 'MovieQuizz');
  app.appendChild(title);

  const homePanel = createElement('section', 'home-panel');
  const intro = createElement('p', null, 'Choisissez quelques filtres (optionnels) puis démarrez une partie :');
  homePanel.appendChild(intro);

  const languageLabel = createElement('label', null, 'Langue originale : ');
  const languageSelect = document.createElement('select');
  languageSelect.appendChild(new Option('Toutes', ''));
  ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'].forEach((lang) => languageSelect.appendChild(new Option(lang, lang)));
  languageLabel.appendChild(languageSelect);
  homePanel.appendChild(languageLabel);


  const minVotesLabel = createElement('label', null, 'Vote count min : ');
  const minVotesInput = document.createElement('input');
  minVotesInput.type = 'number';
  minVotesInput.min = '0';
  minVotesInput.placeholder = '100';
  minVotesInput.value = '100';
  minVotesLabel.appendChild(minVotesInput);
  homePanel.appendChild(minVotesLabel);

  const modeLabel = createElement('label', null, 'Mode score : ');
  const modeSelect = document.createElement('select');
  modeSelect.appendChild(new Option('Points cumulés', 'cumulative'));
  modeLabel.appendChild(modeSelect);
  homePanel.appendChild(modeLabel);

  const homeStartBtn = createElement('button', null, 'Démarrer une partie');
  homeStartBtn.type = 'button';
  homePanel.appendChild(homeStartBtn);
  app.appendChild(homePanel);

  const gamePanel = createElement('section', 'game-panel');
  gamePanel.style.display = 'none';
  app.appendChild(gamePanel);

  const status = createElement('div', 'status');
  gamePanel.appendChild(status);

  const control = createElement('div', 'controls');
  const resetBtn = createElement('button', null, 'Réinitialiser le jeu');
  control.appendChild(resetBtn);
  gamePanel.appendChild(control);

  const cluesBlock = createElement('div', 'clues-block');
  gamePanel.appendChild(cluesBlock);

  const cluesHolder = createElement('div', 'clue-list');
  cluesBlock.appendChild(cluesHolder);

  const guessContainer = createElement('div', 'guess-container');
  const guessInput = createElement('input', 'guess-input');
  guessInput.type = 'text';
  guessInput.placeholder = 'Rechercher un film...';
  const guessSubmit = createElement('button', null, 'Valider la réponse');
  guessSubmit.type = 'button';
  const suggestionBox = createElement('div', 'autocomplete');
  guessContainer.appendChild(guessInput);
  guessContainer.appendChild(guessSubmit);
  guessContainer.appendChild(suggestionBox);
  gamePanel.appendChild(guessContainer);

  const message = createElement('div', 'message');
  gamePanel.appendChild(message);

  const extraActions = createElement('div', 'extra-actions');
  gamePanel.appendChild(extraActions);

  let selectedMovieId = null;

  const clueActions = createElement('div', 'clue-actions');
  const clueButtons = {};
  clueTypes.forEach((type) => {
    const button = createElement('button', 'clue-btn', `${type} (${getClueCost(type)} crédits)`);
    button.type = 'button';
    button.addEventListener('click', async () => {
      try {
        if (type === 'image' && state.round?.movie?.id) {
          const imageData = await getMovieImages(state.round.movie.id);
          if (imageData) {
            state.round.movie.images = imageData;
          }
        }
        buyClue(state, type);
        renderClueList(state, cluesHolder, message);
        renderStatus(state, status);
        updateClueButtons();
      } catch (e) {
        message.classList.remove('success');
        message.classList.add('error');
        message.textContent = e.message;
      }
    });
    clueButtons[type] = button;
    clueActions.appendChild(button);
  });
  gamePanel.appendChild(clueActions);

  function updateClueButtons() {
    const active = !!state.round && !state.round.done;
    clueTypes.forEach((type) => {
      const button = clueButtons[type];
      if (!button) return;
      button.disabled = !active || !canBuyClue(state, type);
    });
  }

  function setGameMode(active) {
    homePanel.style.display = active ? 'none' : 'block';
    gamePanel.style.display = active ? 'block' : 'none';
  }

  function setAllInteraction(enabled) {
    Object.values(clueButtons).forEach((button) => {
      if (button && button !== resetBtn) {
        button.disabled = !enabled;
      }
    });
    guessInput.disabled = !enabled;
    guessSubmit.disabled = !enabled;
  }

  function createShowAnswerButton(movie) {
    extraActions.innerHTML = '';
    const showAnswerBtn = createElement('button', null, 'Voir la réponse');
    showAnswerBtn.type = 'button';
    showAnswerBtn.addEventListener('click', () => {
      message.classList.remove('success', 'error');
      message.classList.add('answer-reveal');
      message.textContent = `La réponse était ${movie.title} (${movie.release_date?.slice(0, 4) || 'N/A'})`;
      revealAllClues(state);
      if (state.round) {
        state.round.done = true;
      }
      renderClueList(state, cluesHolder, message);
      updateClueButtons();
      setGameOverUI();
      renderStatus(state, status);
    });
    extraActions.appendChild(showAnswerBtn);
  }

  function clearExtraActions() {
    extraActions.innerHTML = '';
  }

  function revealAllClues(currentState) {
    if (!currentState.round) return;
    const allTypes = ['year', 'genre', 'synopsis', 'image', 'actors'];
    currentState.round.clues = [...new Set([...(currentState.round.clues || []), ...allTypes])];
    if (currentState.round.movie?.credits?.cast) {
      while (currentState.round.clues.filter((c) => c === 'actors').length < currentState.round.movie.credits.cast.length) {
        currentState.round.clues.push('actors');
      }
    }
    if (currentState.round.movie?.images?.backdrops) {
      while (currentState.round.clues.filter((c) => c === 'image').length < currentState.round.movie.images.backdrops.length) {
        currentState.round.clues.push('image');
      }
    }
  }

  function computeRank(pointsConsumed) {
    if (pointsConsumed <= 20) return 'Expert';
    if (pointsConsumed <= 50) return 'Amateur';
    if (pointsConsumed <= 90) return 'Noob';
    return 'Fait un effort';
  }

  function setGameOverUI() {
    setAllInteraction(false);
    clueActions.style.display = 'none';
    guessContainer.style.display = 'none';
    extraActions.style.display = 'none';
  }

  function renderStatus(currentState) {
    const rank = computeRank(currentState.pointsConsumed || 0);
    status.innerHTML = `Points consommés: ${currentState.pointsConsumed} | Rang: ${rank}`;

    if (currentState.round && !currentState.round.done) {
      createShowAnswerButton(currentState.round.movie);
    } else {
      clearExtraActions();
    }
  }

  async function startNewRound() {
    resetGameState();
    const freshState = initGameState();
    Object.assign(state, freshState);

    const settings = {
      originalLanguage: languageSelect.value || undefined,
      minVotes: minVotesInput.value ? Number(minVotesInput.value) : 100,
      mode: 'cumulative',
    };

    message.classList.remove('success', 'error', 'answer-reveal');
    message.textContent = 'Chargement du film...';
    try {
      const movie = await getRandomMovie(settings);
      startRound(state, movie, settings.mode);
      renderClueList(state, cluesHolder, message);
      renderStatus(state, status);
      setGameMode(true);
      clueActions.style.display = 'flex';
      guessContainer.style.display = 'block';
      setAllInteraction(true);
      clearExtraActions();
      updateClueButtons();
      message.classList.remove('success', 'error', 'answer-reveal');
      message.textContent = 'Partie lancée. Bonne chance !';
    } catch (error) {
      message.classList.remove('success');
      message.classList.add('error');
      message.textContent = error.message || 'Impossible de démarrer la partie. Vérifiez la clé TMDb et la connexion.';
      console.error(error);
    }
  }

  homeStartBtn.addEventListener('click', () => startNewRound());
  resetBtn.addEventListener('click', () => {
    resetGameState();
    const newState = initGameState();
    Object.assign(state, newState);
    renderStatus(state);
    cluesHolder.innerHTML = '';
    guessInput.value = '';
    selectedMovieId = null;
    updateClueButtons();
    setGameMode(false);
    clueActions.style.display = 'flex';
    guessContainer.style.display = 'block';
    setAllInteraction(true);
    clearExtraActions();
    message.classList.remove('success', 'error', 'answer-reveal');
    message.textContent = 'Jeu réinitialisé.';
  });

  buildAutoComplete(guessInput, suggestionBox, (selected) => {
    guessInput.value = selected.title;
    selectedMovieId = selected.id;
    message.textContent = 'Film sélectionné. Cliquez sur "Valider la réponse" pour confirmer.';
  });

  guessSubmit.addEventListener('click', async () => {
    message.classList.remove('success', 'error');
    if (!state.round || !state.round.movie) {
      message.textContent = 'Lancez d’abord une partie.';
      message.classList.add('error');
      return;
    }
    const query = guessInput.value.trim();
    if (!query) {
      message.textContent = 'Entrez un titre pour deviner.';
      message.classList.add('error');
      return;
    }

    try {
      const matches = await autocompleteMovies(query);
      const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
      const target = state.round.movie;
      const normalizedTarget = (target.title || '').toLowerCase().replace(/\s+/g, ' ').trim();

      let guessId = selectedMovieId;
      if (!guessId) {
        const candidateById = matches.find((m) => Number(m.id) === Number(target.id));
        if (candidateById) {
          guessId = candidateById.id;
        }
      }

      if (!guessId) {
        const candidateByTitle = matches.find((m) => m.title.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedQuery);
        if (candidateByTitle) guessId = candidateByTitle.id;
      }

      if (!guessId && normalizedQuery === normalizedTarget) {
        guessId = target.id;
      }

      if (!guessId) {
        message.textContent = 'Aucun film correspondant trouvé. Utilisez l’autocomplétion.';
        message.classList.add('error');
        return;
      }

      const result = checkGuess(state, guessId);
      if (result.correct) {
        message.classList.remove('error', 'answer-reveal');
        message.classList.add('success');
        message.textContent = `Bravo ! Vous avez deviné ${state.round.movie.title}.`;
        revealAllClues(state);
        renderClueList(state, cluesHolder, message);
        setGameOverUI();
      } else {
        message.classList.remove('success', 'answer-reveal');
        message.classList.add('error');
        message.textContent = `Ce n’est pas le bon film.`;
      }
      renderStatus(state, status);
    } catch (error) {
      message.textContent = 'Erreur lors de la vérification de la réponse.';
      message.classList.add('error');
    }
  });

  const inGame = !!state.round && !state.round.done;
  setGameMode(inGame);
  renderStatus(state);
  updateClueButtons();
  if (inGame) {
    renderClueList(state, cluesHolder, message);
  }
}
