import { TMDB_API_KEY, TMDB_BASE_URL } from '../config.js';

function handleResponse(response) {
  if (!response.ok) {
    const error = new Error(`TMDb API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function tmdbFetch(path, params = {}) {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is manquante.');
  }

  const queryParams = new URLSearchParams({ language: 'fr-FR', ...params });
  const url = `${TMDB_BASE_URL}${path}?${queryParams}`;

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_API_KEY}`,
    },
  });

  return handleResponse(response);
}

export async function searchMovies(query) {
  if (!query || query.length < 2) return { results: [] };
  return tmdbFetch('/search/movie', { query, include_adult: 'false' });
}

export async function getMovieDetail(movieId) {
  return tmdbFetch(`/movie/${movieId}`, { append_to_response: 'credits' });
}

export async function getMovieImages(movieId) {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key est manquante.');
  }

  const url = `${TMDB_BASE_URL}/movie/${movieId}/images`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_API_KEY}`,
    },
  });

  return handleResponse(response);
}

export async function discoverMovies(params = {}) {
  return tmdbFetch('/discover/movie', {
    sort_by: 'popularity.desc',
    include_adult: 'false',
    include_video: 'false',
    language: 'fr-FR',
    ...params,
  });
}

export async function getRandomMovie(filters = {}) {
  const { originalLanguage, minVotes } = filters;
  const normalizedMinVotes = typeof minVotes === 'number' && !Number.isNaN(minVotes) ? minVotes : 100;

  let attempt = 0;
  const maxAttempts = 30;
  while (attempt < maxAttempts) {
    attempt += 1;
    const page = Math.floor(Math.random() * 20) + 1;
    const discoverParams = {
      page,
      'vote_count.gte': normalizedMinVotes,
    };

    if (originalLanguage) {
      discoverParams.with_original_language = originalLanguage;
    }

    const data = await discoverMovies(discoverParams);
    const movies = (data.results || []).filter((movie) => movie.vote_count >= normalizedMinVotes);

    if (!movies.length) continue;

    const candidates = movies.sort(() => Math.random() - 0.5);
    for (const candidate of candidates) {
      const detail = await getMovieDetail(candidate.id);
      return detail;
    }
  }

  throw new Error('Aucun film trouvé correspondant aux filtres. Veuillez élargir ou supprimer les filtres.');
}
