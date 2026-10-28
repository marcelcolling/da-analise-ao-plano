/*
 * Caderno de exemplo: AgroSense, a empresa fictícia dos guias (conteudo/0X_*.md).
 * Os dados vêm dos exemplos dos guias; o que os guias não trazem (fichas e faróis de todos os indicadores, ações
 * dos objetivos 4 e 7, setas do mapa) foi completado para a cadeia fechar e o caderno passar no teste "pronto para o sistema".
 * Usado em: "Ver como a AgroSense fez" (cada seção), modo exemplo (?exemplo) e testes.
 * Mesmo formato do arquivo .json que as empresas baixam (campos com as chaves de folhas.js).
 */
window.WS_EXEMPLO = {
  formato: 'caderno-estrategia', v: 1, empresa: 'AgroSense (exemplo)',
  campos: {
    /* Folha 0 */
    f0_empresa: 'AgroSense', f0_perfil: 'Residente',
    f0_setor: 'Sensores IoT de umidade e solo + plataforma de monitoramento de lavouras',
    f0_participantes: 'Sócio comercial, sócio de operações e sócio financeiro',
    f0_faturamento: '≈ R$ 1,8 milhão/ano (≈ R$ 150 mil/mês)',
    f0_clientes: 'Produtores médios de grãos e 2 cooperativas com contrato anual (2.300 hectares monitorados)',
    f0_produtos: '70% venda avulsa de sensores · 30% assinatura da plataforma (≈ R$ 45 mil/mês)',
    f0_hoje_que: 'vende sensores de solo e uma plataforma de monitoramento de lavouras',
    f0_hoje_para: 'produtores médios de grãos e algumas cooperativas',
    f0_fut_reconhecidos: 'ser a parceira de agricultura de precisão das cooperativas de grãos do estado',
    f0_fut_numero: 'R$ 6 milhões de faturamento, com 70% de receita recorrente',
    f0_chk1: true, f0_chk3: true,

    /* Folha 1 */
    f1_o1: 'Linhas de crédito para agricultura de precisão', f1_o1_ev: 'Cooperativas relatam associados buscando financiar tecnologia',
    f1_o2: 'Cooperativas querem digitalizar a assistência técnica', f1_o2_ev: '3 cooperativas pediram proposta nos últimos 6 meses',
    f1_o3: 'Exigências de rastreabilidade de compradores internacionais', f1_o3_ev: 'Tradings passaram a pedir dados de manejo por talhão',
    f1_a1: 'Fabricantes de máquinas oferecem plataformas embarcadas', f1_a1_ev: 'Duas marcas grandes já incluem monitoramento no pacote',
    f1_a2: 'Câmbio encarece componentes importados', f1_a2_ev: 'Custo do sensor subiu 18% em 12 meses',
    f1_a3: 'Conectividade rural limitada', f1_a3_ev: '25% das áreas atendidas têm sinal instável',
    f1_f1: 'Base de dados de 3 safras', f1_f1_ev: '2.300 hectares monitorados com histórico', f1_f1_vrio: 'Vantagem sustentável (V, R, I e O)',
    f1_f2: 'Suporte agronômico próprio', f1_f2_ev: '3 agrônomos na equipe; suporte é o 1º motivo de renovação citado', f1_f2_vrio: 'Vantagem temporária (V e R)',
    f1_f3: 'Sensor de custo mais baixo', f1_f3_ev: '30% mais barato que o importado equivalente', f1_f3_vrio: 'Vantagem temporária (V e R)',
    f1_q1: 'Dependência de venda avulsa de hardware', f1_q1_ev: '70% da receita vem de venda de sensores',
    f1_q2: 'Implantação lenta', f1_q2_ev: 'Média de 21 dias entre contrato e sensor operando',
    f1_q3: 'Gestão financeira sem orçamento', f1_q3_ev: 'Não há orçamento anual; decisões são tomadas pelo saldo bancário',

    /* Folha 2 */
    f2_fo1: 'Criar pacote de monitoramento financiável via cooperativa', f2_fo1_orig: 'F2 + F3 + O1 + O2',
    f2_fa1: 'Oferecer recomendações agronômicas independentes da marca da máquina', f2_fa1_orig: 'F1 + F2 + A1',
    f2_wo1: 'Padronizar a implantação para atender cooperativas em escala', f2_wo1_orig: 'f2 + O2',
    f2_wa1: 'Migrar a receita para assinatura, reduzindo a exposição ao câmbio do hardware', f2_wa1_orig: 'f1 + A2',
    f2_critico: 'A outra empresa marcou F3 com "?": 30% mais barato que o quê? Acrescentamos o importado equivalente como referência.',
    f2_chk1: true, f2_chk3: true, f2_chk4: true,

    /* Folha 3A */
    f3a_gestao_est: 'Estruturar', f3a_gestao_ev: 'Planejamento anual existe, mas sem metas por área', f3a_gestao_prox: 'Definir indicadores e metas táticas por área',
    f3a_operacao_est: 'Entender', f3a_operacao_ev: 'Cada implantação é feita de um jeito; média de 21 dias', f3a_operacao_prox: 'Padronizar o processo de implantação', f3a_operacao_garg: true,
    f3a_comercial_est: 'Estruturar', f3a_comercial_ev: 'Tem precificação e equipe de vendas; ainda sem funil', f3a_comercial_prox: 'Implantar gestão de vendas e jornada do cliente',
    f3a_pessoas_est: 'Estruturar', f3a_pessoas_ev: 'Cultura clara, contratação planejada; sem líderes formais', f3a_pessoas_prox: 'Estruturar lideranças em operação e comercial',
    f3a_financeiro_est: 'Estruturar', f3a_financeiro_ev: 'Plano de contas e análise gerencial; sem orçamento', f3a_financeiro_prox: 'Implantar plano orçamentário e forecast trimestral', f3a_financeiro_garg: true,
    f3a_estrategia_est: 'Estruturar', f3a_estrategia_ev: 'Modelo de negócio e acordo de sócios definidos; ainda sem ciclos estratégicos',
    f3a_eo1: 'Padronizar o processo de implantação', f3a_eo1_dim: 'Operação', f3a_eo1_tows: 'fO (padronizar a implantação)',
    f3a_eo2: 'Implantar orçamento anual e forecast trimestral', f3a_eo2_dim: 'Financeiro',
    f3a_eo3: 'Estruturar a gestão de vendas com funil por cooperativa', f3a_eo3_dim: 'Comercial',

    /* Folha 3B */
    f3b_pos: 'Parceira de agricultura de precisão das cooperativas de grãos',
    f3b_base: 'Necessidade + acesso',
    f3b_at1: 'Venda via cooperativa, não porta a porta', f3b_at1_liga: '2, 5',
    f3b_at2: 'Implantação em lote por cooperativa', f3b_at2_liga: '1, 3',
    f3b_at3: 'Agrônomo dedicado por cooperativa', f3b_at3_liga: '4',
    f3b_at4: 'Relatório agronômico mensal para o técnico da cooperativa', f3b_at4_liga: '3, 6',
    f3b_at5: 'Preço por hectare monitorado (assinatura)', f3b_at5_liga: '1',
    f3b_at6: 'Plataforma que integra máquinas de qualquer marca', f3b_at6_liga: '4',
    f3b_tradeoff: 'vender sensores avulsos a pequenos produtores e atender culturas fora de grãos',
    f3b_imit_uma: 'Sim: o relatório mensal é fácil de copiar',
    f3b_imit_conj: 'Difícil: exige agrônomos na equipe, base de 3 safras, preço por hectare e plataforma independente de marca, tudo junto', f3_chk4: true, f3_chk5: true, f3_chk6: true,

    /* Folha 4 */
    f4_bcg1_item: 'Plataforma por assinatura para cooperativas', f4_bcg1_merc: 'Rápido', f4_bcg1_pos: 'Forte', f4_bcg1_dec: 'Investir', f4_bcg1_obs: 'Renovação de 100%, base de 3 safras',
    f4_bcg2_item: 'Venda avulsa de sensores a produtores médios', f4_bcg2_merc: 'Devagar', f4_bcg2_pos: 'Forte', f4_bcg2_dec: 'Manter', f4_bcg2_obs: 'Sensor 30% mais barato. Usar o caixa para financiar a plataforma e converter os clientes em assinantes',
    f4_bcg3_item: 'Consultoria agronômica avulsa', f4_bcg3_merc: 'Rápido', f4_bcg3_pos: 'Fraca', f4_bcg3_dec: 'Testar', f4_bcg3_obs: 'Poucos clientes, sem escala. Testar como complemento da assinatura por 2 safras',
    f4_bcg4_item: 'Sensores para hortifrúti', f4_bcg4_merc: 'Devagar', f4_bcg4_pos: 'Fraca', f4_bcg4_dec: 'Descontinuar', f4_bcg4_obs: '3 clientes, produto adaptado',
    f4_bcg_equilibrio: 'A venda avulsa (vaca leiteira) financia a plataforma (estrela) e o teste da consultoria. Hortifrúti sai, coerente com o trade-off da Folha 3B; a venda avulsa é mantida, sem expandir.',
    f4_ans_hoje: 'Penetração de mercado', f4_ans_vetor: 'Penetração de mercado',
    f4_ans_just: 'A Operação está em "Entender" (implantação de 21 dias): antes de ir para outros estados, é preciso conseguir implantar em escala.',
    f4_int_direcao: 'Reforça a direção de POS "parceira das cooperativas" e a direção de EO "padronizar a implantação".',
    f4_int_coerencia: 'Sim. Conquistar mais cooperativas no estado respeita o trade-off (sem venda avulsa ao pequeno produtor, só grãos) e não exige a operação em escala nacional que ainda não temos.', f4_chk4: true,

    /* Folha 5A · passo 1: objetivos */
    f5a_o1_obj: 'Aumentar a participação da receita recorrente', f5a_o1_tipo: 'POS',
    f5a_o2_obj: 'Implantar a gestão orçamentária', f5a_o2_tipo: 'EO', f5a_o2_garg: true,
    f5a_o3_obj: 'Conquistar cooperativas como clientes-âncora', f5a_o3_tipo: 'POS',
    f5a_o4_obj: 'Reter as cooperativas atendidas', f5a_o4_tipo: 'POS',
    f5a_o5_obj: 'Reduzir o tempo de implantação', f5a_o5_tipo: 'EO', f5a_o5_garg: true,
    f5a_o6_obj: 'Entregar o relatório agronômico mensal', f5a_o6_tipo: 'POS',
    f5a_o7_obj: 'Estruturar lideranças em operação e comercial', f5a_o7_tipo: 'EO',

    /* Folhas 5A e 5B · passo 2: indicadores de cada objetivo (ficha e meta em f5a_; farol e gatilhos em f5b_) */
    f5a_o1_i1_nome: '% da receita que é recorrente', f5a_o1_i1_tipo: 'Resultado', f5a_o1_i1_vaid: true, f5a_o1_i1_formula: 'Receita de assinaturas ÷ receita total do mês', f5a_o1_i1_unidade: '%', f5a_o1_i1_fonte: 'Sistema de faturamento', f5a_o1_i1_freq: 'Mensal', f5a_o1_i1_pol: 'Quanto maior, melhor', f5a_o1_i1_resp: 'Sócio comercial', f5a_o1_i1_base: '30%', f5a_o1_i1_meta: '55%', f5a_o1_i1_prazo: 'dez/2027',
    f5b_o1_i1_mp: '35', f5b_o1_i1_am: '0', f5b_o1_i1_vm: '10',
    f5b_o1_i1_gam: 'Sócio comercial revisa quantos clientes avulsos migraram para assinatura e apresenta a causa na reunião mensal',
    f5b_o1_i1_gvm: 'Sócios revisam a oferta de assinatura em até 7 dias',
    f5a_o1_i2_nome: 'Receita recorrente mensal (MRR)', f5a_o1_i2_tipo: 'Tendência', f5a_o1_i2_vaid: true, f5a_o1_i2_formula: 'Soma das assinaturas faturadas no mês', f5a_o1_i2_unidade: 'R$', f5a_o1_i2_fonte: 'Sistema de faturamento', f5a_o1_i2_freq: 'Mensal', f5a_o1_i2_pol: 'Quanto maior, melhor', f5a_o1_i2_resp: 'Sócio comercial', f5a_o1_i2_base: 'R$ 45 mil', f5a_o1_i2_meta: 'R$ 110 mil', f5a_o1_i2_prazo: 'dez/2027',
    f5b_o1_i2_mp: '60000', f5b_o1_i2_am: '0', f5b_o1_i2_vm: '15',
    f5b_o1_i2_gam: 'Sócio comercial revisa contratos parados e apresenta causa na reunião mensal',
    f5b_o1_i2_gvm: 'Sócios se reúnem em até 3 dias; plano corretivo em até 7 dias',
    f5a_o2_i1_nome: 'Desvio entre orçado e realizado', f5a_o2_i1_tipo: 'Resultado', f5a_o2_i1_vaid: true, f5a_o2_i1_formula: 'Diferença entre o realizado e o orçado nas despesas do mês ÷ orçado', f5a_o2_i1_unidade: '%', f5a_o2_i1_fonte: 'Planilha de orçamento e relatório do contador', f5a_o2_i1_freq: 'Mensal', f5a_o2_i1_pol: 'Quanto menor, melhor', f5a_o2_i1_resp: 'Sócio financeiro', f5a_o2_i1_base: 'Sem orçamento (primeira medição em mar/2027)', f5a_o2_i1_meta: '≤ 10%', f5a_o2_i1_prazo: 'a partir de jun/2027',
    f5b_o2_i1_mp: '10', f5b_o2_i1_am: '0', f5b_o2_i1_vm: '50',
    f5b_o2_i1_gam: 'Sócio financeiro revisa as 3 maiores variações com o contador',
    f5b_o2_i1_gvm: 'Sócios revisam o orçamento em até 7 dias',
    f5a_o3_i1_nome: 'Nº de cooperativas com contrato anual', f5a_o3_i1_tipo: 'Resultado', f5a_o3_i1_vaid: true, f5a_o3_i1_formula: 'Cooperativas com contrato anual vigente no fim do trimestre', f5a_o3_i1_unidade: 'cooperativas', f5a_o3_i1_fonte: 'Contratos (pasta comercial)', f5a_o3_i1_freq: 'Trimestral', f5a_o3_i1_pol: 'Quanto maior, melhor', f5a_o3_i1_resp: 'Sócio comercial', f5a_o3_i1_base: '2', f5a_o3_i1_meta: '6', f5a_o3_i1_prazo: 'dez/2027',
    f5b_o3_i1_mp: '3', f5b_o3_i1_am: '0', f5b_o3_i1_vm: '35',
    f5b_o3_i1_gam: 'Sócio comercial revisa as negociações em aberto com cada cooperativa',
    f5b_o3_i1_gvm: 'Sócios revisam a proposta para cooperativas em até 7 dias',
    f5a_o3_i2_nome: 'Demonstrações para cooperativas por mês', f5a_o3_i2_tipo: 'Tendência', f5a_o3_i2_vaid: true, f5a_o3_i2_formula: 'Nº de demonstrações da plataforma feitas para cooperativas no mês', f5a_o3_i2_unidade: 'por mês', f5a_o3_i2_fonte: 'Agenda comercial', f5a_o3_i2_freq: 'Mensal', f5a_o3_i2_pol: 'Quanto maior, melhor', f5a_o3_i2_resp: 'Sócio comercial', f5a_o3_i2_base: '1 por mês', f5a_o3_i2_meta: '4 por mês', f5a_o3_i2_prazo: 'a partir de fev/2027',
    f5b_o3_i2_mp: '3', f5b_o3_i2_am: '0', f5b_o3_i2_vm: '35',
    f5b_o3_i2_gam: 'Comercial revisa o funil de cooperativas',
    f5b_o3_i2_gvm: 'Sócios revisam a abordagem comercial em até 7 dias',
    f5a_o4_i1_nome: 'Taxa de renovação contratual', f5a_o4_i1_tipo: 'Resultado', f5a_o4_i1_vaid: true, f5a_o4_i1_formula: 'Contratos renovados ÷ contratos que venceram no período', f5a_o4_i1_unidade: '%', f5a_o4_i1_fonte: 'Contratos (pasta comercial)', f5a_o4_i1_freq: 'Trimestral', f5a_o4_i1_pol: 'Quanto maior, melhor', f5a_o4_i1_resp: 'Sócio comercial', f5a_o4_i1_base: '100% (2 de 2)', f5a_o4_i1_meta: '≥ 90%', f5a_o4_i1_prazo: 'contínuo',
    f5b_o4_i1_mp: '90', f5b_o4_i1_am: '0', f5b_o4_i1_vm: '5',
    f5b_o4_i1_gam: 'Sócio comercial liga para a cooperativa que não renovou e registra o motivo',
    f5b_o4_i1_gvm: 'Sócios visitam a cooperativa em até 7 dias e montam um plano de retenção',
    f5a_o5_i1_nome: 'Dias entre contrato e sensor operando', f5a_o5_i1_tipo: 'Resultado', f5a_o5_i1_vaid: true, f5a_o5_i1_formula: 'Média de dias entre a assinatura do contrato e o sensor operando, nas implantações do mês', f5a_o5_i1_unidade: 'dias', f5a_o5_i1_fonte: 'Planilha de implantações da coordenação de campo', f5a_o5_i1_freq: 'Mensal', f5a_o5_i1_pol: 'Quanto menor, melhor', f5a_o5_i1_resp: 'Coordenador de campo', f5a_o5_i1_base: '21 dias', f5a_o5_i1_meta: '7 dias', f5a_o5_i1_prazo: 'dez/2027',
    f5b_o5_i1_mp: '14', f5b_o5_i1_am: '0', f5b_o5_i1_vm: '15',
    f5b_o5_i1_gam: 'Coordenador de campo revisa as 3 últimas implantações',
    f5b_o5_i1_gvm: 'Sócio de operações aciona; plano corretivo em até 7 dias',
    f5a_o6_i1_nome: '% de cooperativas que recebem o relatório no prazo', f5a_o6_i1_tipo: 'Resultado', f5a_o6_i1_vaid: true, f5a_o6_i1_formula: 'Cooperativas que receberam o relatório até o dia 5 ÷ cooperativas atendidas', f5a_o6_i1_unidade: '%', f5a_o6_i1_fonte: 'Registro de envios da plataforma', f5a_o6_i1_freq: 'Mensal', f5a_o6_i1_pol: 'Quanto maior, melhor', f5a_o6_i1_resp: 'Líder de produto', f5a_o6_i1_base: 'a levantar', f5a_o6_i1_meta: '100%', f5a_o6_i1_prazo: 'a partir de abr/2027',
    f5b_o6_i1_mp: '100', f5b_o6_i1_am: '0', f5b_o6_i1_vm: '15',
    f5b_o6_i1_gam: 'Líder de produto verifica quais relatórios atrasaram e por quê',
    f5b_o6_i1_gvm: 'Sócio de operações aciona; plano corretivo em até 7 dias',
    f5a_o7_i1_nome: 'Nº de líderes com plano de desenvolvimento', f5a_o7_i1_tipo: 'Resultado', f5a_o7_i1_vaid: true, f5a_o7_i1_formula: 'Líderes de operação e comercial com plano de desenvolvimento acordado', f5a_o7_i1_unidade: 'líderes', f5a_o7_i1_fonte: 'Pasta de pessoas', f5a_o7_i1_freq: 'Trimestral', f5a_o7_i1_pol: 'Quanto maior, melhor', f5a_o7_i1_resp: 'Sócio de operações', f5a_o7_i1_base: '0', f5a_o7_i1_meta: '2', f5a_o7_i1_prazo: 'jun/2027',
    f5b_o7_i1_mp: '2', f5b_o7_i1_am: '0', f5b_o7_i1_vm: '50',
    f5b_o7_i1_gam: 'Sócio de operações confere o andamento dos planos na reunião mensal',
    f5b_o7_i1_gvm: 'Sócios redefinem prazo e apoio (mentoria externa) em até 7 dias',
    f5_chk7: true,

    /* Folha 6 */
    f6_a1_obj: '5', f6_a1_acao: 'Criar kit de instalação pré-configurado', f6_a1_ind: '5.1', f6_a1_alav: 'De 21 para 12 dias em 3 meses', f6_a1_imp: 'A', f6_a1_esf: 'B', f6_a1_resp: 'Coordenador de campo', f6_a1_prazo: 'mar/2027', f6_a1_custo: 'R$ 8 mil',
    f6_a2_obj: '5', f6_a2_acao: 'Definir prioridade formal: contratos recorrentes antes de venda avulsa', f6_a2_ind: '5.1', f6_a2_alav: 'Libera a equipe de campo para as cooperativas já no próximo mês', f6_a2_imp: 'A', f6_a2_esf: 'B', f6_a2_resp: 'Sócio de operações', f6_a2_prazo: 'jan/2027', f6_a2_custo: '—',
    f6_a3_obj: '3', f6_a3_acao: 'Piloto gratuito de 60 dias com 3 cooperativas', f6_a3_ind: '3.1', f6_a3_alav: '+2 cooperativas com contrato em 6 meses', f6_a3_imp: 'A', f6_a3_esf: 'A', f6_a3_resp: 'Sócio comercial', f6_a3_prazo: 'jun/2027', f6_a3_custo: 'R$ 25 mil',
    f6_a4_obj: '1', f6_a4_acao: 'Oferecer plano anual com desconto para quem compra sensores', f6_a4_ind: '1.1', f6_a4_alav: '+5 pontos percentuais de receita recorrente em 6 meses', f6_a4_imp: 'A', f6_a4_esf: 'B', f6_a4_resp: 'Sócio comercial', f6_a4_prazo: 'fev/2027', f6_a4_custo: '—',
    f6_a5_obj: '2', f6_a5_acao: 'Montar orçamento anual em planilha com o contador', f6_a5_ind: '2.1', f6_a5_alav: 'Primeira medição do desvio em mar/2027', f6_a5_imp: 'A', f6_a5_esf: 'B', f6_a5_resp: 'Sócio financeiro', f6_a5_prazo: 'fev/2027', f6_a5_custo: 'R$ 3 mil',
    f6_a6_obj: '2', f6_a6_acao: 'Contratar sistema de gestão financeira', f6_a6_ind: '2.1', f6_a6_alav: 'Pouco além do que a planilha já resolve no estágio atual', f6_a6_imp: 'B', f6_a6_esf: 'A', f6_a6_resp: 'Sócio financeiro', f6_a6_custo: 'Descartada por ora: volta quando o Financeiro chegar em "Desenvolver"',
    f6_a7_obj: '6', f6_a7_acao: 'Criar modelo padrão de relatório gerado pela plataforma', f6_a7_ind: '6.1', f6_a7_alav: '100% no prazo a partir de abr/2027', f6_a7_imp: 'A', f6_a7_esf: 'A', f6_a7_resp: 'Líder de produto', f6_a7_prazo: 'abr/2027', f6_a7_custo: 'R$ 15 mil',
    f6_a8_obj: '4', f6_a8_acao: 'Reunião trimestral de resultados com cada cooperativa', f6_a8_ind: '4.1', f6_a8_alav: 'Mantém a renovação acima de 90% nos próximos 12 meses', f6_a8_imp: 'A', f6_a8_esf: 'B', f6_a8_resp: 'Sócio comercial', f6_a8_prazo: 'mar/2027', f6_a8_custo: '—',
    f6_a9_obj: '7', f6_a9_acao: 'Plano de desenvolvimento com mentoria para os coordenadores de campo e comercial', f6_a9_ind: '7.1', f6_a9_alav: '2 líderes com plano até jun/2027', f6_a9_imp: 'A', f6_a9_esf: 'B', f6_a9_resp: 'Sócio de operações', f6_a9_prazo: 'mai/2027', f6_a9_custo: 'R$ 6 mil',
    f6_chk1: true,

    /* Fechamento */
    fc_obj: '5', fc_direcao: 'fO da TOWS (padronizar a implantação) + gargalo Operação (Folha 3A)',
    fc_quebra: 'A cadeia fecha. No objetivo 6 (relatório mensal) ela quebrava: a linha de base estava "a levantar" e não havia ação. Incluímos o modelo padrão de relatório e o levantamento ficou como tarefa.',
    fc_chk1: true, fc_chk2: true, fc_chk3: true, fc_chk4: true,
    fc_obs: 'Levantar quantos relatórios saíram no prazo em 2026 (não há registro de envios). Validar o caderno com o sócio financeiro, que não veio à Aula 1.',

    /* Folha 7 */
    f7_ret_bases: 'Parte levantada', f7_ret_dificil: '% de relatórios entregues no prazo: não havia registro de envios',
    f7_ret_mudou: 'O sócio financeiro pediu que a gestão orçamentária fosse um objetivo próprio, e não só uma ação; e a meta do tempo de implantação no trimestre ficou em 14 dias, por realismo.',
    f7_o1_persp: 'fin',
    f7_o2_persp: 'fin', f7_o2_just: 'Objetivo habilitador: dá controle sobre o investimento necessário para todos os outros. Fica, e a justificativa é registrada.',
    f7_o3_persp: 'cli', f7_o3_leva: '1',
    f7_o4_persp: 'cli', f7_o4_leva: '1',
    f7_o5_persp: 'pro', f7_o5_leva: '3',
    f7_o6_persp: 'pro', f7_o6_leva: '4',
    f7_o7_persp: 'apr', f7_o7_leva: '5',
    f7_ajustes: '"Implantar a gestão orçamentária" ficou sem seta: mantido como objetivo habilitador, com a justificativa registrada.', f7_chk5: true,
  }
};
