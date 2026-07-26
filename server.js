const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'projects.json');

app.use(express.json({ limit: '5mb' }));
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
app.post('/api/projects', async (req, res) => {
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
app.post('/api/project', async (req, res) => {
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
