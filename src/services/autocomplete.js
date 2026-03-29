import { getCache, setCache } from './cache.js';
import { searchMovies } from './tmdb.js';

export async function autocompleteMovies(query) {
  const key = `autocomplete:${query}`;
  const cached = getCache(key);
  if (cached) return cached;

  const data = await searchMovies(query);
  const results = (data.results || []).slice(0, 7).map((movie) => ({
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date,
  }));

  setCache(key, results, 300000);
  return results;
}
