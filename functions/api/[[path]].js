// ============================================================
// API DO SITE – Cloudflare Pages Functions (substitui o server.js)
// Responde por todas as rotas /api/*
//
// Configuração no painel da Cloudflare (Settings do projeto Pages):
//   KV namespace   DADOS                  → onde ficam imóveis e banner
//   Secret         ADMIN_PASSWORD         → senha do painel admin
//   Secret         CLOUDINARY_CLOUD_NAME
//   Secret         CLOUDINARY_API_KEY
//   Secret         CLOUDINARY_API_SECRET
// ============================================================
import seed from '../../data/properties.json';

const CATEGORIAS   = ['aluguel', 'lojas', 'venda'];
const SESSAO_DIAS  = 7;
const PASTA_FOTOS  = 'nossacasa';
const CONFIG_PADRAO = { banner: 'nossacasa.png' };

export async function onRequest({ request, env, params }) {
  const rota   = (params.path || []).join('/');
  const metodo = request.method;

  try {
    if (!env.DADOS) return json({ error: 'KV "DADOS" não configurado no Cloudflare' }, 500);

    // ── Auth ──────────────────────────────────────────────────
    if (rota === 'login' && metodo === 'POST') {
      if (!env.ADMIN_PASSWORD) return json({ error: 'Senha do admin não configurada no Cloudflare' }, 500);
      const { password } = await request.json().catch(() => ({}));
      if (!password || !(await iguais(password, env.ADMIN_PASSWORD)))
        return json({ error: 'Senha incorreta' }, 401);
      return json({ token: await criarToken(env) });
    }
    if (rota === 'logout' && metodo === 'POST') return json({ ok: true });
    if (rota === 'session' && metodo === 'GET') {
      return (await autorizado(request, env)) ? json({ ok: true }) : naoAutorizado();
    }

    // ── Config pública (banner) ───────────────────────────────
    if (rota === 'config' && metodo === 'GET') return json(await lerConfig(env));

    if (rota === 'banner' && metodo === 'PUT') {
      if (!(await autorizado(request, env))) return naoAutorizado();
      const { url } = await request.json().catch(() => ({}));
      if (!url) return json({ error: 'Nenhuma imagem enviada' }, 400);
      const cfg = await lerConfig(env);
      cfg.banner = url;
      await env.DADOS.put('config', JSON.stringify(cfg));
      return json({ filename: url });
    }

    // ── Imóveis ───────────────────────────────────────────────
    if (rota === 'properties' && metodo === 'GET') return json(await lerDados(env));

    if (rota === 'properties' && metodo === 'POST') {
      if (!(await autorizado(request, env))) return naoAutorizado();
      const { category, ...prop } = await request.json();
      if (!CATEGORIAS.includes(category)) return json({ error: 'Categoria inválida' }, 400);
      const data = await lerDados(env);
      prop.id      = Date.now().toString();
      prop.imagens = prop.imagens || [];
      data[category].push(prop);
      await salvarDados(env, data);
      return json(prop);
    }

    const m = rota.match(/^properties\/([^/]+)\/([^/]+)$/);
    if (m && (metodo === 'PUT' || metodo === 'DELETE')) {
      if (!(await autorizado(request, env))) return naoAutorizado();
      const [, category, id] = m;
      if (!CATEGORIAS.includes(category)) return json({ error: 'Categoria inválida' }, 400);
      const data = await lerDados(env);
      const idx  = data[category].findIndex(p => p.id === id);
      if (idx < 0) return json({ error: 'Não encontrado' }, 404);

      if (metodo === 'DELETE') {
        data[category].splice(idx, 1);
        await salvarDados(env, data);
        return json({ ok: true });
      }
      const { category: _ignorada, ...campos } = await request.json();
      data[category][idx] = { ...data[category][idx], ...campos, id };
      await salvarDados(env, data);
      return json(data[category][idx]);
    }

    // ── Upload de fotos ───────────────────────────────────────
    // O navegador envia as fotos direto para o Cloudinary; aqui só
    // geramos a assinatura que autoriza o envio (vale por 1 hora).
    if (rota === 'upload-signature' && metodo === 'POST') {
      if (!(await autorizado(request, env))) return naoAutorizado();
      const faltando = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(k => !env[k]);
      if (faltando.length)
        return json({ error: `Cloudinary não configurado no Cloudflare (faltando: ${faltando.join(', ')})` }, 500);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await sha1Hex(`folder=${PASTA_FOTOS}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`);
      return json({
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey:    env.CLOUDINARY_API_KEY,
        folder:    PASTA_FOTOS,
        timestamp,
        signature,
      });
    }

    return json({ error: 'Rota não encontrada' }, 404);
  } catch (e) {
    console.error('Erro na API:', e);
    return json({ error: 'Erro interno' }, 500);
  }
}

// ── Dados (KV) ──────────────────────────────────────────────
// Enquanto ninguém salvou nada pelo admin, usa data/properties.json
async function lerDados(env) {
  const data = (await env.DADOS.get('properties', 'json')) || structuredClone(seed);
  for (const c of CATEGORIAS) data[c] = data[c] || [];
  return data;
}
function salvarDados(env, data) {
  return env.DADOS.put('properties', JSON.stringify(data));
}
async function lerConfig(env) {
  return { ...CONFIG_PADRAO, ...((await env.DADOS.get('config', 'json')) || {}) };
}

// ── Sessão do admin ─────────────────────────────────────────
// Token = "<expira>.<assinatura>", assinado com a senha do admin.
// Trocar a senha derruba todas as sessões abertas.
async function criarToken(env) {
  const exp = Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1000;
  return `${exp}.${await hmacHex(env.ADMIN_PASSWORD, `admin:${exp}`)}`;
}
async function autorizado(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const [exp, sig] = (request.headers.get('x-admin-token') || '').split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sig === (await hmacHex(env.ADMIN_PASSWORD, `admin:${exp}`));
}
// Compara as senhas via HMAC para não vazar informação pelo tempo de resposta
async function iguais(a, b) {
  return (await hmacHex('comparacao', a)) === (await hmacHex('comparacao', b));
}

// ── Helpers ─────────────────────────────────────────────────
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
function naoAutorizado() {
  return json({ error: 'Não autorizado' }, 401);
}
const enc = new TextEncoder();
function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hmacHex(chave, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
async function sha1Hex(texto) {
  return hex(await crypto.subtle.digest('SHA-1', enc.encode(texto)));
}
