const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Proxy TMDB API
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

// Search movies
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

// Get trailer
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

// NEW: VidSrc streaming endpoint
app.get('/api/stream/:mediaType/:id', (req, res) => {
  const { mediaType, id } = req.params;
  // Use vidsrc.to – it works with TMDB or IMDb IDs
  const streamUrl = `https://vidsrc.to/embed/${mediaType}/${id}`;
  console.log(`[Stream] Generated URL: ${streamUrl}`);
  res.json({ url: streamUrl });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
