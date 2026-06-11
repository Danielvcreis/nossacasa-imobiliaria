const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE   = path.join(ROOT, 'data', 'properties.json');
const CONFIG_FILE = path.join(ROOT, 'data', 'config.json');
const IMAGES_DIR  = path.join(ROOT, 'images');

// ── Configuração ──────────────────────────────────────────────
const ADMIN_PASSWORD = 'nossacasa2024'; // altere aqui a senha
let   adminToken     = null;

// ── Multer (upload de imagens) ────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGES_DIR),
    filename:    (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
      const name = `imovel-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      cb(null, name);
    }
  }),
  limits:     { fileSize: 15 * 1024 * 1024 },   // 15 MB por arquivo
  fileFilter: (req, file, cb) =>
    /^image\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Apenas imagens'))
});

// ── Middlewares ───────────────────────────────────────────────
app.use(express.json());
app.use(express.static(ROOT));

// ── Helpers ───────────────────────────────────────────────────
function readData() {
  try   { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { aluguel: [], lojas: [], venda: [] }; }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function readConfig() {
  try   { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return { banner: 'nossacasa.png' }; }
}
function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}
function auth(req, res, next) {
  if (adminToken && req.headers['x-admin-token'] === adminToken) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

// ── Auth ──────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  if (req.body?.password === ADMIN_PASSWORD) {
    adminToken = crypto.randomBytes(32).toString('hex');
    res.json({ token: adminToken });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

app.post('/api/logout', auth, (req, res) => {
  adminToken = null;
  res.json({ ok: true });
});

// ── Config pública (banner, etc.) ────────────────────────────
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(readConfig());
});

// ── Upload do banner ──────────────────────────────────────────
app.post('/api/banner', auth, upload.single('banner'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  const cfg = readConfig();
  cfg.banner = req.file.filename;
  writeConfig(cfg);
  res.json({ filename: req.file.filename });
});

// ── Imóveis: leitura pública ──────────────────────────────────
app.get('/api/properties', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(readData());
});

// ── Imóveis: criar ────────────────────────────────────────────
app.post('/api/properties', auth, (req, res) => {
  const data = readData();
  const { category, ...prop } = req.body;
  if (!data[category]) return res.status(400).json({ error: 'Categoria inválida' });
  prop.id      = Date.now().toString();
  prop.imagens = prop.imagens || [];
  data[category].push(prop);
  writeData(data);
  res.json(prop);
});

// ── Imóveis: atualizar ────────────────────────────────────────
app.put('/api/properties/:category/:id', auth, (req, res) => {
  const data = readData();
  const { category, id } = req.params;
  if (!data[category]) return res.status(400).json({ error: 'Categoria inválida' });
  const idx = data[category].findIndex(p => p.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Não encontrado' });
  data[category][idx] = { ...data[category][idx], ...req.body, id };
  writeData(data);
  res.json(data[category][idx]);
});

// ── Imóveis: deletar ──────────────────────────────────────────
app.delete('/api/properties/:category/:id', auth, (req, res) => {
  const data = readData();
  const { category, id } = req.params;
  if (!data[category]) return res.status(400).json({ error: 'Categoria inválida' });
  const idx = data[category].findIndex(p => p.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Não encontrado' });
  data[category].splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

// ── Upload de imagens ─────────────────────────────────────────
app.post('/api/upload', auth, upload.array('imagens', 20), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  res.json({ filenames: req.files.map(f => f.filename) });
});

// ── Deletar imagem do disco ───────────────────────────────────
app.delete('/api/images/:filename', auth, (req, res) => {
  const fp = path.join(IMAGES_DIR, path.basename(req.params.filename));
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

// ── Inicialização ─────────────────────────────────────────────
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  writeData({ aluguel: [], lojas: [], venda: [] });
}

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   🏠  Nossa Casa Imobiliária          ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`  Site:   http://localhost:${PORT}`);
  console.log(`  Admin:  http://localhost:${PORT}/admin`);
  console.log(`  Senha:  ${ADMIN_PASSWORD}`);
  console.log('\n  Pressione Ctrl+C para parar o servidor\n');
});
