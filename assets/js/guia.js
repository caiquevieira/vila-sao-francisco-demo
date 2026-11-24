/* Busca da home e filtro por categoria nas páginas de grupo.
   Sem JS: a busca leva ao índice e a lista aparece completa. */

const semAcento = (t) =>
  (t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const escapar = (t) =>
  String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const MSG_LOJA = encodeURIComponent('Olá! Encontrei vocês no guia Vila São Francisco.');

function iniciarBusca() {
  const campo = document.querySelector('[data-busca]');
  const caixa = document.querySelector('[data-resultados]');
  const form = document.querySelector('[data-busca-form]');
  
  if (!campo || !caixa || !Array.isArray(window.GUIA)) return;

  const itens = window.GUIA.map((l) => ({ ...l, chave: semAcento(`${l.n} ${l.c} ${l.e} ${l.d || ''}`) }));

  const render = () => {
    const termos = semAcento(campo.value).split(/\s+/).filter(Boolean);
    if (!termos.length) {
      caixa.hidden = true;
      caixa.innerHTML = '';

      return;
    }
    const achados = itens.filter((l) => termos.every((t) => l.chave.includes(t))).slice(0, 8);

    caixa.hidden = false;

    if (!achados.length) {
      caixa.innerHTML =
        '<p class="py-4 text-pedra">Nada encontrado com esse nome. Tente o tipo de comércio, como “padaria”, ou veja o <a class="link" href="#indice">índice do guia</a>.</p>';
      return;
    }

    caixa.innerHTML =
      '<ul class="lojas entra">' +
      achados
        .map((l) => {
          const contato = l.w
            ? `<a href="https://wa.me/${l.w}?text=${MSG_LOJA}" target="_blank" rel="noopener" class="btn btn-whatsapp shrink-0" data-track="whatsapp" data-origem="busca" data-loja="${escapar(l.u.split('#')[1])}">WhatsApp</a>`
            : l.t
              ? `<a href="tel:+${l.t}" class="btn btn-contorno shrink-0" data-track="telefone" data-origem="busca" data-loja="${escapar(l.u.split('#')[1])}">Ligar</a>`
              : '';
          return `<li class="flex items-center justify-between gap-4 py-3">
            <a href="${escapar(l.u)}" class="min-w-0"><span class="block font-bold underline-offset-4 hover:underline">${escapar(l.n)}</span><span class="block truncate text-sm text-pedra">${escapar(l.c)}</span></a>
            ${contato}
          </li>`;
        })
        .join('') +
      '</ul>';
  };

  campo.addEventListener('input', render);
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    render();
  });
  const inicial = new URLSearchParams(location.search).get('q');
  if (inicial) campo.value = inicial;
  if (campo.value) render();
}

function iniciarFiltros() {
  const grupo = document.querySelector('[data-filtros]');
  const lista = document.querySelector('[data-lista]');
  if (!grupo || !lista) return;
  grupo.hidden = false;
  const botoes = grupo.querySelectorAll('[data-filtro]');
  const contagem = document.querySelector('[data-contagem]');
  const textoOriginal = contagem?.textContent;

  botoes.forEach((botao) =>
    botao.addEventListener('click', () => {
      const filtro = botao.dataset.filtro;
      botoes.forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
      let visiveis = 0;
      lista.querySelectorAll(':scope > li').forEach((li) => {
        const mostra = !filtro || li.dataset.categorias.split(' ').includes(filtro);
        li.hidden = !mostra;
        if (mostra) visiveis++;
      });
      lista.classList.remove('entra');
      void lista.offsetWidth; // reinicia a animação
      lista.classList.add('entra');
      if (contagem) contagem.textContent = filtro ? `${visiveis} de ${textoOriginal}` : textoOriginal;
    })
  );
}

/* Banner de destaques: setas, pontos e troca automática (pausa ao passar o mouse, ao focar e no botão).
   Quem pede menos movimento no sistema não recebe a troca automática. */
function iniciarBanner() {
  const raiz = document.querySelector('[data-banner]');
  const trilho = raiz?.querySelector('[data-banner-trilho]');
  const controles = raiz?.querySelector('[data-banner-controles]');
  if (!trilho || !controles) return;
  const slides = [...trilho.children];
  if (slides.length < 2) return;
  controles.hidden = false;

  const pontos = [...controles.querySelectorAll('[data-banner-ir]')];
  const botaoPausa = controles.querySelector('[data-banner-pausa]');
  const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let atual = 0;
  let pausadoPeloUsuario = reduzMovimento;
  let pausadoTemporario = false;
  let timer = null;

  const marcar = (i) => {
    atual = i;
    pontos.forEach((p, k) => p.setAttribute('aria-current', String(k === i)));
    slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
    slides.forEach((s, k) => s.querySelectorAll('a').forEach((a) => (a.tabIndex = k === i ? 0 : -1)));
  };
  const ir = (i) => {
    const alvo = (i + slides.length) % slides.length;
    trilho.scrollTo({ left: slides[alvo].offsetLeft - trilho.offsetLeft, behavior: reduzMovimento ? 'auto' : 'smooth' });
    marcar(alvo);
  };

  const atualizarPausa = () => {
    const parado = pausadoPeloUsuario;
    botaoPausa.setAttribute('aria-label', parado ? 'Retomar a troca automática' : 'Pausar a troca automática');
    botaoPausa.querySelector('[data-icone-pausa]').hidden = parado;
    botaoPausa.querySelector('[data-icone-tocar]').hidden = !parado;
  };
  const agendar = () => {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!pausadoPeloUsuario && !pausadoTemporario && !document.hidden) ir(atual + 1);
    }, 7000);
  };

  controles.querySelector('[data-banner-anterior]').addEventListener('click', () => { ir(atual - 1); agendar(); });
  controles.querySelector('[data-banner-proximo]').addEventListener('click', () => { ir(atual + 1); agendar(); });
  pontos.forEach((p) => p.addEventListener('click', () => { ir(Number(p.dataset.bannerIr)); agendar(); }));
  botaoPausa.addEventListener('click', () => { pausadoPeloUsuario = !pausadoPeloUsuario; atualizarPausa(); });

  // Rolagem por toque/trackpad atualiza os pontos
  let espera;
  trilho.addEventListener('scroll', () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      const i = Math.round(trilho.scrollLeft / trilho.clientWidth);
      if (i !== atual) marcar(Math.max(0, Math.min(slides.length - 1, i)));
    }, 80);
  });

  // Setas do teclado com o foco no trilho
  trilho.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(atual + 1); agendar(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(atual - 1); agendar(); }
  });

  raiz.addEventListener('mouseenter', () => (pausadoTemporario = true));
  raiz.addEventListener('mouseleave', () => (pausadoTemporario = false));
  raiz.addEventListener('focusin', () => (pausadoTemporario = true));
  raiz.addEventListener('focusout', () => (pausadoTemporario = false));

  marcar(0);
  atualizarPausa();
  agendar();
}

iniciarBanner();
iniciarBusca();
iniciarFiltros();
