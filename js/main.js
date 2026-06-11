// ============================================================
// NOSSA CASA IMOBILIÁRIA – MAIN JS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Sticky header shadow ────────────────────────────────────
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 10
      ? '0 4px 24px rgba(0,0,0,0.12)'
      : '0 2px 12px rgba(0,0,0,0.08)';
  });

  // ── Mobile menu ─────────────────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');

  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  document.body.appendChild(overlay);

  function openMenu() {
    nav.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    menuToggle.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    nav.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  menuToggle.addEventListener('click', () => {
    nav.classList.contains('open') ? closeMenu() : openMenu();
  });
  overlay.addEventListener('click', closeMenu);
  nav.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', closeMenu));

  // ── Search tabs ─────────────────────────────────────────────
  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // ── Favorite buttons ─────────────────────────────────────────
  document.querySelectorAll('.property-fav').forEach(btn => {
    btn.addEventListener('click', () => {
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

  // ── Scroll fade-in animation ─────────────────────────────────
  const fadeEls = document.querySelectorAll(
    '.property-card, .why-card, .about-grid > *, .section-title, .section-header'
  );
  fadeEls.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  fadeEls.forEach(el => observer.observe(el));

  // ── Image fallback (placeholder when no image file) ──────────
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', function () {
      const wrap = this.parentElement;

      if (this.classList.contains('hero-img')) {
        this.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.className = 'hero-bg-placeholder';
        wrap.insertBefore(placeholder, this);
        return;
      }

      if (this.classList.contains('property-img')) {
        const icons = ['🏠', '🏡', '🏢', '🏗️'];
        const placeholder = document.createElement('div');
        placeholder.className = 'property-img-placeholder';
        placeholder.innerHTML = icons[Math.floor(Math.random() * icons.length)];
        wrap.replaceChild(placeholder, this);
        return;
      }

      if (this.classList.contains('about-img')) {
        this.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'width:100%;height:100%;background:linear-gradient(135deg,#e9ecef,#dee2e6);display:flex;align-items:center;justify-content:center;font-size:4rem;';
        placeholder.textContent = '🏘️';
        wrap.appendChild(placeholder);
      }
    });
  });

  // ── Filtros de listagem ───────────────────────────────────────
  initFilters();

  // ── WhatsApp popup ────────────────────────────────────────────
  initWhatsAppPopup();

});

