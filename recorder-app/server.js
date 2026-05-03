/**
 * RO Test Automation — Express Server
 * Merged: Test Recorder + Automated Playwright Tests
 * Industry-standard structure: Test Suite > Test Cases > Test Steps
 */

const express        = require('express');
const path           = require('path');
const fs             = require('fs');
const { spawn }      = require('child_process');
const { RecorderEngine } = require('./recorder-engine');
const { PlayerEngine }   = require('./player-engine');

const app           = express();
const PORT          = 3333;
const DATA_FILE     = path.join(__dirname, 'test-data.json');
const LEGACY_FILE   = path.join(__dirname, 'tags.json');
const TEST_AUTO_DIR = path.join(__dirname, '..', 'test-automation');

app.use(express.json());
// Serve static files but don't auto-redirect / to index.html
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Serve Playwright HTML report
app.use('/playwright-report', express.static(path.join(TEST_AUTO_DIR, 'playwright-report')));

// ── Page Routes ───────────────────────────────────────────────────────────────
app.get('/',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/recorder',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/playwright',(req, res) => res.sendFile(path.join(__dirname, 'public', 'playwright-runner.html')));

// ── State ─────────────────────────────────────────────────────────────────────
let recorder     = null;
let liveSteps    = [];
let recordStatus = 'idle'; // idle | recording | paused

// ── Data Helpers ──────────────────────────────────────────────────────────────
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { suites: {}, testCases: {} };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return { suites: {}, testCases: {} }; }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function slugify(name) {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
}

// ── Migrate from legacy tags.json ─────────────────────────────────────────────
function migrateLegacy() {
  if (fs.existsSync(DATA_FILE)) return; // already migrated
  if (!fs.existsSync(LEGACY_FILE)) {
    saveData({
      suites: {
        'Uncategorized': {
          id: 'Uncategorized',
          name: 'Uncategorized',
          description: 'Default suite for ungrouped test cases',
          createdAt: new Date().toISOString(),
        }
      },
      testCases: {}
    });
    return;
  }

  const legacy = JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf8'));
  const data   = {
    suites: {
      'Uncategorized': {
        id: 'Uncategorized',
        name: 'Uncategorized',
        description: 'Migrated test cases',
        createdAt: new Date().toISOString(),
      }
    },
    testCases: {}
  };

  for (const [name, tc] of Object.entries(legacy)) {
    data.testCases[name] = { ...tc, id: name, suiteId: 'Uncategorized' };
  }

  saveData(data);
  console.log(`✓ Migrated ${Object.keys(legacy).length} test case(s) from tags.json`);
}

migrateLegacy();

// ══════════════════════════════════════════════════════════════════════════════
//  API — STATUS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/status', (req, res) => {
  res.json({ status: recordStatus, stepCount: liveSteps.length, steps: liveSteps });
});

// ══════════════════════════════════════════════════════════════════════════════
//  API — PLAYWRIGHT RUNNER
// ══════════════════════════════════════════════════════════════════════════════

// List all spec files in test-automation/tests/
app.get('/api/playwright/specs', (req, res) => {
  const specsDir = path.join(TEST_AUTO_DIR, 'tests');
  if (!fs.existsSync(specsDir)) {
    return res.status(404).json({ error: 'test-automation/tests folder not found.', specs: [] });
  }

  function getSpecs(dir, base) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    let specs = [];
    for (const item of items) {
      if (item.isDirectory()) {
        specs = specs.concat(getSpecs(path.join(dir, item.name), base ? `${base}/${item.name}` : item.name));
      } else if (item.name.endsWith('.spec.ts') || item.name.endsWith('.spec.js')) {
        specs.push(base ? `${base}/${item.name}` : item.name);
      }
    }
    return specs;
  }

  try {
    const specs = getSpecs(specsDir, '');
    res.json({ specs });
  } catch (err) {
    res.status(500).json({ error: err.message, specs: [] });
  }
});

