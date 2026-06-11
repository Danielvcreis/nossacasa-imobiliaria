// ============================================================
// PROPERTIES.JS – carrega e renderiza imóveis dinamicamente
// ============================================================

(async function () {
  // Detecta qual categoria exibir pelo caminho da página
  const path = window.location.pathname;
  const isAluguel = path.includes('aluguel') && !path.includes('lojas');
  const isLojas   = path.includes('aluguel-lojas') || path.includes('lojas');
  const isVenda   = path.includes('venda');
  const isHome    = path === '/' || path.endsWith('index.html') || path.endsWith('/');

  if (!isAluguel && !isLojas && !isVenda && !isHome) return;

  let data;
  try {
    const r = await fetch('/api/properties?_=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error();
    data = await r.json();
  } catch {
    console.warn('properties.js: não foi possível carregar imóveis da API.');
    return;
  }

  if (isHome)    renderFeatured(data);
  if (isAluguel) renderListing('aluguel', data.aluguel || []);
  if (isLojas)   renderListing('lojas',   data.lojas   || []);
  if (isVenda)   renderListing('venda',   data.venda   || []);
})();

// ── Renderiza listagem completa (páginas aluguel/lojas/venda) ─
function renderListing(cat, list) {
  const grid  = document.getElementById('listings-grid');
  const count = document.getElementById('listings-count');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '';
    if (count) count.textContent = 'Nenhum imóvel cadastrado';
    return;
  }

  grid.innerHTML = list.map(p => buildCard(p, cat)).join('');
  if (count) count.textContent = `${list.length} imóvel${list.length !== 1 ? 's' : ''} encontrado${list.length !== 1 ? 's' : ''}`;

  bindFavs();
  initCarousels();
  setTimeout(applyUrlParams, 50);
}

// ── Renderiza destaques na home ───────────────────────────────
function renderFeatured(data) {
  const grid = document.querySelector('.properties-grid');
  if (!grid) return;

  const destaques = [
    ...(data.aluguel || []).filter(p => p.destaque).map(p => ({ p, cat: 'aluguel' })),
    ...(data.venda   || []).filter(p => p.destaque).map(p => ({ p, cat: 'venda'   })),
    ...(data.lojas   || []).filter(p => p.destaque).map(p => ({ p, cat: 'lojas'   })),
  ].slice(0, 4);

  // Se não houver destaques, pega os 4 mais recentes do aluguel
  const items = destaques.length > 0 ? destaques
    : (data.aluguel || []).slice(0, 4).map(p => ({ p, cat: 'aluguel' }));

  if (items.length === 0) return;
  grid.innerHTML = items.map(({ p, cat }) => buildCard(p, cat)).join('');
  bindFavs();
  initCarousels();
}

