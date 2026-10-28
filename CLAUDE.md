# Portal "Da Análise ao Plano": guia para sessões do Claude

Hub do workshop de planejamento estratégico para empresas ligadas ao parque tecnológico (incubadas, residentes, PMEs): 2 aulas de 3 h. Cada empresa constrói o próprio plano **durante** as aulas: para cada tema exposto há, logo em seguida, uma folha para aplicar na empresa. As folhas formam uma cadeia (Folha 0 a Folha 7) que termina no mapa do BSC e num resumo para lançar no **sistema do parque** (Aula 2, conduzido pelo facilitador fora do portal).

Mesma família visual dos portais "Vieses e Decisão", "Entendendo Porter" e "Planejamento Mercadológico", mas com uma **diferença de princípio**: nenhum dado sai do computador do participante. Não há login, planilha nem Apps Script. Os projetos são independentes: não altere nada nos outros a partir daqui.

## Onde está cada coisa

| Item | Local |
|---|---|
| Repositório local | `C:\Users\LENOVO\OneDrive - Biopark Educação\Documentos\ESTRATÉGIA\WORKSHOP ESTRATÉGIA` (git, branch `main`) |
| GitHub | https://github.com/marcelcolling/da-analise-ao-plano (público) |
| Site (GitHub Pages) | https://marcelcolling.github.io/da-analise-ao-plano/ (publica sozinho a cada `git push`, cerca de 1 min) |
| Trilha do facilitador | `conteudo/facilitador/trilha-workshop-planejamento-estrategico.md` (fora do git: tempos, roteiro, orientações) |
| Fontes dos guias | `conteudo/00_guia_de_uso.md` a `07_bsc_mapa_estrategico.md` (versionados) |

## Decisões do professor (não reverter sem perguntar)

- **Privacidade:** as respostas ficam só no navegador (localStorage) e no arquivo `.json` que a empresa baixa ("Salvar arquivo") e reabre ("Abrir arquivo"). Nada de `fetch`, formulário, planilha, analytics ou serviço externo com dados. `ferramentas/conferir_integridade.py` (verificação 3) falha se aparecer código de envio. Os únicos recursos externos são as fontes do Google Fonts.
- **PDF** de cada folha (botão na folha) e do caderno completo (`caderno.html`), pela impressão do navegador.
- **Abordagem prática:** cada seção de folha é um "mão na massa" (passos numerados, link para o trecho do guia, "Ver como a AgroSense fez"). A trilha na home mostra guia (claro) e folha (azul) lado a lado por etapa.
- **Guias com texto íntegro** dos Markdown que o professor enviou; a conferência compara palavra por palavra. Os guias são para consulta; a lista "Sua folha está pronta quando…" é estática no guia e interativa na folha.
- A trilha do facilitador (tempos, notas, roteiro) **não é publicada**.
- Empresa-exemplo: **AgroSense** (fictícia). `assets/js/exemplo-agrosense.js` tem o caderno completo dela (dados dos guias, completados para a cadeia fechar: fichas 4 a 7, ações dos objetivos 4 e 7, setas do mapa). Precisa passar em todos os critérios de "pronto para o sistema" (há teste).

## Arquitetura (site estático, sem build de JS)

```
index.html                 home: hero + cartão "Seu caderno" (estado de cada etapa), faixa de privacidade, trilha das 2 aulas
folhas/<id>.html           cascas: chamam WS_M.iniciar('<id>'); ids: abertura, bloco1..bloco5, fechamento, bloco6
caderno.html               caderno completo (resumo para o sistema + todas as folhas), pronto para PDF; ?exemplo = AgroSense
guias/*.html               GERADOS por ferramentas/gerar_guias.py a partir de conteudo/*.md (não editar à mão)
assets/js/config.js        WS_CONFIG: NOME e SUBTITULO (barra, PDFs)
assets/js/portal.js        núcleo: caderno no localStorage, Salvar/Abrir arquivo, Apagar, barra superior, guia "Como funciona",
                           modo exemplo (?exemplo), WS.pagina (salvamento automático das páginas com campos)
assets/js/folhas.js        ESPECIFICAÇÃO das folhas (seções, passos, campos, tabelas, chaves) + funções de domínio (faixas do farol,
                           prioridade, objetivos, ações, fichas) em window.WS_F
assets/js/motor.js         MOTOR: monta a página, lê/escreve campos, componentes especiais (matriz, sistema de atividades em SVG,
                           BCG, Ansoff, abas por objetivo, faixas do farol, painel 5B, priorização, cadeia, pendências, mapa em SVG, prontidão),
                           relatório (PDF), estado de cada página (home) e caderno completo. window.WS_M
assets/js/exemplo-agrosense.js  caderno da AgroSense (mesmo formato do .json)
assets/js/guia.js          comportamento das páginas de guia (sumário, progresso)
assets/css/portal.css · folha.css · guia.css
ferramentas/               gerar_guias.py, conferir_integridade.py, verificar_paginas.py (auditoria das páginas renderizadas e PDFs),
                           capturar_telas.py, servidor_local.py (servidor das ferramentas), testes/
```