// Run Playwright tests — streams output via Server-Sent Events
app.get('/api/playwright/run', (req, res) => {
  const { specs, headed, baseUrl } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  if (!specs) {
    sendEvent({ type: 'done', code: 1, passed: 0, failed: 0, total: 0 });
    return res.end();
  }

  const specList = specs.split(',').map(s => s.trim()).filter(Boolean);

  // Build args: npx playwright test <spec1> <spec2> ... --reporter=list [--headed]
  const args = ['playwright', 'test', ...specList, '--reporter=list'];
  if (headed === 'true') args.push('--headed');

  const env = {
    ...process.env,
    FORCE_COLOR: '0',
    ...(baseUrl ? { BASE_URL: baseUrl } : {})
  };

  sendEvent({ type: 'stdout', text: `▶ npx ${args.join(' ')}\n` });

  const proc = spawn('npx', args, { cwd: TEST_AUTO_DIR, env });

  let passed = 0, failed = 0, total = 0;

  const parseLine = (line) => {
    if (/✓|passed/.test(line)) { passed++; total++; }
    else if (/✗|×|failed/.test(line)) { failed++; total++; }
  };

  proc.stdout.on('data', data => {
    const text = data.toString();
    text.split('\n').forEach(l => parseLine(l));
    sendEvent({ type: 'stdout', text });
  });

  proc.stderr.on('data', data => {
    sendEvent({ type: 'stderr', text: data.toString() });
  });

  proc.on('close', code => {
    sendEvent({ type: 'done', code, passed, failed, total });
    res.end();
  });

  req.on('close', () => {
    try { proc.kill(); } catch (_) {}
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  API — TEST SUITES
// ══════════════════════════════════════════════════════════════════════════════

// GET all suites with their test cases
app.get('/api/suites', (req, res) => {
  const data = loadData();
  const result = Object.values(data.suites).map(suite => ({
    ...suite,
    testCases: Object.values(data.testCases)
      .filter(tc => tc.suiteId === suite.id)
      .map(tc => ({ id: tc.id, name: tc.name, stepCount: tc.stepCount, createdAt: tc.createdAt }))
  }));
  res.json(result);
});

// POST create a new suite
app.post('/api/suites', (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Suite name is required.' });

  const data = loadData();
  const id   = name.trim();
  if (data.suites[id]) return res.status(400).json({ error: `Suite "${name}" already exists.` });

  data.suites[id] = { id, name: name.trim(), description: description || '', createdAt: new Date().toISOString() };
  saveData(data);
  res.json({ success: true, suite: data.suites[id] });
});

// PUT rename a suite
app.put('/api/suites/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const data = loadData();
  if (!data.suites[id]) return res.status(404).json({ error: 'Suite not found.' });

  const newId = name.trim();
  if (newId !== id && data.suites[newId]) return res.status(400).json({ error: 'Name already taken.' });

  data.suites[newId] = { ...data.suites[id], id: newId, name: newId };
  if (newId !== id) {
    delete data.suites[id];
    Object.values(data.testCases).forEach(tc => { if (tc.suiteId === id) tc.suiteId = newId; });
  }
  saveData(data);
  res.json({ success: true });
});

// DELETE a suite and all its test cases
app.delete('/api/suites/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  if (!data.suites[id]) return res.status(404).json({ error: 'Suite not found.' });

  const removed = Object.keys(data.testCases).filter(k => data.testCases[k].suiteId === id).length;
  Object.keys(data.testCases).forEach(k => { if (data.testCases[k].suiteId === id) delete data.testCases[k]; });
  delete data.suites[id];
  saveData(data);
  res.json({ success: true, removedTestCases: removed });
});

// ══════════════════════════════════════════════════════════════════════════════
//  API — TEST CASES
// ══════════════════════════════════════════════════════════════════════════════

// GET a test case (with steps)
app.get('/api/testcases/:id', (req, res) => {
  const data = loadData();
  const tc   = data.testCases[decodeURIComponent(req.params.id)];
  if (!tc) return res.status(404).json({ error: 'Test case not found.' });
  res.json(tc);
});

// PUT rename a test case
app.put('/api/testcases/:id', (req, res) => {
  const id   = decodeURIComponent(req.params.id);
  const { name } = req.body;
  const data = loadData();
  if (!data.testCases[id]) return res.status(404).json({ error: 'Test case not found.' });
  if (name !== id && data.testCases[name]) return res.status(400).json({ error: 'Name already taken.' });

  data.testCases[name] = { ...data.testCases[id], id: name, name };
  if (name !== id) delete data.testCases[id];
  saveData(data);
  res.json({ success: true });
});

// POST move a test case to a different suite
app.post('/api/testcases/:id/move', (req, res) => {
  const id       = decodeURIComponent(req.params.id);
  const { suiteId } = req.body;
  const data     = loadData();
  if (!data.testCases[id])     return res.status(404).json({ error: 'Test case not found.' });
  if (!data.suites[suiteId])   return res.status(404).json({ error: 'Target suite not found.' });

  data.testCases[id].suiteId = suiteId;
  saveData(data);
  res.json({ success: true });
});

// PUT update steps of a test case (from drag-drop / step editor)
app.put('/api/testcases/:id/steps', (req, res) => {
  const id    = decodeURIComponent(req.params.id);
  const { steps } = req.body;
  if (!Array.isArray(steps)) return res.status(400).json({ error: 'steps must be an array.' });
  const data  = loadData();
  if (!data.testCases[id]) return res.status(404).json({ error: 'Test case not found.' });
  data.testCases[id].steps     = steps;
  data.testCases[id].stepCount = steps.length;
  saveData(data);
  res.json({ success: true, stepCount: steps.length });
});

// DELETE a test case
app.delete('/api/testcases/:id', (req, res) => {
  const id   = decodeURIComponent(req.params.id);
  const data = loadData();
  if (!data.testCases[id]) return res.status(404).json({ error: 'Test case not found.' });
  delete data.testCases[id];
  saveData(data);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  API — RECORDING
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/record/start', async (req, res) => {
  if (recorder) return res.status(400).json({ error: 'Already recording. Stop first.' });
  const { testCaseName, suiteId, url } = req.body;
  if (!testCaseName?.trim()) return res.status(400).json({ error: 'Test case name is required.' });
  if (!suiteId?.trim())      return res.status(400).json({ error: 'Suite is required.' });

  const data = loadData();
  if (!data.suites[suiteId]) return res.status(400).json({ error: 'Suite not found.' });

  liveSteps    = [];
  recordStatus = 'recording';

  try {
    recorder = new RecorderEngine(steps => { liveSteps = steps; });
    await recorder.start(url || 'about:blank');
    res.json({ success: true });
  } catch (err) {
    recorder = null; recordStatus = 'idle';
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/record/pause', (req, res) => {
  if (!recorder) return res.status(400).json({ error: 'Not recording.' });
  recorder.pause(); recordStatus = 'paused';
  res.json({ success: true });
});

app.post('/api/record/resume', (req, res) => {
  if (!recorder) return res.status(400).json({ error: 'Not recording.' });
  recorder.resume(); recordStatus = 'recording';
  res.json({ success: true });
});

app.post('/api/record/stop', async (req, res) => {
  if (!recorder) return res.status(400).json({ error: 'Not recording.' });
  const { testCaseName, suiteId } = req.body;
  if (!testCaseName?.trim()) return res.status(400).json({ error: 'Test case name required.' });

  try {
    const steps  = await recorder.stop();
    recorder     = null;
    recordStatus = 'idle';

    if (!steps.length) return res.status(400).json({ error: 'No steps recorded.' });

    const data = loadData();
    const name = testCaseName.trim();
    data.testCases[name] = {
      id: name, name,
      suiteId: suiteId || 'Uncategorized',
      createdAt: new Date().toISOString(),
      stepCount: steps.length,
      steps,
    };
    saveData(data);
    liveSteps = [];
    res.json({ success: true, stepCount: steps.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  API — TEST EXECUTION (Recorder replays)
// ══════════════════════════════════════════════════════════════════════════════

// Run a single test case
app.post('/api/run/testcase/:id', (req, res) => {
  const id   = decodeURIComponent(req.params.id);
  const data = loadData();
  const tc   = data.testCases[id];
  if (!tc) return res.status(404).json({ error: `Test case "${id}" not found.` });

  res.json({ success: true, message: `Running "${id}"...` });
  new PlayerEngine().play([tc]).catch(console.error);
});

// Run all test cases in a suite
app.post('/api/run/suite/:id', (req, res) => {
  const id   = decodeURIComponent(req.params.id);
  const data = loadData();
  if (!data.suites[id]) return res.status(404).json({ error: 'Suite not found.' });

  const tcs = Object.values(data.testCases).filter(tc => tc.suiteId === id);
  if (!tcs.length) return res.status(400).json({ error: 'No test cases in this suite.' });

  res.json({ success: true, message: `Running ${tcs.length} test case(s) in "${id}"...` });
  new PlayerEngine().play(tcs).catch(console.error);
});

// Run selected test cases (in given order)
app.post('/api/run/selected', (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'No test cases selected.' });

  const data = loadData();
  const tcs  = ids.map(id => data.testCases[id]).filter(Boolean);
  if (!tcs.length) return res.status(400).json({ error: 'None of the selected test cases were found.' });

  res.json({ success: true, message: `Running ${tcs.length} test case(s)...` });
  new PlayerEngine().play(tcs).catch(console.error);
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(55));
  console.log('   🤖  RO Test Automation is running!');
  console.log('═'.repeat(55));
  console.log(`   Home          → http://localhost:${PORT}`);
  console.log(`   Test Recorder → http://localhost:${PORT}/recorder`);
  console.log(`   Auto Tests    → http://localhost:${PORT}/playwright`);
  console.log('═'.repeat(55) + '\n');
});