// ── Monta HTML de um card de imóvel ──────────────────────────
function buildCard(p, cat) {
  const badgeClass = cat === 'venda' ? 'badge-venda' : cat === 'lojas' ? 'badge-comercial' : 'badge-aluguel';
  const badgeText  = cat === 'venda' ? 'Para Venda'  : cat === 'lojas' ? 'Comercial'       : 'Para Alugar';

  const imgs     = (p.imagens || []).filter(Boolean);
  const imgCount = imgs.length;

  // Monta as imagens do carrossel
  let imgHTML;
  if (imgCount === 0) {
    imgHTML = `<div class="property-img-placeholder">🏠</div>`;
  } else if (imgCount === 1) {
    imgHTML = `<img src="/images/${imgs[0]}" alt="${esc(p.titulo)}" class="property-img" loading="lazy" />`;
  } else {
    // Múltiplas fotos: empilhadas com classe slide, primeira visível
    imgHTML = imgs.map((fn, i) =>
      `<img src="/images/${fn}" alt="${esc(p.titulo)} ${i+1}" class="property-img card-slide${i === 0 ? ' slide-active' : ''}" loading="lazy" />`
    ).join('');
    // Dots indicadores
    imgHTML += `<div class="slide-dots">
      ${imgs.map((_, i) => `<span class="slide-dot${i === 0 ? ' active' : ''}"></span>`).join('')}
    </div>`;
  }

  const feats = [];
  if (p.quartos)   feats.push(`<span><i class="fas fa-bed"></i> ${p.quartos}</span>`);
  if (p.banheiros) feats.push(`<span><i class="fas fa-bath"></i> ${p.banheiros}</span>`);
  if (p.vagas)     feats.push(`<span><i class="fas fa-car"></i> ${p.vagas}</span>`);
  if (p.area)      feats.push(`<span><i class="fas fa-vector-square"></i> ${p.area}m²</span>`);
  if (p.elevador !== undefined && p.elevador !== null)
    feats.push(`<span><i class="fas fa-elevator"></i> ${p.elevador ? 'Sim' : 'Não'}</span>`);

  const condParts = [];
  if (p.condominio) condParts.push(`Cond: ${p.condominio}`);
  if (p.iptu)       condParts.push(`IPTU: ${p.iptu}`);

  const priceFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(p.preco || 0);

  const priceHTML = cat === 'venda'
    ? `<p class="property-price">${priceFormatted}</p>`
    : `<p class="property-price">${priceFormatted} <span>/ mês</span></p>`;

  const detailUrl = `imovel.html?id=${p.id}&cat=${cat}`;

  return `
    <div class="property-card"
         data-tipo="${esc(p.tipo)}"
         data-bairro="${esc(p.bairro)}"
         data-quartos="${p.quartos || ''}"
         data-area="${p.area || 0}"
         data-preco="${p.preco || 0}"
         style="cursor:pointer"
         onclick="window.location.href='${detailUrl}'">
      <div class="property-img-wrap">
        ${imgHTML}
        <span class="property-badge ${badgeClass}">${badgeText}</span>
        <button class="property-fav" aria-label="Favoritar" onclick="event.stopPropagation();favToggle(this)"><i class="far fa-heart"></i></button>
      </div>
      <div class="property-body">
        <h3 class="property-name">${esc(p.titulo)}</h3>
        <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${esc(p.bairro)}, ${esc(p.cidade || 'Belo Horizonte')}</p>
        <div class="property-features">${feats.join('')}</div>
        ${condParts.length ? `<div class="property-cond">${condParts.join(' · ')}</div>` : ''}
        ${priceHTML}
      </div>
    </div>`;
}

// ── Favoritar (chamado inline para evitar propagação para o card) ─
function favToggle(btn) {
  btn.classList.toggle('active');
  const icon = btn.querySelector('i');
  if (btn.classList.contains('active')) {
    icon.classList.replace('far', 'fas');
    icon.style.color = '#C0392B';
  } else {
    icon.classList.replace('fas', 'far');
    icon.style.color = '';
  }
}

// ── Bind botão favoritar (fallback para cards estáticos) ──────
function bindFavs() {
  document.querySelectorAll('.property-fav').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active');
      const icon = btn.querySelector('i');
      if (btn.classList.contains('active')) {
        icon.classList.replace('far', 'fas');
        icon.style.color = '#C0392B';
      } else {
        icon.classList.replace('fas', 'far');
        icon.style.color = '';
      }
    });
  });
}

// ── Carrossel automático nos cards ───────────────────────────
function initCarousels() {
  document.querySelectorAll('.property-img-wrap').forEach(wrap => {
    const slides = wrap.querySelectorAll('.card-slide');
    const dots   = wrap.querySelectorAll('.slide-dot');
    if (slides.length < 2) return;

    // Evita inicializar duas vezes no mesmo card
    if (wrap.dataset.carouselInit) return;
    wrap.dataset.carouselInit = '1';

    let cur = 0;

    function goTo(next) {
      slides[cur].classList.remove('slide-active');
      dots[cur]?.classList.remove('active');
      cur = next;
      slides[cur].classList.add('slide-active');
      dots[cur]?.classList.add('active');
    }

    // Troca a foto a cada 3,5 segundos
    // Cada card começa em offset diferente para não trocar tudo ao mesmo tempo
    const offset = Array.from(document.querySelectorAll('.property-img-wrap')).indexOf(wrap) * 700;
    setTimeout(() => {
      setInterval(() => goTo((cur + 1) % slides.length), 3500);
    }, offset % 3500);
  });
}

// ── Lê parâmetros da URL e aplica nos filtros ─────────────────
function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const map = { tipo:'filter-tipo', bairro:'filter-bairro', quartos:'filter-quartos', preco:'filter-preco', area:'filter-area' };
  let hasParam = false;
  Object.entries(map).forEach(([key, elId]) => {
    const val = params.get(key);
    const el  = document.getElementById(elId);
    if (val && el) { el.value = val; hasParam = true; }
  });
  if (hasParam && typeof initFilters === 'function') {
    // Re-inicializa filtros para disparar com os valores pré-preenchidos
    document.getElementById('filter-btn')?.click();
  }
}

function esc(s) {
  return String(s || '').replace(/[<>&"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;' }[c]));
}
