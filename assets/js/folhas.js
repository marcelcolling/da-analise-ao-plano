/*
 * Especificação das folhas do Caderno de Estratégia (Folhas 0 a 7), uma página por etapa do workshop.
 * O motor (motor.js) monta o formulário, o salvamento, o PDF e o caderno completo a partir daqui.
 *
 * AS CHAVES (k) NÃO PODEM MUDAR depois que as empresas começarem: os arquivos .json salvos dependem delas.
 * Para acrescentar um campo, use uma chave nova. Para tirar, apague o item (o valor antigo continua no arquivo).
 * Todas as chaves são únicas no caderno inteiro e começam pelo código da folha (f0_, f1_, f2_, f3a_, f3b_, f4_,
 * f5a_, f5b_, f6_, fc_ = fechamento, f7_).
 *
 * Página:  { id, codigo, aula, etapa, titulo, pergunta, resumo, guia: '01', secoes: [...], calcular(c) }
 * Seção:   { id, n: rótulo curto, nav: nome na barra de seções, folha, titulo, dica, passos: [...], guia: ['02', 'âncora'], exemplo: false, itens: [...] }
 * Itens:
 *   campo     { k, r: rótulo, tipo: 'texto' (padrão) | 'linha' | 'numero' | 'numerico' | 'data' | 'opcoes' | 'check' | 'objetivo' | 'indicador', ph, d: dica, op }
 *             tipo 'objetivo' = lista com os objetivos da Folha 5A (guarda o nº); 'indicador' = lista com os indicadores do
 *             objetivo escolhido na mesma linha (guarda "objetivo.indicador", ex.: "3.2")
 *   grupo     { t:'grupo', cols: 2|3, itens }
 *   caixa     { t:'caixa', r: título, d: dica, cls, itens }   (quadrante da TOWS, painel de um indicador...)
 *   tabela    { t:'tabela', r, cols: [{ r, tipo, op, ph, w }], linhas: [{ r, d, k: [chaves], rotuloDe, se(c) }], largo,
 *               item: nome da linha no celular ("Objetivo 3"), minimo: linhas visíveis no início (as seguintes abrem
 *               conforme o preenchimento ou pelo botão "Mais uma linha"), vazia: aviso quando nenhuma linha "se" aparece }
 *             coluna tipo 'calc' = calculada por calcular(c) da página (só leitura)
 *   sub       { t:'sub', r }
 *   nota      { t:'nota', html }          orientação (não vai para o PDF)
 *   espelho   { t:'espelho', k, r, vazio }  mostra, sem editar, uma resposta de outra folha
 *   trazer    { t:'trazer', r, mapa: { destino: origem } }
 *   checklist { t:'checklist', itens: [[k, texto] | { r: texto, auto: função(campos), ir: id da seção }] }   "Sua folha está pronta quando…"
 *             (não vai para o PDF). [k, texto] = o participante marca (julgamento); { auto } = o caderno confere sozinho
 *             (com "ir", o item pendente leva à seção onde se resolve). A página fica "pronta" (na home) quando todos os itens estão ok.
 *   especial  { t:'especial', nome, n }   componentes com lógica própria (motor.js › ESPECIAIS)
 *   mais      { t:'mais', r, itens }      bloco recolhível (abre sozinho se tiver algo preenchido)
 *   caixa com limpar: true                botão "Limpar" que esvazia os campos da caixa
 *   progressivo { t:'progressivo', minimo, botao, itens }   mostra "minimo" itens e os preenchidos; o botão abre o seguinte
 *   porObjetivo { t:'porObjetivo', itens: [{ t:'objetivo', n, itens }] }   uma aba por objetivo escrito na Folha 5A
 *   Em qualquer campo: opcional: true (não conta no progresso), relatorio: false (não vai para o PDF)
 */