## Como funciona o salvamento (não alterar sem necessidade)

- Um objeto só no `localStorage`, chave **`ws_caderno_v1`**: `{ formato: 'caderno-estrategia', v: 1, campos: { chave: texto | true }, atualizado, arquivo }`. Prefixo `ws_` próprio: os portais do professor dividem o domínio `marcelcolling.github.io` (há teste de que os dados dos outros portais não aparecem aqui, e "Apagar" só remove chaves `ws_`).
- Cada página grava **apenas as chaves que existem nela** (`data-k`) e as calculadas da própria página (ex.: `f4_bcg1_quad`, `f6_a1_prio`); as outras folhas ficam intactas. As faixas do farol não são gravadas: calculam-se de `mp`, `am` e `vm`. Salvamento 0,5 s depois da última alteração e ao sair da página.
- `arquivo` = quando o caderno foi baixado ou aberto de um arquivo. A barra mostra "falta o arquivo" quando `atualizado > arquivo`.
- **Arquivo `.json`:** `{ formato, v, workshop, salvoEm, empresa, campos }`. "Abrir arquivo" valida (`WS.lerConteudo`: JSON, formato, chaves `[a-z0-9_]`, só texto/true) e **substitui** o caderno inteiro (avisa e oferece baixar uma cópia antes).
- Outra aba alterou o caderno: evento `storage` → a página reaplica (ou só atualiza os componentes, se estiver em foco).
- **Modo exemplo (`?exemplo`):** o caderno vem de `WS_EXEMPLO` em memória; nada é lido nem gravado no navegador (há teste).
- **Chaves (`k`) em `folhas.js` não podem mudar** depois que as empresas começarem: os `.json` salvos dependem delas. Para acrescentar, chave nova; para tirar, apague o item. Prefixos: `f0_`, `f1_`, `f2_`, `f3a_`, `f3b_`, `f3_chk`, `f4_`, `f5a_`, `f5b_`, `f5_chk`, `f6_`, `fc_` (fechamento), `f7_`. Objetivos: `f5a_o{1..10}_obj|tipo|garg`; indicadores (até 3 por objetivo): ficha e meta em `f5a_o{i}_i{j}_nome|tipo|vaid|formula|unidade|fonte|freq|pol|resp|base|meta|prazo`, farol em `f5b_o{i}_i{j}_mp|am|vm|gam|gvm` (meta do período, % pior que a meta para amarelo e vermelho, gatilhos); ações: `f6_a1_*` a `f6_a12_*`, com `f6_a{n}_ind` = referência "objetivo.indicador" (ex.: "3.2"). As chaves antigas da Folha 5 (`f5a_o{i}_ind|ind2|base|meta|prazo`, `f5a_fc*`, `f5b_p*`, `f5b_sim_resp`, `f5b_rc*`, `f5a_vaidade`) saíram em 28/10/2026, antes de as empresas começarem; se aparecerem num .json antigo, ficam no arquivo sem uso.
- Todo texto do usuário que entra em `innerHTML` ou no SVG passa por `WS.esc`; valores em campos vão por `.value`.

## Convenções de apresentação (revisão de 26/10/2026)

