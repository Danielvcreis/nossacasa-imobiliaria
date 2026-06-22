const express    = require('express');
const multer     = require('multer');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const cloudinary = require('cloudinary').v2;

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE   = path.join(ROOT, 'data', 'properties.json');
const CONFIG_FILE = path.join(ROOT, 'data', 'config.json');
const IMAGES_DIR  = path.join(ROOT, 'images');

// ── Cloudinary ────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadToCloud(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'nossacasa', resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve(result.secure_url)
    ).end(buffer);
  });
}

// ── Configuração ──────────────────────────────────────────────
const ADMIN_PASSWORD = 'nossacasa2024'; // altere aqui a senha
let   adminToken     = null;

// ── Multer (memória – Cloudinary faz o armazenamento) ─────────
const upload = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 15 * 1024 * 1024 },
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
app.post('/api/banner', auth, upload.single('banner'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  try {
    const url = await uploadToCloud(req.file.buffer);
    const cfg = readConfig();
    cfg.banner = url;
    writeConfig(cfg);
    res.json({ filename: url });
  } catch (e) {
    console.error('Cloudinary banner error:', e);
    res.status(500).json({ error: 'Erro ao enviar banner' });
  }
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
app.post('/api/upload', auth, upload.array('imagens', 20), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  try {
    const urls = await Promise.all(req.files.map(f => uploadToCloud(f.buffer)));
    res.json({ filenames: urls });
  } catch (e) {
    console.error('Cloudinary upload error:', e);
    res.status(500).json({ error: 'Erro ao enviar imagens' });
  }
});

// ── Deletar imagem ────────────────────────────────────────────
app.delete('/api/images/:filename', auth, async (req, res) => {
  const val = decodeURIComponent(req.params.filename);
  if (!val.startsWith('http')) {
    // Arquivo local (compatibilidade com imagens antigas)
    const fp = path.join(IMAGES_DIR, path.basename(val));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  // Imagens Cloudinary não precisam ser deletadas imediatamente
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