(function () {
  'use strict';

  /* ---------------- guias (gerados de conteudo/*.md) ---------------- */
  var GUIAS = {
    '00': { url: 'guias/00-guia-de-uso.html', nome: 'Guia de uso do caderno' },
    '01': { url: 'guias/01-ponto-de-partida.html', nome: 'Guia 01 · Ponto de partida' },
    '02': { url: 'guias/02-analise-de-ambiente.html', nome: 'Guia 02 · Análise de ambiente' },
    '03': { url: 'guias/03-porter-atividades.html', nome: 'Guia 03 · Porter: a estratégia está nas atividades' },
    '04': { url: 'guias/04-bcg-ansoff.html', nome: 'Guia 04 · Matrizes BCG e Ansoff' },
    '05': { url: 'guias/05-objetivos-indicadores-farois.html', nome: 'Guia 05 · Objetivos, indicadores e faróis' },
    '06': { url: 'guias/06-acoes.html', nome: 'Guia 06 · Ações que movem indicadores' },
    '07': { url: 'guias/07-bsc-mapa-estrategico.html', nome: 'Guia 07 · BSC e mapa estratégico' }
  };

  /* ---------------- referências comuns ---------------- */
  var ESTAGIOS = ['Entender', 'Estruturar', 'Desenvolver', 'Consolidar', 'Expandir'];
  var MATRIZ = [
    { id: 'gestao', nome: 'Gestão', itens: ['Alinhamento de futuro', 'Problemas estratégicos, planejamento, indicadores', 'Indicadores e metas (táticos e operacionais), modelo de gestão', 'Ampliação do modelo de gestão, desdobramento de metas com a equipe', 'Sistema de gestão, governança corporativa'] },
    { id: 'operacao', nome: 'Operação', itens: ['Pontos vitais, processos de valor', 'Método, padronização dos processos', 'Sistemas e controles de operação (estoque, compras, ciclo de operação, capacidade produtiva)', 'Gestão de projetos, gestão de estoque e compras, logística', 'Tecnologia e inovação, estratégia de canais, estratégia de cadeia de valor'] },
    { id: 'comercial', nome: 'Comercial', itens: ['Público-alvo, proposta de valor, proposta comercial', 'Estrutura comercial e atendimento, precificação, estratégia de aquisição de clientes', 'Gestão de vendas, jornada do cliente, gestão de mix', 'Gestão comercial, gestão de canais', 'Novos mercados, novos negócios'] },
    { id: 'pessoas', nome: 'Pessoas', itens: ['Valores, funções dos sócios', 'Cultura, estrutura de pessoas, estratégia de contratação', 'Estrutura de lideranças, plano de gente, gestão de pessoas', 'Formação de lideranças, remuneração variável, gestão de desempenho', 'Partnership, gestão de talentos'] },
    { id: 'financeiro', nome: 'Financeiro', itens: ['Separação PF × PJ, pró-labore, registro e controle das informações', 'Plano de contas, ferramenta financeira, análise gerencial', 'Plano orçamentário, processo de forecast, gestão financeira, controladoria', 'Estrutura de capital, plano financeiro de LP, gestão de recursos', 'Valuation, M&A e auditoria, gestão de patrimônio'] },
    { id: 'estrategia', nome: 'Estratégia', itens: ['Ambições dos sócios, modelagem do negócio, missão', 'Modelo de negócio, acordo de sócios, visão', 'Ampliação do modelo de negócio (novos produtos, novos canais), ciclos estratégicos, estratégia de LP', 'Estratégia de expansão', 'Funding para expansão, processo de expansão'] }
  ];
  var PERSPECTIVAS = [
    ['fin', '💰 Financeira', 'Como geramos valor econômico?'],
    ['cli', '🤝 Clientes / Mercado', 'Como queremos ser percebidos, e por quem?'],
    ['pro', '⚙️ Processos internos', 'Em que precisamos ser excelentes?'],
    ['apr', '🌱 Aprendizado e crescimento', 'Que pessoas, competências, tecnologia e cultura sustentam tudo isso?']
  ];
  // até 10 objetivos, cada um com até 3 indicadores (chaves f5a_o{i}_i{j}_* e f5b_o{i}_i{j}_*), e até 12 ações
  var N_OBJ = 10, N_IND = 3, N_ACOES = 12;
  function seq(n) { var a = []; for (var i = 1; i <= n; i++) a.push(i); return a; }
  var AB = [['A', 'Alto'], ['B', 'Baixo']];
  /* Itens das listas finais que o próprio caderno confere ({ auto: função(campos), r: texto }); os demais são marcados à mão. */
  function tem(c, k) { return !!String(c[k] || '').trim(); }
  var QUADS = ['fo', 'fa', 'wo', 'wa'];
  function nomesGargalo(c) { return MATRIZ.slice(0, 5).filter(function (d) { return c['f3a_' + d.id + '_garg']; }).map(function (d) { return d.nome; }); }

  /* =====================================================================
   * Abertura · Folha 0 — Ponto de partida
   * ===================================================================== */
  var ABERTURA = {
    id: 'abertura', codigo: 'Folha 0', aula: 'Aula 1', etapa: 'Abertura', titulo: 'Ponto de partida',
    pergunta: 'Quem a empresa é hoje e aonde quer chegar?',
    resumo: 'Antes de qualquer conceito, deixe escrito o negócio de hoje e a ambição para daqui a 3 anos. É contra essa referência que todo o resto do caderno será testado.',
    guia: '01',
    secoes: [
      { id: 'empresa', n: '0', nav: 'A empresa', folha: 'Folha 0', titulo: 'A empresa e quem está na mesa',
        dica: 'Estes dados aparecem na capa dos PDFs. Os números de partida servem de linha de base mais adiante (Folha 5A).',
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'f0_empresa', r: 'Nome da empresa', tipo: 'linha', ph: 'Como a empresa quer aparecer no caderno' },
            { k: 'f0_perfil', r: 'Vínculo com o parque', tipo: 'opcoes', op: ['Incubada', 'Residente', 'Pequena ou média empresa associada', 'Outro vínculo'] },
            { k: 'f0_setor', r: 'O que a empresa faz, em poucas palavras', tipo: 'linha', ph: 'Ex.: sensores IoT e plataforma de monitoramento de lavouras' },
            { k: 'f0_participantes', r: 'Quem está preenchendo (nomes e funções)', tipo: 'linha', ph: 'Ex.: Ana (sócia comercial), Rui (operações)' }
          ] },
          { t: 'sub', r: 'Números de partida (aproximados)' },
          { t: 'grupo', cols: 3, itens: [
            { k: 'f0_faturamento', r: 'Faturamento dos últimos 12 meses', tipo: 'linha', ph: 'Ex.: ≈ R$ 1,8 milhão' },
            { k: 'f0_clientes', r: 'Número de clientes', tipo: 'linha', ph: 'Ex.: 40 produtores + 2 cooperativas' },
            { k: 'f0_produtos', r: 'Principais produtos ou serviços', tipo: 'linha', ph: 'Ex.: sensores; plataforma por assinatura' }
          ] }
        ] },
      { id: 'hoje', n: '0', nav: 'Hoje', folha: 'Folha 0', titulo: 'Hoje somos uma empresa que…',
        dica: 'Não é missão nem slogan: é uma descrição honesta, sem adjetivos.',
        guia: ['01', 'passo-a-passo'],
        passos: ['Escreva o que vende e para quem vende hoje, não o que gostaria de vender.', 'Incubada sem clientes? Descreva o que está construindo e com quem está validando.'],
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'f0_hoje_que', r: 'Hoje somos uma empresa que…', ph: 'Ex.: vende sensores de solo e uma plataforma de monitoramento de lavouras' },
            { k: 'f0_hoje_para', r: '…para…', ph: 'Ex.: produtores médios de grãos e algumas cooperativas' }
          ] }
        ] },
      { id: 'futuro', n: '0', nav: 'Daqui a 3 anos', folha: 'Folha 0', titulo: 'Daqui a 3 anos, queremos…',
        dica: 'Uma ambição qualitativa (como o mercado vai enxergar a empresa) e uma quantitativa (o número que prova que chegou lá). Sem número, a frase vira desejo.',
        guia: ['01', 'o-essencial'],
        passos: ['Na parte qualitativa, escreva como clientes, parceiros e concorrentes devem enxergar a empresa.', 'No número, um ou dois indicadores: faturamento, nº de clientes, % de receita recorrente, margem, mercados atendidos.', 'Leia as duas frases em voz alta para quem está na mesa. Se alguém discordar, ótimo: é melhor descobrir agora.'],
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'f0_fut_reconhecidos', r: '…ser reconhecidos por…', ph: 'Ex.: ser a parceira de agricultura de precisão das cooperativas de grãos do estado' },
            { k: 'f0_fut_numero', r: '…e ter (um número)', ph: 'Ex.: R$ 6 milhões de faturamento, com 70% de receita recorrente' }
          ] },
          { k: 'f0_divergencia', r: 'Divergências entre os sócios (se houver)', d: 'Se os sócios discordam sobre o futuro, escreva as duas versões. A divergência é um achado: resolva antes da Aula 2.', ph: 'Opcional' }
        ] },
      { id: 'pronta', n: '✓', nav: 'Pronta?', titulo: 'Sua folha está pronta quando…', exemplo: false,
        itens: [ { t: 'checklist', itens: [
          ['f0_chk1', 'A frase 1 descreve o negócio real de hoje, sem adjetivos.'],
          { r: 'A frase 2 tem uma parte qualitativa e um número.', ir: 'futuro', auto: function (c) { return tem(c, 'f0_fut_reconhecidos') && /\d/.test(c.f0_fut_numero || ''); } },
          ['f0_chk3', 'Os participantes da mesma empresa concordam com as duas frases (ou registraram a divergência).']
        ] } ] }
    ]
  };

  /* =====================================================================
   * Bloco 1 · Folhas 1 (Radar do ambiente) e 2 (Cruzamento TOWS)
   * ===================================================================== */
  function linhasRadar(prefixo, rotulo, vrio) {
    return seq(3).map(function (i) {
      return { r: rotulo + i, k: [prefixo + i, prefixo + i + '_ev'].concat(vrio ? [prefixo + i + '_vrio'] : []) };
    });
  }
  var COLS_RADAR = [{ r: 'Item', ph: 'Específico para a sua empresa', w: '42%' }, { r: 'Evidência', ph: 'Número, fato, fala de cliente… ou "a levantar"' }];
  var VRIO = ['Vantagem sustentável (V, R, I e O)', 'Vantagem temporária (V e R)', 'Paridade (só valiosa)', 'Ainda não sei'];
  function quadrante(cod, nome, verbo, d) {
    var p = 'f2_' + cod;
    return { t: 'caixa', r: nome, cls: 'quad quad-' + cod, d: d, itens: [
      { k: p + '1', r: 'Direção 1 (começa com verbo)', ph: verbo },
      { k: p + '1_orig', r: 'Itens da Folha 1 que a originaram', tipo: 'linha', ph: 'Ex.: F2 + O1' },
      { k: p + '2', r: 'Direção 2 (opcional)' },
      { k: p + '2_orig', r: 'Origem da direção 2', tipo: 'linha' }
    ] };
  }
  var BLOCO1 = {
    id: 'bloco1', codigo: 'Folhas 1 e 2', aula: 'Aula 1', etapa: 'Bloco 1', titulo: 'Análise de ambiente e cruzamento TOWS',
    pergunta: 'O que o ambiente oferece e ameaça, o que temos de melhor e de pior, e o que fazemos com isso?',
    resumo: 'Olhe para fora (oportunidades e ameaças) e para dentro (forças e fraquezas, sempre com evidência). Depois cruze os dois para gerar pelo menos quatro direções estratégicas.',
    guia: '02',
    secoes: [
      { id: 'externo', n: '1', nav: 'Radar externo', folha: 'Folha 1', titulo: 'Radar: ambiente externo',
        dica: 'Oportunidade e ameaça são coisas que acontecem lá fora: a empresa não controla. Escolha as 3 de cada que mudam o resultado da empresa nos próximos 2–3 anos.',
        guia: ['02', 'ambiente-externo-dois-niveis'],
        passos: ['Passe rapidamente pelo PESTEL e pelas Cinco Forças (abra a varredura abaixo) e anote tudo no rascunho.', 'Escolha as 3 oportunidades e as 3 ameaças mais relevantes.', 'Para cada uma, anote a evidência.', 'Incubadas: foquem em mercado-alvo e concorrência direta. Residentes e PMEs: incluam cadeia de fornecimento e regulação.'],
        itens: [
          { t: 'nota', html: '<details class="varredura"><summary>Varredura rápida: PESTEL e Cinco Forças</summary><div class="varredura-grade">' +
            '<div><strong>PESTEL</strong><ul><li><b>Político:</b> programas, compras públicas ou incentivos que me afetam?</li><li><b>Econômico:</b> juros, câmbio e crédito afetam meu cliente ou meus custos?</li><li><b>Social:</b> mudanças de comportamento aumentam ou reduzem a demanda?</li><li><b>Tecnológico:</b> IA, conectividade, automação criam ou destroem espaço para mim?</li><li><b>Ecológico:</b> exigências ambientais geram demanda ou restrição?</li><li><b>Legal:</b> LGPD, regulação setorial, certificações: o que me obriga ou me protege?</li><li><b>Fomento e ecossistema:</b> Finep, fundação de amparo à pesquisa, editais, o próprio parque, universidades, investidores.</li></ul></div>' +
            '<div><strong>Cinco Forças</strong> <em>— quem pode capturar o valor que eu gero?</em><ul><li><b>Rivalidade:</b> quantos concorrentes diretos? A disputa é por preço?</li><li><b>Novos entrantes:</b> é fácil alguém entrar no meu mercado amanhã?</li><li><b>Substitutos:</b> o cliente resolve de outro jeito (inclusive planilha ou "não fazer nada")?</li><li><b>Poder do cliente:</b> poucos e grandes? Conseguem pressionar o preço?</li><li><b>Poder do fornecedor:</b> dependo de poucos fornecedores (componentes, nuvem, plataformas)?</li></ul></div>' +
            '</div></details>' },
          { k: 'f1_rascunho', r: 'Rascunho da varredura', d: 'Tudo o que vier à cabeça. Não vai para o PDF.', ph: 'Opcional', opcional: true, relatorio: false },
          { t: 'tabela', r: 'Oportunidades', cols: COLS_RADAR, linhas: linhasRadar('f1_o', 'O') },
          { t: 'tabela', r: 'Ameaças', cols: COLS_RADAR, linhas: linhasRadar('f1_a', 'A') }
        ] },
      { id: 'interno', n: '1', nav: 'Radar interno', folha: 'Folha 1', titulo: 'Radar: ambiente interno',
        dica: 'Força sem evidência é desejo: uma força só é força se o cliente percebe e paga por ela. Use o teste VRIO para ver se ela é vantagem ou só paridade.',
        guia: ['02', 'ambiente-interno-forca-sem-evidencia-e-desejo'],
        passos: ['Liste 3 forças e 3 fraquezas, cada uma com uma evidência (número, fato, fala de cliente).', 'Para cada força, faça o teste VRIO: valiosa? rara? difícil de imitar? a empresa está organizada para explorá-la?', 'Revise com o teste do controle: algum item interno foi parar no externo, ou vice-versa?'],
        itens: [
          { t: 'tabela', r: 'Forças', cols: [COLS_RADAR[0], COLS_RADAR[1], { r: 'Teste VRIO', tipo: 'opcoes', op: VRIO, w: '20%' }], linhas: linhasRadar('f1_f', 'F', true) },
          { t: 'tabela', r: 'Fraquezas', cols: COLS_RADAR, linhas: linhasRadar('f1_q', 'f') }
        ] },
      { id: 'tows', n: '2', nav: 'TOWS', folha: 'Folha 2', titulo: 'Cruzamento TOWS: as direções estratégicas',
        dica: 'A SWOT para no diagnóstico; a TOWS cruza os quadrantes e gera direções. Cada direção começa com um verbo e combina pelo menos um item de cada lado.',
        guia: ['02', 'do-diagnostico-a-direcao-a-tows-swot-cruzada'],
        passos: ['Para cada quadrante, pegue um item de cada lado e pergunte: "o que fazemos com isso?"', 'Escreva pelo menos uma direção por quadrante (mínimo de 4). Comece com verbo: ampliar, lançar, reduzir, padronizar, proteger, migrar…', 'Anote os itens da Folha 1 que deram origem a cada direção (ex.: F1 + O2).'],
        itens: [
          { t: 'especial', nome: 'radar' },
          { t: 'grupo', cols: 2, itens: [
            quadrante('fo', 'FO — Crescer', 'Ex.: Criar pacote de monitoramento financiável via cooperativa', 'Forças × Oportunidades: use forças para aproveitar oportunidades.'),
            quadrante('fa', 'FA — Defender', 'Ex.: Oferecer recomendações independentes da marca da máquina', 'Forças × Ameaças: use forças para neutralizar ameaças.'),
            quadrante('wo', 'fO — Desenvolver', 'Ex.: Padronizar a implantação para atender em escala', 'Fraquezas × Oportunidades: corrija fraquezas para não perder oportunidades.'),
            quadrante('wa', 'fA — Proteger', 'Ex.: Migrar a receita para assinatura', 'Fraquezas × Ameaças: reduza a exposição onde você é fraco e o ambiente é hostil.')
          ] }
        ] },
      { id: 'critico', n: '?', titulo: 'Crítico amigo',
        dica: 'Troque as Folhas 1 e 2 com outra empresa. Cada uma marca com "?" a força que parece não ter evidência e a direção que parece genérica demais. Devolvam e ajustem.',
        itens: [ { k: 'f2_critico', r: 'O que a outra empresa questionou e o que vocês ajustaram', ph: 'Ex.: "Equipe qualificada" não tinha evidência; trocamos por "3 agrônomos na equipe, citados como motivo de renovação".' } ] },
      { id: 'pronta', n: '✓', nav: 'Pronta?', titulo: 'Suas folhas estão prontas quando…', exemplo: false,
        itens: [ { t: 'checklist', itens: [
          ['f2_chk1', 'As 3 oportunidades e as 3 ameaças são específicas para a sua empresa.'],
          { r: 'Cada força e fraqueza tem uma evidência (ou está marcada como "a levantar").', ir: 'interno', auto: function (c) { return seq(3).every(function (i) { return tem(c, 'f1_f' + i) && tem(c, 'f1_f' + i + '_ev') && tem(c, 'f1_q' + i) && tem(c, 'f1_q' + i + '_ev'); }); } },
          ['f2_chk3', 'Nenhum item interno está no externo, e vice-versa.'],
          { r: 'Há pelo menos uma direção em cada quadrante da TOWS.', ir: 'tows', auto: function (c) { return QUADS.every(function (q) { return tem(c, 'f2_' + q + '1') || tem(c, 'f2_' + q + '2'); }); } },
          ['f2_chk4', 'Cada direção começa com um verbo e é uma ação estratégica, não a reescrita de um item.'],
          { r: 'Cada direção indica os itens da Folha 1 que a originaram.', ir: 'tows', auto: function (c) { var n = 0; return QUADS.every(function (q) { return [1, 2].every(function (i) { if (!tem(c, 'f2_' + q + i)) return true; n++; return tem(c, 'f2_' + q + i + '_orig'); }); }) && n > 0; } }
        ] } ] }
    ]
  };

  /* =====================================================================
   * Bloco 2 · Folhas 3A (Diagnóstico de maturidade) e 3B (Sistema de atividades)
   * ===================================================================== */
  var DIMS_EO = MATRIZ.slice(0, 5);
  var BLOCO2 = {
    id: 'bloco2', codigo: 'Folhas 3A e 3B', aula: 'Aula 1', etapa: 'Bloco 2', titulo: 'Porter: maturidade e sistema de atividades',
    pergunta: 'O que precisamos fazer melhor, e o que vamos fazer diferente?',
    resumo: 'Eficácia operacional (EO) é fazer melhor o que todos fazem: o diagnóstico de maturidade mostra o próximo passo. Posicionamento (POS) é fazer diferente, com renúncias: o sistema de atividades mostra como ele se sustenta.',
    guia: '03',
    secoes: [
      { id: 'matriz', n: '3A', nav: 'Maturidade', folha: 'Folha 3A', titulo: 'Diagnóstico de maturidade',
        dica: 'Estágio atual = o último estágio cujos itens a empresa já pratica todos; o que estiver pela metade é o próximo passo. A matriz não dá nota, e estar em "Entender" ou "Estruturar" é o esperado para incubadas.',
        guia: ['03', 'parte-a-matriz-de-maturidade-para-a-eo'],
        passos: ['Em cada dimensão, marque o estágio atual e anote uma evidência.', 'Escreva uma atividade do próximo estágio que a empresa precisa dominar (a lista aparece quando você escolhe o estágio).', 'Marque a dimensão gargalo: a mais atrasada, ou a que mais trava as direções da TOWS.'],
        itens: [
          { t: 'especial', nome: 'matriz' },
          { t: 'tabela', r: 'As cinco dimensões da eficácia operacional', largo: true,
            cols: [{ r: 'Estágio atual', tipo: 'opcoes', op: ESTAGIOS, w: '15%' }, { r: 'Evidência', ph: 'O que mostra que vocês estão nesse estágio' }, { r: 'Atividade do próximo estágio' }, { r: 'Gargalo?', tipo: 'check', w: '9%' }],
            linhas: DIMS_EO.map(function (d) { return { r: d.nome, k: ['f3a_' + d.id + '_est', 'f3a_' + d.id + '_ev', 'f3a_' + d.id + '_prox', 'f3a_' + d.id + '_garg'] }; }) },
          { t: 'sub', r: 'Linha Estratégia (conversa com o posicionamento e com Ansoff)' },
          { t: 'grupo', cols: 2, itens: [
            { k: 'f3a_estrategia_est', r: 'Estágio atual na linha Estratégia', tipo: 'opcoes', op: ESTAGIOS },
            { k: 'f3a_estrategia_ev', r: 'Evidência', tipo: 'linha' }
          ] }
        ] },
      { id: 'direcoes-eo', n: '3A', nav: 'Direções de EO', folha: 'Folha 3A', titulo: 'Direções de eficácia operacional',
        dica: 'Capacidade de execução é limitada: não escolha mais de 3.',
        guia: ['03', 'passo-a-passo-folha-3a'],
        passos: ['Escolha 2 ou 3 das atividades do próximo estágio como direções de EO, pelo menos uma no gargalo.', 'Compare com a TOWS (Folha 2): se um quadrante fO ou fA já falava disso, unifique as duas e anote qual.'],
        itens: [
          { t: 'tabela', cols: [{ r: 'Direção de EO (atividade)' }, { r: 'Dimensão', tipo: 'opcoes', op: DIMS_EO.map(function (d) { return d.nome; }), w: '16%' }, { r: 'Unifica com a TOWS?', tipo: 'linha', ph: 'Ex.: fO', w: '22%' }],
            linhas: seq(3).map(function (i) { return { r: String(i), k: ['f3a_eo' + i, 'f3a_eo' + i + '_dim', 'f3a_eo' + i + '_tows'] }; }) }
        ] },
      { id: 'sistema', n: '3B', nav: 'Sistema de atividades', folha: 'Folha 3B', titulo: 'Sistema de atividades do posicionamento',
        dica: 'O concorrente copia uma atividade; copiar o sistema inteiro é muito mais difícil. Cada caixa precisa ser algo que a empresa faz e que alguém consegue observar.',
        guia: ['03', 'parte-b-sistema-de-atividades-para-o-pos'],
        passos: ['Escolha um posicionamento, normalmente do quadrante FO da TOWS. Se não houver: "que tipo de cliente, necessidade ou canal escolhemos atender melhor do que qualquer um?"', 'Identifique a base: variedade, necessidade ou acesso.', 'Liste de 4 a 6 atividades que entregam o posicionamento de forma diferente (como vendemos, implantamos, precificamos, atendemos, desenvolvemos).', 'Diga com quais atividades cada uma se reforça: o desenho se monta sozinho.'],
        itens: [
          { t: 'trazer', r: '↻ Trazer a direção FO da Folha 2 para o posicionamento', mapa: { f3b_pos: 'f2_fo1' } },
          { t: 'grupo', cols: 2, itens: [
            { k: 'f3b_pos', r: 'Posicionamento', ph: 'Ex.: parceira de agricultura de precisão das cooperativas de grãos' },
            { k: 'f3b_base', r: 'Base do posicionamento', tipo: 'opcoes', op: ['Variedade', 'Necessidade', 'Acesso', 'Variedade + necessidade', 'Necessidade + acesso', 'Variedade + acesso'],
              d: 'Variedade: oferta específica feita muito bem. Necessidade: grupo de clientes com necessidade particular. Acesso: clientes alcançados de forma diferente (região, porte, canal).' }
          ] },
          { t: 'tabela', r: 'Atividades que entregam o posicionamento (de 4 a 6)', item: 'Atividade', minimo: 4,
            cols: [{ r: 'Atividade (o que fazemos de um jeito diferente)' }, { r: 'Reforça as atividades nº', tipo: 'linha', ph: 'Ex.: 2, 4', w: '24%' }],
            linhas: seq(6).map(function (i) { return { r: String(i), k: ['f3b_at' + i, 'f3b_at' + i + '_liga'] }; }) },
          { t: 'especial', nome: 'sistema' }
        ] },
      { id: 'testes', n: '3B', nav: 'Trade-off e imitação', folha: 'Folha 3B', titulo: 'Testes do trade-off e da imitação',
        dica: 'Renúncia de verdade dói: é um cliente, produto ou receita de que você abre mão. Se não há renúncia, provavelmente não é estratégia.',
        guia: ['03', 'trade-off-o-que-voce-escolhe-nao-fazer'],
        passos: ['Se o conjunto de atividades for fácil de copiar, o posicionamento ainda é fraco: volte às atividades e reforce as ligações.'],
        itens: [
          { k: 'f3b_tradeoff', r: 'Para isso, vamos deixar de…', ph: 'Ex.: vender sensores avulsos a pequenos produtores e atender culturas fora de grãos' },
          { t: 'grupo', cols: 2, itens: [
            { k: 'f3b_imit_uma', r: 'Um concorrente copiaria uma atividade facilmente? Qual?' },
            { k: 'f3b_imit_conj', r: 'E o conjunto todo? Por quê?' }
          ] }
        ] },
      { id: 'pronta', n: '✓', nav: 'Pronta?', titulo: 'Suas folhas estão prontas quando…', exemplo: false,
        itens: [ { t: 'checklist', itens: [
          { r: 'Cada uma das 5 dimensões de EO tem estágio, evidência e próximo passo.', ir: 'matriz', auto: function (c) { return DIMS_EO.every(function (d) { return tem(c, 'f3a_' + d.id + '_est') && tem(c, 'f3a_' + d.id + '_ev') && tem(c, 'f3a_' + d.id + '_prox'); }); } },
          { r: 'O gargalo está identificado.', ir: 'matriz', auto: function (c) { return nomesGargalo(c).length > 0; } },
          { r: 'Há 2 ou 3 direções de EO, com pelo menos uma no gargalo.', ir: 'direcoes-eo', auto: function (c) {
            var eo = seq(3).filter(function (i) { return tem(c, 'f3a_eo' + i); }), g = nomesGargalo(c);
            return eo.length >= 2 && eo.some(function (i) { return g.indexOf(c['f3a_eo' + i + '_dim']) >= 0; });
          } },
          { r: 'O posicionamento tem base definida e de 4 a 6 atividades ligadas entre si.', ir: 'sistema', auto: function (c) {
            var at = seq(6).filter(function (i) { return tem(c, 'f3b_at' + i); });
            return tem(c, 'f3b_pos') && tem(c, 'f3b_base') && at.length >= 4 && at.every(function (i) { return tem(c, 'f3b_at' + i + '_liga') || at.some(function (j) { return WS_F.numeros(c['f3b_at' + j + '_liga']).indexOf(i) >= 0; }); });
          } },
          ['f3_chk4', 'As atividades são concretas: algo que a empresa faz e alguém consegue observar.'],
          ['f3_chk5', 'O trade-off é uma renúncia real.'],
          ['f3_chk6', 'O conjunto de atividades é difícil de copiar.']
        ] } ] }
    ]
  };

  /* =====================================================================
   * Bloco 3 · Folha 4 (Portfólio e crescimento)
   * ===================================================================== */
  var ANSOFF = ['Penetração de mercado', 'Desenvolvimento de mercado', 'Desenvolvimento de produto', 'Diversificação'];
  var BLOCO3 = {
    id: 'bloco3', codigo: 'Folha 4', aula: 'Aula 1', etapa: 'Bloco 3', titulo: 'Portfólio (BCG) e crescimento (Ansoff)',
    pergunta: 'Onde colocar dinheiro e energia, e por qual caminho crescer?',
    resumo: 'A BCG ajuda a decidir onde investir entre o que você já vende (use como foto, não como sentença). A Ansoff ajuda a escolher um vetor de crescimento coerente com o posicionamento e com a maturidade.',
    guia: '04',
    secoes: [
      { id: 'bcg', n: '4', nav: 'BCG', folha: 'Folha 4', titulo: 'Matriz BCG: onde investir',
        dica: 'Um produto só? Aplique a matriz a segmentos de clientes ou a linhas de receita (licença, implantação, suporte…). Sem dado de participação de mercado, use força relativa: crescimento comparado ao do mercado, margem, renovação.',
        guia: ['04', 'o-essencial-matriz-bcg'],
        passos: ['Liste de 3 a 5 produtos, serviços, linhas de receita ou segmentos.', 'Para cada um, avalie o crescimento do mercado e a posição competitiva: o quadrante aparece sozinho.', 'Registre uma decisão para cada um.', 'Confira o equilíbrio: há uma vaca leiteira financiando as apostas? Há apostas para o futuro?'],
        itens: [
          { t: 'tabela', largo: true,
            cols: [{ r: 'Produto, serviço ou segmento', tipo: 'linha', w: '24%' }, { r: 'Mercado cresce', tipo: 'opcoes', op: ['Rápido', 'Devagar'], w: '12%' }, { r: 'Posição competitiva', tipo: 'opcoes', op: ['Forte', 'Fraca'], w: '12%' },
              { r: 'Quadrante', tipo: 'calc', w: '15%' }, { r: 'Decisão', tipo: 'opcoes', op: ['Investir', 'Manter', ['Testar', 'Testar (investir seletivamente)'], 'Reposicionar', 'Descontinuar'], w: '13%' }, { r: 'Por quê', ph: 'Evidência da posição ou detalhe da decisão' }],
            item: 'Item', minimo: 3,
            linhas: seq(5).map(function (i) { var p = 'f4_bcg' + i + '_'; return { r: String(i), k: [p + 'item', p + 'merc', p + 'pos', p + 'quad', p + 'dec', p + 'obs'] }; }) },
          { t: 'especial', nome: 'bcg' },
          { k: 'f4_bcg_equilibrio', r: 'Equilíbrio do portfólio', ph: 'O que financia as apostas? O que fica com menos atenção para que as estrelas recebam mais?' }
        ] },
      { id: 'ansoff', n: '4', nav: 'Ansoff', folha: 'Folha 4', titulo: 'Matriz de Ansoff: por onde crescer',
        dica: 'O risco cresce da penetração para a diversificação. Penetração não é falta de ambição: para muitas empresas pequenas, é o vetor de maior retorno e menor risco. Escolha um.',
        guia: ['04', 'o-essencial-matriz-de-ansoff'],
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'f4_ans_hoje', r: 'Onde está a maior parte da receita hoje', tipo: 'opcoes', op: ANSOFF },
            { k: 'f4_ans_vetor', r: 'Vetor prioritário (12–24 meses)', tipo: 'opcoes', op: ANSOFF }
          ] },
          { t: 'especial', nome: 'ansoff' },
          { k: 'f4_ans_just', r: 'Por que esse vetor e não outro? (uma linha)', tipo: 'linha', ph: 'Ex.: antes de ir para outros estados, é preciso conseguir implantar em escala' }
        ] },
      { id: 'integracao', n: '4', nav: 'Integração', folha: 'Folha 4', titulo: 'Integração com Porter e com a maturidade',
        dica: 'Crescimento que obriga a abandonar o trade-off da Folha 3B é um alerta: pode diluir o posicionamento. Crescer também exige base: confira a maturidade.',
        guia: ['04', 'duas-conexoes-importantes'],
        itens: [
          { t: 'espelho', k: 'f3b_tradeoff', r: 'Seu trade-off (Folha 3B)', vazio: 'Ainda não preenchido na Folha 3B.' },
          { t: 'espelho', k: 'f3a_estrategia_est', r: 'Estágio na linha Estratégia (Folha 3A)', vazio: 'Ainda não preenchido na Folha 3A.' },
          { k: 'f4_int_direcao', r: 'A escolha gera uma nova direção ou reforça uma existente? Qual?' },
          { k: 'f4_int_coerencia', r: 'É coerente com o trade-off e com a maturidade? Por quê?' }
        ] },
      { id: 'pronta', n: '✓', nav: 'Pronta?', titulo: 'Sua folha está pronta quando…', exemplo: false,
        itens: [ { t: 'checklist', itens: [
          { r: 'De 3 a 5 itens estão na BCG, cada um com uma decisão.', ir: 'bcg', auto: function (c) { var it = seq(5).filter(function (i) { return tem(c, 'f4_bcg' + i + '_item'); }); return it.length >= 3 && it.every(function (i) { return tem(c, 'f4_bcg' + i + '_dec'); }); } },
          { r: 'O portfólio tem pelo menos uma fonte de caixa (vaca leiteira ou estrela) e uma aposta de futuro (estrela ou interrogação).', ir: 'bcg', auto: function (c) {
            var q = BLOCO3.calcular(c), qs = seq(5).map(function (i) { return q['f4_bcg' + i + '_quad']; });
            return qs.some(function (x) { return /Vaca|Estrela/.test(x); }) && qs.some(function (x) { return /Estrela|Interroga/.test(x); });
          } },
          { r: 'Há um vetor de Ansoff prioritário, com justificativa.', ir: 'ansoff', auto: function (c) { return tem(c, 'f4_ans_vetor') && tem(c, 'f4_ans_just'); } },
          ['f4_chk4', 'A escolha é coerente com o trade-off (Folha 3B) e com a maturidade (Folha 3A).']
        ] } ] }
    ],
    calcular: function (c) {
      var out = {};
      seq(5).forEach(function (i) {
        var p = 'f4_bcg' + i + '_', m = c[p + 'merc'], s = c[p + 'pos'];
        out[p + 'quad'] = m && s ? (m === 'Rápido' ? (s === 'Forte' ? '⭐ Estrela' : '❓ Interrogação') : (s === 'Forte' ? '🐄 Vaca leiteira' : '🍍 Abacaxi')) : '';
      });
      return out;
    }
  };

  /* =====================================================================
   * Bloco 4 · Folhas 5A (Objetivos e indicadores) e 5B (Painel de controle)
   * Passo 1: os objetivos (EO/POS, gargalo). Passo 2: para cada objetivo, de 1 a 3 indicadores, cada um com
   * teste da vaidade, ficha, meta e farol (5B). O painel de controle se monta sozinho com esses indicadores.
   * ===================================================================== */
  function indicadorItens(i, j) {
    var p = 'f5a_o' + i + '_i' + j + '_', b = 'f5b_o' + i + '_i' + j + '_', ref = i + '.' + j;
    return { t: 'caixa', cls: 'ind', r: 'Indicador ' + j, rotuloDe: p + 'nome', limpar: true, itens: [
      { t: 'especial', nome: 'indEstado', n: ref },
      { t: 'grupo', cols: 3, itens: [
        { k: p + 'nome', r: 'Nome do indicador', tipo: 'linha', ph: 'A régua. Ex.: % da receita que é recorrente' },
        { k: p + 'tipo', r: 'Tipo', tipo: 'opcoes', op: ['Resultado', 'Tendência'], d: 'Resultado mostra se chegou; tendência avisa antes.' },
        { k: p + 'vaid', r: 'Passa no teste da vaidade?', tipo: 'check', d: 'Se este número cair, vocês mudam alguma coisa? Marque só se a resposta for sim.' }
      ] },
      { t: 'sub', r: 'Ficha' },
      { t: 'grupo', cols: 3, itens: [
        { k: p + 'formula', r: 'Fórmula', tipo: 'linha', ph: 'Como se calcula' },
        { k: p + 'unidade', r: 'Unidade', tipo: 'linha', ph: 'R$, %, dias, nº…' },
        { k: p + 'fonte', r: 'Fonte do dado', tipo: 'linha', ph: 'De onde vem' },
        { k: p + 'freq', r: 'Frequência', tipo: 'opcoes', op: ['Semanal', 'Quinzenal', 'Mensal', 'Trimestral', 'Semestral'] },
        { k: p + 'pol', r: 'Polaridade', tipo: 'opcoes', op: ['Quanto maior, melhor', 'Quanto menor, melhor'] },
        { k: p + 'resp', r: 'Responsável', tipo: 'linha', ph: 'Uma pessoa, não uma área' }
      ] },
      { t: 'sub', r: 'Meta' },
      { t: 'grupo', cols: 3, itens: [
        { k: p + 'base', r: 'Linha de base', tipo: 'linha', ph: 'Valor atual ou "a levantar"' },
        { k: p + 'meta', r: 'Meta', tipo: 'linha', ph: 'Ex.: 55%' },
        { k: p + 'prazo', r: 'Prazo', tipo: 'linha', ph: 'Ex.: dez/2027' }
      ] },
      { t: 'sub', r: 'Farol (Folha 5B)' },
      { t: 'grupo', cols: 3, itens: [
        { k: b + 'mp', r: 'Meta do próximo período (só o número)', tipo: 'numerico', ph: 'Ex.: 60000', d: 'Mês ou trimestre: é contra ela que o farol compara.' },
        { k: b + 'am', r: '🟡 Amarelo a partir de quantos % pior que a meta?', tipo: 'numerico', ph: 'Ex.: 0', d: '0 = qualquer resultado pior que a meta já acende o amarelo.' },
        { k: b + 'vm', r: '🔴 Vermelho a partir de quantos % pior que a meta?', tipo: 'numerico', ph: 'Ex.: 15', d: 'Usual: 15. Críticos (caixa, perda de clientes): 5. Tendência: 25 ou mais.' }
      ] },
      { t: 'especial', nome: 'faixas', n: ref },
      { t: 'grupo', cols: 2, itens: [
        { k: b + 'gam', r: '🟡 Gatilho do amarelo', tipo: 'linha', ph: 'Quem analisa e qual a primeira verificação' },
        { k: b + 'gvm', r: '🔴 Gatilho do vermelho', tipo: 'linha', ph: 'Quem é acionado e em quanto tempo sai o plano corretivo' }
      ] }
    ] };
  }
  var BLOCO4 = {
    id: 'bloco4', codigo: 'Folhas 5A e 5B', aula: 'Aula 1', etapa: 'Bloco 4', titulo: 'Objetivos, indicadores e faróis',
    pergunta: 'Como saberemos se estamos chegando lá, e quando é preciso corrigir a rota?',
    resumo: 'Primeiro, transforme as direções em 6 a 10 objetivos (EO ou POS). Depois, para cada objetivo, desenvolva de 1 a 3 indicadores: cada um passa no teste da vaidade e ganha ficha, meta e um farol com faixas que vocês definem antes de medir. O painel de controle se monta sozinho.',
    guia: '05',
    secoes: [
      { id: 'objetivos', n: '5A', nav: 'Objetivos', folha: 'Folha 5A', titulo: 'Os objetivos',
        dica: 'Objetivo = verbo de resultado + objeto + qualificador. De 6 a 10, com pelo menos 2 de posicionamento (POS) e 1 de eficácia operacional (EO) que ataque o gargalo. Os indicadores vêm no passo seguinte.',
        guia: ['05', '1-do-verbo-ao-objetivo'],
        passos: ['Use ＋ para levar uma direção das folhas anteriores para a próxima linha livre e reescreva como objetivo.', 'Marque EO ou POS e, nos que atacam a dimensão gargalo da Folha 3A, "Ataca o gargalo".'],
        itens: [
          { t: 'especial', nome: 'direcoes' },
          { t: 'tabela', item: 'Objetivo', minimo: 6,
            cols: [{ r: 'Objetivo', tipo: 'linha', ph: 'Verbo de resultado + objeto + qualificador' }, { r: 'Tipo', tipo: 'opcoes', op: [['EO', 'EO · eficácia operacional'], ['POS', 'POS · posicionamento']], w: '26%' }, { r: 'Ataca o gargalo?', tipo: 'check', w: '13%' }],
            linhas: seq(N_OBJ).map(function (i) { var p = 'f5a_o' + i + '_'; return { r: String(i), k: [p + 'obj', p + 'tipo', p + 'garg'] }; }) },
          { t: 'especial', nome: 'validador' }
        ] },
      { id: 'indicadores', n: '5A·5B', nav: 'Indicadores e faróis', folha: 'Folhas 5A e 5B', titulo: 'Os indicadores de cada objetivo, com ficha e farol',
        dica: 'Até 3 indicadores por objetivo: combine um de resultado (mostra se chegou) com um de tendência (avisa antes). As faixas do farol são decididas agora, antes de medir, nunca depois de ver o resultado. Na Aula 1, complete pelo menos 3 indicadores; os demais ficam como tarefa para a Aula 2.',
        guia: ['05', '2-indicador-meta'],
        passos: ['Escolha um objetivo nas abas: cada aba mostra o que ainda falta nele.', 'Dê nome ao indicador e faça o teste da vaidade. Se ele não passar, troque o indicador.', 'No farol, a empresa decide a partir de quantos % pior que a meta ele fica amarelo e vermelho: as faixas aparecem na hora.', 'Siga para o próximo objetivo pelo botão no fim da aba.'],
        itens: [
          { t: 'porObjetivo', itens: seq(N_OBJ).map(function (i) {
            return { t: 'objetivo', n: i, itens: [{ t: 'progressivo', minimo: 1, botao: '＋ Acrescentar outro indicador a este objetivo (até 3)', itens: seq(N_IND).map(function (j) { return indicadorItens(i, j); }) }] };
          }) },
          { t: 'especial', nome: 'painel' }
        ] },
      { id: 'pronta', n: '✓', nav: 'Pronta?', titulo: 'Suas folhas estão prontas quando…', exemplo: false,
        itens: [ { t: 'checklist', itens: [
          { r: 'Há de 6 a 10 objetivos, com pelo menos 2 de POS e 1 de EO no gargalo.', ir: 'objetivos', auto: function (c) {
            var o = WS_F.objetivos(c);
            return o.length >= 6 && o.length <= 10 && o.filter(function (x) { return x.tipo === 'POS'; }).length >= 2 && o.some(function (x) { return x.tipo === 'EO' && x.garg; });
          } },
          ['f5_chk7', 'Cada objetivo está redigido como verbo de resultado + objeto + qualificador.'],
          { r: 'Cada objetivo tem de 1 a 3 indicadores, todos aprovados no teste da vaidade.', ir: 'indicadores', auto: function (c) {
            var o = WS_F.objetivos(c);
            return o.length > 0 && o.every(function (x) { return x.inds.length > 0 && x.inds.every(function (y) { return y.vaid; }); });
          } },
          { r: 'Cada indicador tem nome, tipo, linha de base (ou "a levantar"), meta e prazo.', ir: 'indicadores', auto: function (c) { var i = WS_F.indicadores(c); return i.length > 0 && i.every(function (x) { return x.essencial; }); } },
          { r: 'Pelo menos 3 indicadores estão completos: ficha, faixas de farol e gatilhos de amarelo e vermelho.', ir: 'indicadores', auto: function (c) { return WS_F.indicadores(c).filter(function (x) { return x.ok; }).length >= 3; } }
        ] } ] }
    ]
  };

  /* =====================================================================
   * Bloco 5 · Folha 6 (Ações)
   * ===================================================================== */
  var BLOCO5 = {
    id: 'bloco5', codigo: 'Folha 6', aula: 'Aula 1', etapa: 'Bloco 5', titulo: 'Ações que movem os indicadores',
    pergunta: 'O que vamos fazer, quem faz e até quando, para os indicadores saírem do lugar?',
    resumo: 'O indicador é o termômetro; a ação é o que muda a temperatura. Cada objetivo ganha de 1 a 3 ações que passam no teste da alavanca, priorizadas por impacto e esforço, com responsável, prazo e custo.',
    guia: '06',
    secoes: [
      { id: 'acoes', n: '6', nav: 'Ações', folha: 'Folha 6', titulo: 'Ações e teste da alavanca',
        dica: 'Ação estratégica tem começo, meio e fim: rotina ("atender clientes") e intenção ("melhorar o financeiro") não entram.',
        guia: ['06', 'o-teste-da-alavanca'],
        passos: ['Para cada objetivo da Folha 5A, liste de 1 a 3 ações.', 'Teste da alavanca: escolha o indicador que a ação move e diga em quanto e em quanto tempo. Sem resposta, apague a ação.', 'Classifique impacto e esforço: a prioridade aparece sozinha.'],
        itens: [
          { t: 'tabela', largo: true, item: 'Ação', minimo: 5,
            cols: [{ r: 'Objetivo', tipo: 'objetivo', w: '18%' }, { r: 'Ação', w: '19%' }, { r: 'Indicador que move', tipo: 'indicador', w: '15%' }, { r: 'Em quanto e em quanto tempo?', ph: 'Teste da alavanca' },
              { r: 'Impacto', tipo: 'opcoes', op: AB, w: '11%' }, { r: 'Esforço', tipo: 'opcoes', op: AB, w: '11%' }, { r: 'Prioridade', tipo: 'calc', w: '10%' }],
            linhas: seq(N_ACOES).map(function (i) { var p = 'f6_a' + i + '_'; return { r: String(i), k: [p + 'obj', p + 'acao', p + 'ind', p + 'alav', p + 'imp', p + 'esf', p + 'prio'] }; }) },
          { t: 'especial', nome: 'priorizacao' }
        ] },
      { id: 'detalhe', n: '6', nav: 'Quem, quando, quanto', folha: 'Folha 6', titulo: 'O mínimo de cada ação: quem, até quando, quanto custa',
        dica: 'Obrigatório para as ações em "Fazer já" e "Planejar": uma pessoa por ação (nunca "todos"), prazo com mês e ano, custo estimado. O plano detalhado de cada ação é feito depois, por quem for responsável. As linhas aparecem conforme as ações são escritas acima.',
        guia: ['06', 'o-detalhamento-minimo'],
        itens: [
          { t: 'tabela', item: 'Ação',
            cols: [{ r: 'Responsável', tipo: 'linha' }, { r: 'Prazo (mês/ano)', tipo: 'linha', w: '18%' }, { r: 'Custo estimado', tipo: 'linha', w: '18%' }],
            linhas: seq(N_ACOES).map(function (i) {
              var p = 'f6_a' + i + '_';
              return { r: String(i), rotuloDe: p + 'acao', k: [p + 'resp', p + 'prazo', p + 'custo'], se: function (c) { return !!c[p + 'acao']; } };
            }) }
        ] },
      { id: 'pronta', n: '✓', nav: 'Pronta?', titulo: 'Sua folha está pronta quando…', exemplo: false,
        itens: [ { t: 'checklist', itens: [
          { r: 'Cada objetivo tem de 1 a 3 ações, e todas têm o teste da alavanca respondido.', ir: 'acoes', auto: function (c) {
            var o = WS_F.objetivos(c), a = WS_F.acoes(c);
            return o.length > 0 && o.every(function (x) { var n = a.filter(function (y) { return y.obj === x.n; }).length; return n >= 1 && n <= 3; }) && a.every(function (y) { return y.ind && y.alav; });
          } },
          ['f6_chk1', 'As ações são estratégicas (têm começo e fim), não rotina nem intenção.'],
          { r: 'Cada indicador do painel (Folha 5B) tem pelo menos uma ação vinculada.', ir: 'acoes', auto: function (c) { var a = WS_F.acoes(c), f = WS_F.indicadores(c); return f.length > 0 && f.every(function (x) { return a.some(function (y) { return y.obj === x.obj; }); }); } },
          { r: 'As ações em "Fazer já" e "Planejar" têm responsável, prazo e custo estimado.', ir: 'detalhe', auto: function (c) {
            var a = WS_F.acoes(c).filter(function (y) { return y.prio === 'Fazer já' || y.prio === 'Planejar'; });
            return a.length > 0 && a.every(function (y) { return y.resp && y.prazo && y.custo; });
          } },
          { r: 'Não há mais de 8 ações em andamento ao mesmo tempo.', ir: 'acoes', auto: function (c) { var a = WS_F.acoes(c).filter(function (y) { return y.prio === 'Fazer já' || y.prio === 'Planejar'; }); return a.length > 0 && a.length <= 8; } }
        ] } ] }
    ],
    calcular: function (c) {
      var out = {};
      seq(N_ACOES).forEach(function (i) {
        var p = 'f6_a' + i + '_';
        out[p + 'prio'] = WS_F.prioridade(c[p + 'imp'], c[p + 'esf']);
      });
      return out;
    }
  };

  /* =====================================================================
   * Fechamento da Aula 1 · leitura da cadeia e tarefa
   * ===================================================================== */
  var FECHAMENTO = {
    id: 'fechamento', codigo: 'Fechamento', aula: 'Aula 1', etapa: 'Fechamento', titulo: 'Leitura da cadeia e tarefa para a Aula 2',
    pergunta: 'A cadeia fecha, da direção à ação?',
    resumo: 'Escolha um objetivo e leia em voz alta a cadeia completa: direção → tipo → objetivo → indicador → meta → farol → ação. Se ela quebra em algum ponto, é ali que se ajusta. Depois, a tarefa para a Aula 2.',
    guia: '00',
    secoes: [
      { id: 'cadeia', n: 'C', nav: 'A cadeia', titulo: 'Leitura da cadeia',
        dica: 'Teste da cadeia: escolha qualquer ação da Folha 6 e tente voltar até a Folha 1. Se não consegue explicar de onde ela veio, algo se perdeu no caminho.',
        guia: ['00', 'a-logica-do-caderno-uma-cadeia-so'],
        passos: ['Escolha um objetivo: a cadeia dele se monta com o que está no caderno.', 'Leia em voz alta para a mesa.', 'Onde aparecer "falta", a cadeia quebrou: anote o ajuste.'],
        itens: [
          { k: 'fc_obj', r: 'Objetivo escolhido', tipo: 'objetivo' },
          { k: 'fc_direcao', r: 'De qual direção ele veio? (TOWS, maturidade, sistema de atividades, BCG/Ansoff)', tipo: 'linha', ph: 'Ex.: fO da TOWS + gargalo Operação' },
          { t: 'especial', nome: 'cadeia' },
          { k: 'fc_quebra', r: 'Onde a cadeia quebrou e o que vamos ajustar' }
        ] },
      { id: 'tarefa', n: 'T', nav: 'Tarefa', titulo: 'Tarefa para a Aula 2',
        dica: 'O que ainda falta no caderno aparece abaixo. Salve o arquivo agora e traga-o para a Aula 2, junto com o acesso ao sistema do parque funcionando.',
        exemplo: false,
        itens: [
          { t: 'especial', nome: 'pendencias' },
          { t: 'checklist', itens: [
            ['fc_chk1', 'Completar as fichas dos indicadores restantes, incluindo faixas de farol e gatilhos.'],
            ['fc_chk2', 'Levantar as linhas de base marcadas como "a levantar".'],
            ['fc_chk3', 'Validar o caderno com ao menos um sócio ou gestor que não participou da aula.'],
            ['fc_chk4', 'Trazer o arquivo do caderno e o acesso ao sistema do parque funcionando.']
          ] },
          { k: 'fc_obs', r: 'Anotações para a Aula 2', ph: 'Dados a buscar, com quem conversar, dúvidas para o facilitador…' }
        ] }
    ]
  };

  /* =====================================================================
   * Aula 2 · Retomada e Bloco 6 · Folha 7 (Mapa estratégico)
   * ===================================================================== */
  var BLOCO6 = {
    id: 'bloco6', codigo: 'Folha 7', aula: 'Aula 2', etapa: 'Bloco 6', titulo: 'BSC e mapa estratégico',
    pergunta: 'Como a estratégia cabe numa página, com causa e efeito?',
    resumo: 'O BSC não cria a estratégia: organiza, equilibra e comunica a que você construiu na Aula 1. Cada objetivo vai para uma perspectiva, as setas de causa e efeito sobem do aprendizado ao financeiro, e o teste do equilíbrio mostra o que falta antes de lançar no sistema do parque.',
    guia: '07',
    secoes: [
      { id: 'retomada', n: 'R', nav: 'Retomada', titulo: 'Retomada: o que mudou desde a Aula 1',
        dica: 'Quais dados foram mais difíceis de obter mostra onde o sistema vai exigir ajuda. O que mudou depois de conversar com quem não estava na aula costuma melhorar o plano.',
        exemplo: true,
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'f7_ret_bases', r: 'Linhas de base "a levantar"', tipo: 'opcoes', op: ['Todas levantadas', 'Parte levantada', 'Nenhuma levantada', 'Não havia nenhuma a levantar'] },
            { k: 'f7_ret_dificil', r: 'Que dados foram mais difíceis de obter?', tipo: 'linha' }
          ] },
          { k: 'f7_ret_mudou', r: 'O que mudou no plano depois de validar com o sócio ou gestor?' }
        ] },
      { id: 'perspectivas', n: '7', nav: 'Perspectivas e setas', folha: 'Folha 7', titulo: 'Cada objetivo na sua perspectiva, com setas de causa e efeito',
        dica: 'Na dúvida, use a perspectiva do efeito principal do objetivo: é no caixa, no cliente ou na capacidade interna? Ligue só as relações em que você acredita: poucas setas fortes valem mais que muitas fracas.',
        guia: ['07', 'as-quatro-perspectivas'],
        passos: ['Para cada objetivo da Folha 5A, escolha a perspectiva. Para mudar o texto de um objetivo, volte à Folha 5A.', 'Em "leva a", escreva os números dos objetivos que ele ajuda a alcançar (setas de baixo para cima).', 'Objetivo sem seta? Ligue, elimine ou escreva a justificativa.'],
        itens: [
          { t: 'tabela', largo: true, item: 'Objetivo', vazia: 'Escreva os objetivos na Folha 5A: eles aparecem aqui para você posicionar no mapa.',
            cols: [{ r: 'Perspectiva', tipo: 'opcoes', op: PERSPECTIVAS.map(function (p) { return [p[0], p[1]]; }), w: '22%' }, { r: 'Leva a (objetivos nº)', tipo: 'linha', ph: 'Ex.: 3', w: '16%' }, { r: 'Justificativa, se ficar sem seta', ph: 'Ex.: objetivo habilitador' }],
            linhas: seq(N_OBJ).map(function (i) {
              var p = 'f7_o' + i + '_';
              return { r: String(i), rotuloDe: 'f5a_o' + i + '_obj', k: [p + 'persp', p + 'leva', p + 'just'], se: function (c) { return !!c['f5a_o' + i + '_obj']; } };
            }) }
        ] },
      { id: 'mapa', n: '7', nav: 'Mapa e equilíbrio', folha: 'Folha 7', titulo: 'O mapa estratégico e o teste do equilíbrio',
        dica: 'Leia cada seta como "se… então…". Um mapa sem objetivo de POS é um mapa de eficiência, não de estratégia. Se o gargalo da Folha 3A não aparece, o plano ignora o principal freio da empresa.',
        guia: ['07', 'o-mapa-estrategico-causa-e-efeito'],
        itens: [
          { t: 'especial', nome: 'mapa' },
          { k: 'f7_ajustes', r: 'Ajustes feitos depois do teste do equilíbrio' },
          { k: 'f7_galeria', r: 'Galeria relâmpago: perguntas que outras empresas deixaram no seu mapa e suas respostas', ph: 'Opcional', relatorio: false }
        ] },
      { id: 'pronto', n: '★', nav: 'Pronto?', titulo: 'Pronto para o sistema do parque?',
        dica: 'Os critérios abaixo são conferidos pelo próprio caderno, com o que está em todas as folhas. Falta só o que depende de vocês: ler as setas em voz alta. O caderno completo abre com um resumo por perspectiva, na ordem em que você vai digitar no sistema.',
        exemplo: false,
        itens: [
          { t: 'especial', nome: 'prontidao' },
          { t: 'checklist', itens: [
            ['f7_chk5', 'Lemos cada seta em voz alta como "se… então…", e a mesa concorda com todas.']
          ] }
        ] }
    ],
    // a Folha 7 só fica "pronta" com todos os critérios de "pronto para o sistema" verdes (mostrados acima da lista)
    pronta: function (c) { return WS_M.criterios(c).every(function (x) { return x[0]; }); }
  };

  /* ---------------- funções de domínio usadas pelo motor e pelas folhas ---------------- */
  function numBR(v) {
    if (v === undefined || v === null || v === '') return NaN;
    var s = String(v).replace(/R\$\s*/gi, '').replace(/%/g, '').replace(/\s/g, '');
    var mil = /mil$/i.test(s); s = s.replace(/mil$/i, '');
    if (/,\d{1,3}$/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else s = s.replace(/,/g, '');
    var n = parseFloat(s);
    if (isNaN(n)) return NaN;
    return mil ? n * 1000 : n;
  }
  function fmtNum(n, unidade) {
    var t = (Math.round(n * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    var u = String(unidade || '').trim();
    if (/^r\$$/i.test(u)) return 'R$ ' + t;
    if (u === '%') return t + '%';
    return u ? t + ' ' + u : t;
  }
  /* Faixas do farol de um indicador: a empresa decide a partir de quantos % pior que a meta do período
   * o farol fica amarelo (am) e vermelho (vm). Devolve null (falta algo), { erro } ou as faixas. */
  function faixas(c, i, j) {
    var p = 'f5a_o' + i + '_i' + j + '_', b = 'f5b_o' + i + '_i' + j + '_';
    var meta = numBR(c[b + 'mp']), am = numBR(c[b + 'am']), vm = numBR(c[b + 'vm']);
    if (isNaN(meta) || isNaN(am) || isNaN(vm)) return null;
    var maior = c[p + 'pol'] !== 'Quanto menor, melhor', u = c[p + 'unidade'];
    if (am < 0 || vm <= am) return { erro: 'O vermelho precisa começar num % maior que o do amarelo.' };
    if (maior && vm > 100) return { erro: 'Num indicador "quanto maior, melhor", o vermelho não pode passar de 100% pior que a meta.' };
    var limA = meta * (1 + (maior ? -am : am) / 100), limV = meta * (1 + (maior ? -vm : vm) / 100);
    var f = { meta: meta, am: am, vm: vm, limA: limA, limV: limV, maior: maior };
    if (maior) { f.verde = '≥ ' + fmtNum(limA, u); f.amarelo = 'de ' + fmtNum(limV, u) + ' a menos de ' + fmtNum(limA, u); f.vermelho = '< ' + fmtNum(limV, u); }
    else { f.verde = '≤ ' + fmtNum(limA, u); f.amarelo = 'acima de ' + fmtNum(limA, u) + ' até ' + fmtNum(limV, u); f.vermelho = '> ' + fmtNum(limV, u); }
    return f;
  }
  function cor(f, valor) {
    if (!f || f.erro || isNaN(valor)) return null;
    if (f.maior) return valor >= f.limA ? 'verde' : valor >= f.limV ? 'amarelo' : 'vermelho';
    return valor <= f.limA ? 'verde' : valor <= f.limV ? 'amarelo' : 'vermelho';
  }
  function prioridade(imp, esf) {
    if (!imp || !esf) return '';
    if (imp === 'A') return esf === 'B' ? 'Fazer já' : 'Planejar';
    return esf === 'B' ? 'Encaixar' : 'Descartar';
  }
  /* Campos de cada indicador, na ordem em que aparecem na folha: [chave sem prefixo, nome para a pessoa]. */
  var CAMPOS_IND = [['nome', 'nome'], ['tipo', 'tipo'], ['vaid', 'teste da vaidade'], ['formula', 'fórmula'], ['unidade', 'unidade'], ['fonte', 'fonte'],
    ['freq', 'frequência'], ['pol', 'polaridade'], ['resp', 'responsável'], ['base', 'linha de base'], ['meta', 'meta'], ['prazo', 'prazo']];
  var CAMPOS_FAROL = [['mp', 'meta do período'], ['am', '% do amarelo'], ['vm', '% do vermelho'], ['gam', 'gatilho do amarelo'], ['gvm', 'gatilho do vermelho']];
  function existeIndicador(c, i, j) {
    var p = 'f5a_o' + i + '_i' + j + '_', b = 'f5b_o' + i + '_i' + j + '_';
    return CAMPOS_IND.some(function (x) { return c[p + x[0]] === true || tem(c, p + x[0]); }) || CAMPOS_FAROL.some(function (x) { return tem(c, b + x[0]); });
  }
  function indicador(c, i, j) {
    var p = 'f5a_o' + i + '_i' + j + '_', b = 'f5b_o' + i + '_i' + j + '_';
    var x = { obj: i, j: j, ref: i + '.' + j, vaid: c[p + 'vaid'] === true };
    CAMPOS_IND.forEach(function (k) { if (k[0] !== 'vaid') x[k[0]] = String(c[p + k[0]] || '').trim(); });
    x.metaPeriodo = c[b + 'mp'] || ''; x.gatAm = c[b + 'gam'] || ''; x.gatVerm = c[b + 'gvm'] || '';
    x.faixas = faixas(c, i, j);
    x.falta = CAMPOS_IND.filter(function (k) { return k[0] === 'vaid' ? !x.vaid : !x[k[0]]; }).map(function (k) { return k[1]; })
      .concat(CAMPOS_FAROL.filter(function (k) { return !tem(c, b + k[0]); }).map(function (k) { return k[1]; }));
    x.essencial = !!(x.nome && x.tipo && x.base && x.meta && x.prazo);
    x.farol = !!(x.faixas && !x.faixas.erro && x.gatAm && x.gatVerm);
    x.ok = !x.falta.length && x.farol;
    return x;
  }
  /* indicadores dos objetivos escritos (de um objetivo só, se "n" for dado) */
  function indicadores(c, n) {
    var out = [];
    objetivosBase(c).forEach(function (o) {
      if (n && o.n !== n) return;
      seq(N_IND).forEach(function (j) { if (existeIndicador(c, o.n, j)) out.push(indicador(c, o.n, j)); });
    });
    return out;
  }
  /* nome legível de uma referência "3.2" (ou do texto livre das versões antigas da Folha 6) */
  function nomeIndicador(c, v) {
    var m = /^(\d+)\.(\d)$/.exec(String(v || ''));
    if (!m) return String(v || '');
    return c['f5a_o' + m[1] + '_i' + m[2] + '_nome'] || 'Indicador ' + v;
  }
  function objetivosBase(c) {
    return seq(N_OBJ).map(function (i) {
      var p = 'f5a_o' + i + '_';
      return { n: i, texto: c[p + 'obj'] || '', tipo: c[p + 'tipo'] || '', garg: !!c[p + 'garg'],
        persp: c['f7_o' + i + '_persp'] || '', leva: numeros(c['f7_o' + i + '_leva']), just: c['f7_o' + i + '_just'] || '' };
    }).filter(function (o) { return o.texto; });
  }
  function objetivos(c) {
    return objetivosBase(c).map(function (o) { o.inds = indicadores(c, o.n); return o; });
  }
  function numeros(v) {
    var out = [];
    String(v || '').replace(/\d+/g, function (m) { var n = Number(m); if (out.indexOf(n) < 0) out.push(n); return m; });
    return out;
  }
  function acoes(c) {
    return seq(N_ACOES).map(function (i) {
      var p = 'f6_a' + i + '_';
      return { n: i, obj: Number(c[p + 'obj']) || 0, acao: c[p + 'acao'] || '', ind: c[p + 'ind'] || '', indNome: nomeIndicador(c, c[p + 'ind']), alav: c[p + 'alav'] || '',
        imp: c[p + 'imp'] || '', esf: c[p + 'esf'] || '', prio: prioridade(c[p + 'imp'], c[p + 'esf']),
        resp: c[p + 'resp'] || '', prazo: c[p + 'prazo'] || '', custo: c[p + 'custo'] || '' };
    }).filter(function (a) { return a.acao; });
  }

  window.WS_F = {
    GUIAS: GUIAS, MATRIZ: MATRIZ, ESTAGIOS: ESTAGIOS, PERSPECTIVAS: PERSPECTIVAS, ANSOFF: ANSOFF,
    N_OBJ: N_OBJ, N_IND: N_IND, N_ACOES: N_ACOES,
    PAGINAS: { abertura: ABERTURA, bloco1: BLOCO1, bloco2: BLOCO2, bloco3: BLOCO3, bloco4: BLOCO4, bloco5: BLOCO5, fechamento: FECHAMENTO, bloco6: BLOCO6 },
    ORDEM: ['abertura', 'bloco1', 'bloco2', 'bloco3', 'bloco4', 'bloco5', 'fechamento', 'bloco6'],
    numBR: numBR, fmtNum: fmtNum, faixas: faixas, cor: cor, prioridade: prioridade,
    objetivos: objetivos, indicadores: indicadores, nomeIndicador: nomeIndicador, acoes: acoes, numeros: numeros, seq: seq
  };
})();