- **Sem redundância entre dica, passos e rótulos:** a dica diz o conceito ou o critério; os passos ("mão na massa") só aparecem quando há uma sequência que os rótulos dos campos não contam. Se o passo repete o rótulo, apague o passo.
- **Listas finais ("pronta quando…"):** o que o caderno consegue conferir é item `{ r, auto }` (aparece como "conferido pelo caderno", sem caixa); só o que exige julgamento fica para marcar (`[chave, texto]`, "marque você"). Uma página fica "pronta" na home quando todos os itens estão ok e, se houver, `pronta(c)` da página é verdadeira (Folha 7: critérios de "pronto para o sistema").
- **Tabelas longas** (`minimo`) começam com poucas linhas e abrem a seguinte conforme o preenchimento, ou pelo botão "Mais uma linha". No celular cada linha vira um cartão com nome (`item`: "Objetivo 3").
- **Campo `linha`** é uma caixa de uma linha que cresce (textarea), para não cortar texto; números do painel usam `numerico`.
- Cabeçalho de seção: "Folha X · passo i de N". Guia e exemplo ficam juntos na linha de apoio. O exemplo e a folha da AgroSense abrem em nova aba; no modo exemplo, a navegação entre folhas continua no exemplo.
- Fim de cada folha: cartão com o estado da lista final, "Salvar arquivo" e o próximo passo. O botão "Salvar arquivo" fica na barra superior e nesse cartão (não no topo da folha).
- Home: o cartão "Seu caderno" mostra uma barra das 8 etapas e a próxima; a lista detalhada fica na trilha (não repetir).
- Home: QR code do site (`assets/img/qrcode.svg`, gerado por `ferramentas/gerar_qrcode.py`, que precisa de `pip install segno`) para projetar na sala; "Projetar o QR code em tela cheia" ou `index.html#qrcode` abre a versão grande. Some no celular. Se o endereço do site mudar, gere de novo.
- Desenhos (sistema de atividades e mapa) rolam para o lado no celular (`.svg-rolagem`), em vez de encolher o texto.

## Navegação e Folha 5 (revisão de 28/10/2026)

- Topo de cada folha: **trilha das 8 etapas** (`.e-trilha`, estado de cada uma pelo `status()`), clicável. "Passo i de N" conta só os passos (não a lista final). Fim de cada passo: botão "Seguir para o passo…" (`.sec-seguir`). Itens automáticos da lista final têm `ir` (id da seção): quando pendentes, mostram "resolver no passo ↑".
- **Folha 5:** passo 1 = só objetivo, EO/POS e gargalo (com "＋" para levar direções das Folhas 2 a 4 à próxima linha livre). Passo 2 = uma **aba por objetivo** (`porObjetivo`), cada uma com 1 a 3 indicadores (`progressivo`), e em cada indicador: estado ("Falta: …"), teste da vaidade, ficha, meta e farol com os % definidos pela empresa (`WS_F.faixas(c, i, j)`). Abaixo, o painel 5B se monta sozinho; o número de cada linha abre a aba. Simulação e registro de correção de rota saíram da folha (decisão do professor; continuam no guia como conceito).
- Domínio: `WS_F.objetivos(c)` traz `inds`; `WS_F.indicadores(c[, n])` traz `falta`, `essencial`, `farol`, `ok`. Na Folha 6, "Indicador que move" é lista (`tipo: 'indicador'`) com os indicadores do objetivo da linha.

## Receitas

### Mudar uma folha
Edite a página em `folhas.js` (formato documentado no topo). Componentes com lógica própria: `ESPECIAIS` em `motor.js` (`atualizar(el, c, it)` na tela, `relatorio(c, it)` no PDF). Se acrescentar campo que a AgroSense deveria ter, preencha também em `exemplo-agrosense.js`. Acrescente verificações no teste.

### Mudar um guia
Edite o `.md` em `conteudo/`, rode `python ferramentas/gerar_guias.py` e `python ferramentas/conferir_integridade.py`. As "pontes" (links do guia para a folha) ficam em `GUIAS` no gerador; as âncoras dos guias usadas pelas folhas (`guia: ['05', 'âncora']`) são conferidas pelo conferidor.

### Alinhar com o sistema do parque
A trilha pede que as Folhas 5A, 5B, 6 e 7 tenham os mesmos campos do sistema do parque. Quando o professor mandar os campos do sistema, ajuste os rótulos (não as chaves) em `folhas.js` e o "Resumo para o sistema do parque" (`resumoSistema` em `motor.js`).

## Armadilhas já encontradas

