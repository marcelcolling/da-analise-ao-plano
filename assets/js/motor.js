/*
 * Motor das folhas: monta a página de uma etapa a partir de WS_F.PAGINAS (folhas.js), liga o salvamento
 * (WS.pagina, em portal.js), desenha os componentes práticos e gera o relatório (PDF) da folha e do caderno.
 *
 * Os dados ficam num objeto só (o caderno): { chave: texto | true }. Cada página lê o caderno inteiro (para as
 * referências entre folhas) e grava só as próprias chaves.
 *
 * API: window.WS_M = { iniciar(id), caderno(alvo, campos), status(id, campos), relatorioPagina(esp, campos), completar(campos) }
 */
(function () {
  'use strict';
  var F = window.WS_F, P = F.PAGINAS;
  var esc = window.WS.esc, vazio = window.WS.vazio, seq = F.seq;
  var EX = (window.WS_EXEMPLO && window.WS_EXEMPLO.campos) || null;

  /* ================= utilidades sobre a especificação ================= */
  function filhos(it) { return /^(grupo|caixa|mais|progressivo|porObjetivo|objetivo)$/.test(it.t) ? it.itens : null; }
  function cadaItem(itens, f) {
    (itens || []).forEach(function (it) { f(it); var fs = filhos(it); if (fs) cadaItem(fs, f); });
  }
  /* chaves que contam no progresso (sem calculadas, opcionais e as que não vão para o PDF) */
  function chavesProgresso(esp) {
    var ks = [];
    esp.secoes.forEach(function (s) {
      cadaItem(s.itens, function (it) {
        if (it.k && !it.t && !it.opcional && it.relatorio !== false) ks.push(it.k);
        if (it.t === 'tabela') it.linhas.forEach(function (l) { l.k.forEach(function (k, j) { if (it.cols[j].tipo !== 'calc') ks.push(k); }); });
      });
    });
    return ks;
  }
  /* listas finais: itens marcados à mão ([chave, texto]) e itens conferidos pelo caderno ({ r, auto }) */
  function chavesChecklist(esp) {
    var ks = [];
    esp.secoes.forEach(function (s) { cadaItem(s.itens, function (it) { if (it.t === 'checklist') it.itens.forEach(function (x) { if (Array.isArray(x)) ks.push(x[0]); }); }); });
    return ks;
  }
  function autosChecklist(esp) {
    var fs = [];
    esp.secoes.forEach(function (s) { cadaItem(s.itens, function (it) { if (it.t === 'checklist') it.itens.forEach(function (x) { if (!Array.isArray(x)) fs.push(x.auto); }); }); });
    return fs;
  }
  function autoOk(f, c) { try { return !!f(c); } catch (e) { return false; } }
  function opcoes(op) { return (op || []).map(function (o) { return Array.isArray(o) ? o : [o, o]; }); }
  function rotuloOpcao(op, v) { var o = opcoes(op).filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : v; }
  function dataBR(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v || ''); }
  function textoObjetivo(c, n) { var t = c['f5a_o' + n + '_obj']; return t ? n + ' · ' + t : (n ? 'Objetivo ' + n + ' (apagado na Folha 5A)' : ''); }
  function valorLegivel(def, v, c) {
    if (vazio(v)) return '';
    if (v === true) return '✔';
    var tipo = def && def.tipo;
    if (tipo === 'opcoes') return rotuloOpcao(def.op, v);
    if (tipo === 'data') return dataBR(v);
    if (tipo === 'objetivo') return textoObjetivo(c, Number(v));
    if (tipo === 'indicador') return F.nomeIndicador(c, v);
    return String(v);
  }
  function codigoCurto(e) { return e.codigo.replace(/^Folhas? /, 'F').replace(' e ', '–').replace('Fechamento', 'Fech.'); }
  function curto(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
  function listaRefs(xs) { return xs.map(function (x) { return x.ref; }).join(', '); }
  function br(v) { return esc(v).replace(/\n/g, '<br>'); }
  function urlGuia(ref) { var g = F.GUIAS[ref[0]]; return g ? WS.raiz + g.url + (ref[1] ? '#' + ref[1] : '') : ''; }
  function completar(c) {
    // aplica as colunas calculadas de todas as páginas (para relatórios e para o exemplo)
    var out = Object.assign({}, c);
    F.ORDEM.forEach(function (id) { if (P[id].calcular) Object.assign(out, P[id].calcular(out)); });
    return out;
  }
  function exemplo() { return EX ? completar(EX) : {}; }

  /* ================= SVG: quebra de linha simples ================= */
  function quebrar(texto, max, maxLinhas) {
    var palavras = String(texto || '').replace(/\s+/g, ' ').trim().split(' '), linhas = [], atual = '';
    palavras.forEach(function (p) {
      if (!p) return;
      if ((atual + ' ' + p).trim().length <= max) atual = (atual + ' ' + p).trim();
      else { if (atual) linhas.push(atual); atual = p.length > max ? p.slice(0, max - 1) + '…' : p; }
    });
    if (atual) linhas.push(atual);
    if (linhas.length > maxLinhas) { linhas = linhas.slice(0, maxLinhas); linhas[maxLinhas - 1] = linhas[maxLinhas - 1].replace(/.{0,2}$/, '') + '…'; }
    return linhas;
  }
  function textoSvg(linhas, x, y, alt, attrs) {
    return '<text x="' + x + '" y="' + y + '" ' + (attrs || '') + '>' + linhas.map(function (l, i) {
      return '<tspan x="' + x + '" dy="' + (i ? alt : 0) + '">' + esc(l) + '</tspan>';
    }).join('') + '</text>';
  }

  /* ================= componentes especiais ================= */
  function aviso(ok, texto, tipo) {
    return '<li class="chk-auto ' + (ok ? 'ok' : (tipo || 'alerta')) + '"><span aria-hidden="true">' + (ok ? '✔' : tipo === 'info' ? 'ℹ' : '⚠') + '</span>' + texto + '</li>';
  }
  function listaRadar(c, pref, cod, titulo) {
    var itens = seq(3).map(function (i) { return c[pref + i] ? '<li><b>' + cod + i + '</b> ' + esc(c[pref + i]) + '</li>' : ''; }).join('');
    return '<div class="radar-col"><span class="radar-tit">' + titulo + '</span>' + (itens ? '<ul>' + itens + '</ul>' : '<p class="vazio">Ainda vazio na Folha 1.</p>') + '</div>';
  }

  function svgSistema(c) {
    var acts = seq(6).map(function (i) { return { n: i, t: c['f3b_at' + i], liga: F.numeros(c['f3b_at' + i + '_liga']) }; }).filter(function (a) { return a.t; });
    if (!acts.length && !c.f3b_pos) return '';
    var W = 900, H = 540, cx = 450, cy = 270, pos = {}, h = '';
    acts.forEach(function (a, i) {
      var ang = (-90 + i * 360 / acts.length) * Math.PI / 180;
      pos[a.n] = { x: Math.round(cx + 322 * Math.cos(ang)), y: Math.round(cy + 200 * Math.sin(ang)) };
    });
    // raios até o centro (leves) e ligações de reforço (fortes), sem repetir pares
    acts.forEach(function (a) { h += '<line class="s-raio" x1="' + cx + '" y1="' + cy + '" x2="' + pos[a.n].x + '" y2="' + pos[a.n].y + '"/>'; });
    var feitos = {};
    acts.forEach(function (a) {
      a.liga.forEach(function (b) {
        if (!pos[b] || b === a.n) return;
        var chave = Math.min(a.n, b) + '-' + Math.max(a.n, b);
        if (feitos[chave]) return; feitos[chave] = 1;
        h += '<line class="s-liga" x1="' + pos[a.n].x + '" y1="' + pos[a.n].y + '" x2="' + pos[b].x + '" y2="' + pos[b].y + '"/>';
      });
    });
    var pl = quebrar(c.f3b_pos || 'Posicionamento (escreva acima)', 24, 4);
    h += '<ellipse class="s-centro" cx="' + cx + '" cy="' + cy + '" rx="158" ry="70"/>' +
      textoSvg(pl, cx, cy - (pl.length - 1) * 9 + 5, 18, 'class="s-centro-txt" text-anchor="middle"');
    acts.forEach(function (a) {
      var l = quebrar(a.t, 28, 4), bh = 22 + l.length * 17, p = pos[a.n];
      h += '<g class="s-ativ"><rect x="' + (p.x - 112) + '" y="' + (p.y - bh / 2) + '" width="224" height="' + bh + '" rx="12"/>' +
        '<circle cx="' + (p.x - 112) + '" cy="' + (p.y - bh / 2) + '" r="13"/><text class="s-num" x="' + (p.x - 112) + '" y="' + (p.y - bh / 2 + 4.5) + '" text-anchor="middle">' + a.n + '</text>' +
        textoSvg(l, p.x, p.y - bh / 2 + 24, 17, 'text-anchor="middle"') + '</g>';
    });
    return '<div class="svg-rolagem"><svg class="svg-sistema" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Mapa do sistema de atividades">' + h + '</svg></div>';
  }

  function svgMapa(c) {
    var objs = F.objetivos(c), porN = {};
    objs.forEach(function (o) { porN[o.n] = o; });
    var faixaY = {}, caixas = {}, W = 1000, BH = 156, X0 = 190, AREA = 790, h = '';
    F.PERSPECTIVAS.forEach(function (p, bi) {
      var y = bi * BH;
      faixaY[p[0]] = y;
      h += '<rect class="m-faixa m-faixa-' + bi % 2 + '" x="0" y="' + y + '" width="' + W + '" height="' + BH + '"/>' +
        textoSvg(quebrar(p[1], 17, 2), 16, y + 32, 20, 'class="m-faixa-txt"');
      var nela = objs.filter(function (o) { return o.persp === p[0]; }), k = nela.length;
      if (!k) { h += '<text class="m-vazia" x="' + (X0 + AREA / 2) + '" y="' + (y + BH / 2 + 5) + '" text-anchor="middle">perspectiva vazia</text>'; return; }
      var w = Math.min(240, (AREA - (k - 1) * 16) / k), total = k * w + (k - 1) * 16, x = X0 + (AREA - total) / 2;
      nela.forEach(function (o) {
        var l = quebrar(o.texto, Math.max(10, Math.floor((w - 18) / 7.4)), 4), bh = 34 + l.length * 16, by = y + (BH - bh) / 2;
        caixas[o.n] = { x: x, y: by, w: w, h: bh, cx: x + w / 2, cy: by + bh / 2, faixa: bi };
        h += '<g class="m-obj m-' + (o.tipo === 'POS' ? 'pos' : o.tipo === 'EO' ? 'eo' : 'sem') + '"><rect x="' + x + '" y="' + by + '" width="' + w + '" height="' + bh + '" rx="8"/>' +
          '<text class="m-tag" x="' + (x + 10) + '" y="' + (by + 17) + '">' + esc((o.tipo || '?') + ' · ' + o.n + (o.garg ? ' · ★ gargalo' : '')) + '</text>' +
          textoSvg(l, x + 10, by + 35, 16, '') + '</g>';
        x += w + 16;
      });
    });
    var setas = '';
    objs.forEach(function (o) {
      var a = caixas[o.n]; if (!a) return;
      o.leva.forEach(function (t) {
        var b = caixas[t]; if (!b || t === o.n) return;
        var d;
        if (b.faixa < a.faixa) d = 'M' + a.cx + ',' + a.y + ' C' + a.cx + ',' + (a.y - 34) + ' ' + b.cx + ',' + (b.y + b.h + 34) + ' ' + b.cx + ',' + (b.y + b.h + 3);
        else if (b.faixa > a.faixa) d = 'M' + a.cx + ',' + (a.y + a.h) + ' C' + a.cx + ',' + (a.y + a.h + 34) + ' ' + b.cx + ',' + (b.y - 34) + ' ' + b.cx + ',' + (b.y - 3);
        else {
          var dir = b.cx > a.cx ? 1 : -1, x1 = dir > 0 ? a.x + a.w : a.x, x2 = dir > 0 ? b.x - 3 : b.x + b.w + 3;
          d = 'M' + x1 + ',' + a.cy + ' C' + (x1 + dir * 20) + ',' + (a.cy - 30) + ' ' + (x2 - dir * 20) + ',' + (b.cy - 30) + ' ' + x2 + ',' + b.cy;
        }
        setas += '<path class="m-seta" d="' + d + '" marker-end="url(#m-ponta)"/>';
      });
    });
    var H = F.PERSPECTIVAS.length * BH;
    return '<div class="svg-rolagem"><svg class="svg-mapa" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Mapa estratégico">' +
      '<defs><marker id="m-ponta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>' +
      h + setas + '</svg></div>';
  }
  function analiseMapa(c) {
    var objs = F.objetivos(c), porN = {}, entra = {}, sai = {}, setas = [], invalidas = [], descem = 0;
    objs.forEach(function (o) { porN[o.n] = o; });
    var ordem = {}; F.PERSPECTIVAS.forEach(function (p, i) { ordem[p[0]] = i; });
    objs.forEach(function (o) {
      o.leva.forEach(function (t) {
        if (!porN[t] || t === o.n) { invalidas.push(o.n + '→' + t); return; }
        sai[o.n] = 1; entra[t] = 1; setas.push([o, porN[t]]);
        if (o.persp && porN[t].persp && ordem[porN[t].persp] > ordem[o.persp]) descem++;
      });
    });
    return { objs: objs, setas: setas, invalidas: invalidas, descem: descem,
      isolados: objs.filter(function (o) { return !entra[o.n] && !sai[o.n]; }),
      semPersp: objs.filter(function (o) { return !o.persp; }),
      vazias: F.PERSPECTIVAS.filter(function (p) { return !objs.some(function (o) { return o.persp === p[0]; }); }) };
  }
  function dimsGargalo(c) {
    return F.MATRIZ.slice(0, 5).filter(function (d) { return c['f3a_' + d.id + '_garg']; }).map(function (d) { return d.nome; });
  }
  function criteriosProntidao(c) {
    var objs = F.objetivos(c), inds = F.indicadores(c), as = F.acoes(c), am = analiseMapa(c);
    var pos = objs.filter(function (o) { return o.tipo === 'POS'; }).length;
    var eoGarg = objs.filter(function (o) { return o.tipo === 'EO' && o.garg; }).length;
    var semIndMeta = objs.filter(function (o) { return !o.inds.length || o.inds.some(function (x) { return !x.nome || !x.meta; }); });
    var incompletos = inds.filter(function (x) { return !x.ok; });
    var semAcao = objs.filter(function (o) { return !as.some(function (a) { return a.obj === o.n; }); });
    var lista = function (os) { return os.map(function (o) { return o.n; }).join(', '); };
    return [
      [objs.length >= 6 && objs.length <= 10, 'De 6 a 10 objetivos <small>(hoje: ' + objs.length + ')</small>'],
      [pos >= 2, 'Pelo menos 2 objetivos de posicionamento <small>(hoje: ' + pos + ')</small>'],
      [objs.length > 0 && !am.vazias.length && !am.semPersp.length, 'Todas as perspectivas preenchidas e todo objetivo numa perspectiva' +
        (am.vazias.length ? ' <small>(vazias: ' + am.vazias.map(function (p) { return esc(p[1]); }).join(', ') + ')</small>' : '') +
        (am.semPersp.length ? ' <small>(sem perspectiva: ' + lista(am.semPersp) + ')</small>' : '')],
      [eoGarg >= 1, 'Pelo menos um objetivo de EO ligado à dimensão gargalo'],
      [objs.length > 0 && !semIndMeta.length, 'Cada objetivo com indicador e meta' + (semIndMeta.length && objs.length ? ' <small>(falta em: ' + lista(semIndMeta) + ')</small>' : '')],
      [inds.length > 0 && !incompletos.length, 'Cada indicador com ficha completa, faixas de farol e gatilhos' + (incompletos.length ? ' <small>(falta em: ' + listaRefs(incompletos) + ')</small>' : '')],
      [objs.length > 0 && !semAcao.length, 'Cada indicador com pelo menos uma ação' + (semAcao.length && objs.length ? ' <small>(objetivos sem ação: ' + lista(semAcao) + ')</small>' : '')]
    ];
  }

  function chipsFarol(f) {
    return '<div class="farol-faixas"><span class="fx fx-verde"><b>🟢 Verde</b>' + esc(f.verde) + '</span><span class="fx fx-amarelo"><b>🟡 Amarelo</b>' + esc(f.amarelo) + '</span><span class="fx fx-vermelho"><b>🔴 Vermelho</b>' + esc(f.vermelho) + '</span></div>';
  }
  function faixasTexto(f) { return '🟢 ' + f.verde + ' · 🟡 ' + f.amarelo + ' · 🔴 ' + f.vermelho; }
  /* um indicador no PDF, no exemplo e no resumo para o sistema: uma linha de tabela */
  function linhaIndicador(x) {
    var ficha = [x.formula && 'Fórmula: ' + esc(x.formula), x.unidade && 'Unidade: ' + esc(x.unidade), x.fonte && 'Fonte: ' + esc(x.fonte),
      x.freq && 'Frequência: ' + esc(x.freq), x.pol && esc(x.pol), x.resp && 'Responsável: ' + esc(x.resp)].filter(Boolean).join(' · ');
    var meta = x.meta || x.base ? esc((x.base || '—') + ' → ' + (x.meta || '—') + (x.prazo ? ' (' + x.prazo + ')' : '')) : '';
    var f = x.faixas && !x.faixas.erro ? x.faixas : null;
    return '<tr><th>' + esc(x.ref + ' · ' + (x.nome || 'indicador sem nome')) +
      (x.tipo || x.vaid ? '<small>' + esc([x.tipo, x.vaid ? 'passa no teste da vaidade' : ''].filter(Boolean).join(' · ')) + '</small>' : '') + '</th><td>' +
      [ficha, meta && 'Linha de base → meta: ' + meta,
        f ? 'Meta do período: ' + esc(F.fmtNum(f.meta, x.unidade)) + ' · ' + esc(faixasTexto(f)) : '',
        x.gatAm && '🟡 Gatilho: ' + br(x.gatAm), x.gatVerm && '🔴 Gatilho: ' + br(x.gatVerm)].filter(Boolean).join('<br>') + '</td></tr>';
  }
  function cabObjetivo(o) {
    return '<div class="r-obj-cab"><span class="r-obj-n">' + o.n + '</span><strong>' + esc(o.texto) + '</strong><span class="r-obj-tipo ' + (o.tipo === 'POS' ? 'pos' : 'eo') + '">' + esc(o.tipo || '—') + (o.garg ? ' · gargalo' : '') + '</span></div>';
  }
  function relIndicadores(c) {
    return F.objetivos(c).filter(function (o) { return o.inds.length; }).map(function (o) {
      return '<div class="r-obj">' + cabObjetivo(o) + '<table class="r-tab"><tbody>' + o.inds.map(linhaIndicador).join('') + '</tbody></table></div>';
    }).join('');
  }
  /* estado de um objetivo no passo 2: sem indicador, falta algo, completo */
  function estadoObjetivo(o) { return !o.inds.length ? 'vazio' : o.inds.every(function (x) { return x.ok; }) ? 'ok' : 'andamento'; }

  var ESPECIAIS = {
    radar: {
      atualizar: function (el, c) {
        el.innerHTML = '<span class="esp-rot">Seu radar (Folha 1), para cruzar</span><div class="radar">' +
          listaRadar(c, 'f1_f', 'F', 'Forças') + listaRadar(c, 'f1_q', 'f', 'Fraquezas') + listaRadar(c, 'f1_o', 'O', 'Oportunidades') + listaRadar(c, 'f1_a', 'A', 'Ameaças') + '</div>';
      }
    },
    matriz: {
      atualizar: function (el, c) {
        var h = '<span class="esp-rot">Matriz de Maturidade · o estágio marcado fica em amarelo; o próximo, tracejado</span><div class="mat-wrap"><table class="mat"><thead><tr><th>Dimensão</th>' +
          F.ESTAGIOS.map(function (e) { return '<th>' + e + '</th>'; }).join('') + '</tr></thead><tbody>';
        F.MATRIZ.forEach(function (d) {
          var at = F.ESTAGIOS.indexOf(c['f3a_' + d.id + '_est']);
          h += '<tr' + (c['f3a_' + d.id + '_garg'] ? ' class="mat-garg"' : '') + '><th>' + d.nome + (c['f3a_' + d.id + '_garg'] ? ' <span class="mat-tag">gargalo</span>' : '') + '</th>' +
            d.itens.map(function (t, i) { return '<td class="' + (i < at ? 'feito' : i === at ? 'atual' : i === at + 1 ? 'proximo' : '') + '" data-label="' + F.ESTAGIOS[i] + '">' + esc(t) + '</td>'; }).join('') + '</tr>';
          // dica do próximo passo no campo da tabela
          var campo = document.querySelector('#app [data-k="f3a_' + d.id + '_prox"]');
          if (campo) campo.placeholder = at < 0 ? 'Escolha o estágio atual para ver o próximo passo' : at >= 4 ? 'Já no último estágio: consolidar o que existe' : 'Próximo estágio (' + F.ESTAGIOS[at + 1] + '): ' + d.itens[at + 1];
        });
        el.innerHTML = h + '</tbody></table></div>';
      }
    },
    sistema: {
      atualizar: function (el, c) {
        var s = svgSistema(c);
        el.innerHTML = s ? '<span class="esp-rot">O desenho do seu sistema de atividades · linhas fortes = atividades que se reforçam</span>' + s : '<p class="vazio">Escreva o posicionamento e as atividades para ver o desenho do sistema.</p>';
      },
      relatorio: function (c) { var s = svgSistema(c); return s ? '<div class="r-svg">' + s + '</div>' : ''; }
    },
    bcg: {
      html: function (c) {
        var q = { '⭐ Estrela': [], '❓ Interrogação': [], '🐄 Vaca leiteira': [], '🍍 Abacaxi': [] };
        seq(5).forEach(function (i) {
          var p = 'f4_bcg' + i + '_', qd = F.PAGINAS.bloco3.calcular(c)[p + 'quad'];
          if (qd && c[p + 'item']) q[qd].push('<li><b>' + i + '</b> ' + esc(c[p + 'item']) + (c[p + 'dec'] ? ' <em>→ ' + esc(c[p + 'dec']) + '</em>' : '') + '</li>');
        });
        var cel = function (nome, cls) { return '<div class="q2-cel ' + cls + '"><span class="q2-nome">' + nome + '</span><ul>' + q[nome].join('') + '</ul></div>'; };
        return '<div class="q2 q2-bcg"><span class="q2-eixo q2-y">Crescimento do mercado ↑</span><span class="q2-eixo q2-x">← Posição competitiva forte · fraca →</span>' +
          cel('⭐ Estrela', 'q-a') + cel('❓ Interrogação', 'q-b') + cel('🐄 Vaca leiteira', 'q-c') + cel('🍍 Abacaxi', 'q-d') + '</div>';
      },
      atualizar: function (el, c) { el.innerHTML = '<span class="esp-rot">Seu portfólio na matriz</span>' + ESPECIAIS.bcg.html(c); },
      relatorio: function (c) { return seq(5).some(function (i) { return c['f4_bcg' + i + '_item']; }) ? ESPECIAIS.bcg.html(c) : ''; }
    },
    ansoff: {
      html: function (c) {
        var cel = function (nome, sub, cls) {
          var marcas = (c.f4_ans_hoje === nome ? '<span class="q2-marca hoje">Hoje</span>' : '') + (c.f4_ans_vetor === nome ? '<span class="q2-marca vetor">Vetor prioritário</span>' : '');
          return '<div class="q2-cel ' + cls + (marcas ? ' marcada' : '') + '"><span class="q2-nome">' + nome + '</span><small>' + sub + '</small>' + marcas + '</div>';
        };
        return '<div class="q2 q2-ansoff"><span class="q2-eixo q2-x">Mercados atuais · novos →</span><span class="q2-eixo q2-y">Produtos atuais · novos ↓</span>' +
          cel('Penetração de mercado', 'mais do mesmo, para os mesmos · menor risco', 'r1') + cel('Desenvolvimento de mercado', 'mesmo produto, novos clientes, regiões ou setores', 'r2') +
          cel('Desenvolvimento de produto', 'coisas novas para os clientes atuais', 'r2') + cel('Diversificação', 'produto novo para mercado novo · maior risco', 'r3') + '</div>';
      },
      atualizar: function (el, c) {
        var alertas = [];
        var v = c.f4_ans_vetor;
        if (v === 'Diversificação' && c.f0_perfil === 'Incubada') alertas.push('Diversificar cedo demais é comum em incubadas. Já domina o mercado atual? A operação aguenta?');
        if ((v === 'Desenvolvimento de mercado' || v === 'Diversificação') && c.f3a_operacao_est === 'Entender') alertas.push('A Operação está em "Entender" (Folha 3A). Crescer exige base: a operação aguenta mais mercados?');
        if (v === 'Diversificação' && /^(Entender|Estruturar)$/.test(c.f3a_estrategia_est || '')) alertas.push('Na linha Estratégia, "Ampliação do modelo de negócio" e "Estratégia de expansão" aparecem só a partir de "Desenvolver".');
        el.innerHTML = ESPECIAIS.ansoff.html(c) + (alertas.length ? '<ul class="chk-auto-lista">' + alertas.map(function (a) { return aviso(false, esc(a)); }).join('') + '</ul>' : '');
      },
      relatorio: function (c) { return c.f4_ans_hoje || c.f4_ans_vetor ? ESPECIAIS.ansoff.html(c) : ''; }
    },
    direcoes: {
      atualizar: function (el, c) {
        var objs = F.objetivos(c), g = dimsGargalo(c), livre = seq(F.N_OBJ).some(function (i) { return !c['f5a_o' + i + '_obj']; });
        // cada direção pode ir, com um clique, para a próxima linha livre da tabela de objetivos
        var item = function (cod, texto, tipo, garg) {
          if (!texto) return '';
          var ja = objs.filter(function (o) { return o.texto.trim().toLowerCase() === String(texto).trim().toLowerCase(); })[0];
          return '<li><b>' + cod + '</b> ' + esc(texto) + (ja ? ' <span class="dir-usada">✓ objetivo ' + ja.n + '</span>'
            : livre ? ' <button type="button" class="dir-usar" data-usar="' + esc(texto) + '" data-tipo="' + (tipo || '') + '"' + (garg ? ' data-garg="1"' : '') + ' title="Levar para a próxima linha livre dos objetivos" aria-label="Levar para os objetivos: ' + esc(texto) + '">＋</button>' : '') + '</li>';
        };
        var tows = [['FO', 'f2_fo1'], ['FO', 'f2_fo2'], ['FA', 'f2_fa1'], ['FA', 'f2_fa2'], ['fO', 'f2_wo1'], ['fO', 'f2_wo2'], ['fA', 'f2_wa1'], ['fA', 'f2_wa2']].map(function (x) { return item(x[0], c[x[1]]); }).join('');
        var eo = seq(3).map(function (i) { var d = c['f3a_eo' + i + '_dim']; return item('EO' + (d ? ' · ' + esc(d) : ''), c['f3a_eo' + i], 'EO', d && g.indexOf(d) >= 0); }).join('');
        var pos = item('POS', c.f3b_pos, 'POS') + item('Ansoff', c.f4_ans_vetor) + item('Folha 4', c.f4_int_direcao);
        var col = function (t, l, f) { return '<div class="radar-col"><span class="radar-tit">' + t + '</span>' + (l ? '<ul>' + l + '</ul>' : '<p class="vazio">Ainda vazio na ' + f + '.</p>') + '</div>'; };
        el.innerHTML = '<span class="esp-rot">As direções que você já tem · ＋ leva a direção para a tabela de objetivos</span><div class="radar radar-3">' +
          col('TOWS (Folha 2)', tows, 'Folha 2') + col('Eficácia operacional (Folha 3A)', eo + (g.length ? '<li class="garg">★ Gargalo: ' + esc(g.join(', ')) + '</li>' : ''), 'Folha 3A') +
          col('Posicionamento e crescimento (3B e 4)', pos, 'Folha 3B') + '</div>';
      }
    },
    validador: {
      atualizar: function (el, c) {
        var objs = F.objetivos(c);
        var pos = objs.filter(function (o) { return o.tipo === 'POS'; }).length;
        var eoG = objs.filter(function (o) { return o.tipo === 'EO' && o.garg; }).length;
        var semTipo = objs.filter(function (o) { return !o.tipo; }).map(function (o) { return o.n; });
        var g = dimsGargalo(c);
        el.innerHTML = '<span class="esp-rot">Conferência automática</span><ul class="chk-auto-lista">' +
          aviso(objs.length >= 6 && objs.length <= 10, 'De 6 a 10 objetivos <small>(hoje: ' + objs.length + ')</small>') +
          aviso(pos >= 2, 'Pelo menos 2 de posicionamento (POS) <small>(hoje: ' + pos + ')</small>') +
          aviso(eoG >= 1, 'Pelo menos 1 de EO que ataca o gargalo' + (g.length ? ' <small>(gargalo na Folha 3A: ' + esc(g.join(', ')) + ')</small>' : ' <small>(marque o gargalo na Folha 3A)</small>')) +
          (semTipo.length ? aviso(false, 'Marque EO ou POS nos objetivos ' + semTipo.join(', ')) : '') +
          '</ul>' + (objs.length ? '<a class="seguir-dentro" href="#s-indicadores">Objetivos escritos? Siga para os indicadores de cada um ↓</a>' : '');
      }
    },
    /* o que ainda falta num indicador (no topo de cada um, no passo 2) */
    indEstado: {
      atualizar: function (el, c, it) {
        var m = String(it.n).split('.'), i = Number(m[0]), j = Number(m[1]), x = F.indicadores(c, i).filter(function (y) { return y.j === j; })[0];
        if (!x) { el.innerHTML = '<p class="ind-estado">Comece pelo nome do indicador.</p>'; return; }
        el.innerHTML = x.ok ? '<p class="ind-estado ok">✔ Indicador completo: ficha, meta, farol e gatilhos.</p>'
          : '<p class="ind-estado">Falta: ' + esc(x.falta.join(', ')) + (x.faixas && x.faixas.erro ? (x.falta.length ? '; ' : '') + 'ajustar os % do farol' : '') + '.</p>';
      }
    },
    /* as faixas de um indicador, calculadas com os % que a empresa escolheu */
    faixas: {
      atualizar: function (el, c, it) {
        var m = String(it.n).split('.'), i = m[0], j = m[1], f = F.faixas(c, i, j), p = 'f5a_o' + i + '_i' + j + '_';
        if (!f) { el.innerHTML = '<p class="vazio">Escreva a meta do período e os % do amarelo e do vermelho: as faixas aparecem aqui.</p>'; return; }
        if (f.erro) { el.innerHTML = '<ul class="chk-auto-lista">' + aviso(false, esc(f.erro)) + '</ul>'; return; }
        el.innerHTML = chipsFarol(f) + (c[p + 'pol'] ? '' : '<p class="farol-info falta">Polaridade não escolhida: as faixas acima consideram "quanto maior, melhor".</p>');
      }
    },
    /* painel de controle (Folha 5B): todos os indicadores numa tabela; cada linha abre a aba do objetivo */
    painel: {
      atualizar: function (el, c) {
        var objs = F.objetivos(c), inds = F.indicadores(c);
        if (!inds.length) { el.innerHTML = '<p class="vazio">O painel de controle (Folha 5B) se monta aqui, com os indicadores de todos os objetivos.</p>'; return; }
        var ok = inds.filter(function (x) { return x.ok; }).length;
        var linhas = objs.map(function (o) {
          if (!o.inds.length) return '<tr class="painel-falta"><td><button type="button" class="painel-ir" data-obj-sel="' + o.n + '">' + o.n + '</button></td><td colspan="5">' + esc(curto(o.texto, 70)) + ' <b>· sem indicador</b></td></tr>';
          return o.inds.map(function (x) {
            var f = x.faixas && !x.faixas.erro ? x.faixas : null;
            return '<tr><td><button type="button" class="painel-ir" data-obj-sel="' + o.n + '" title="Abrir o objetivo ' + o.n + '">' + x.ref + '</button></td><td>' + esc(x.nome || 'sem nome') + (x.tipo ? ' <small>' + esc(x.tipo.toLowerCase()) + '</small>' : '') + '</td>' +
              (f ? '<td class="fx-verde">' + esc(f.verde) + '</td><td class="fx-amarelo">' + esc(f.amarelo) + '</td><td class="fx-vermelho">' + esc(f.vermelho) + '</td>' : '<td colspan="3" class="painel-sem">faixas ainda não definidas</td>') +
              '<td>' + (x.ok ? '<span class="painel-ok">✔ completo</span>' : '<span class="painel-pend">falta ' + x.falta.length + (x.falta.length === 1 ? ' item' : ' itens') + '</span>') + '</td></tr>';
          }).join('');
        }).join('');
        el.innerHTML = '<span class="esp-rot">Seu painel de controle (Folha 5B) · ' + ok + ' de ' + inds.length + ' indicadores completos · clique no número para abrir o objetivo</span>' +
          '<div class="r-tab-wrap"><table class="painel-tab"><thead><tr><th>Nº</th><th>Indicador</th><th>🟢 Verde</th><th>🟡 Amarelo</th><th>🔴 Vermelho</th><th>Situação</th></tr></thead><tbody>' + linhas + '</tbody></table></div>';
      }
    },
    priorizacao: {
      atualizar: function (el, c) {
        var as = F.acoes(c), objs = F.objetivos(c), q = { 'Fazer já': [], 'Planejar': [], 'Encaixar': [], 'Descartar': [] };
        if (!as.length) { el.innerHTML = '<p class="vazio">Escreva as ações e classifique impacto e esforço: elas aparecem aqui, na matriz, com a conferência do limite de ações em andamento.</p>'; return; }
        as.forEach(function (a) { if (a.prio) q[a.prio].push('<li title="' + esc(a.acao) + '"><b>' + a.n + '</b> ' + esc(a.acao.length > 60 ? a.acao.slice(0, 58) + '…' : a.acao) + '</li>'); });
        var cel = function (nome, sub, cls) { return '<div class="q2-cel ' + cls + '"><span class="q2-nome">' + nome + ' <em>' + q[nome].length + '</em></span><small>' + sub + '</small><ul>' + q[nome].join('') + '</ul></div>'; };
        var andamento = q['Fazer já'].length + q['Planejar'].length;
        var semAcao = objs.filter(function (o) { return !as.some(function (a) { return a.obj === o.n; }); }).map(function (o) { return o.n; });
        var demais = objs.filter(function (o) { return as.filter(function (a) { return a.obj === o.n; }).length > 3; }).map(function (o) { return o.n; });
        var semObj = as.filter(function (a) { return !a.obj; }).map(function (a) { return a.n; });
        var semAlav = as.filter(function (a) { return !a.alav || !a.ind; }).map(function (a) { return a.n; });
        var painel = F.indicadores(c).filter(function (x) { return !as.some(function (a) { return a.obj === x.obj; }); }).map(function (x) { return x.nome || 'indicador ' + x.ref; });
        var naoMovidos = F.indicadores(c).filter(function (x) { return as.some(function (a) { return a.obj === x.obj; }) && !as.some(function (a) { return a.ind === x.ref; }); }).map(function (x) { return x.nome || x.ref; });
        el.innerHTML = '<span class="esp-rot">Impacto × esforço</span><div class="q2 q2-prio"><span class="q2-eixo q2-x">Esforço baixo · alto →</span><span class="q2-eixo q2-y">Impacto alto · baixo ↓</span>' +
          cel('Fazer já', 'impacto alto, esforço baixo', 'q-a') + cel('Planejar', 'dividir em etapas, garantir recursos', 'q-b') + cel('Encaixar', 'se sobrar tempo', 'q-c') + cel('Descartar', 'lista de espera', 'q-d') + '</div>' +
          '<ul class="chk-auto-lista">' +
          aviso(andamento <= 8, 'Ações em andamento ao mesmo tempo (Fazer já + Planejar): <b>' + andamento + '</b> <small>(referência: no máximo 6 a 8)</small>') +
          aviso(objs.length > 0 && !semAcao.length, 'Todo objetivo tem pelo menos uma ação' + (semAcao.length ? ' <small>(sem ação: ' + semAcao.join(', ') + ')</small>' : '')) +
          (demais.length ? aviso(false, 'Mais de 3 ações nos objetivos ' + demais.join(', ') + ': capacidade de execução é o recurso mais escasso') : '') +
          (semObj.length ? aviso(false, 'Escolha o objetivo das ações ' + semObj.join(', ')) : '') +
          (semAlav.length ? aviso(false, 'Teste da alavanca incompleto nas ações ' + semAlav.join(', ') + ' (indicador e "em quanto e em quanto tempo")') : '') +
          (painel.length ? aviso(false, 'Indicadores do painel sem ação: ' + esc(painel.join(', ')) + '. Indicador sem ação não tem como sair do vermelho.') : '') +
          (naoMovidos.length ? aviso(false, 'Nenhuma ação aponta diretamente para: ' + esc(naoMovidos.join(', ')) + '. Tudo bem se as ações do mesmo objetivo também o movem.', 'info') : '') +
          '</ul>';
      },
      relatorio: function (c) { return F.acoes(c).length ? '<div class="r-prio">' + ESPECIAIS.priorizacao.htmlRel(c) + '</div>' : ''; },
      htmlRel: function (c) {
        var as = F.acoes(c);
        return ['Fazer já', 'Planejar', 'Encaixar', 'Descartar'].map(function (p) {
          var l = as.filter(function (a) { return a.prio === p; });
          return l.length ? '<p><b>' + p + ':</b> ' + l.map(function (a) { return a.n; }).join(', ') + '</p>' : '';
        }).join('');
      }
    },
    cadeia: {
      atualizar: function (el, c) {
        var n = Number(c.fc_obj);
        if (!n) { el.innerHTML = '<p class="vazio">Escolha um objetivo para ver a cadeia dele.</p>'; return; }
        el.innerHTML = ESPECIAIS.cadeia.html(c, n);
      },
      html: function (c, n) {
        var o = F.objetivos(c).filter(function (x) { return x.n === n; })[0];
        if (!o) return '<p class="vazio">Este objetivo não existe mais na Folha 5A.</p>';
        var is = o.inds, as = F.acoes(c).filter(function (a) { return a.obj === n; });
        var elo = function (rot, val, falta) { return '<li class="elo' + (val ? '' : ' quebra') + '"><span class="elo-rot">' + rot + '</span><span class="elo-val">' + (val || '<b>falta</b> · ' + falta) + '</span></li>'; };
        var nome = function (x) { return esc(x.nome || 'indicador ' + x.ref); };
        var metas = is.filter(function (x) { return x.meta; }).map(function (x) { return nome(x) + ': ' + esc((x.base ? x.base + ' → ' : '') + x.meta + (x.prazo ? ' (' + x.prazo + ')' : '')); }).join('<br>');
        var farol = is.some(function (x) { return x.faixas && !x.faixas.erro; }) ? is.map(function (x) {
          return nome(x) + (x.faixas && !x.faixas.erro ? ': ' + esc(faixasTexto(x.faixas)) : ' (sem faixas: falta definir o farol na Folha 5B)');
        }).join('<br>') : '';
        return '<ol class="cadeia">' +
          elo('Direção', esc(c.fc_direcao || ''), 'escreva acima de onde ele veio') +
          elo('Tipo', o.tipo ? esc(o.tipo) + (o.garg ? ' · ★ gargalo' : '') : '', 'marque EO ou POS na Folha 5A') +
          elo('Objetivo', esc(o.texto), '') +
          elo('Indicador', is.length ? is.map(function (x) { return nome(x) + (x.tipo ? ' <small>(' + esc(x.tipo.toLowerCase()) + ')</small>' : ''); }).join('<br>') : '', 'defina o indicador na Folha 5A') +
          elo('Meta', metas, 'defina a meta do indicador na Folha 5A') +
          elo('Farol', farol, 'defina o farol do indicador (Folha 5B)') +
          elo('Ação', as.length ? as.map(function (a) { return esc(a.acao) + (a.prio ? ' <small>(' + esc(a.prio) + ')</small>' : ''); }).join('<br>') : '', 'nenhuma ação na Folha 6 para este objetivo') +
          '</ol>';
      },
      relatorio: function (c) { var n = Number(c.fc_obj); return n ? ESPECIAIS.cadeia.html(c, n) : ''; }
    },
    pendencias: {
      atualizar: function (el, c) {
        var objs = F.objetivos(c), inds = F.indicadores(c), as = F.acoes(c);
        var aLevantar = inds.filter(function (x) { return !x.base || /levantar/i.test(x.base); });
        var semInd = objs.filter(function (o) { return !o.inds.length; }).map(function (o) { return o.n; });
        var incompletos = inds.filter(function (x) { return !x.ok; });
        var semAcao = objs.filter(function (o) { return !as.some(function (a) { return a.obj === o.n; }); }).map(function (o) { return o.n; });
        el.innerHTML = '<span class="esp-rot">O que ainda falta no caderno</span><ul class="chk-auto-lista">' +
          aviso(objs.length > 0 && !semInd.length, 'Indicadores' + (semInd.length ? ' faltando para os objetivos ' + semInd.join(', ') : objs.length ? ' para todos os objetivos' : ': nenhum objetivo ainda')) +
          aviso(inds.length > 0 && !aLevantar.length, 'Linhas de base' + (aLevantar.length ? ' a levantar nos indicadores ' + listaRefs(aLevantar) : inds.length ? ' levantadas' : ': nenhum indicador ainda')) +
          aviso(inds.length > 0 && !incompletos.length, 'Indicadores completos (ficha, farol e gatilhos)' + (incompletos.length ? ': falta completar ' + listaRefs(incompletos) + ' <a href="' + WS.raiz + 'folhas/bloco4.html' + (WS.exemplo ? '?exemplo' : '') + '#s-indicadores">abrir a Folha 5</a>' : '')) +
          aviso(objs.length > 0 && !semAcao.length, 'Ações' + (semAcao.length ? ' faltando para os objetivos ' + semAcao.join(', ') : ' para todos os objetivos')) +
          '</ul>';
      }
    },
    mapa: {
      atualizar: function (el, c) { el.innerHTML = ESPECIAIS.mapa.html(c, true); },
      html: function (c, tela) {
        var am = analiseMapa(c);
        if (!am.objs.length) return '<p class="vazio">Escreva os objetivos na Folha 5A para montar o mapa.</p>';
        var g = dimsGargalo(c), pos = am.objs.filter(function (o) { return o.tipo === 'POS'; }).length;
        var gargNoMapa = am.objs.some(function (o) { return o.garg && o.persp; });
        var isoSemJust = am.isolados.filter(function (o) { return !o.just; });
        var min = function (t) { return t.charAt(0).toLowerCase() + t.slice(1); };
        var se = am.setas.map(function (s) { return '<li><b>Se</b> ' + esc(min(s[0].texto)) + ', <b>então</b> ' + esc(min(s[1].texto)) + '.</li>'; }).join('');
        return '<div class="mapa-leg"><span class="lg lg-pos">POS · posicionamento</span><span class="lg lg-eo">EO · eficácia operacional</span><span class="lg lg-garg">★ ligado ao gargalo</span></div>' +
          svgMapa(c) +
          (tela ? '<span class="esp-rot">Teste do equilíbrio</span><ul class="chk-auto-lista">' +
            aviso(!am.vazias.length, am.vazias.length ? 'Perspectiva vazia: ' + am.vazias.map(function (p) { return esc(p[1]); }).join(', ') + ' → crie o objetivo que falta' : 'Todas as perspectivas preenchidas') +
            (am.semPersp.length ? aviso(false, 'Escolha a perspectiva dos objetivos ' + am.semPersp.map(function (o) { return o.n; }).join(', ')) : '') +
            aviso(pos >= 2, pos + ' objetivo(s) de POS' + (pos < 2 ? ' → volte à Folha 3B' : '')) +
            aviso(gargNoMapa, gargNoMapa ? 'O gargalo aparece no mapa' + (g.length ? ' (' + esc(g.join(', ')) + ')' : '') : 'O gargalo da Folha 3A não aparece: marque "gargalo" no objetivo que o ataca (Folha 5A) ou inclua um') +
            aviso(!isoSemJust.length, isoSemJust.length ? 'Objetivo sem seta e sem justificativa: ' + isoSemJust.map(function (o) { return o.n; }).join(', ') + ' → ligue, elimine ou justifique' : 'Nenhum objetivo isolado sem justificativa') +
            (am.invalidas.length ? aviso(false, 'Setas para objetivos que não existem: ' + esc(am.invalidas.join(', '))) : '') +
            (am.descem ? aviso(false, am.descem + ' seta(s) descem no mapa. Na maior parte dos casos, a causa fica embaixo e o efeito em cima.', 'info') : '') +
            '</ul>' : '') +
          (se ? '<span class="esp-rot">Leia cada seta em voz alta</span><ul class="se-entao">' + se + '</ul>' : '');
      },
      relatorio: function (c) { return F.objetivos(c).length ? '<div class="r-svg r-mapa">' + ESPECIAIS.mapa.html(c, false) + '</div>' : ''; }
    },
    prontidao: {
      atualizar: function (el, c) {
        var cr = criteriosProntidao(c), ok = cr.every(function (x) { return x[0]; });
        el.innerHTML = '<div class="pronto-cab ' + (ok ? 'ok' : '') + '">' + (ok ? '✔ Pronto para lançar no sistema do parque' : 'Ainda faltam ' + cr.filter(function (x) { return !x[0]; }).length + ' de ' + cr.length + ' critérios') + '</div>' +
          '<ul class="chk-auto-lista">' + cr.map(function (x) { return aviso(x[0], x[1]); }).join('') + '</ul>';
      }
    }
  };

  /* ================= montagem da página ================= */
  function attrs(o) { return Object.keys(o).map(function (k) { return o[k] == null ? '' : ' ' + k + '="' + esc(o[k]) + '"'; }).join(''); }
  function controle(k, def, ph, rotulo) {
    var tipo = def.tipo || 'texto';
    var base = { 'data-k': k, 'aria-label': rotulo || null };
    // "linha": uma linha que cresce se o texto for maior (um input cortaria o que não cabe)
    if (tipo === 'linha') return '<textarea rows="1" class="linha"' + attrs(Object.assign(base, { placeholder: ph || null })) + '></textarea>';
    if (tipo === 'numerico') return '<input type="text" inputmode="decimal"' + attrs(Object.assign(base, { placeholder: ph || null })) + '>';
    if (tipo === 'numero') return '<input type="number"' + attrs(Object.assign(base, { placeholder: ph || null })) + '>';
    if (tipo === 'data') return '<input type="date"' + attrs(base) + '>';
    if (tipo === 'calc') return '<input type="text" readonly tabindex="-1" class="calc"' + attrs(base) + '>';
    if (tipo === 'check') return '<label class="chk-cel"><input type="checkbox"' + attrs(base) + '><span aria-hidden="true"></span></label>';
    if (tipo === 'opcoes') return '<select' + attrs(base) + '><option value="">—</option>' + opcoes(def.op).map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    if (tipo === 'objetivo') return '<select data-objetivo' + attrs(base) + '><option value="">—</option></select>';
    if (tipo === 'indicador') return '<select data-indicador' + attrs(base) + '><option value="">—</option></select>';
    return '<textarea rows="2"' + attrs(Object.assign(base, { placeholder: ph || null })) + '></textarea>';
  }
  function htmlCampo(it) {
    return '<div class="campo' + (it.tipo === 'check' ? ' campo-check' : '') + '"><label><span class="campo-rot">' + esc(it.r) + '</span>' +
      (it.d ? '<span class="campo-dica">' + esc(it.d) + '</span>' : '') + controle(it.k, it, it.ph, it.r) + '</label></div>';
  }
  var SE = [];   // funções "se" das linhas de tabela (mostrar só quando...)
  var AUTO = []; // itens das listas finais conferidos pelo caderno
  function htmlTabela(it) {
    var h = it.r ? '<h4 class="tab-titulo">' + esc(it.r) + '</h4>' : '';
    var numerada = it.linhas.every(function (l) { return /^\d+$/.test(l.r) && !l.rotuloDe; });
    // tabelas progressivas: mostram "minimo" linhas e vão abrindo a seguinte conforme o preenchimento
    h += '<div class="tab-wrap' + (it.largo ? ' largo' : '') + '"' + (it.minimo ? ' data-minimo="' + it.minimo + '"' : '') + '><table class="tab' + (numerada ? ' tab-num' : '') + (it.linhas.some(function (l) { return l.rotuloDe; }) ? ' tab-rot' : '') + '"><thead><tr><th class="tab-canto"></th>';
    it.cols.forEach(function (c) { h += '<th' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.r) + '</th>'; });
    h += '</tr></thead><tbody>';
    it.linhas.forEach(function (l) {
      var se = l.se ? ' data-se="' + (SE.push(l.se) - 1) + '"' : '';
      h += '<tr' + se + '><th scope="row"><span class="lin-rot"' + (it.item && /^\d+$/.test(l.r) ? ' data-item="' + esc(it.item) + '"' : '') + '>' + esc(l.r) + '</span>' +
        (l.rotuloDe ? '<span class="lin-dica" data-rotulo-de="' + esc(l.rotuloDe) + '"></span>' : '') + (l.d ? '<span class="lin-dica">' + esc(l.d) + '</span>' : '') + '</th>';
      it.cols.forEach(function (c, j) {
        h += '<td data-label="' + esc(c.r) + '">' + controle(l.k[j], c, (l.ph && l.ph[j]) || c.ph, l.r + ' · ' + c.r) + '</td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table>' +
      (it.minimo ? '<button type="button" class="btn-linha" data-mais-linha>＋ Mais uma linha</button>' : '') +
      (it.vazia ? '<p class="tab-vazia" hidden>' + esc(it.vazia) + '</p>' : '') + '</div>';
  }
  function htmlItens(itens) {
    return (itens || []).map(function (it) {
      if (!it.t) return htmlCampo(it);
      if (it.t === 'grupo') return '<div class="grade grade-' + (it.cols || 2) + '">' + htmlItens(it.itens) + '</div>';
      if (it.t === 'caixa') return '<div class="caixa ' + esc(it.cls || '') + '"><div class="caixa-cab"><h4 class="caixa-tit">' + esc(it.r) + (it.rotuloDe ? '<span data-rotulo-de="' + esc(it.rotuloDe) + '" data-prefixo=" · "></span>' : '') + '</h4>' +
        (it.limpar ? '<button type="button" class="btn-limpar" data-limpar>Limpar ' + esc(it.r.toLowerCase()) + '</button>' : '') + '</div>' +
        (it.d ? '<p class="caixa-dica">' + esc(it.d) + '</p>' : '') + htmlItens(it.itens) + '</div>';
      if (it.t === 'progressivo') return '<div class="prog" data-minimo="' + (it.minimo || 1) + '">' + it.itens.map(function (x) { return '<div class="prog-item">' + htmlItens([x]) + '</div>'; }).join('') +
        '<button type="button" class="btn-linha btn-prog" data-mais-item>' + esc(it.botao) + '</button></div>';
      // uma aba por objetivo da Folha 5A (as abas e os cartões visíveis são ajustados em atualizarVisual)
      if (it.t === 'porObjetivo') return '<div class="objs" data-objs><div class="objs-nav" role="group" aria-label="Escolha o objetivo"></div>' +
        '<p class="vazio objs-vazio">Escreva os objetivos no passo 1: cada um ganha aqui uma aba para os seus indicadores.</p>' + htmlItens(it.itens) + '</div>';
      if (it.t === 'objetivo') return '<div class="obj-card" data-obj="' + it.n + '" hidden><div class="obj-cab"><span class="obj-n">' + it.n + '</span><div class="obj-cab-txt"><span class="obj-rot">Objetivo ' + it.n + '</span>' +
        '<strong data-rotulo-de="f5a_o' + it.n + '_obj"></strong></div><span class="obj-tags" data-obj-tags></span></div>' + htmlItens(it.itens) +
        '<div class="obj-pe"><button type="button" class="vd-btn vd-btn-ghost" data-obj-ir="-1">← Objetivo anterior</button><button type="button" class="vd-btn vd-btn-roxo" data-obj-ir="1">Próximo objetivo →</button></div></div>';
      if (it.t === 'mais') return '<details class="mais"><summary>' + esc(it.r) + '</summary><div class="mais-corpo">' + htmlItens(it.itens) + '</div></details>';
      if (it.t === 'sub') return '<h3 class="sub">' + esc(it.r) + '</h3>';
      if (it.t === 'nota') return '<div class="nota">' + it.html + '</div>';
      if (it.t === 'tabela') return htmlTabela(it);
      if (it.t === 'espelho') return '<div class="espelho" data-espelho="' + esc(it.k) + '" data-vazio="' + esc(it.vazio || 'Ainda não preenchido.') + '"><span class="espelho-rot">' + esc(it.r) + '</span><p></p></div>';
      if (it.t === 'trazer') return '<div class="trazer"><button type="button" class="btn-trazer" data-trazer="' + esc(JSON.stringify(it.mapa)) + '">' + esc(it.r) + '</button></div>';
      if (it.t === 'checklist') return '<ul class="chk-lista">' + it.itens.map(function (c) {
        if (!Array.isArray(c)) return '<li class="chk-conferido" data-auto="' + (AUTO.push(c.auto) - 1) + '"><span class="chk-caixa" aria-hidden="true"></span><span>' + esc(c.r) +
          (c.ir ? ' <a class="chk-ir" href="#s-' + esc(c.ir) + '">resolver no passo ↑</a>' : '') + '</span><em class="chk-tag">conferido pelo caderno</em></li>';
        return '<li><label><input type="checkbox" data-k="' + esc(c[0]) + '"><span class="chk-caixa" aria-hidden="true"></span><span>' + esc(c[1]) + '</span><em class="chk-tag chk-tag-mao">marque você</em></label></li>';
      }).join('') + '</ul>';
      if (it.t === 'especial') return '<div class="especial esp-' + esc(it.nome) + '" data-esp="' + esc(it.nome) + '"' + (it.n ? ' data-n="' + it.n + '"' : '') + '></div>';
      return '';
    }).join('');
  }

  function montar(esp) {
    var idx = F.ORDEM.indexOf(esp.id), ant = P[F.ORDEM[idx - 1]], prox = P[F.ORDEM[idx + 1]];
    var guia = F.GUIAS[esp.guia];
    var qs = WS.exemplo ? '?exemplo' : '';   // no modo exemplo, a navegação continua no exemplo
    var urlP = function (e) { return WS.raiz + 'folhas/' + e.id + '.html' + qs; };
    // trilha das 8 etapas: onde estou, o que está pronto, e um clique para ir a qualquer folha
    var trilha = '<nav class="e-trilha no-print" aria-label="Etapas do caderno"><span class="e-trilha-rot">Seu caderno</span>' + F.ORDEM.map(function (id) {
      return '<a href="' + esc(urlP(P[id])) + '" data-trilha="' + id + '"' + (id === esp.id ? ' aria-current="page"' : '') + '>' + esc(codigoCurto(P[id])) + '</a>';
    }).join('') + '</nav>';
    var h = '<header class="e-hero"><div class="e-wrap">' + trilha +
      '<span class="e-tag"><i></i>' + esc(esp.aula + ' · ' + esp.etapa) + '</span>' +
      '<h1><span class="e-cod">' + esc(esp.codigo) + '</span>' + esc(esp.titulo) + '</h1>' +
      '<p class="e-perg">' + esc(esp.pergunta) + '</p>' +
      '<p class="e-resumo">' + esc(esp.resumo) + '</p>' +
      '<div class="e-meta"><span id="progGeral"></span><span id="empresaMeta"></span></div>' +
      '<div class="e-acoes no-print">' +
        (guia ? '<a class="vd-btn vd-btn-amarelo" href="' + esc(WS.raiz + guia.url) + '" target="_blank" rel="noopener">📖 Abrir o ' + esc(guia.nome.replace(/ · .*/, '').replace('Guia de uso do caderno', 'guia de uso')) + '</a>' : '') +
        (WS.exemplo ? '' : '<a class="vd-btn vd-btn-claro" href="?exemplo" target="_blank" rel="noopener">◎ Ver a folha da AgroSense (nova aba)</a>') +
        '<button type="button" class="vd-btn vd-btn-claro" id="btnPdf">Salvar esta folha em PDF</button>' +
      '</div></div></header>';
    h += '<nav class="e-nav no-print" aria-label="Seções"><div class="e-wrap"><div class="e-nav-in">' + esp.secoes.map(function (s) {
      return '<a href="#s-' + esc(s.id) + '" data-sec="' + esc(s.id) + '"><b>' + esc(s.n) + '</b><span>' + esc(s.nav || s.titulo.replace(/[:…].*$/, '')) + '</span><i class="sec-prog"></i></a>';
    }).join('') + '</div></div></nav>';
    h += '<main class="e-wrap e-main">';
    h += '<ol class="fluxo no-print" aria-label="Como trabalhar nesta etapa">' +
      '<li><span class="fluxo-n">1</span><span><b>Entenda</b> com a exposição; o guia fica à mão para consulta.</span></li>' +
      '<li><span class="fluxo-n">2</span><span><b>Aplique</b> seção por seção na sua empresa, vendo antes como a AgroSense fez.</span></li>' +
      '<li><span class="fluxo-n">3</span><span><b>Confira</b> a lista final e salve o arquivo.</span></li></ol>';
    var finalSec = function (s) { return s.n === '✓' || s.n === '★'; };
    var total = esp.secoes.filter(function (s) { return !finalSec(s); }).length;
    esp.secoes.forEach(function (s, i) {
      var temEx = EX && !WS.exemplo && s.exemplo !== false;
      var final = finalSec(s), seg = esp.secoes[i + 1];
      // fim de cada passo: botão para o seguinte (o último leva à lista final)
      var seguir = seg ? '<a class="sec-seguir no-print" href="#s-' + esc(seg.id) + '">' + (finalSec(seg) ? 'Conferir a lista final' : 'Seguir para o passo ' + (i + 2) + ': ' + esc(seg.nav || seg.titulo)) + ' ↓</a>' : '';
      var apoio = (s.guia ? '<a class="link-leitura" href="' + esc(urlGuia(s.guia)) + '" target="_blank" rel="noopener">📖 No ' + esc(F.GUIAS[s.guia[0]].nome.replace(/ · .*/, '').replace('Guia de uso do caderno', 'guia de uso')) + ' ↗</a>' : '') +
        (temEx ? '<details class="ex" data-ex="' + esc(s.id) + '"><summary><span class="ex-ico" aria-hidden="true">◎</span>Ver como a AgroSense fez</summary><div class="ex-corpo"></div></details>' : '');
      h += '<section class="e-secao' + (final ? ' e-secao-chk' : '') + '" id="s-' + esc(s.id) + '" data-sec="' + esc(s.id) + '">' +
        '<div class="e-secao-cab"><span class="e-secao-n">' + esc(s.n) + '</span><div class="e-secao-tit"><span class="e-alimenta">' +
          esc((s.folha ? s.folha + ' · ' : '') + (final ? 'para fechar' : 'passo ' + (i + 1) + ' de ' + total)) + '</span><h2>' + esc(s.titulo) + '</h2></div></div>' +
        '<div class="e-secao-conteudo">' +
        (s.dica ? '<p class="e-dica">' + esc(s.dica) + '</p>' : '') +
        (apoio ? '<div class="sec-apoio no-print">' + apoio + '</div>' : '') +
        (s.passos ? '<div class="passos"><span class="passos-rot">✎ Mão na massa</span><ol>' + s.passos.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></div>' : '') +
        '<div class="e-secao-corpo">' + htmlItens(s.itens) + '</div>' + seguir + '</div></section>';
    });
    h += '<aside class="proximo no-print"><div><span class="proximo-rot">Esta folha</span><p id="proximoStatus"></p></div><div class="proximo-acoes">' +
      (WS.exemplo ? '' : '<button type="button" class="vd-btn vd-btn-ghost" data-salvar-arquivo>⤓ Salvar arquivo</button>') +
      (prox ? '<a class="vd-btn vd-btn-roxo" href="' + esc(urlP(prox)) + '">Próximo: ' + esc(prox.codigo + ' · ' + prox.titulo) + ' →</a>'
        : '<a class="vd-btn vd-btn-roxo" href="' + WS.raiz + 'caderno.html' + qs + '">Abrir o caderno completo →</a>') + '</div></aside>';
    h += '<nav class="e-rodape no-print">' +
      (ant ? '<a href="' + esc(urlP(ant)) + '">← ' + esc(ant.codigo + ' · ' + ant.titulo) + '</a>' : '<a href="' + WS.raiz + 'index.html#trilha">← Voltar à trilha</a>') +
      '<a href="' + WS.raiz + 'index.html#trilha">Trilha</a>' +
      '<a href="' + WS.raiz + 'caderno.html' + qs + '">Caderno completo</a>' +
      '</nav></main>';
    document.getElementById('app').innerHTML = h;
    var rel = document.createElement('div');
    rel.id = 'relatorio'; rel.className = 'relatorio'; rel.setAttribute('aria-hidden', 'true');
    document.body.appendChild(rel);
  }

  /* ================= relatório (PDF) ================= */
  function relatorioTabela(it, c) {
    var cols = it.cols.map(function (col, j) { return { c: col, j: j }; });
    var linhas = it.linhas.filter(function (l) { return cols.some(function (x) { return !vazio(c[l.k[x.j]]) && x.c.tipo !== 'calc'; }); });
    if (!linhas.length) return '';
    cols = cols.filter(function (x) { return linhas.some(function (l) { return !vazio(c[l.k[x.j]]); }); });
    var numerada = linhas.every(function (l) { return /^\d+$/.test(l.r) && !(l.rotuloDe && c[l.rotuloDe]); });
    // a moldura deixa a tabela rolar para o lado no celular (na impressão não muda nada)
    var h = (it.r ? '<h4 class="r-sub">' + esc(it.r) + '</h4>' : '') + '<div class="r-tab-wrap"><table class="r-tab' + (cols.length > 5 ? ' r-tab-larga' : '') + (numerada ? ' r-tab-num' : '') + '"><thead><tr><th></th>';
    cols.forEach(function (x) { h += '<th>' + esc(x.c.r) + '</th>'; });
    h += '</tr></thead><tbody>';
    linhas.forEach(function (l) {
      h += '<tr><th scope="row">' + esc(l.r) + (l.rotuloDe && c[l.rotuloDe] ? '<small>' + esc(c[l.rotuloDe]) + '</small>' : '') + '</th>';
      cols.forEach(function (x) { h += '<td>' + br(valorLegivel(x.c, c[l.k[x.j]], c)) + '</td>'; });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function relatorioItens(itens, c) {
    var h = '';
    (itens || []).forEach(function (it) {
      if (it.relatorio === false) return;
      if (!it.t && it.k) {
        if (!vazio(c[it.k])) h += '<div class="r-campo"><h4>' + esc(it.r) + '</h4><p>' + br(valorLegivel(it, c[it.k], c)) + '</p></div>';
      } else if (it.t === 'grupo') {
        var d = relatorioItens(it.itens, c);
        if (d) h += '<div class="r-grade' + (it.cols === 3 ? ' r-grade-3' : '') + '">' + d + '</div>';
      } else if (it.t === 'caixa') {
        var dc = relatorioItens(it.itens, c);
        if (dc.replace(/<[^>]+>|\s/g, '')) h += '<div class="r-caixa"><h4 class="r-sub">' + esc(it.r) + (it.rotuloDe && c[it.rotuloDe] ? ' · ' + esc(c[it.rotuloDe]) : '') + '</h4>' + dc + '</div>';
      } else if (it.t === 'mais') {
        h += relatorioItens(it.itens, c);
      } else if (it.t === 'porObjetivo') {
        h += relIndicadores(c);
      } else if (it.t === 'tabela') {
        h += relatorioTabela(it, c);
      } else if (it.t === 'sub') {
        h += '<!--sub:' + esc(it.r) + '-->';
      } else if (it.t === 'especial' && ESPECIAIS[it.nome] && ESPECIAIS[it.nome].relatorio) {
        h += ESPECIAIS[it.nome].relatorio(c, it);
      }
    });
    return h.replace(/<!--sub:(.*?)-->((?:(?!<!--sub:)[\s\S])*)/g, function (m, t, resto) {
      return resto.replace(/<[^>]+>|\s/g, '') ? '<h3 class="r-subtitulo">' + t + '</h3>' + resto : '';
    });
  }
  function relatorioPagina(esp, c) {
    var h = '';
    esp.secoes.forEach(function (s) {
      var d = relatorioItens(s.itens, c);
      if (d.replace(/<[^>]+>|\s/g, '') || /<svg/.test(d)) h += '<section class="r-secao"><h2>' + (s.folha ? '<span>' + esc(s.folha) + '</span>' : '') + esc(s.titulo) + '</h2>' + d + '</section>';
    });
    return h;
  }
  // nivel: 'h1' no PDF de uma folha; 'h2' no caderno completo, cuja página já tem o próprio h1
  function capa(titulo, sub, c, nivel) {
    var hoje = new Date(), cfg = window.WS_CONFIG || {}, hn = nivel || 'h1';
    return '<header class="r-capa">' +
      '<div class="r-capa-topo">Caderno de Estratégia' + (c.f0_empresa ? ' · ' + esc(c.f0_empresa) : '') + '</div>' +
      '<' + hn + ' class="r-capa-tit">' + esc(titulo) + '</' + hn + '>' + (sub ? '<p class="r-capa-sub">' + esc(sub) + '</p>' : '') +
      '<dl class="r-capa-dados">' +
        (c.f0_empresa ? '<div><dt>Empresa</dt><dd>' + esc(c.f0_empresa) + (c.f0_perfil ? ' · ' + esc(c.f0_perfil) : '') + '</dd></div>' : '') +
        (c.f0_participantes ? '<div><dt>Preenchido por</dt><dd>' + esc(c.f0_participantes) + '</dd></div>' : '') +
        '<div><dt>Data</dt><dd>' + String(hoje.getDate()).padStart(2, '0') + '/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear() + '</dd></div>' +
      '</dl>' +
      '<p class="r-capa-nota">Workshop ' + esc(cfg.NOME || 'Da Análise ao Plano') + (cfg.SUBTITULO ? ' · ' + esc(cfg.SUBTITULO) : '') + '. Documento gerado no navegador da empresa; as respostas não foram enviadas a ninguém.</p>' +
      '</header>';
  }

  /* ================= comportamento da página ================= */
  function iniciar(id) {
    var esp = P[id];
    document.title = esp.codigo + ' · ' + esp.titulo + ' — ' + ((window.WS_CONFIG || {}).NOME || 'Da Análise ao Plano');
    montar(esp);
    var app = document.getElementById('app');
    var progKs = chavesProgresso(esp), chkKs = chavesChecklist(esp);
    var base = {};   // caderno salvo (outras folhas)

    function els() { return Array.prototype.slice.call(app.querySelectorAll('[data-k]')); }
    function lerTela() {
      var c = {};
      els().forEach(function (el) {
        var v = el.type === 'checkbox' ? el.checked : el.value;
        if (!vazio(v)) c[el.dataset.k] = el.type === 'checkbox' ? true : v;
      });
      return c;
    }
    function porChave(k) { return app.querySelector('[data-k="' + k + '"]'); }
    function escrever(el, v) {
      if (el.type === 'checkbox') el.checked = !!v;
      else {
        var lista = el.hasAttribute('data-objetivo') ? 'Objetivo ' : el.hasAttribute('data-indicador') ? 'Indicador ' : '';
        if (lista && !vazio(v) && !Array.prototype.some.call(el.options, function (x) { return x.value === String(v); })) {
          var o = document.createElement('option'); o.value = v; o.textContent = lista + v; el.appendChild(o);
        }
        el.value = vazio(v) ? '' : String(v);
      }
    }
    function todos() {
      var c = Object.assign({}, base);
      els().forEach(function (el) { delete c[el.dataset.k]; });
      Object.assign(c, lerTela());
      return esp.calcular ? Object.assign(c, esp.calcular(c)) : c;
    }
    function opcoesObjetivo(c) {
      var objs = F.objetivos(c);
      app.querySelectorAll('select[data-objetivo]').forEach(function (sel) {
        var v = sel.value;
        var h = '<option value="">—</option>' + objs.map(function (o) { return '<option value="' + o.n + '">' + esc(o.n + ' · ' + o.texto) + '</option>'; }).join('');
        if (v && !objs.some(function (o) { return String(o.n) === v; })) h += '<option value="' + esc(v) + '">' + esc(textoObjetivo(c, Number(v))) + '</option>';
        if (sel._ultimo !== h) { sel.innerHTML = h; sel._ultimo = h; sel.value = v; }
      });
      // indicador que a ação move: os indicadores do objetivo escolhido na mesma linha (ou todos, sem objetivo)
      var inds = F.indicadores(c);
      app.querySelectorAll('select[data-indicador]').forEach(function (sel) {
        var tr = sel.closest('tr'), os = tr && tr.querySelector('select[data-objetivo]'), on = os ? Number(os.value) || 0 : 0;
        var lista = inds.filter(function (x) { return !on || x.obj === on; }), v = sel.value;
        var h = '<option value="">—</option>' + lista.map(function (x) { return '<option value="' + x.ref + '">' + esc((on ? '' : x.obj + ' · ') + (x.nome || 'Indicador ' + x.ref)) + '</option>'; }).join('');
        if (v && !lista.some(function (x) { return x.ref === v; })) h += '<option value="' + esc(v) + '">' + esc(F.nomeIndicador(c, v) + (/^\d+\.\d$/.test(v) ? ' (de outro objetivo ou apagado)' : '')) + '</option>';
        if (on && !lista.length) h += '<option value="" disabled>Este objetivo ainda não tem indicador (Folha 5A)</option>';
        if (sel._ultimo !== h) { sel.innerHTML = h; sel._ultimo = h; sel.value = v; }
      });
    }
    function preenchido(el) { return !el.classList.contains('calc') && !vazio(el.type === 'checkbox' ? el.checked : el.value); }
    function temValor(box) { return Array.prototype.some.call(box.querySelectorAll('[data-k]'), preenchido); }
    /* passo 2 da Folha 5: abas dos objetivos, cartão visível, rótulos e botões anterior/próximo */
    function abasObjetivos(c) {
      app.querySelectorAll('[data-objs]').forEach(function (box) {
        var objs = F.objetivos(c), ns = objs.map(function (o) { return o.n; });
        if (ns.indexOf(box._sel) < 0) box._sel = ns[0] || 0;
        var nav = box.querySelector('.objs-nav');
        var h = objs.map(function (o) {
          var st = estadoObjetivo(o), ativa = o.n === box._sel;
          var txt = st === 'vazio' ? 'sem indicador' : o.inds.length + (o.inds.length === 1 ? ' indicador' : ' indicadores') + (st === 'ok' ? ' ✔' : ' · falta algo');
          return '<button type="button" class="obj-aba ' + st + (ativa ? ' ativa' : '') + '" data-obj-sel="' + o.n + '" aria-pressed="' + ativa + '" title="' + esc(o.texto) + '">' +
            '<b>' + o.n + '</b><span class="obj-aba-txt">' + esc(curto(o.texto, 40)) + '</span><small>' + txt + '</small></button>';
        }).join('');
        if (nav._h !== h) { nav.innerHTML = h; nav._h = h; }
        nav.hidden = !objs.length;
        box.querySelector('.objs-vazio').hidden = objs.length > 0;
        var idx = ns.indexOf(box._sel);
        box.querySelectorAll('.obj-card').forEach(function (card) {
          var n = Number(card.dataset.obj), vis = n === box._sel;
          card.hidden = !vis;
          if (!vis) return;
          var o = objs[idx];
          card.querySelector('[data-obj-tags]').innerHTML = (o.tipo ? '<span class="obj-tag ' + (o.tipo === 'POS' ? 'pos' : 'eo') + '">' + esc(o.tipo) + '</span>' : '<span class="obj-tag sem">EO ou POS? (passo 1)</span>') +
            (o.garg ? '<span class="obj-tag garg">★ gargalo</span>' : '');
          card.querySelector('[data-obj-ir="-1"]').hidden = idx <= 0;
          card.querySelector('[data-obj-ir="1"]').textContent = idx < ns.length - 1 ? 'Próximo: objetivo ' + ns[idx + 1] + ' →' : 'Terminei os objetivos: ver o painel ↓';
        });
      });
    }
    function escolherObjetivo(n, rolar) {
      var box = app.querySelector('[data-objs]');
      if (!box) return;
      box._sel = n;
      atualizarVisual();
      WS.agendarAlturas();
      if (rolar) box.scrollIntoView({ block: 'start' });
    }
    /* trilha das etapas (topo da folha): estado de cada uma com o que está no caderno agora */
    var tTrilha = null;
    function trilha(c) {
      // adiado e agrupado (várias teclas seguidas = um cálculo); setTimeout porque o requestAnimationFrame pausa em abas ocultas
      clearTimeout(tTrilha);
      tTrilha = setTimeout(function () {
        app.querySelectorAll('[data-trilha]').forEach(function (a) {
          var s = status(a.dataset.trilha, c);
          a.className = s.estado;
          a.title = P[a.dataset.trilha].codigo + ' · ' + P[a.dataset.trilha].titulo + ': ' + s.texto;
        });
      }, 120);
    }
    function atualizarVisual() {
      var c = todos();
      if (esp.calcular) {
        var r = esp.calcular(c);
        Object.keys(r).forEach(function (k) { var el = porChave(k); if (el && el.value !== r[k]) el.value = r[k]; });
      }
      opcoesObjetivo(c);
      app.querySelectorAll('[data-rotulo-de]').forEach(function (el) {
        var v = c[el.dataset.rotuloDe];
        el.textContent = v ? (el.dataset.prefixo || '') + v : '';
      });
      app.querySelectorAll('tr[data-se]').forEach(function (tr) { tr.hidden = !SE[Number(tr.dataset.se)](c); });
      app.querySelectorAll('.tab-wrap').forEach(function (w) {
        var trs = Array.prototype.slice.call(w.querySelectorAll('tbody tr'));
        if (w.dataset.minimo) {
          var ultima = -1;
          trs.forEach(function (tr, i) { if (temValor(tr)) ultima = i; });
          var n = Math.min(trs.length, Math.max(Number(w.dataset.minimo), ultima + 2, w._abertas || 0));
          trs.forEach(function (tr, i) { tr.hidden = i >= n; });
          var b = w.querySelector('[data-mais-linha]');
          if (b) b.hidden = n >= trs.length;
        }
        var vz = w.querySelector('.tab-vazia');
        if (vz) { var nenhuma = trs.every(function (tr) { return tr.hidden; }); vz.hidden = !nenhuma; w.querySelector('table').hidden = nenhuma; }
      });
      // blocos progressivos (indicadores 2 e 3): aparecem quando preenchidos ou pelo botão
      app.querySelectorAll('.prog').forEach(function (p) {
        var its = Array.prototype.filter.call(p.children, function (x) { return x.classList.contains('prog-item'); }), ultima = -1;
        its.forEach(function (x, i) { if (temValor(x)) ultima = i; });
        var n = Math.min(its.length, Math.max(Number(p.dataset.minimo), ultima + 1, p._abertas || 0));
        its.forEach(function (x, i) { x.hidden = i >= n; });
        p.querySelector('[data-mais-item]').hidden = n >= its.length;
      });
      abasObjetivos(c);
      app.querySelectorAll('[data-auto]').forEach(function (li) { li.classList.toggle('ok', autoOk(AUTO[Number(li.dataset.auto)], c)); });
      app.querySelectorAll('[data-espelho]').forEach(function (el) {
        var v = c[el.dataset.espelho], p = el.querySelector('p');
        p.textContent = v || el.dataset.vazio;
        el.classList.toggle('vazio', !v);
      });
      app.querySelectorAll('[data-esp]').forEach(function (el) {
        var e = ESPECIAIS[el.dataset.esp];
        if (e && e.atualizar) e.atualizar(el, c, { n: el.dataset.n || 0 });
      });
      progresso(c);
      trilha(c);
      var em = document.getElementById('empresaMeta');
      if (em) em.textContent = c.f0_empresa ? 'Empresa: ' + c.f0_empresa : 'Empresa ainda sem nome (Folha 0)';
    }
    function progresso(c) {
      var feitos = progKs.filter(function (k) { return !vazio(c[k]); }).length;
      var autos = autosChecklist(esp), autosOk = autos.filter(function (f) { return autoOk(f, c); }).length;
      var chk = chkKs.filter(function (k) { return c[k]; }).length + autosOk, chkTot = chkKs.length + autos.length;
      var tudo = chkTot && chk === chkTot && (!esp.pronta || autoOk(esp.pronta, c));
      var ps = document.getElementById('proximoStatus');
      if (ps) {
        ps.className = tudo ? 'ok' : '';
        ps.textContent = !feitos ? 'Ainda não preenchida. Comece pelo passo 1.'
          : tudo ? '✔ Pronta: todos os itens da lista final estão ok.' + (WS.exemplo ? '' : ' Salve o arquivo e siga em frente.')
          : chkTot && chk === chkTot ? 'A lista final está ok, mas ainda há critérios de "pronto para o sistema" em aberto (acima).'
          : chkTot ? 'Lista final: ' + chk + ' de ' + chkTot + ' itens ok. Dá para seguir e voltar depois.' : feitos + ' campos preenchidos.';
      }
      esp.secoes.forEach(function (s) {
        var sec = document.getElementById('s-' + s.id), n = 0;
        sec.querySelectorAll('[data-k]').forEach(function (el) { if (preenchido(el)) n++; });
        var a = app.querySelector('.e-nav a[data-sec="' + s.id + '"] .sec-prog');
        if (a) { a.textContent = n || ''; a.parentNode.classList.toggle('tem', n > 0); }
      });
      var pg = document.getElementById('progGeral');
      if (pg) pg.textContent = (feitos ? feitos + ' campo' + (feitos === 1 ? '' : 's') + ' preenchido' + (feitos === 1 ? '' : 's') : 'Nada preenchido ainda') +
        (chkTot ? ' · lista final: ' + chk + ' de ' + chkTot : '');
    }
    function abrirMais() {
      app.querySelectorAll('details.mais').forEach(function (d) { if (temValor(d)) d.open = true; });
    }
    function aplicar(c) {
      base = Object.assign({}, c);
      // primeiro as listas de objetivos (os valores dependem delas)
      opcoesObjetivo(c);
      els().forEach(function (el) { escrever(el, c[el.dataset.k]); });
      abrirMais();
      atualizarVisual();
      WS.agendarAlturas();
    }
    function coletar() {
      var c = lerTela();
      if (esp.calcular) {
        var r = esp.calcular(todos());
        Object.keys(r).forEach(function (k) { if (!vazio(r[k])) c[k] = r[k]; else delete c[k]; });
        // chaves calculadas sem campo na tela (ex.: faixas do farol) também pertencem a esta página
        Object.keys(r).forEach(function (k) { if (!(k in c)) c[k] = ''; });
      }
      return c;
    }

    var ctrl = WS.pagina({
      crumb: esp.codigo + ' · ' + esp.titulo, raiz: app,
      coletar: coletar, aplicar: aplicar,
      aoMudar: function (c) { var meu = lerTela(); base = Object.assign({}, c); atualizarVisual(); return meu; }
    });

    app.addEventListener('input', atualizarVisual);
    app.addEventListener('change', atualizarVisual);
    app.addEventListener('click', function (e) {
      if (e.target.closest('[data-salvar-arquivo]')) { WS.salvarArquivo(); return; }
      var sel = e.target.closest('[data-obj-sel]');
      if (sel) { escolherObjetivo(Number(sel.dataset.objSel), !sel.closest('.objs-nav')); return; }
      var ir = e.target.closest('[data-obj-ir]');
      if (ir) {
        var box = ir.closest('[data-objs]'), ns = F.objetivos(todos()).map(function (o) { return o.n; }), i = ns.indexOf(box._sel) + Number(ir.dataset.objIr);
        if (i >= ns.length) { var painel = app.querySelector('.esp-painel'); if (painel) painel.scrollIntoView({ block: 'start' }); return; }
        if (i >= 0) escolherObjetivo(ns[i], true);
        return;
      }
      var mi = e.target.closest('[data-mais-item]');
      if (mi) {
        var p = mi.closest('.prog'), vis = Array.prototype.filter.call(p.children, function (x) { return x.classList.contains('prog-item') && !x.hidden; });
        p._abertas = vis.length + 1;
        atualizarVisual();
        var novo = Array.prototype.filter.call(p.children, function (x) { return x.classList.contains('prog-item') && !x.hidden; }).pop();
        var cp = novo && novo.querySelector('textarea, input, select');
        if (cp) cp.focus();
        WS.agendarAlturas();
        return;
      }
      var lp = e.target.closest('[data-limpar]');
      if (lp) {
        var cx = lp.closest('.caixa');
        if (!temValor(cx) || !window.confirm('Apagar tudo o que está escrito neste ' + lp.textContent.replace(/^Limpar /, '') + '?')) return;
        cx.querySelectorAll('[data-k]').forEach(function (el) { escrever(el, ''); });
        var pg = cx.closest('.prog'); if (pg) pg._abertas = 0;
        atualizarVisual(); ctrl.alterado(); WS.agendarAlturas();
        return;
      }
      var us = e.target.closest('[data-usar]');
      if (us) {
        var livre = seq(F.N_OBJ).filter(function (n) { var el = porChave('f5a_o' + n + '_obj'); return el && !el.value.trim(); })[0];
        if (!livre) { WS.toast('A tabela já tem 10 objetivos.'); return; }
        escrever(porChave('f5a_o' + livre + '_obj'), us.dataset.usar);
        if (us.dataset.tipo && !porChave('f5a_o' + livre + '_tipo').value) escrever(porChave('f5a_o' + livre + '_tipo'), us.dataset.tipo);
        if (us.dataset.garg) escrever(porChave('f5a_o' + livre + '_garg'), true);
        atualizarVisual(); ctrl.alterado(); WS.agendarAlturas();
        var alvo = porChave('f5a_o' + livre + '_obj');
        alvo.focus();
        WS.toast('Levada para o objetivo ' + livre + '. Agora reescreva: verbo de resultado + objeto + qualificador.');
        return;
      }
      var ml = e.target.closest('[data-mais-linha]');
      if (ml) {
        var w = ml.closest('.tab-wrap');
        w._abertas = w.querySelectorAll('tbody tr:not([hidden])').length + 1;
        atualizarVisual();
        var nova = w.querySelectorAll('tbody tr:not([hidden])');
        var campo = nova[nova.length - 1] && nova[nova.length - 1].querySelector('textarea, input, select');
        if (campo) campo.focus();
        WS.agendarAlturas();
        return;
      }
      var b = e.target.closest('[data-trazer]');
      if (b) {
        var mapa = JSON.parse(b.dataset.trazer), c = todos(), n = 0;
        Object.keys(mapa).forEach(function (dest) {
          var v = c[mapa[dest]], el = porChave(dest);
          if (vazio(v) || !el) return;
          if (el.value && el.value !== v && !window.confirm('Substituir o que já está escrito?')) return;
          escrever(el, v); n++;
        });
        if (!n) { WS.toast('Não há nada para trazer: a origem ainda está vazia.'); return; }
        atualizarVisual(); ctrl.alterado(); WS.agendarAlturas();
        WS.toast('Pronto: trazido da folha anterior. Ajuste o texto se precisar.');
      }
    });
    // exemplo da AgroSense: montado na primeira vez que é aberto
    app.querySelectorAll('details.ex').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open || d._feito) return;
        d._feito = true;
        var s = esp.secoes.filter(function (x) { return x.id === d.dataset.ex; })[0];
        var corpo = relatorioItens(s.itens, exemplo());
        d.querySelector('.ex-corpo').innerHTML = (corpo || '<p class="vazio">A AgroSense não preencheu esta parte.</p>') +
          '<p class="ex-nota">A AgroSense é um modelo de nível de detalhe, não uma resposta certa. <a href="?exemplo#s-' + esc(s.id) + '" target="_blank" rel="noopener">Ver esta parte na folha da AgroSense (nova aba) ↗</a></p>';
      });
    });

    /* PDF */
    function prepararRelatorio() {
      var c = completar(todos());
      document.getElementById('relatorio').innerHTML = capa(esp.codigo + ' · ' + esp.titulo, esp.aula + ' · ' + esp.etapa, c) +
        (relatorioPagina(esp, c) || '<p class="r-vazio">Nenhuma resposta preenchida ainda.</p>');
    }
    window.addEventListener('beforeprint', prepararRelatorio);
    document.getElementById('btnPdf').onclick = function () { ctrl.salvarAgora(); prepararRelatorio(); window.print(); };

    /* navegação: seção ativa */
    var secs = Array.prototype.slice.call(app.querySelectorAll('.e-secao'));
    var links = Array.prototype.slice.call(app.querySelectorAll('.e-nav a'));
    function ativa() {
      var at = 0;
      secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < 170) at = i; });
      links.forEach(function (a, i) { a.classList.toggle('ativo', i === at); });
      var l = links[at];
      if (l && l.parentNode.scrollWidth > l.parentNode.clientWidth) {
        var p = l.parentNode, alvo = l.offsetLeft - p.clientWidth / 2 + l.clientWidth / 2;
        if (Math.abs(p.scrollLeft - alvo) > 40) p.scrollLeft = alvo;
      }
    }
    var ag = false;
    window.addEventListener('scroll', function () { if (!ag) { ag = true; requestAnimationFrame(function () { ag = false; ativa(); }); } }, { passive: true });
    ativa();
    if (location.hash) { var alvo = document.getElementById(location.hash.slice(1)); if (alvo) setTimeout(function () { alvo.scrollIntoView(); }, 60); }
    return ctrl;
  }

  /* ================= estado de cada página (para a página inicial) ================= */
  function status(id, campos) {
    var esp = P[id], ks = chavesProgresso(esp), chk = chavesChecklist(esp), autos = autosChecklist(esp), c = completar(campos);
    var n = ks.filter(function (k) { return !vazio(c[k]); }).length, marcados = chk.filter(function (k) { return c[k]; }).length;
    var m = marcados + (n ? autos.filter(function (f) { return autoOk(f, c); }).length : 0), tot = chk.length + autos.length;
    var estado = !n && !marcados ? 'vazia' : tot && m === tot && (!esp.pronta || autoOk(esp.pronta, c)) ? 'pronta' : 'andamento';
    return { campos: n, chk: m, chkTotal: tot, estado: estado,
      texto: estado === 'vazia' ? 'Não iniciada' : estado === 'pronta' ? '✓ Pronta' : 'Em andamento · lista final ' + m + ' de ' + tot };
  }

  /* ================= caderno completo ================= */
  function resumoSistema(c) {
    var objs = F.objetivos(c), as = F.acoes(c);
    if (!objs.length) return '';
    var grupos = F.PERSPECTIVAS.map(function (p) { return { p: p, os: objs.filter(function (o) { return o.persp === p[0]; }) }; });
    var sem = objs.filter(function (o) { return !o.persp; });
    if (sem.length) grupos.push({ p: ['', 'Sem perspectiva definida (Folha 7)'], os: sem });
    var h = '<section class="r-entrega r-sistema" id="p-sistema"><div class="r-entrega-cab"><span>★</span><div><h2>Resumo para o sistema do parque</h2><p>Objetivos por perspectiva, com indicador, meta, faróis e ações: a ordem de digitação no sistema.</p></div></div>';
    grupos.forEach(function (g) {
      if (!g.os.length) return;
      h += '<h3 class="r-persp">' + esc(g.p[1]) + '</h3>';
      g.os.forEach(function (o) {
        var aa = as.filter(function (a) { return a.obj === o.n; });
        h += '<div class="r-obj">' + cabObjetivo(o) + '<table class="r-tab"><tbody>' +
          (o.inds.length ? o.inds.map(linhaIndicador).join('') : '<tr><th>Indicador</th><td>—</td></tr>') +
          '<tr><th>Ações</th><td>' + (aa.length ? '<ul>' + aa.map(function (a) {
            return '<li>' + esc(a.acao) + ' <small>(' + [a.ind && 'move: ' + a.indNome, a.prio, a.resp, a.prazo, a.custo].filter(Boolean).map(esc).join(' · ') + ')</small></li>';
          }).join('') + '</ul>' : '—') + '</td></tr>' +
          (o.leva.length ? '<tr><th>Leva a</th><td>' + o.leva.map(function (t) { return esc(textoObjetivo(c, t)); }).join('<br>') + '</td></tr>' : '') +
          '</tbody></table></div>';
      });
    });
    return h + '</section>';
  }
  function caderno(alvo, campos) {
    var c = completar(campos), indice = [], partes = [];
    var rs = resumoSistema(c);
    if (rs) { indice.push('<li class="tem"><a href="#p-sistema"><b>★</b> Resumo para o sistema do parque</a><span></span></li>'); partes.push(rs); }
    F.ORDEM.forEach(function (id) {
      var esp = P[id], corpo = relatorioPagina(esp, c);
      indice.push('<li class="' + (corpo ? 'tem' : '') + '"><a href="#p-' + id + '"><b>' + esc(esp.codigo) + '</b> ' + esc(esp.titulo) + '</a><span>' + (corpo ? '' : 'ainda sem respostas') + '</span></li>');
      partes.push('<section class="r-entrega" id="p-' + id + '"><div class="r-entrega-cab"><span>' + esc(esp.codigo) + '</span><div><h2>' + esc(esp.titulo) + '</h2><p>' + esc(esp.aula + ' · ' + esp.etapa) + '</p></div></div>' +
        (corpo || '<p class="r-vazio">Esta parte ainda não tem respostas.</p>') + '</section>');
    });
    alvo.innerHTML = capa('Caderno de Estratégia', 'Da análise ao plano: diagnóstico, escolhas, objetivos, indicadores, faróis, ações e mapa estratégico', c, 'h2') +
      '<nav class="r-indice"><h2>Conteúdo</h2><ol>' + indice.join('') + '</ol></nav>' + partes.join('');
  }

  window.WS_M = { iniciar: iniciar, caderno: caderno, status: status, relatorioPagina: relatorioPagina, completar: completar, criterios: criteriosProntidao };
})();