// ============================================================
// WHATSAPP POPUP – flutua em todas as páginas
// ============================================================
function initWhatsAppPopup() {
  const PHONE = '5531994300145';
  const MSG   = encodeURIComponent('Olá! Vim pelo site e gostaria de mais informações sobre os imóveis.');

  const html = `
    <div class="wa-popup" id="waPopup" role="dialog" aria-label="Fale conosco pelo WhatsApp">
      <div class="wa-popup-box" id="waBox">
        <button class="wa-popup-close" id="waClose" aria-label="Fechar">✕</button>
        <div class="wa-popup-header">
          <div class="wa-popup-avatar">
            <svg viewBox="0 0 24 24" fill="white" width="26" height="26"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.554 4.1 1.523 5.824L.057 23.926a.5.5 0 0 0 .609.61l6.101-1.466A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.507-5.22-1.389l-.374-.22-3.878.932.947-3.879-.24-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          </div>
          <div class="wa-popup-info">
            <strong>Nossa Casa Imobiliária</strong>
            <span><span class="wa-online-dot"></span>Online agora</span>
          </div>
        </div>
        <div class="wa-popup-body">
          <div class="wa-bubble">
            <p>Olá! 👋</p>
            <p>Como podemos te ajudar? Estamos prontos para te ajudar a encontrar o imóvel ideal!</p>
          </div>
        </div>
        <a class="wa-popup-btn" href="https://wa.me/${PHONE}?text=${MSG}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.554 4.1 1.523 5.824L.057 23.926a.5.5 0 0 0 .609.61l6.101-1.466A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.507-5.22-1.389l-.374-.22-3.878.932.947-3.879-.24-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          Iniciar conversa
        </a>
      </div>
      <button class="wa-fab" id="waFab" aria-label="Abrir WhatsApp">
        <svg class="wa-fab-icon wa-icon-whatsapp" viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.554 4.1 1.523 5.824L.057 23.926a.5.5 0 0 0 .609.61l6.101-1.466A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.507-5.22-1.389l-.374-.22-3.878.932.947-3.879-.24-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        <svg class="wa-fab-icon wa-icon-close" viewBox="0 0 24 24" fill="white" width="22" height="22" style="display:none"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
        <span class="wa-fab-badge" id="waBadge">1</span>
      </button>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const popup  = document.getElementById('waPopup');
  const box    = document.getElementById('waBox');
  const fab    = document.getElementById('waFab');
  const close  = document.getElementById('waClose');
  const badge  = document.getElementById('waBadge');
  const iconWa = fab.querySelector('.wa-icon-whatsapp');
  const iconX  = fab.querySelector('.wa-icon-close');

  let open = false;

  // Abre automaticamente após 4 segundos (apenas 1 vez por sessão)
  if (!sessionStorage.getItem('wa_shown')) {
    setTimeout(() => {
      if (!open) toggle();
      sessionStorage.setItem('wa_shown', '1');
    }, 4000);
  }

  function toggle() {
    open = !open;
    box.classList.toggle('wa-box-open', open);
    iconWa.style.display = open ? 'none' : 'block';
    iconX.style.display  = open ? 'block' : 'none';
    badge.style.display  = open ? 'none' : 'flex';
  }

  fab.addEventListener('click', toggle);
  close.addEventListener('click', () => { open = true; toggle(); });
}

// ============================================================
// FILTROS – funciona em qualquer página com .property-card[data-*]
// ============================================================
function initFilters() {
  const filterTipo    = document.getElementById('filter-tipo');
  const filterBairro  = document.getElementById('filter-bairro');
  const filterQuartos = document.getElementById('filter-quartos');
  const filterArea    = document.getElementById('filter-area');
  const filterPreco   = document.getElementById('filter-preco');
  const filterBtn     = document.getElementById('filter-btn');
  const filterClear   = document.getElementById('filter-clear');
  const noResultsClear = document.getElementById('no-results-clear');
  const countEl       = document.getElementById('listings-count');

  if (!filterTipo && !filterBairro) return; // página sem filtros

  function checkRange(value, range) {
    if (!range) return true;
    const parts = range.split('-');
    if (range.endsWith('+')) {
      return value > parseFloat(range);
    }
    return value >= parseFloat(parts[0]) && value <= parseFloat(parts[1]);
  }

  function checkPreco(price, range) {
    switch (range) {
      // Aluguel residencial
      case '0-1500':       return price <= 1500;
      case '1500-2500':    return price > 1500    && price <= 2500;
      case '2500-4000':    return price > 2500    && price <= 4000;
      case '4000+':        return price > 4000;
      // Aluguel comercial
      case '0-2000':       return price <= 2000;
      case '2000-4000':    return price > 2000    && price <= 4000;
      case '4000-7000':    return price > 4000    && price <= 7000;
      case '7000+':        return price > 7000;
      // Venda
      case '0-200000':     return price <= 200000;
      case '200000-400000':return price > 200000  && price <= 400000;
      case '400000-700000':return price > 400000  && price <= 700000;
      case '700000+':      return price > 700000;
      default:             return true;
    }
  }

  // Faixas de área (m²)
  function checkArea(area, range) {
    if (!area || area === 0) return true; // sem dado de área, sempre exibe
    switch (range) {
      case '0-70':   return area <= 70;
      case '71-150': return area > 70  && area <= 150;
      case '150+':   return area > 150;
      default:       return true;
    }
  }

  function applyFilters() {
    const tipo    = filterTipo    ? filterTipo.value    : '';
    const bairro  = filterBairro  ? filterBairro.value  : '';
    const quartos = filterQuartos ? filterQuartos.value : '';
    const area    = filterArea    ? filterArea.value    : '';
    const preco   = filterPreco   ? filterPreco.value   : '';

    const cards = document.querySelectorAll('.property-card[data-tipo]');
    let visible = 0;

    cards.forEach(card => {
      const cardPreco   = parseFloat(card.dataset.preco  || 0);
      const cardArea    = parseFloat(card.dataset.area   || 0);
      const cardQuartos = card.dataset.quartos || '';

      const ok =
        (!tipo    || card.dataset.tipo   === tipo)    &&
        (!bairro  || card.dataset.bairro === bairro)  &&
        (!quartos || cardQuartos         === quartos)  &&
        (!area    || checkArea(cardArea, area))        &&
        (!preco   || checkPreco(cardPreco, preco));

      card.style.display = ok ? '' : 'none';
      if (ok) visible++;
    });

    if (countEl) {
      countEl.textContent = visible === 0
        ? 'Nenhum imóvel encontrado'
        : `${visible} imóvel${visible !== 1 ? 's' : ''} encontrado${visible !== 1 ? 's' : ''}`;
    }

    const noResults = document.getElementById('no-results');
    if (noResults) noResults.style.display = visible === 0 ? 'flex' : 'none';
  }

  function clearFilters() {
    [filterTipo, filterBairro, filterQuartos, filterArea, filterPreco].forEach(el => {
      if (el) el.value = '';
    });
    applyFilters();
  }

  if (filterBtn) filterBtn.addEventListener('click', applyFilters);
  if (filterClear) filterClear.addEventListener('click', clearFilters);
  if (noResultsClear) noResultsClear.addEventListener('click', clearFilters);

  [filterTipo, filterBairro, filterQuartos, filterArea, filterPreco].forEach(el => {
    if (el) el.addEventListener('change', applyFilters);
  });
}
