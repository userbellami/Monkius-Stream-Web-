const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// TMDB endpoints (same as before)
app.get('/api/movies/:category', async (req, res) => {
  const { category } = req.params;
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  let url = '';
  if (category === 'trending') url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`;
  else if (category === 'top_rated') url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}`;
  else if (category === 'action') url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28`;
  else if (category === 'comedy') url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=35`;
  else return res.status(400).json({ error: 'Invalid category' });
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data.results || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data.results || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/movie/:id/trailer', async (req, res) => {
  const { id } = req.params;
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    res.json({ key: trailer ? trailer.key : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: Multiple streaming providers with fallback
const STREAM_PROVIDERS = [
  (id) => `https://vidsrc.me/embed/movie/${id}?autoplay=1`,
  (id) => `https://vidsrc.to/embed/movie/${id}?autoplay=1`,
  (id) => `https://2embed.cc/embed/${id}`,
  (id) => `https://embed.su/embed/movie/${id}`,
  (id) => `https://autoembed.cc/embed/movie/${id}`
];

app.get('/api/stream/:mediaType/:id', async (req, res) => {
  const { id } = req.params;
  // Try each provider sequentially (server-side check)
  for (const provider of STREAM_PROVIDERS) {
    const url = provider(id);
    try {
      // Quick HEAD request to see if the URL is reachable (optional, but we'll just return first)
      // For simplicity, we'll return the first provider's URL and let frontend handle fallback.
      // But to make it more robust, we'll test with a timeout.
      console.log(`Trying provider: ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        console.log(`Provider works: ${url}`);
        return res.json({ url, provider: provider.name });
      }
    } catch (err) {
      console.log(`Provider failed: ${url} - ${err.message}`);
      continue;
    }
  }
  // If all fail, return the first as fallback (frontend will show error)
  res.json({ url: STREAM_PROVIDERS[0](id), fallback: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
