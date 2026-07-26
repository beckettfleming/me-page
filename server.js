const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'projects.json');

// If the app is behind a reverse proxy (nginx), trust the X-Forwarded-* headers
app.set('trust proxy', true);

app.use(express.json({ limit: '5mb' }));

// IP restriction for admin access
const ALLOWED_ADMIN_IP = '162.230.12.125';
function getClientIp(req) {
  let ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  if (!ip) return '';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}
function adminOnly(req, res, next) {
  const ip = getClientIp(req);
  if (ip === ALLOWED_ADMIN_IP) return next();
  console.warn('Blocked admin access from', ip, 'to', req.originalUrl);
  return res.status(403).json({ error: 'forbidden' });
}

// Serve admin page only to the allowed IP
app.get('/admin.html', adminOnly, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Serve other static assets
app.use(express.static(path.join(__dirname)));

app.get('/api/projects', async (req, res) => {
  try {
    const txt = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(txt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Replace full projects array (admin UI uses this)
app.post('/api/projects', adminOnly, async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'expected array' });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add or update a single project
app.post('/api/project', adminOnly, async (req, res) => {
  try {
    const p = req.body;
    if (!p || !p.id) return res.status(400).json({ error: 'missing id' });
    const txt = await fs.readFile(DATA_FILE, 'utf8');
    const projects = JSON.parse(txt);
    const idx = projects.findIndex(x => x.id === p.id);
    if (idx >= 0) projects[idx] = p; else projects.push(p);
    await fs.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
