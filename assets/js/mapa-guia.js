/* Mapa do guia (home): pinos dos estabelecimentos da região, lista ao lado e filtro por assunto.
   Dados: window.GUIA (assets/js/dados-guia.js, gerado a partir do CSV); só entram os com mp = true.
   O Leaflet (cdnjs) só é baixado quando a seção chega perto da tela. Mapa: OpenStreetMap.
   Mesmo padrão do mapa da comunidade em underlinelab.com.br. */
(function () {
  const secao = document.querySelector('[data-mapa-guia]');
  if (!secao || !Array.isArray(window.GUIA)) return;

  const lista = secao.querySelector('[data-mapa-lista]');
  const filtros = secao.querySelector('[data-mapa-filtros]');
  const contagem = secao.querySelector('[data-mapa-contagem]');
  const tela = secao.querySelector('[data-mapa-tela]');
  const aviso = secao.querySelector('[data-mapa-aviso]');
  const dica = secao.querySelector('[data-mapa-dica]');
  const MSG = encodeURIComponent('Olá! Encontrei vocês no guia Vila São Francisco.');
  const ARVORE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 1.5a5 5 0 0 0-4.8 3.7A4.6 4.6 0 0 0 3.5 9.8a4.5 4.5 0 0 0 1.7 3.5A4.4 4.4 0 0 0 9.4 17H11v4H8.5a1 1 0 0 0 0 2h7a1 1 0 0 0 0-2H13v-4h1.6a4.4 4.4 0 0 0 4.2-3.7 4.5 4.5 0 0 0 1.7-3.5 4.6 4.6 0 0 0-3.7-4.6A5 5 0 0 0 12 1.5z"/></svg>';

  const esc = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const itens = window.GUIA.filter((l) => l.mp).sort((a, b) => a.n.localeCompare(b.n, 'pt-BR'));
  const porSlug = Object.fromEntries(itens.map((l) => [l.s, l]));

  // Endereços iguais (ex.: lojas do mesmo centro comercial): espalha os pinos num pequeno círculo
  const repetidos = {};
  itens.forEach((l) => {
    const k = `${l.la.toFixed(5)},${l.lo.toFixed(5)}`;
    (repetidos[k] = repetidos[k] || []).push(l);
  });
  Object.values(repetidos).forEach((grupo) => {
    if (grupo.length < 2) return;
    grupo.forEach((l, i) => {
      const ang = (2 * Math.PI * i) / grupo.length;
      l.la += 0.00012 * Math.sin(ang);
      l.lo += 0.00014 * Math.cos(ang);
    });
  });

  const rota = (l) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${l.n}, ${l.e}`);
  const cartao = (l) => {
    const contato = l.w
      ? `<a class="btn btn-whatsapp" href="https://wa.me/${l.w}?text=${MSG}" target="_blank" rel="noopener" data-track="whatsapp" data-origem="mapa" data-loja="${esc(l.s)}">WhatsApp</a>`
      : l.t
        ? `<a class="btn btn-whatsapp" href="tel:+${l.t}" data-track="telefone" data-origem="mapa" data-loja="${esc(l.s)}">Ligar</a>`
        : '';
    return `<div class="mapa-cartao">
      <p class="mapa-cartao-cat">${esc(l.c.split(',')[0])}</p>
      <p class="mapa-cartao-nome">${esc(l.n)}</p>
      <p class="mapa-cartao-end">${esc(l.e)}</p>
      <div class="mapa-cartao-acoes">${contato}
        <a class="link" href="${esc(l.u)}">Ver no guia</a>
        <a class="link" href="${rota(l)}" target="_blank" rel="noopener" data-track="como-chegar" data-origem="mapa" data-loja="${esc(l.s)}">Como chegar</a>
      </div></div>`;
  };

  // ---------- Filtros por assunto ----------
  const grupos = {};
  itens.forEach((l) => (grupos[l.g] = (grupos[l.g] || 0) + 1));
  const ordem = Object.keys(grupos).sort((a, b) => grupos[b] - grupos[a]);
  filtros.innerHTML =
    `<button type="button" class="filtro" aria-pressed="true" data-grupo="">Todos (${itens.length})</button>` +
    ordem.map((g) => `<button type="button" class="filtro" aria-pressed="false" data-grupo="${esc(g)}">${esc(g)} (${grupos[g]})</button>`).join('');

  // ---------- Lista ----------
  lista.innerHTML = itens
    .map(
      (l) => `<li data-grupo="${esc(l.g)}"><button type="button" class="mapa-item${l.p ? ' is-parceiro' : ''}" data-slug="${esc(l.s)}">
        <span class="mapa-item-pino" aria-hidden="true">${ARVORE}</span>
        <span class="min-w-0"><span class="mapa-item-nome">${esc(l.n)}</span><span class="mapa-item-cat">${esc(l.c.split(',')[0])}</span></span>
      </button></li>`
    )
    .join('');

  let grupoAtual = '';
  let mapa = null;
  const marcadores = {};
  let ativo = null;

  const visiveis = () => itens.filter((l) => !grupoAtual || l.g === grupoAtual);
  const atualizarContagem = () => {
    const n = visiveis().length;
    contagem.textContent = grupoAtual ? `${n} em ${grupoAtual}` : `${n} endereços no mapa`;
  };

  const marcarAtivo = (slug) => {
    lista.querySelectorAll('.mapa-item').forEach((b) => b.classList.toggle('is-ativo', b.dataset.slug === slug));
    if (ativo && marcadores[ativo]?.getElement()) marcadores[ativo].getElement().classList.remove('is-ativo');
    ativo = slug;
    if (slug && marcadores[slug]?.getElement()) marcadores[slug].getElement().classList.add('is-ativo');
  };

  const aplicarFiltro = (g) => {
    grupoAtual = g;
    filtros.querySelectorAll('[data-grupo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.grupo === g)));
    lista.querySelectorAll(':scope > li').forEach((li) => (li.hidden = Boolean(g) && li.dataset.grupo !== g));
    atualizarContagem();
    if (!mapa) return;
    mapa.closePopup();
    const pontos = [];
    itens.forEach((l) => {
      const m = marcadores[l.s];
      const mostra = !g || l.g === g;
      if (mostra) {
        m.addTo(mapa);
        pontos.push([l.la, l.lo]);
      } else m.remove();
    });
    if (pontos.length) mapa.fitBounds(pontos, { padding: [40, 40], maxZoom: 16 });
  };

  filtros.addEventListener('click', (e) => {
    const b = e.target.closest('[data-grupo]');
    if (b) aplicarFiltro(b.dataset.grupo);
  });

  lista.addEventListener('click', (e) => {
    const b = e.target.closest('.mapa-item');
    if (!b) return;
    const l = porSlug[b.dataset.slug];
    marcarAtivo(l.s);
    if (!mapa) return;
    const m = marcadores[l.s];
    mapa.flyTo([l.la, l.lo], Math.max(mapa.getZoom(), 17), { duration: 0.6 });
    mapa.once('moveend', () => m.openPopup());
    if (window.matchMedia('(max-width: 63.99rem)').matches) tela.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  atualizarContagem();

  // ---------- Mapa ----------
  function iniciarMapa() {
    const L = window.L;
    const ponteiroFino = window.matchMedia('(pointer: fine)').matches;
    mapa = L.map(tela, { scrollWheelZoom: false, dragging: ponteiroFino, tap: false, zoomSnap: 0.5 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(mapa);
    // Roda do mouse só depois de clicar no mapa (não prende a rolagem da página)
    mapa.on('click', () => mapa.scrollWheelZoom.enable());
    tela.addEventListener('mouseleave', () => mapa.scrollWheelZoom.disable());
    // Toque: arrastar com um dedo só depois de tocar no mapa; ao sair da tela, volta a rolar a página
    if (!ponteiroFino) {
      const liberar = () => {
        mapa.dragging.enable();
        dica.hidden = true;
      };
      dica.hidden = false;
      mapa.on('click popupopen', liberar);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((e) => {
          if (e[0].isIntersecting) return;
          mapa.dragging.disable();
          dica.hidden = false;
        }).observe(tela);
      }
    }

    itens.forEach((l) => {
      const icone = L.divIcon({
        className: `mapa-pino${l.p ? ' is-parceiro' : ''}`,
        html: `<span class="mapa-pino-gota">${ARVORE}</span>`,
        iconSize: [30, 38],
        iconAnchor: [15, 36],
        popupAnchor: [0, -32],
      });
      const m = L.marker([l.la, l.lo], { icon: icone, title: l.n, alt: l.n, keyboard: true, riseOnHover: true })
        .bindPopup(cartao(l), { className: 'mapa-popup', maxWidth: 280, minWidth: 240, autoPanPadding: [24, 24] })
        .addTo(mapa);
      m.on('popupopen', () => marcarAtivo(l.s));
      m.on('popupclose', () => ativo === l.s && marcarAtivo(null));
      marcadores[l.s] = m;
    });
    aplicarFiltro(grupoAtual);
    aviso.hidden = true;
  }

  function falhou() {
    aviso.textContent = 'Não foi possível carregar o mapa. A lista ao lado mostra todos os estabelecimentos.';
  }

  function carregarLeaflet() {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    js.onload = () => {
      try {
        iniciarMapa();
      } catch (e) {
        falhou();
      }
    };
    js.onerror = falhou;
    document.head.appendChild(js);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entradas) => {
        if (!entradas[0].isIntersecting) return;
        io.disconnect();
        carregarLeaflet();
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(secao);
  } else carregarLeaflet();
})();