- **Heredoc no Git Bash:** `'\\n'` dentro de código Python escrito por heredoc virou quebra de linha real e quebrou o executor do teste (expressão JS inválida, "o Edge travou"). Prefira a ferramenta de edição para código com escapes.
- `python` no Windows não entende caminhos `/c/...` do Git Bash: copie para `$TEMP` ou use caminho `C:/...`.
- **Edge headless:** processos órfãos acumulam e prendem portas. Limpe só os de teste: `msedge.exe` com `--headless` e perfil em `AppData\Local\Temp` (nunca o Edge normal). Use `capturar_telas.py`/`rodar_testes.py`, que controlam o Edge pelo CDP e recarregam se a página travar.
- **Edge órfão com cache antigo:** o Edge às vezes passa o navegador para outro processo e o primeiro sai; o `taskkill` não pega o órfão, que fica com a porta de depuração. Na execução seguinte, a ferramenta conversava com ele e via a versão **antiga** das páginas (falsos defeitos). `encerrar()` agora também mata quem usa o mesmo perfil temporário, e as ferramentas sorteiam as portas.
- **Pedidos locais que se perdem:** neste ambiente, ~10% dos pedidos ao servidor local estouram o tempo (mesmo fora do navegador, mesmo com fila maior). O navegador pula o script que não chegou e a página fica incompleta (ex.: `WS_M` indefinido, cartão da home vazio). Não é defeito do site. As ferramentas servem uma cópia do site fora do OneDrive (`servidor_local.py`, sem cache, fila de 128) e só consideram a página pronta quando todos os scripts rodaram (`SCRIPTS_OK` em `capturar_telas.py`; `scriptsOk` no teste); se não, recarregam. Se um teste falhar só no começo, de forma intermitente, rode de novo antes de procurar defeito.
- **PDF:** `Page.printToPDF` respeita `Emulation.setEmulatedMedia`; zere (`media=''`). O relatório da folha (`#relatorio`) fica fora de `#app`, porque a impressão esconde `#app`. Para ver: `pymupdf` (já instalado).
- **`.ps1` com acentos:** grave em UTF-8 **com BOM** (`publicar.ps1` já está).
- A pasta está no OneDrive: se o git reclamar de arquivo bloqueado, espere a sincronização.

## Como validar antes de publicar

1. `python ferramentas/gerar_guias.py` e `python ferramentas/conferir_integridade.py` (Git Bash: `PYTHONIOENCODING=utf-8`) → **TUDO OK** (texto íntegro dos 8 guias, links e âncoras, privacidade).
2. `.\ferramentas\testes\rodar_testes.ps1` → `FAIL/ERRO: 0` (94 verificações hoje: prefixos, salvamento, XSS, referências entre folhas, cálculos, SVGs, listas finais conferidas pelo caderno, linhas progressivas, PDF, arquivo, abrir arquivo, modo exemplo e sua navegação, AgroSense "pronta" nas 8 etapas, abas e indicadores da Folha 5, faixas com % da empresa, trilha das etapas, outra aba, apagar). Leva cerca de 1 minuto.
3. `python ferramentas/verificar_paginas.py` → **TUDO OK**. Audita as páginas **renderizadas** (as folhas são montadas por JavaScript, o conferidor estático não as vê) em 3 estados (vazio, preenchido, `?exemplo`) e 2 larguras (1366 e 500px): erros de JS, página mais larga que a tela, ids repetidos, um só h1, campos sem rótulo, botões sem texto, "undefined/NaN" na tela, links e âncoras gerados por JS; e gera os 9 PDFs, conferindo que nada de orientação ("Mão na massa", "marque você"…) vaza para eles. Leva uns 5 minutos.
4. `python ferramentas/capturar_telas.py <pasta>` e olhar as capturas (1366px e 520px; o script avisa erro de JavaScript e página mais larga que a tela).
5. `git add -A; git commit; git push` e conferir o site (cache: `?x=aleatório`).

## Pendências conhecidas

- Campos do sistema do parque ainda não conhecidos: as Folhas 5A, 5B, 6 e 7 seguem o modelo do caderno da trilha.
- O apêndice da trilha (modelos das folhas em tabela) não foi copiado para `conteudo/facilitador/`: está implementado nas folhas.
