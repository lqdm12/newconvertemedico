/* ==========================================================================
   Depoimentos — módulo ES, sem dependência

   Uso automático:  <section class="dp" data-depoimentos> ... </section>
   Uso manual:      import { initDepoimentos } from './depoimentos.js';
                    initDepoimentos(el, { autoplay: 5200 });

   Retorna uma API com destroy(), útil em SPA e em hot reload.
   ========================================================================== */

const ESTRELA = 'M12 2.3l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.4 6.1 20.5l1.2-6.6L2.5 9.3l6.6-.9z';
const SETAS = {
  anterior: 'M15 18l-6-6 6-6',
  proximo:  'M9 18l6-6-6-6'
};

export function initDepoimentos(raiz, opcoes = {}) {
  if (!raiz || raiz.dataset.dpPronto) return null;

  const trilho = raiz.querySelector('[data-dp-trilho]');
  const cards  = Array.from(raiz.querySelectorAll('[data-dp-card]'));
  if (!trilho || !cards.length) return null;

  const config = { autoplay: 5200, ...opcoes };
  const semAnimacao = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const limpezas = [];
  const on = (alvo, evento, fn, op) => {
    alvo.addEventListener(evento, fn, op);
    limpezas.push(() => alvo.removeEventListener(evento, fn, op));
  };

  /* ---- estrelas a partir de data-nota ---- */
  cards.forEach(card => {
    const caixa = card.querySelector('[data-dp-estrelas]');
    if (!caixa) return;
    const nota = Math.min(5, Math.max(0, parseInt(caixa.dataset.nota || '5', 10)));
    caixa.innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<svg viewBox="0 0 24 24" ${i < nota ? '' : 'data-vazia'} aria-hidden="true"><path d="${ESTRELA}"/></svg>`
    ).join('');
    caixa.setAttribute('role', 'img');
    caixa.setAttribute('aria-label', `${nota} de 5 estrelas`);
    caixa.setAttribute('data-i18n-label', 'dp_stars');
    caixa.dataset.dpNota = nota;
  });

  /* ---- controles gerados por JS, então não existem sem ele ---- */
  const controles = raiz.querySelector('[data-dp-controles]');
  const pontos = document.createElement('div');
  pontos.className = 'dp-pontos';

  const botaoSeta = (dir, rotulo) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dp-seta';
    b.setAttribute('aria-label', rotulo);
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round"><path d="${SETAS[dir]}"/></svg>`;
    return b;
  };
  const anterior = botaoSeta('anterior', 'Depoimento anterior');
  anterior.setAttribute('data-i18n-label', 'dp_prev');
  const proximo  = botaoSeta('proximo',  'Próximo depoimento');
  proximo.setAttribute('data-i18n-label', 'dp_next');

  const caixaSetas = document.createElement('div');
  caixaSetas.className = 'dp-setas';
  caixaSetas.append(anterior, proximo);

  const listaPontos = cards.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dp-ponto';
    b.setAttribute('aria-label', `Ir para o depoimento ${i + 1}`);
    b.setAttribute('data-i18n-label', 'dp_go');
    b.dataset.dpIndex = i + 1;
    on(b, 'click', () => irPara(i));
    pontos.appendChild(b);
    return b;
  });

  controles?.append(pontos, caixaSetas);

  trilho.tabIndex = 0;
  trilho.setAttribute('role', 'region');
  trilho.setAttribute('aria-label', 'Depoimentos, use as setas do teclado para navegar');
  trilho.setAttribute('data-i18n-label', 'dp_region');

  /* ---- navegação ---- */
  let atual = 0;

  function irPara(i) {
    atual = Math.max(0, Math.min(i, cards.length - 1));
    trilho.scrollTo({
      left: cards[atual].offsetLeft - trilho.offsetLeft,
      behavior: semAnimacao ? 'auto' : 'smooth'
    });
  }

  function sincronizar() {
    listaPontos.forEach((p, i) => p.setAttribute('aria-current', i === atual ? 'true' : 'false'));
    anterior.disabled = atual === 0;
    proximo.disabled  = atual === cards.length - 1;
  }

  const noFim = () =>
    Math.abs(trilho.scrollLeft + trilho.clientWidth - trilho.scrollWidth) < 4;

  const obsCard = new IntersectionObserver(entradas => {
    for (const e of entradas) {
      if (e.isIntersecting && e.intersectionRatio > 0.6) {
        atual = cards.indexOf(e.target);
        sincronizar();
      }
    }
  }, { root: trilho, threshold: [0.6] });
  cards.forEach(c => obsCard.observe(c));

  on(anterior, 'click', () => irPara(atual - 1));
  on(proximo,  'click', () => irPara(atual + 1));
  on(trilho, 'scroll', sincronizar, { passive: true });
  on(window, 'resize', sincronizar);
  on(trilho, 'keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); irPara(atual + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); irPara(atual - 1); }
  });

  /* ---- autoplay ---- */
  let timer = null;
  const ligar = () => {
    if (semAnimacao || timer || !config.autoplay) return;
    timer = setInterval(() => irPara(noFim() ? 0 : atual + 1), config.autoplay);
  };
  const desligar = () => { clearInterval(timer); timer = null; };

  on(raiz, 'mouseenter', desligar);
  on(raiz, 'mouseleave', ligar);
  on(raiz, 'focusin', desligar);
  on(raiz, 'touchstart', desligar, { passive: true });
  on(document, 'visibilitychange', () => document.hidden ? desligar() : ligar());

  /* ---- entrada ---- */
  const obsSecao = new IntersectionObserver((entradas, obs) => {
    for (const e of entradas) {
      if (e.isIntersecting) {
        raiz.dataset.dpVisivel = '';
        ligar();
        obs.disconnect();
      }
    }
  }, { threshold: 0.15 });
  obsSecao.observe(raiz);

  raiz.dataset.dpPronto = '';
  sincronizar();

  return {
    irPara,
    destroy() {
      desligar();
      obsCard.disconnect();
      obsSecao.disconnect();
      limpezas.forEach(fn => fn());
      pontos.remove();
      caixaSetas.remove();
      delete raiz.dataset.dpPronto;
      delete raiz.dataset.dpVisivel;
    }
  };
}

/* ---- auto-init de todas as instâncias da página ---- */
export function initTodos(escopo = document) {
  return Array.from(escopo.querySelectorAll('[data-depoimentos]')).map(el => initDepoimentos(el));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initTodos(), { once: true });
} else {
  initTodos();
}