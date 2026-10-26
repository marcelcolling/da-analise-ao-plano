# Da Análise ao Plano — hub do workshop

Site: **https://marcelcolling.github.io/da-analise-ao-plano/**

Guias e folhas de atividade do workshop de planejamento estratégico (2 aulas de 3 h) para empresas ligadas ao parque. Cada empresa preenche o próprio **Caderno de Estratégia** durante as aulas, da Folha 0 ao mapa do BSC, e sai com o resumo pronto para lançar no sistema do parque.

## Como o workshop usa o site

| Etapa | Guia (para consultar) | Folha (para aplicar logo depois da exposição) |
|---|---|---|
| Abertura | 01 · Ponto de partida | Folha 0 |
| Bloco 1 | 02 · Análise de ambiente | Folhas 1 e 2 (radar + TOWS) |
| Bloco 2 | 03 · Porter: atividades | Folhas 3A e 3B (maturidade + sistema de atividades) |
| Bloco 3 | 04 · BCG e Ansoff | Folha 4 |
| Bloco 4 | 05 · Objetivos, indicadores e faróis | Folhas 5A e 5B |
| Bloco 5 | 06 · Ações | Folha 6 |
| Fechamento | 00 · Guia de uso (a lógica da cadeia) | Leitura da cadeia + tarefa para a Aula 2 |
| Aula 2 · Bloco 6 | 07 · BSC e mapa estratégico | Folha 7 + "pronto para o sistema?" |
| Aula 2 · Sistema | — | Caderno completo, que abre com o resumo por perspectiva |

Em cada seção das folhas há: os passos do "mão na massa", o link para o trecho do guia e o botão **Ver como a AgroSense fez**. Várias coisas se montam sozinhas: o desenho do sistema de atividades, o quadrante da BCG, as faixas do farol (com simulador), a prioridade das ações, a leitura da cadeia, o mapa estratégico e o teste do equilíbrio.

**Para demonstrar em sala:** qualquer folha com `?exemplo` no endereço (ou o link "Ver … preenchida pela AgroSense" na trilha) mostra a folha completa da AgroSense, sem mexer no caderno de ninguém. O caderno completo da AgroSense está em `caderno.html?exemplo`.

## Privacidade: nada passa por você

- Não há login, planilha nem servidor. As respostas ficam **no navegador** de quem preenche, salvas sozinhas.
- **Salvar arquivo** baixa o caderno inteiro num `.json` no computador da empresa. **Abrir arquivo** (menu Caderno) carrega de volta, em qualquer computador. Peça às empresas para salvar o arquivo ao final da Aula 1 e trazê-lo na Aula 2.
- **PDF:** botão em cada folha e no caderno completo (na janela de impressão, "Salvar como PDF").
- Computador compartilhado: menu **Caderno › Apagar o caderno deste navegador**. Navegação anônima apaga tudo ao fechar a janela.

## Para mudar o conteúdo

- **Guias:** edite os `.md` em `conteudo/` e peça ao Claude para regenerar (ou rode `python ferramentas/gerar_guias.py`). O texto é publicado na íntegra.
- **Folhas:** os campos estão em `assets/js/folhas.js`. Os nomes internos (chaves) não podem mudar depois que as empresas começarem, porque os arquivos salvos dependem deles; rótulos e textos podem.
- **Sistema do parque:** quando tiver os campos que o sistema pede (nomes das perspectivas, ficha do indicador, formato das ações), mande para o Claude alinhar as Folhas 5A, 5B, 6 e 7 e o resumo do caderno completo.

A trilha do facilitador (tempos, roteiro, orientações) fica só na pasta local: `conteudo/facilitador/`.
