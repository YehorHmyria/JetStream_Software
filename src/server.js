// src/server.js
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const session = require('express-session');
const { parse: csvParse } = require('csv-parse');
const bcrypt = require('bcryptjs');

const config = require('./config');
const { ensureAuthenticated } = require('./middleware/authMiddleware');
const { createJobAndStart } = require('./services/appsFlyerSender');
const { logServerStart } = require('./services/telegramLogger');
const { initSchedulers } = require('./services/scheduler');
const { getLogs } = require('./services/logStore');
const { getJobs, stopJob, deleteJob } = require('./services/jobsStore');
const { getNotes, saveNotes } = require('./services/notesStore');

const app = express();

// uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
  })
);

// static
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

/**
 * ROUTES – PAGES
 */

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/login', (req, res) => {
  res.redirect('/');
});

app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard.html'));
});

app.get('/logs', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(publicDir, 'logs.html'));
});

/**
 * AUTH
 */

app.post('/login', async (req, res) => {
  const { username } = req.body;
  
  // Login logic disabled for demonstration purposes
  // Previously verified against admin credentials
  
  try {
    req.session.user = { username: username || 'admin' };
    return res.redirect('/dashboard');
  } catch (e) {
    console.error('Login error:', e.message);
    return res.redirect('/?error=1');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

/**
 * API – health
 */

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * API – logs
 */

app.get('/api/logs', ensureAuthenticated, (req, res) => {
  const { bundle, limit } = req.query;
  const limitNum = limit ? Number(limit) : 200;
  const items = getLogs({ bundle, limit: limitNum });
  res.json(items);
});

/**
 * API – jobs list, stop, delete
 */

app.get('/api/jobs', ensureAuthenticated, (req, res) => {
  const jobs = getJobs()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((j) => ({
      id: j.id,
      bundle: j.bundle,
      fileName: j.fileName,
      createdAt: j.createdAt,
      expectedEndAt: j.expectedEndAt,
      sent: j.sent || 0,
      total: j.total,
      status: j.status
    }));

  res.json(jobs);
});

app.post('/api/jobs/:id/stop', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const job = stopJob(id);
  if (!job) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ ok: true });
});

app.delete('/api/jobs/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const job = getJobs().find((j) => j.id === id);
  if (!job) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (job.status === 'running') {
    return res.status(400).json({ error: 'running' });
  }

  const removed = deleteJob(id);
  if (!removed) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ ok: true });
});

/**
 * API – notes (шифровані)
 */

app.get('/api/notes', ensureAuthenticated, (req, res) => {
  const text = getNotes();
  res.json({ text });
});

app.post('/api/notes', ensureAuthenticated, (req, res) => {
  const { text } = req.body || {};
  const ok = saveNotes(text || '');
  if (!ok) {
    return res.status(500).json({ error: 'save_failed' });
  }
  res.json({ ok: true });
});

/**
 * API – upload CSV & start job
 */

app.post(
  '/api/upload',
  ensureAuthenticated,
  upload.single('file'),
  (req, res) => {
    const { bundle, devKey, days } = req.body;

    if (!bundle || !devKey || !days || !req.file) {
      return res.status(400).send('Missing required fields');
    }

    const daysNum = Number(days);
    if (Number.isNaN(daysNum) || daysNum <= 0) {
      return res.status(400).send('Invalid "days" value');
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname || 'file.csv';
    const records = [];

    fs.createReadStream(filePath)
      .pipe(
        csvParse({
          columns: true,
          trim: true
        })
      )
      .on('data', (row) => {
        records.push(row);
      })
      .on('end', () => {
        fs.unlink(filePath, () => {});

        if (!records.length) {
          return res.status(400).send('CSV file is empty');
        }

        const { jobId, total, intervalMs } = createJobAndStart({
          bundle,
          devKey,
          days: daysNum,
          records,
          fileName
        });

        const intervalSec = (intervalMs / 1000).toFixed(2);

        const url =
          `/job-created.html` +
          `?jobId=${encodeURIComponent(jobId)}` +
          `&bundle=${encodeURIComponent(bundle)}` +
          `&file=${encodeURIComponent(fileName)}` +
          `&records=${total}` +
          `&interval=${intervalSec}` +
          `&days=${daysNum}`;

        res.redirect(url);
      })
      .on('error', (err) => {
        console.error('CSV parse error:', err);
        fs.unlink(filePath, () => {});
        res.status(500).send('Error parsing CSV');
      });
  }
);

/**
 * START
 */

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  logServerStart(config.port).catch(() => {});
  initSchedulers();
});
