const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Cache for sitemap movies (refresh every 24h)
let sitemapCache = null;
let sitemapLastUpdate = 0;

// TMDB endpoints
app.get('/api/movies/:category', async (req, res) => {
  const { category } = req.params;
  const key = process.env.TMDB_API_KEY;
  let url = '';
  if (category === 'trending') url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`;
  else if (category === 'top_rated') url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${key}`;
  else if (category === 'action') url = `https://api.themoviedb.org/3/discover/movie?api_key=${key}&with_genres=28`;
  else if (category === 'comedy') url = `https://api.themoviedb.org/3/discover/movie?api_key=${key}&with_genres=35`;
  else if (category === 'scifi') url = `https://api.themoviedb.org/3/discover/movie?api_key=${key}&with_genres=878`;
  else if (category === 'romance') url = `https://api.themoviedb.org/3/discover/movie?api_key=${key}&with_genres=10749`;
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
  const key = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}`;
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
  const key = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${key}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    res.json({ key: trailer ? trailer.key : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streaming with fallbacks
app.get('/api/stream/:id', (req, res) => {
  const { id } = req.params;
  const providers = [
    `https://vidsrc.me/embed/movie/${id}?autoplay=1`,
    `https://vidsrc.xyz/embed/movie/${id}`,
    `https://2embed.cc/embed/${id}`,
    `https://embed.su/embed/movie/${id}`
  ];
  res.json({ url: providers[0], fallbacks: providers.slice(1) });
});

// -------------------------------
// SEO Routes
// -------------------------------
// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: https://monkius-full-stream.onrender.com/sitemap.xml`);
});

// Sitemap.xml generator (dynamic, caches movies for 24h)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const now = Date.now();
    if (sitemapCache && (now - sitemapLastUpdate) < 24 * 60 * 60 * 1000) {
      return res.type('application/xml').send(sitemapCache);
    }
    const key = process.env.TMDB_API_KEY;
    const trendingRes = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`);
    const trendingData = await trendingRes.json();
    const movies = trendingData.results || [];
    // Generate sitemap XML
    let urls = '';
    const baseUrl = 'https://monkius-full-stream.onrender.com';
    movies.slice(0, 50).forEach(movie => {
      urls += `
  <url>
    <loc>${baseUrl}/movie/${movie.id}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${urls}
</urlset>`;
    sitemapCache = sitemap;
    sitemapLastUpdate = now;
    res.type('application/xml').send(sitemap);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// Individual movie page (for SEO – dynamic route)
app.get('/movie/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
