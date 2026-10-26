/*
 * Portal "Da Análise ao Plano" — o Caderno de Estratégia da empresa.
 * Núcleo inspirado nos portais "Vieses e Decisão", "Entendendo Porter" e "Planejamento Mercadológico",
 * com uma diferença de princípio: NADA sai do computador do participante.
 *
 *   1. As respostas ficam no navegador (localStorage), salvas automaticamente.
 *   2. O botão "Salvar arquivo" baixa o caderno inteiro num .json, que a empresa guarda onde quiser.
 *   3. "Abrir arquivo" carrega esse .json de volta (em outro computador, na Aula 2...).
 * Não há planilha, servidor nem envio de dados. O PDF é gerado pelo próprio navegador (Imprimir › Salvar como PDF).
 *
 * O caderno é um objeto só, com todas as folhas: { formato, v, campos: { chave: texto | true }, atualizado, arquivo }.
 * Cada página grava apenas as chaves que existem nela (data-k), sem tocar nas outras.
 *
 * Modo exemplo (?exemplo no endereço): a página mostra o caderno da AgroSense (assets/js/exemplo-agrosense.js),
 * em memória, sem ler nem gravar o caderno do navegador.
 *
 * API pública: window.WS
 */
(function () {
  'use strict';

  var CFG = window.WS_CONFIG || {};
  var NOME = CFG.NOME || 'Da Análise ao Plano';
  // Prefixo próprio: os portais do professor ficam no mesmo domínio (github.io) e dividem o localStorage.
  var K_CADERNO = 'ws_caderno_v1';
  var FORMATO = 'caderno-estrategia';
  var SCRIPT = document.currentScript;
  var RAIZ = SCRIPT ? new URL('../../', SCRIPT.src).href : '';
  var EXEMPLO = /[?&]exemplo(=|&|$)/.test(location.search);

  /* ---------------- utilidades ---------------- */
  var armazenamentoOk = true;
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { armazenamentoOk = false; return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { armazenamentoOk = false; return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  try { localStorage.setItem('ws_teste', '1'); localStorage.removeItem('ws_teste'); } catch (e) { armazenamentoOk = false; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtHora(ms) {
    if (!ms) return '';
    var d = new Date(Number(ms)), h = new Date();
    var hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === h.toDateString()) return 'hoje às ' + hh;
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' às ' + hh;
  }
  function vazio(v) { return v === undefined || v === null || v === '' || v === false; }
  function slug(t) {
    var s = String(t || '');
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  /* ---------------- o caderno ---------------- */
  function novo() { return { formato: FORMATO, v: 1, campos: {}, atualizado: null, arquivo: null }; }
  var memoria = null;   // modo exemplo
  if (EXEMPLO) {
    memoria = novo();
    memoria.campos = JSON.parse(JSON.stringify((window.WS_EXEMPLO && window.WS_EXEMPLO.campos) || {}));
    memoria.atualizado = Date.now();
  }
  function ler() {
    if (EXEMPLO) return memoria;
    var c = store.get(K_CADERNO, null);
    if (!c || typeof c !== 'object' || !c.campos) c = novo();
    return c;
  }
  function gravar(c) {
    if (EXEMPLO) { memoria = c; return true; }
    return store.set(K_CADERNO, c);
  }
  function campos() { return Object.assign({}, ler().campos); }
  function temDados(c) { return Object.keys((c || ler()).campos).length > 0; }
  function empresa(c) { return String(((c || ler()).campos || {}).f0_empresa || '').trim(); }

  var ouvintes = [];
  function emitir(origem) {
    var c = campos();
    ouvintes.forEach(function (f) { try { f(c, origem); } catch (e) { console.error(e); } });
    atualizarStatus();
  }
  function onMudanca(f) { ouvintes.push(f); }

  /* Grava as chaves de uma página: apaga as que pertencem a ela e põe os valores atuais (só os preenchidos). */
  function gravarPagina(chavesDaPagina, valores) {
    var c = ler(), mudou = false;
    chavesDaPagina.forEach(function (k) { if (k in c.campos && !(k in valores)) { delete c.campos[k]; mudou = true; } });
    Object.keys(valores).forEach(function (k) {
      if (vazio(valores[k])) { if (k in c.campos) { delete c.campos[k]; mudou = true; } return; }
      if (c.campos[k] !== valores[k]) { c.campos[k] = valores[k]; mudou = true; }
    });
    if (!mudou) return false;
    c.atualizado = Date.now();
    if (!gravar(c) && !EXEMPLO) toast('O navegador não deixou guardar as respostas. Use "Salvar arquivo" agora para não perder nada.');
    atualizarStatus();
    return true;
  }

  /* outras abas do mesmo navegador (ex.: Folha 5 aberta numa aba e Folha 6 em outra) */
  window.addEventListener('storage', function (e) {
    if (EXEMPLO || e.key !== K_CADERNO) return;
    emitir('outra-aba');
  });

  /* ---------------- arquivo ---------------- */
  function nomeArquivo(c) {
    var d = new Date();
    var data = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var e = slug(empresa(c));
    return 'caderno-estrategia' + (e ? '-' + e : '') + '-' + data + '.json';
  }
  function baixar(nome, texto, tipo) {
    var blob = new Blob([texto], { type: tipo || 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function salvarArquivo() {
    if (window.WS_PAGINA) window.WS_PAGINA.salvarAgora();
    var c = ler();
    if (!temDados(c)) { toast('O caderno ainda está vazio: preencha alguma folha antes de salvar.'); return false; }
    var conteudo = {
      formato: FORMATO, v: 1, workshop: NOME, salvoEm: new Date().toISOString(),
      empresa: empresa(c), campos: c.campos
    };
    baixar(nomeArquivo(c), JSON.stringify(conteudo, null, 2));
    if (!EXEMPLO) { c.arquivo = Date.now(); gravar(c); }
    atualizarStatus();
    toast(EXEMPLO ? 'Arquivo do exemplo baixado.' : 'Arquivo baixado. Guarde-o: é a cópia do seu caderno que você controla.');
    return true;
  }
  /* Lê e valida o conteúdo de um arquivo. Devolve { campos } ou { erro }. */
  function lerConteudo(texto) {
    var j;
    try { j = JSON.parse(texto); } catch (e) { return { erro: 'Este arquivo não é um caderno válido (o conteúdo não é JSON).' }; }
    if (!j || typeof j !== 'object' || !j.campos || typeof j.campos !== 'object' || Array.isArray(j.campos)) return { erro: 'Este arquivo não é um Caderno de Estratégia.' };
    if (j.formato && j.formato !== FORMATO) return { erro: 'Este arquivo é de outra ferramenta, não do Caderno de Estratégia.' };
    var limpo = {};
    Object.keys(j.campos).forEach(function (k) {
      var v = j.campos[k];
      if (!/^[a-z0-9_]{1,60}$/.test(k)) return;
      if (v === true || typeof v === 'string') limpo[k] = v.length > 20000 ? v.slice(0, 20000) : v;
      else if (typeof v === 'number') limpo[k] = String(v);
    });
    return { campos: limpo, empresa: j.empresa || limpo.f0_empresa || '', salvoEm: j.salvoEm };
  }
  function aplicarArquivo(r) {
    var c = novo();
    c.campos = r.campos;
    c.atualizado = Date.now();
    c.arquivo = Date.now();   // acabou de vir de um arquivo: está em dia com ele
    gravar(c);
    emitir('arquivo');
    toast('Caderno ' + (r.empresa ? 'de ' + r.empresa + ' ' : '') + 'carregado.');
  }
  function abrirArquivo() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        var r = lerConteudo(String(leitor.result || ''));
        if (r.erro) { toast(r.erro); return; }
        if (EXEMPLO) { aplicarArquivo(r); return; }
        var atual = ler();
        if (!temDados(atual)) { aplicarArquivo(r); return; }
        var corpo = abrirModal(
          '<div class="vd-modal-eyebrow"><span class="vd-dot"></span>Abrir arquivo</div>' +
          '<h3>Substituir o caderno deste navegador?</h3>' +
          '<p>Este navegador já tem um caderno' + (empresa(atual) ? ' de <strong>' + esc(empresa(atual)) + '</strong>' : '') +
          ', alterado ' + esc(fmtHora(atual.atualizado)) + '. O arquivo' + (r.empresa ? ' de <strong>' + esc(r.empresa) + '</strong>' : '') +
          (r.salvoEm ? ', salvo ' + esc(fmtHora(Date.parse(r.salvoEm))) : '') + ', vai substituí-lo por inteiro.</p>' +
          (atual.arquivo && atual.arquivo >= (atual.atualizado || 0) ? '' : '<div class="vd-aviso">O caderno atual tem alterações que não estão em nenhum arquivo. Se quiser guardá-las, baixe uma cópia antes.</div>') +
          '<div class="vd-acoes" style="flex-direction:column">' +
            '<button type="button" class="vd-btn vd-btn-ghost" data-a="copia">Baixar uma cópia do caderno atual antes</button>' +
            '<button type="button" class="vd-btn vd-btn-roxo" data-a="substituir">Substituir pelo arquivo</button>' +
          '</div>'
        );
        corpo.querySelector('[data-a=copia]').onclick = function () { salvarArquivo(); };
        corpo.querySelector('[data-a=substituir]').onclick = function () { fecharModal(); aplicarArquivo(r); };
      };
      leitor.readAsText(f, 'utf-8');
    };
    document.body.appendChild(inp); inp.click(); inp.remove();
  }
  function apagar() {
    if (EXEMPLO) { toast('No modo exemplo não há nada salvo neste navegador.'); return; }
    var c = ler();
    var corpo = abrirModal(
      '<div class="vd-modal-eyebrow"><span class="vd-dot"></span>Computador compartilhado?</div>' +
      '<h3>Apagar o caderno deste navegador</h3>' +
      '<p>Remove todas as respostas guardadas neste navegador' + (empresa(c) ? ' (caderno de <strong>' + esc(empresa(c)) + '</strong>)' : '') +
      '. Use ao sair de um computador que outras pessoas vão usar. Não há cópia em lugar nenhum além do arquivo que você baixou.</p>' +
      (temDados(c) && !(c.arquivo && c.arquivo >= (c.atualizado || 0)) ? '<div class="vd-aviso">Há alterações que ainda não estão em nenhum arquivo.</div>' : '') +
      '<div class="vd-acoes" style="flex-direction:column">' +
        '<button type="button" class="vd-btn vd-btn-ghost" data-a="copia">Baixar o arquivo antes</button>' +
        '<button type="button" class="vd-btn vd-btn-perigo" data-a="apagar">Apagar deste navegador</button>' +
      '</div>'
    );
    corpo.querySelector('[data-a=copia]').onclick = function () { salvarArquivo(); };
    corpo.querySelector('[data-a=apagar]').onclick = function () {
      store.del(K_CADERNO);
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('ws_') === 0) localStorage.removeItem(k); }); } catch (e) {}
      fecharModal();
      emitir('apagado');
      toast('Caderno apagado deste navegador.');
    };
  }

  /* ---------------- interface: barra, menu, modal, toast ---------------- */
  var toastEl = null, toastT = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'vd-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 4200);
  }

  var topbar = null;
  function montarTopbar(crumb) {
    if (topbar) return topbar;
    topbar = document.createElement('div');
    topbar.className = 'vd-topbar';
    topbar.innerHTML =
      '<div class="vd-topbar-inner">' +
        '<div class="vd-left">' +
          '<a class="vd-brand" href="' + RAIZ + 'index.html" title="Voltar ao início"><span class="vd-dot"></span><span class="vd-brand-txt">' + esc(NOME) + '</span></a>' +
          (crumb ? '<span class="vd-crumb">' + esc(crumb) + '</span>' : '') +
        '</div>' +
        '<div class="vd-right">' +
          '<button type="button" class="vd-btn vd-btn-claro vd-ajuda" title="Como funciona o caderno"><span class="vd-ajuda-ico" aria-hidden="true">?</span><span class="vd-ajuda-txt">Como funciona</span></button>' +
          '<span class="vd-status" data-estado="local"><span class="vd-status-txt"></span></span>' +
          '<button type="button" class="vd-btn vd-btn-amarelo vd-salvar" data-ws-salvar title="Baixa o caderno inteiro num arquivo .json, no seu computador"><span aria-hidden="true">⤓</span><span class="vd-salvar-txt">Salvar arquivo</span></button>' +
          '<button type="button" class="vd-user" aria-haspopup="true" aria-expanded="false" title="Caderno: abrir, ver completo, apagar"><span class="vd-avatar" aria-hidden="true">≡</span><span class="vd-user-nome">Caderno</span></button>' +
          '<div class="vd-menu" hidden>' +
            '<div class="vd-menu-info"></div>' +
            '<button type="button" data-a="abrir">📂 Abrir um arquivo salvo…</button>' +
            '<button type="button" data-a="salvar">⤓ Salvar arquivo (.json)</button>' +
            '<a href="' + RAIZ + 'caderno.html">▤ Caderno completo e PDF</a>' +
            '<a href="' + RAIZ + 'caderno.html?exemplo">◎ Caderno de exemplo (AgroSense)</a>' +
            '<button type="button" data-a="apagar" class="vd-menu-perigo">✕ Apagar o caderno deste navegador</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertBefore(topbar, document.body.firstChild);
    if (EXEMPLO) {
      document.body.classList.add('modo-exemplo');
      var faixa = document.createElement('div');
      faixa.className = 'ws-faixa-exemplo';
      var sem = location.pathname + location.search.replace(/([?&])exemplo(=[^&]*)?(&|$)/, '$1').replace(/[?&]$/, '') + location.hash;
      faixa.innerHTML = '<div class="vd-topbar-inner"><span><strong>Modo exemplo:</strong> este é o caderno da AgroSense, a empresa fictícia dos guias. Nada do que você mudar aqui é salvo.</span><a href="' + esc(sem) + '">Voltar ao meu caderno →</a></div>';
      topbar.appendChild(faixa);
    }
    topbar.querySelector('.vd-ajuda').onclick = function () { abrirInstrucoes(); };
    topbar.querySelector('[data-ws-salvar]').onclick = function () { salvarArquivo(); };
    var menu = topbar.querySelector('.vd-menu'), bm = topbar.querySelector('.vd-user');
    bm.onclick = function () { menu.hidden = !menu.hidden; bm.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) atualizarStatus(); };
    menu.querySelectorAll('button[data-a]').forEach(function (b) {
      b.onclick = function () {
        menu.hidden = true;
        if (b.dataset.a === 'abrir') abrirArquivo();
        if (b.dataset.a === 'salvar') salvarArquivo();
        if (b.dataset.a === 'apagar') apagar();
      };
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !e.target.closest('.vd-right')) { menu.hidden = true; bm.setAttribute('aria-expanded', 'false'); }
    });
    atualizarStatus();
    return topbar;
  }

  function estadoCaderno() {
    var c = ler();
    if (EXEMPLO) return { estado: 'exemplo', texto: 'Exemplo · nada é salvo' };
    if (!armazenamentoOk) return { estado: 'erro', texto: 'Navegador sem armazenamento: salve o arquivo' };
    if (!temDados(c)) return { estado: 'local', texto: 'Caderno vazio' };
    var emDia = c.arquivo && c.arquivo >= (c.atualizado || 0);
    return emDia
      ? { estado: 'ok', texto: 'Salvo no navegador e no arquivo' }
      : { estado: 'pendente', texto: 'Salvo no navegador · falta o arquivo' };
  }
  function atualizarStatus() {
    if (!topbar) return;
    var st = estadoCaderno(), c = ler();
    var el = topbar.querySelector('.vd-status');
    el.dataset.estado = st.estado;
    el.querySelector('.vd-status-txt').textContent = st.texto;
    el.title = st.texto + (c.atualizado ? ' · última alteração ' + fmtHora(c.atualizado) : '') + (c.arquivo ? ' · arquivo baixado ' + fmtHora(c.arquivo) : '');
    var info = topbar.querySelector('.vd-menu-info');
    info.innerHTML = '<strong>' + (empresa(c) ? esc(empresa(c)) : 'Caderno de Estratégia') + '</strong>' +
      (EXEMPLO ? 'Modo exemplo: nada é salvo.' :
        (c.atualizado ? 'Última alteração ' + esc(fmtHora(c.atualizado)) + '.<br>' : 'Ainda vazio.<br>') +
        (c.arquivo ? 'Arquivo baixado ' + esc(fmtHora(c.arquivo)) + '.' : 'Ainda não foi salvo em arquivo.') +
        '<br><span class="vd-menu-priv">Fica só neste computador: ninguém mais recebe suas respostas.</span>');
  }

  /* ----- modal ----- */
  var modal = null;
  function garantirModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'vd-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="vd-modal-box" role="dialog" aria-modal="true"><button type="button" class="vd-modal-x" aria-label="Fechar">✕</button><div class="vd-modal-corpo"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.vd-modal-x').onclick = fecharModal;
    modal.addEventListener('click', function (e) { if (e.target === modal) fecharModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) fecharModal(); });
    return modal;
  }
  function fecharModal() { if (modal) modal.hidden = true; }
  function abrirModal(html, largo) {
    garantirModal();
    modal.querySelector('.vd-modal-box').classList.toggle('vd-largo', !!largo);
    modal.querySelector('.vd-modal-corpo').innerHTML = html;
    modal.hidden = false;
    var primeiro = modal.querySelector('.vd-acoes .vd-btn');
    if (primeiro) setTimeout(function () { primeiro.focus({ preventScroll: true }); modal.querySelector('.vd-modal-box').scrollTop = 0; }, 30);
    return modal.querySelector('.vd-modal-corpo');
  }

  /* ----- guia de uso ----- */
  function abrirInstrucoes() {
    var item = function (ico, titulo, txt) {
      return '<li class="vd-guia-item"><span class="vd-guia-ico" aria-hidden="true">' + ico + '</span><div><strong>' + titulo + '</strong><p>' + txt + '</p></div></li>';
    };
    var corpo = abrirModal(
      '<div class="vd-modal-eyebrow"><span class="vd-dot"></span>Guia rápido</div>' +
      '<h3>Como funciona o Caderno de Estratégia</h3>' +
      '<p>Em cada bloco do workshop há um <strong>guia</strong> (cartão claro), para consultar, e uma <strong>folha</strong> (cartão azul), onde a sua empresa aplica o conceito logo depois da exposição. As folhas formam uma cadeia: o que você escreve numa aparece nas seguintes.</p>' +
      '<ol class="vd-guia">' +
        item('🔒', 'Suas respostas ficam com você',
          'Não há login, planilha nem servidor. Tudo o que você escreve fica <strong>neste navegador</strong> e no <strong>arquivo</strong> que você baixar. Ninguém, nem o facilitador, recebe as respostas da sua empresa.') +
        item('1', 'O navegador guarda sozinho',
          'Enquanto você escreve, o caderno é guardado automaticamente neste navegador. Pode fechar a página e voltar depois, no mesmo computador e no mesmo navegador.') +
        item('2', 'Salve o arquivo ao final de cada aula',
          'O botão <strong>Salvar arquivo</strong> baixa o caderno inteiro num arquivo <code>.json</code>. É a sua cópia de segurança e o jeito de levar o caderno para outro computador. O indicador no topo avisa: <span class="vd-cor pend">●</span> falta salvar o arquivo, <span class="vd-cor ok">●</span> navegador e arquivo em dia.') +
        item('3', 'Continue em outro computador',
          'No menu <strong>Caderno › Abrir um arquivo salvo</strong>, escolha o <code>.json</code>. O caderno volta exatamente como estava. Traga o arquivo para a Aula 2.') +
        item('4', 'PDF de cada folha e do caderno completo',
          'Cada folha tem o botão <strong>Salvar esta folha em PDF</strong>. O <strong>Caderno completo</strong> junta tudo e abre com o resumo para lançar no sistema do parque. Na janela de impressão, escolha "Salvar como PDF".') +
        item('5', 'Veja o exemplo antes de escrever',
          'Cada passo tem o botão <strong>Ver como a AgroSense fez</strong>, com o nível de detalhe esperado. O caderno inteiro da AgroSense está em <strong>Caderno › Caderno de exemplo</strong>.') +
        item('!', 'Computador compartilhado',
          'Ao terminar num computador que outras pessoas usam, salve o arquivo e use <strong>Caderno › Apagar o caderno deste navegador</strong>. Navegação anônima apaga tudo ao fechar a janela: nela, salve o arquivo com frequência.') +
      '</ol>' +
      '<div class="vd-acoes"><button type="button" class="vd-btn vd-btn-roxo" data-a="ok">Entendi</button></div>',
      true
    );
    corpo.querySelector('[data-a=ok]').onclick = fecharModal;
  }

  /* ---------------- controlador de página com campos ---------------- */
  /*
   * cfg = { crumb, raiz: elemento que contém os [data-k], coletar(): { chave: valor }, aplicar(campos), aoMudar(campos) }
   * O salvamento é automático (0,5 s depois da última alteração) e também ao sair da página.
   */
  function pagina(cfg) {
    montarTopbar(cfg.crumb);
    var t = null;
    function chaves() {
      return Array.prototype.map.call(cfg.raiz.querySelectorAll('[data-k]'), function (el) { return el.dataset.k; });
    }
    function salvarAgora() {
      clearTimeout(t); t = null;
      return gravarPagina(chaves(), cfg.coletar());
    }
    function alterado() {
      clearTimeout(t);
      t = setTimeout(salvarAgora, 500);
    }
    ['input', 'change'].forEach(function (ev) {
      cfg.raiz.addEventListener(ev, function (e) { if (e.target.closest('[data-k]') || e.target.matches('[data-k]')) alterado(); });
    });
    window.addEventListener('pagehide', salvarAgora);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') salvarAgora(); });
    onMudanca(function (c, origem) {
      if (origem === 'outra-aba' && document.hasFocus()) { if (cfg.aoMudar) cfg.aoMudar(c); return; }
      cfg.aplicar(c);
    });
    cfg.aplicar(campos());
    agendarAlturas();
    var api = { salvarAgora: salvarAgora, alterado: alterado };
    window.WS_PAGINA = api;
    return api;
  }

  /* página sem campos (início, guias, caderno completo) */
  function iniciarPagina(opts) {
    opts = opts || {};
    montarTopbar(opts.crumb || '');
  }

  /* ---------- caixas de texto crescem conforme o conteúdo (a altura mínima vem do CSS) ---------- */
  function autoAltura(ta) {
    if (!ta || ta.tagName !== 'TEXTAREA' || ta.closest('.vd-modal')) return;
    if (ta.offsetParent === null) return;
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight + 2) + 'px';
  }
  function autoAlturaTodas() { document.querySelectorAll('textarea').forEach(autoAltura); }
  var tAlt = null;
  function agendarAlturas() { cancelAnimationFrame(tAlt); tAlt = requestAnimationFrame(autoAlturaTodas); }
  document.addEventListener('input', function (e) { autoAltura(e.target); }, true);
  window.addEventListener('resize', agendarAlturas);
  window.addEventListener('afterprint', agendarAlturas);
  window.addEventListener('load', agendarAlturas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendarAlturas);

  window.WS = {
    raiz: RAIZ,
    exemplo: EXEMPLO,
    esc: esc,
    vazio: vazio,
    fmtHora: fmtHora,
    campos: campos,
    caderno: function () { return JSON.parse(JSON.stringify(ler())); },
    empresa: function () { return empresa(); },
    temDados: function () { return temDados(); },
    estado: estadoCaderno,
    lerConteudo: lerConteudo,
    aplicarArquivo: aplicarArquivo,
    salvarArquivo: salvarArquivo,
    abrirArquivo: abrirArquivo,
    apagar: apagar,
    pagina: pagina,
    iniciarPagina: iniciarPagina,
    onMudanca: onMudanca,
    abrirInstrucoes: abrirInstrucoes,
    abrirModal: abrirModal,
    fecharModal: fecharModal,
    toast: toast,
    baixar: baixar,
    agendarAlturas: agendarAlturas
  };
})();
