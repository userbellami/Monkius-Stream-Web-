const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// TMDB endpoints
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

// WORKING STREAMING PROVIDERS
app.get('/api/stream/:mediaType/:id', async (req, res) => {
  const { id } = req.params;
  // First try: moviesapi.club (most reliable currently)
  const primaryUrl = `https://moviesapi.club/movie/${id}`;
  // Backup: vidsrc.rip
  const backupUrl = `https://vidsrc.rip/embed/movie/${id}`;
  
  // Test primary URL
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const testResponse = await fetch(primaryUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    if (testResponse.ok) {
      console.log(`Using primary provider: ${primaryUrl}`);
      return res.json({ url: primaryUrl });
    }
  } catch (err) {
    console.log(`Primary failed: ${err.message}`);
  }
  
  // Fallback to backup
  console.log(`Using backup provider: ${backupUrl}`);
  res.json({ url: backupUrl });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
