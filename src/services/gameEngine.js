import { getCache, setCache } from './cache.js';

const CLUE_COSTS = {
  year: 5,
  genre: 10,
  synopsis: 15,
  image: 30,
  actors: 20,
};

const STORAGE_KEY = 'moviequizz:game';

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createDefaultState() {
  return {
    pointsConsumed: 0,
    mode: 'cumulative',
    round: null,
    stats: { wins: 0, losses: 0, rounds: 0 },
  };
}

export function initGameState() {
  const existing = loadState();
  if (existing) return existing;
  const state = createDefaultState();
  saveState(state);
  return state;
}

export function resetGameState() {
  const state = createDefaultState();
  saveState(state);
  return state;
}

export function getClueCost(type) {
  return CLUE_COSTS[type] || 999;
}

export function canBuyClue(state, type) {
  if (!state.round) return false;
  const ownedClues = state.round.clues || [];

  const relevantCount = (ownedClues, t) => ownedClues.filter((c) => c === t).length;

  if (type === 'actors') {
    const actorCount = relevantCount(ownedClues, 'actors');
    const available = (state.round.movie?.credits?.cast || []).length;
    return actorCount < available;
  }

  if (type === 'image') {
    const imageCount = relevantCount(ownedClues, 'image');
    const available = (state.round.movie?.images?.backdrops || []).length;

    if (!state.round.movie?.images) {
      return imageCount === 0;
    }

    return imageCount < available;
  }

  if (relevantCount(ownedClues, type) > 0) return false;
  return true;
}

export function buyClue(state, type) {
  if (!state.round) {
    throw new Error('Aucune partie en cours. Démarrez une partie avant de débloquer un indice.');
  }
  if (!canBuyClue(state, type)) {
    if (type === 'actors' && (state.round.movie?.credits?.cast || []).length === 0) {
      throw new Error('Aucun acteur disponible pour ce film.');
    }
    if (type === 'image' && (state.round.movie?.images?.backdrops || []).length === 0) {
      throw new Error('Aucune image disponible pour ce film.');
    }
    throw new Error('Crédit insuffisant ou indice déjà débloqué.');
  }

  const cost = getClueCost(type);
  state.pointsConsumed = (state.pointsConsumed || 0) + cost;

  state.round.clues = state.round.clues || [];
  state.round.clues.push(type);
  saveState(state);
  return state;
}

export function startRound(state, movie, mode = 'cumulative') {
  state.mode = mode;
  const round = {
    movie,
    clues: [],
    startedAt: Date.now(),
    done: false,
  };
  state.round = round;
  saveState(state);
  setCache('current-movie', movie, 300000);
  return state;
}

export function checkGuess(state, guessMovieId) {
  if (!state.round || state.round.done) return { correct: false, reason: 'Aucune partie en cours' };
  const correct = Number(guessMovieId) === Number(state.round.movie.id);
  state.stats.rounds += 1;
  if (correct) {
    state.stats.wins += 1;
    state.round.done = true;
  } else {
    state.stats.losses += 1;
    // En cas d'erreur, on maintient la partie en cours pour continuer à acheter des indices.
  }
  saveState(state);
  return { correct };
}

export function getClues(state) {
  if (!state.round) return [];
  const movie = state.round.movie;
  const ownedClues = state.round.clues || [];
  const actorsRevealed = ownedClues.filter((c) => c === 'actors').length;

  const imagesRevealed = ownedClues.filter((c) => c === 'image').length;
  const imageEntries = (movie.images?.backdrops || []).slice(0, imagesRevealed);

  return [
    { type: 'year', label: 'Année', value: ownedClues.includes('year') ? (movie.release_date || 'N/A').slice(0, 4) : null },
    { type: 'genre', label: 'Genre', value: ownedClues.includes('genre') ? (movie.genres || []).map((g) => g.name).join(', ') : null },
    { type: 'synopsis', label: 'Synopsis', value: ownedClues.includes('synopsis') ? movie.overview : null },
    { type: 'image', label: 'Image du film', value: imagesRevealed > 0 ? imageEntries : null, count: imagesRevealed },
    {
      type: 'actors',
      label: 'Acteurs',
      value: actorsRevealed > 0
        ? (movie.credits?.cast || []).slice(0, actorsRevealed).map((c) => c.name).join(', ')
        : null,
      count: actorsRevealed,
    },
  ];
}
