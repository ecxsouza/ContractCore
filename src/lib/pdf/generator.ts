// ================================================================
// ContractCore — Gerador de Contrato Local
// Executado no servidor para montagem da minuta base
// ================================================================

import type { ContractFormData, Company, AnexoType } from '@/types';
import { formatDateLong } from '@/lib/masks';

function hoje(): string {
  return formatDateLong(new Date().toISOString().split('T')[0]);
}

// Formato oficial de endereço: Rua, Número[, Complemento] - Bairro - CEP - Cidade - UF
function formatarEndereco(opts: {
  logradouro?: string; numero?: string; complemento?: string;
  bairro?: string; cep?: string; cidade?: string; uf?: string;
}): string {
  const { logradouro, numero, complemento, bairro, cep, cidade, uf } = opts;
  if (!logradouro && !cidade) return '';
  const ruaNumero = `${logradouro || 'Rua'}, ${numero || '0'}${complemento ? ', ' + complemento : ''}`;
  return `${ruaNumero} - ${bairro || 'Bairro'} - ${cep || 'CEP'} - ${cidade || 'Cidade'} - ${uf || 'UF'}`;
}

// Ordem canônica dos anexos — idêntica à ordem exibida na tela (ANEXOS_INFO em Step4Review.tsx).
// Garante que a numeração de letras (Anexo A, B, C...) seja sempre estável e previsível,
// independentemente da ordem em que o usuário clicou para selecionar cada anexo.
const ORDEM_CANONICA_ANEXOS: AnexoType[] = [
  'confidencialidade',
  'lgpd',
  'prontuarios',
  'uso_estrutura',
  'politica_agenda',
  'sem_vinculo_clt',
  'checklist_pj_mei',
  'checklist_pejotizacao',
  'checklist_conselho',
  'ciencia_etica',
];

// Normaliza a lista de anexos selecionados: remove duplicados, ignora valores desconhecidos
// e reordena conforme ORDEM_CANONICA_ANEXOS — garantindo que nenhum anexo selecionado se perca.
function normalizarAnexos(anexos: AnexoType[]): AnexoType[] {
  const selecionados = new Set(anexos || []);
  return ORDEM_CANONICA_ANEXOS.filter(a => selecionados.has(a));
}

export function generateContractHTML(
  formData: ContractFormData,
  company: Company,
  numeroContrato: string
): string {
  const { provider, service, remuneration, anexos: anexosSelecionados } = formData;
  // Normaliza: remove duplicados, ignora IDs inválidos, ordena conforme a tela.
  // Isso garante que TODOS os anexos selecionados cheguem ao contrato final,
  // na mesma ordem em que aparecem na aba Anexos do wizard.
  const anexos = normalizarAnexos(anexosSelecionados);

  const nomeContratada = provider.nome_razao_social;
  const tipoPessoa = provider.tipo_pessoa;

  const enderecoProvider = formatarEndereco({
    logradouro: provider.logradouro, numero: provider.numero, complemento: provider.complemento,
    bairro: provider.bairro, cep: provider.cep, cidade: provider.cidade, uf: provider.uf,
  });
  const enderecoCompany = formatarEndereco({
    logradouro: company.logradouro, numero: company.numero, complemento: company.complemento,
    bairro: company.bairro, cep: company.cep, cidade: company.cidade, uf: company.uf,
  });

  const qualificacaoContratada = tipoPessoa === 'PF'
    ? `${nomeContratada}, ${provider.nacionalidade || 'brasileiro(a)'}, ${provider.estado_civil || ''}, ${provider.profissao_descricao || provider.profissao}, portador(a) do CPF nº ${provider.cpf || '___'} e RG nº ${provider.rg || '___'}, residente em ${enderecoProvider}, e-mail: ${provider.email}, celular: ${provider.telefone}${provider.telefone_fixo ? ', telefone: ' + provider.telefone_fixo : ''}`
    : `${nomeContratada}${provider.nome_fantasia ? ', nome fantasia "' + provider.nome_fantasia + '"' : ''}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${provider.cnpj || '___'}${provider.inscricao_municipal ? ', Inscrição Municipal nº ' + provider.inscricao_municipal : ''}${provider.conselho_profissional ? ', registrada no ' + provider.conselho_profissional + ' sob o nº ' + provider.numero_registro_conselho : ''}, com sede em ${enderecoProvider}${provider.responsavel_legal ? ', representada neste ato por ' + provider.responsavel_legal + ', CPF nº ' + provider.cpf_responsavel : ''}, e-mail: ${provider.email}, celular: ${provider.telefone}${provider.telefone_fixo ? ', telefone: ' + provider.telefone_fixo : ''}`;

  const todosRecursos = [
    ...(service.recursos_disponibilizados || []),
    ...(service.recursos_personalizados   || []),
  ];
  const recursosStr = todosRecursos.length > 0
    ? `a CONTRATANTE disponibilizará os seguintes recursos ao PRESTADOR: ${todosRecursos.join(', ')}.`
    : 'não há disponibilização de recursos ou estrutura física além dos itens acordados entre as partes.';

  const exclTitulo = service.exclusividade
    ? 'CLÁUSULA 4ª — DA ATUAÇÃO PROFISSIONAL E RESTRIÇÕES COMERCIAIS'
    : 'CLÁUSULA 4ª — DA NÃO EXCLUSIVIDADE';
  const excl = service.exclusividade
    ? 'A CONTRATADA poderá prestar serviços a outras pessoas físicas ou jurídicas, desde que não haja conflito de interesses direto com as atividades da CONTRATANTE. Fica vedado, durante a vigência deste contrato, o atendimento particular de pacientes ativos encaminhados ou atendidos exclusivamente pela CONTRATANTE, salvo autorização expressa e por escrito.'
    : 'O presente contrato NÃO estabelece exclusividade. O PRESTADOR poderá exercer livremente sua atividade profissional junto a outras pessoas físicas ou jurídicas, desde que não haja conflito de interesses ou violação do sigilo profissional.';

  const vigencia = formData.vigencia_indeterminada
    ? 'O presente contrato vigora por prazo <strong>indeterminado</strong>'
    : `O presente contrato vigora de <strong>${formatDateLong(formData.data_vigencia_inicio)}</strong> até <strong>${formatDateLong(formData.data_vigencia_fim)}</strong>`;

  const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
    pix: 'PIX', transferencia: 'transferência', boleto: 'boleto', dinheiro: 'dinheiro', outro: 'outro',
  };
  const formasPagamentoStr = (remuneration.formas_pagamento || [])
    .map(f => f === 'outro' && remuneration.forma_pagamento_outro_detalhe
      ? `outro meio pactuado: ${remuneration.forma_pagamento_outro_detalhe}`
      : (FORMA_PAGAMENTO_LABEL[f] || f))
    .join(', ');

  let nfClausula = '';
  if (remuneration.emite_nota_fiscal === 'obrigatorio') {
    nfClausula = 'O PRESTADOR obriga-se a emitir Nota Fiscal de Serviços (NFS-e) para cada pagamento recebido, sendo a emissão condição para liberação do respectivo pagamento.';
  } else if (remuneration.emite_nota_fiscal === 'dispensado_mei') {
    nfClausula = 'O PRESTADOR, na qualidade de Microempreendedor Individual (MEI), fica dispensado da emissão de NFS-e enquanto a receita bruta não superar os limites legais do MEI. Atingido o limite, a emissão torna-se obrigatória.';
  } else {
    nfClausula = 'A obrigatoriedade de emissão de Nota Fiscal será definida conforme a natureza jurídica do PRESTADOR e a legislação fiscal aplicável.';
  }

  const html = `
<article class="contract-body">

<h1 class="contract-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
<p class="contract-meta">Nº ${numeroContrato} &nbsp;·&nbsp; ${provider.profissao_descricao || provider.profissao} &nbsp;·&nbsp; ${company.cidade}/${company.uf}</p>

<section>
<h2>PARTES CONTRATANTES</h2>
<div class="partes-grid">
  <div class="parte-card">
    <div class="parte-label">CONTRATANTE</div>
    <p class="parte-nome">${company.razao_social}</p>
    <p class="parte-info">${company.nome_fantasia}</p>
    <p class="parte-info">CNPJ: ${company.cnpj}</p>
    ${company.inscricao_municipal ? `<p class="parte-info">Inscrição Municipal: ${company.inscricao_municipal}</p>` : ''}
    <p class="parte-info">${enderecoCompany}</p>
    <p class="parte-info">E-mail: ${company.email}</p>
    <p class="parte-info">Tel: ${company.telefone}</p>
    <p class="parte-rep">Representada por: <strong>${company.responsavel_legal}</strong> — CPF ${company.cpf_responsavel}</p>
  </div>
  <div class="parte-card">
    <div class="parte-label">CONTRATADA</div>
    <p class="parte-nome">${nomeContratada}</p>
    ${provider.nome_fantasia ? `<p class="parte-info">${provider.nome_fantasia}</p>` : ''}
    ${provider.cnpj ? `<p class="parte-info">CNPJ: ${provider.cnpj}</p>` : ''}
    ${provider.cpf ? `<p class="parte-info">CPF: ${provider.cpf}</p>` : ''}
    ${provider.rg ? `<p class="parte-info">RG: ${provider.rg}</p>` : ''}
    ${(provider.nacionalidade || provider.estado_civil) ? `<p class="parte-info">${[provider.nacionalidade, provider.estado_civil].filter(Boolean).join(', ')}</p>` : ''}
    <p class="parte-info">${provider.profissao_descricao || provider.profissao}${provider.especialidade ? ' — ' + provider.especialidade : ''}</p>
    ${provider.conselho_profissional ? `<p class="parte-info">${provider.conselho_profissional}: ${provider.numero_registro_conselho || '___'}</p>` : ''}
    ${enderecoProvider ? `<p class="parte-info">${enderecoProvider}</p>` : ''}
    <p class="parte-info">E-mail: ${provider.email}</p>
    ${provider.telefone ? `<p class="parte-info">Cel: ${provider.telefone}</p>` : ''}
    ${provider.telefone_fixo ? `<p class="parte-info">Tel: ${provider.telefone_fixo}</p>` : ''}
  </div>
</div>
<p class="partes-intro">As partes acima qualificadas, doravante denominadas <strong>CONTRATANTE</strong> e <strong>CONTRATADA</strong>, celebram o presente instrumento de <strong>Contrato de Prestação de Serviços Autônomos</strong>, regido pelas cláusulas e condições adiante estipuladas.</p>
</section>

<section>
<h2>CLÁUSULA 1ª — DO OBJETO</h2>
<div class="clausula">
<p data-clause-key="objeto"><strong>1.1.</strong> ${service.objeto}</p>
${service.descricao_servicos ? `<p data-clause-key="descricao_servicos"><strong>1.2. Descrição dos serviços:</strong> ${service.descricao_servicos}</p>` : ''}
<p><strong>1.3. Local:</strong> ${service.local_prestacao}. <strong>Modalidade:</strong> ${service.modalidade}. <strong>Periodicidade:</strong> ${service.periodicidade}.</p>
${service.agenda_pactuada ? `<p><strong>1.4. Agenda pactuada:</strong> ${service.agenda_pactuada} — A agenda é livremente pactuada entre as partes, não configurando controle de jornada ou subordinação de qualquer natureza.</p>` : ''}
</div>
</section>

<section>
<h2>CLÁUSULA 2ª — NATUREZA JURÍDICA E AUSÊNCIA DE VÍNCULO EMPREGATÍCIO</h2>
<div class="clausula">
<p><strong>2.1.</strong> O presente instrumento é um <strong>contrato de prestação de serviços autônoma</strong>, regido pelos arts. 593 a 609 do Código Civil (Lei nº 10.406/2002), não configurando em qualquer hipótese relação de emprego, vínculo empregatício, sociedade ou parceria permanente entre as partes.</p>
<p><strong>2.2.</strong> São expressamente inexistentes entre as partes: habitualidade forçada, onerosidade de natureza salarial, pessoalidade compulsória e subordinação hierárquica. A CONTRATADA exerce suas atividades com plena <strong>autonomia técnica, administrativa e profissional</strong>.</p>
<p><strong>2.3.</strong> Não haverá controle de jornada, ponto eletrônico, advertência disciplinar ou qualquer mecanismo caracterizador de relação empregatícia.</p>
<p><strong>2.4.</strong> A CONTRATADA poderá, a seu critério e responsabilidade, fazer-se substituir por profissional igualmente habilitado, desde que comunicado à CONTRATANTE com antecedência e observadas as normas do conselho profissional competente.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 3ª — AUTONOMIA TÉCNICA E PROFISSIONAL</h2>
<div class="clausula">
<p><strong>3.1.</strong> A CONTRATADA possui plena autonomia técnica e científica, sendo livre para adotar métodos, abordagens e procedimentos que julgar adequados, desde que alinhados às normas éticas e regulatórias do(s) conselho(s) profissional(ais) competente(s).</p>
<p><strong>3.2.</strong> A CONTRATANTE não intervirá nas decisões técnicas e clínicas da CONTRATADA, respeitando integralmente sua autonomia profissional.</p>
${provider.conselho_profissional ? `<p><strong>3.3.</strong> A CONTRATADA declara estar regularmente inscrita no ${provider.conselho_profissional} sob o nº ${provider.numero_registro_conselho}, comprometendo-se a manter tal regularidade durante toda a vigência deste instrumento.</p>` : ''}
</div>
</section>

<section>
<h2>${exclTitulo}</h2>
<div class="clausula"><p data-clause-key="exclusividade">${excl}</p></div>
</section>

<section>
<h2>CLÁUSULA 5ª — OBRIGAÇÕES DA CONTRATANTE</h2>
<div class="clausula">
<p><strong>5.1.</strong> Efetuar o pagamento dos honorários nas condições estabelecidas neste instrumento.</p>
<p><strong>5.2.</strong> Quanto ao uso da estrutura: ${recursosStr}</p>
<p><strong>5.3.</strong> Manter ambiente adequado ao exercício das atividades, observando normas sanitárias e de saúde aplicáveis.</p>
<p><strong>5.4.</strong> Preservar o sigilo das informações técnicas e clínicas produzidas pela CONTRATADA.</p>
<p><strong>5.5.</strong> Comunicar alterações em protocolos internos que possam afetar a prestação dos serviços.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 6ª — OBRIGAÇÕES DA CONTRATADA</h2>
<div class="clausula">
<p><strong>6.1.</strong> Prestar os serviços com diligência, perícia e boa técnica, observando os padrões éticos e deontológicos de sua categoria profissional.</p>
<p><strong>6.2.</strong> Manter registro ativo e regular junto ao conselho profissional competente, apresentando comprovante quando solicitado.</p>
<p><strong>6.3.</strong> Observar rigorosamente as normas do Conselho Federal de Psicologia (CFP), Conselho Regional de Psicologia (CRP) e demais entidades reguladoras aplicáveis.</p>
<p><strong>6.4.</strong> Guardar sigilo profissional absoluto sobre informações de pacientes e dados institucionais da CONTRATANTE.</p>
<p><strong>6.5.</strong> Comunicar imediatamente qualquer irregularidade, conflito de interesses ou impedimento ético.</p>
<p><strong>6.6.</strong> Responsabilizar-se integralmente pelas obrigações fiscais, previdenciárias e tributárias decorrentes de sua atividade (ISS, INSS, IR e demais tributos aplicáveis).</p>
${service.regra_captacao_pacientes ? `<p><strong>6.7.</strong> ${service.regra_captacao_pacientes}</p>` : '<p><strong>6.7.</strong> Não realizar captação de pacientes da CONTRATANTE para atendimento em consultório particular ou terceiro durante a vigência deste contrato e por 12 (doze) meses após seu encerramento, salvo acordo expresso em contrário.</p>'}
</div>
</section>

<section>
<h2>CLÁUSULA 7ª — DA REMUNERAÇÃO E NOTA FISCAL</h2>
<div class="clausula">
<p data-clause-key="remuneracao"><strong>7.1.</strong> Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA: <strong>${remuneration.valor_descricao}</strong>.</p>
<p><strong>7.2.</strong> Pagamento até <strong>${remuneration.data_pagamento}</strong>, via <strong>${formasPagamentoStr}</strong>.</p>
<p><strong>7.3.</strong> ${nfClausula}</p>
${remuneration.retencoes_fiscais ? `<p><strong>7.4.</strong> Retenções acordadas: ${remuneration.retencoes_fiscais}.</p>` : ''}
<p><strong>7.5. Reembolso:</strong> ${remuneration.reembolso_descricao || 'Não há previsão de reembolso de despesas.'}</p>
<p><strong>7.6.</strong> Honorários poderão ser reajustados anualmente com base no INPC/IBGE, mediante acordo prévio entre as partes.</p>
<p><strong>7.7.</strong> O inadimplemento sujeitará a CONTRATANTE à multa moratória de 2% sobre o valor devido, mais juros de 1% ao mês e correção pelo INPC.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 8ª — RESPONSABILIDADE FISCAL E PREVIDENCIÁRIA</h2>
<div class="clausula">
<p><strong>8.1.</strong> A CONTRATADA é a única e exclusiva responsável pelo cumprimento de todas as obrigações fiscais, tributárias e previdenciárias decorrentes de suas atividades, incluindo ISS, IRPF/IRPJ e contribuições previdenciárias.</p>
<p><strong>8.2.</strong> A CONTRATANTE não responde por quaisquer obrigações trabalhistas, previdenciárias ou fiscais da CONTRATADA, incluindo FGTS, 13º, férias, aviso prévio ou qualquer verba de natureza empregatícia.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 9ª — SIGILO PROFISSIONAL E CONFIDENCIALIDADE</h2>
<div class="clausula">
<p><strong>9.1.</strong> A CONTRATADA compromete-se a manter sigilo profissional absoluto sobre todas as informações de pacientes, procedimentos clínicos e dados institucionais, observando o Código de Ética Profissional e a legislação aplicável.</p>
<p><strong>9.2.</strong> A obrigação de sigilo permanece válida por <strong>10 (dez) anos</strong> após o término deste contrato, ou indefinidamente quanto a dados sensíveis de saúde.</p>
<p><strong>9.3.</strong> A violação do sigilo enseja rescisão imediata e sujeitará a CONTRATADA a sanções civis, penais e deontológicas.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 10ª — PROTEÇÃO DE DADOS PESSOAIS (LGPD — LEI Nº 13.709/2018)</h2>
<div class="clausula">
<p><strong>10.1.</strong> As partes comprometem-se a observar rigorosamente a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) no tratamento de todos os dados pessoais e sensíveis de saúde a que tiverem acesso.</p>
<p><strong>10.2.</strong> Os dados dos pacientes somente serão tratados para as finalidades estritamente necessárias à prestação dos serviços contratados.</p>
<p><strong>10.3.</strong> A CONTRATADA, na qualidade de <strong>operadora</strong>, tratará dados apenas conforme instruções da CONTRATANTE (<strong>controladora</strong>), adotando medidas técnicas e administrativas de segurança.</p>
<p><strong>10.4.</strong> Incidentes de segurança envolvendo dados pessoais devem ser comunicados à CONTRATANTE em até <strong>24 (vinte e quatro) horas</strong>.</p>
<p><strong>10.5.</strong> Ao término do contrato, a CONTRATADA devolverá ou destruirá os dados pessoais acessados, conforme determinação da CONTRATANTE, salvo obrigação legal de retenção.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 11ª — PRONTUÁRIOS E DOCUMENTOS CLÍNICOS</h2>
<div class="clausula">
<p><strong>11.1.</strong> Os prontuários, laudos e documentos clínicos produzidos são de responsabilidade técnica da CONTRATADA e de guarda compartilhada com a CONTRATANTE, observadas as normas do CFP e demais regulamentações vigentes.</p>
<p><strong>11.2.</strong> ${service.resp_documentos || 'É vedada a remoção, cópia não autorizada ou compartilhamento de documentos clínicos sem observância dos protocolos da CONTRATANTE e normas éticas vigentes.'}</p>
<p><strong>11.3.</strong> O prazo mínimo de guarda de prontuários observará a legislação vigente (mínimo 5 anos para adultos; até 10 anos para menores após término do atendimento).</p>
</div>
</section>

<section>
<h2>CLÁUSULA 12ª — ÉTICA PROFISSIONAL E NORMAS DOS CONSELHOS</h2>
<div class="clausula">
<p><strong>12.1.</strong> A CONTRATADA observará integralmente o Código de Ética da sua categoria, as Resoluções do CFP, CRP e demais entidades reguladoras competentes.</p>
<p><strong>12.2.</strong> É vedada qualquer conduta que configure violação ética, discriminação, assédio, abuso de poder profissional ou prejuízo aos pacientes.</p>
<p><strong>12.3.</strong> A CONTRATADA responde pelas consequências técnicas, éticas e legais de sua atuação profissional.</p>
${service.condutas_vedadas ? `<p><strong>12.4.</strong> Condutas especificamente vedadas: ${service.condutas_vedadas}</p>` : ''}
</div>
</section>

<section>
<h2>CLÁUSULA 13ª — USO DA ESTRUTURA DA CLÍNICA</h2>
<div class="clausula">
<p><strong>13.1.</strong> Quanto ao uso da estrutura: ${recursosStr}</p>
<p><strong>13.2.</strong> O uso dos recursos é restrito às atividades objeto deste contrato, vedado uso pessoal ou para atendimentos não pactuados.</p>
${service.resp_materiais ? `<p><strong>13.3.</strong> ${service.resp_materiais}</p>` : '<p><strong>13.3.</strong> A CONTRATADA é responsável por seus próprios materiais, instrumentos e equipamentos necessários ao exercício de sua atividade, salvo os expressamente disponibilizados pela CONTRATANTE.</p>'}
</div>
</section>

<section>
<h2>CLÁUSULA 14ª — AGENDA, FALTAS E CANCELAMENTOS</h2>
<div class="clausula">
<p><strong>14.1.</strong> A agenda é livremente pactuada entre as partes, com autonomia do PRESTADOR quanto ao exercício de suas atividades.${service.agenda_pactuada ? ' Agenda inicial acordada: ' + service.agenda_pactuada + '.' : ''}</p>
${service.regra_cancelamento ? `<p data-clause-key="cancelamento"><strong>14.2. Cancelamentos:</strong> ${service.regra_cancelamento}</p>` : '<p data-clause-key="cancelamento"><strong>14.2.</strong> Cancelamentos devem ser comunicados com mínimo de 24 horas de antecedência.</p>'}
${service.regra_falta ? `<p><strong>14.3. Faltas:</strong> ${service.regra_falta}</p>` : ''}
${service.regra_atraso ? `<p><strong>14.4. Atrasos:</strong> ${service.regra_atraso}</p>` : ''}
${service.regra_remarcacao ? `<p><strong>14.5. Remarcações:</strong> ${service.regra_remarcacao}</p>` : ''}
</div>
</section>

<section>
<h2>CLÁUSULA 15ª — COMUNICAÇÃO COM PACIENTES E USO DA MARCA</h2>
<div class="clausula">
${service.regra_comunicacao_pacientes ? `<p><strong>15.1.</strong> ${service.regra_comunicacao_pacientes}</p>` : ''}
${service.regra_uso_marca ? `<p><strong>15.2.</strong> ${service.regra_uso_marca}</p>` : `<p><strong>15.2.</strong> A CONTRATADA poderá utilizar a marca "${company.nome_fantasia}" exclusivamente para fins de identificação institucional no exercício das atividades contratadas.</p>`}
${service.regra_redes_sociais ? `<p><strong>15.3. Redes sociais:</strong> ${service.regra_redes_sociais}</p>` : '<p><strong>15.3.</strong> Publicações em redes sociais que envolvam nome, marca ou imagem da CONTRATANTE requerem autorização prévia.</p>'}
</div>
</section>

<section>
<h2>CLÁUSULA 16ª — RESPONSABILIDADE TÉCNICA</h2>
<div class="clausula">
<p><strong>16.1.</strong> A CONTRATADA responde integralmente pelos atos, laudos, pareceres e condutas técnicas que praticar, respondendo perante pacientes, conselho profissional e demais autoridades.</p>
<p><strong>16.2.</strong> A CONTRATANTE não se responsabiliza por atos técnicos da CONTRATADA. A responsabilidade técnica é pessoal e intransferível.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 17ª — VIGÊNCIA E RESCISÃO</h2>
<div class="clausula">
<p><strong>17.1.</strong> ${vigencia}, podendo ser rescindido por qualquer das partes mediante notificação prévia por escrito com antecedência mínima de <strong>30 (trinta) dias</strong>.</p>
<p><strong>17.2.</strong> A rescisão não gera direito a qualquer verba rescisória de natureza trabalhista.</p>
<p><strong>17.3. Rescisão Imediata por Falta Grave:</strong></p>
<p>a) Violação de sigilo profissional ou dados pessoais de pacientes;</p>
<p>b) Conduta antiética perante conselho profissional;</p>
<p>c) Cassação, suspensão ou cancelamento do registro profissional;</p>
<p>d) Irregularidade fiscal grave;</p>
<p>e) Captação indevida de pacientes da CONTRATANTE;</p>
<p>f) Prática de ato ilícito ou crime no exercício das atividades;</p>
<p>g) Descumprimento reiterado e injustificado das cláusulas deste instrumento.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 18ª — PENALIDADES</h2>
<div class="clausula">
<p><strong>18.1.</strong> O descumprimento sujeita o infrator à multa de 10% dos honorários mensais, sem prejuízo de indenização por perdas e danos.</p>
<p><strong>18.2.</strong> Violações de sigilo, LGPD ou ética profissional: multa específica de R$ 10.000,00, sem prejuízo das demais sanções legais.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 19ª — FORO</h2>
<div class="clausula">
<p>Fica eleito o Foro da <strong>Comarca de ${company.cidade}/${company.uf}</strong> para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.</p>
</div>
</section>

<section>
<h2>CLÁUSULA 20ª — DISPOSIÇÕES FINAIS</h2>
<div class="clausula">
<p><strong>20.1.</strong> Este instrumento constitui o acordo integral entre as partes sobre o objeto nele descrito.</p>
<p><strong>20.2.</strong> Qualquer alteração somente é válida por escrito e assinada por ambas as partes.</p>
<p><strong>20.3.</strong> A tolerância de qualquer cláusula não implica novação ou renúncia.</p>
<p><strong>20.4.</strong> Cláusulas eventualmente consideradas inválidas não afetam as demais.</p>
</div>
</section>

${anexos.length > 0 ? `
<section>
<h2>ANEXOS INTEGRANTES</h2>
<div class="clausula">
<p>São partes integrantes deste contrato:</p>
${anexos.map((a, i) => `<p><strong>Anexo ${String.fromCharCode(65 + i)}:</strong> ${getAnexoTitle(a)}</p>`).join('')}
</div>
</section>` : ''}

<section class="signature-section">
<p>${company.cidade}/${company.uf}, ${hoje()}.</p>

<div class="signatures-grid">
  <div class="signature-block">
    <div class="signature-space"></div>
    <p><strong>${company.razao_social}</strong></p>
    <p>CNPJ: ${company.cnpj}</p>
    <p>${company.responsavel_legal}</p>
    <p><em>Contratante</em></p>
  </div>
  <div class="signature-block">
    <div class="signature-space"></div>
    <p><strong>${nomeContratada}</strong></p>
    <p>${provider.cnpj ? 'CNPJ: ' + provider.cnpj : provider.cpf ? 'CPF: ' + provider.cpf : ''}</p>
    <p><em>Contratada</em></p>
  </div>
  <div class="signature-block">
    <div class="signature-space"></div>
    <p>Testemunha 1</p>
    <p>Nome: ________________________________</p>
    <p>CPF: _________________</p>
  </div>
  <div class="signature-block">
    <div class="signature-space"></div>
    <p>Testemunha 2</p>
    <p>Nome: ________________________________</p>
    <p>CPF: _________________</p>
  </div>
</div>
</section>

</article>

${generateAnexosHTML(anexos, company, provider)}`;

  return html;
}

function getAnexoTitle(anexo: AnexoType): string {
  const titles: Record<AnexoType, string> = {
    confidencialidade:   'Termo de Confidencialidade',
    lgpd:                'Termo de Ciência — LGPD',
    prontuarios:         'Termo de Responsabilidade — Prontuários e Documentos Clínicos',
    uso_estrutura:       'Termo de Uso da Estrutura da Clínica',
    politica_agenda:     'Política de Agenda, Faltas, Remarcações e Cancelamentos',
    sem_vinculo_clt:     'Declaração de Ausência de Vínculo Empregatício',
    checklist_pj_mei:    'Checklist de Documentos para Contratação PJ/MEI',
    checklist_pejotizacao: 'Checklist de Riscos de Pejotização',
    checklist_conselho:  'Checklist de Registro e Regularidade Profissional',
    ciencia_etica:       'Termo de Ciência sobre Ética Profissional e Normas do Conselho',
  };
  return titles[anexo] || anexo;
}

function generateAnexosHTML(anexos: AnexoType[], company: Company, provider: ContractFormData['provider']): string {
  if (anexos.length === 0) return '';
  const data = hoje();

  return anexos.map((anexo, index) => {
    const letra = String.fromCharCode(65 + index);
    const titulo = getAnexoTitle(anexo);

    let corpo = '';
    switch (anexo) {
      case 'confidencialidade':
        corpo = `<p>Pelo presente Termo, a CONTRATADA — <strong>${provider.nome_razao_social}</strong> — compromete-se a:</p>
<p>1. Manter sigilo absoluto sobre todas as informações confidenciais da CONTRATANTE e seus pacientes;</p>
<p>2. Não divulgar, reproduzir ou transferir quaisquer informações confidenciais a terceiros;</p>
<p>3. Adotar medidas técnicas para impedir acesso não autorizado às informações;</p>
<p>4. Comunicar imediatamente qualquer suspeita de vazamento ou acesso indevido;</p>
<p>5. Observar esta obrigação por 10 (dez) anos após o encerramento do vínculo contratual.</p>`;
        break;
      case 'lgpd':
        corpo = `<p>Pelo presente Termo, a CONTRATADA declara ciência sobre a Lei nº 13.709/2018 (LGPD) e assume:</p>
<p>1. Tratará dados pessoais e sensíveis de saúde exclusivamente para as finalidades previstas no contrato;</p>
<p>2. Adotará medidas de segurança técnica e administrativa para proteção dos dados;</p>
<p>3. Não compartilhará dados de pacientes sem autorização da CONTRATANTE e do titular;</p>
<p>4. Comunicará incidentes de segurança em até 24 horas;</p>
<p>5. Devolverá ou destruirá dados ao término do contrato, conforme determinação da CONTRATANTE;</p>
<p>6. Atenderá solicitações de titulares conforme orientação da CONTRATANTE.</p>`;
        break;
      case 'sem_vinculo_clt':
        corpo = `<p>As partes declaram expressamente que:</p>
<p>1. Este contrato é de prestação de serviços autônomos, regido pelo Código Civil, NÃO configurando relação de emprego;</p>
<p>2. Não estão presentes os elementos configuradores de relação empregatícia (pessoalidade, onerosidade salarial, não eventualidade e subordinação);</p>
<p>3. A CONTRATADA possui plena autonomia técnica, administrativa e de gestão de seu tempo;</p>
<p>4. A CONTRATADA é responsável pelo recolhimento de suas próprias contribuições previdenciárias e tributos;</p>
<p>5. A CONTRATANTE não arcará com verbas trabalhistas, férias, 13º, FGTS ou aviso prévio;</p>
<p>6. Ambas as partes reconhecem os riscos de descaracterização do contrato caso a relação passe a apresentar elementos de subordinação não previstos.</p>`;
        break;
      case 'prontuarios':
        corpo = `<p>A CONTRATADA declara ciência de que:</p>
<p>1. Os prontuários e documentos clínicos produzidos no exercício deste contrato deverão ser mantidos, acessados, devolvidos e protegidos conforme as regras previstas no contrato principal, normas do CFP/CRP e legislação aplicável;</p>
<p>2. É vedada a remoção, cópia não autorizada ou compartilhamento de documentos clínicos sem observância dos protocolos da CONTRATANTE;</p>
<p>3. O prazo mínimo de guarda observará a legislação vigente (mínimo 5 anos para adultos; até 10 anos para menores após término do atendimento);</p>
<p>4. A responsabilidade técnica pelo conteúdo dos prontuários é pessoal e intransferível da CONTRATADA.</p>`;
        break;
      case 'uso_estrutura':
        corpo = `<p>A CONTRATADA declara ciência de que:</p>
<p>1. Os recursos e a estrutura disponibilizados pela CONTRATANTE destinam-se exclusivamente à execução dos serviços objeto deste contrato;</p>
<p>2. É vedado o uso pessoal, a cessão a terceiros ou a utilização da estrutura para atendimentos não pactuados neste instrumento;</p>
<p>3. Eventuais danos causados por mau uso da estrutura serão de responsabilidade da CONTRATADA;</p>
<p>4. A CONTRATADA é responsável por seus próprios materiais e instrumentos, salvo os expressamente disponibilizados pela CONTRATANTE.</p>`;
        break;
      case 'politica_agenda':
        corpo = `<p>A CONTRATADA declara ciência e concordância com as regras de agenda, cancelamento, faltas, atrasos e remarcações previstas no contrato principal, comprometendo-se a:</p>
<p>1. Observar os prazos de antecedência estabelecidos para cancelamentos e remarcações;</p>
<p>2. Comunicar a CONTRATANTE com a antecedência mínima pactuada em caso de impossibilidade de atendimento;</p>
<p>3. Respeitar a agenda livremente pactuada entre as partes, sem que isso configure controle de jornada ou subordinação.</p>`;
        break;
      case 'checklist_pj_mei':
        corpo = `<p>Checklist de documentos para conferência no momento da contratação:</p>
<p>☐ Contrato Social ou Certificado de Condição de MEI (CCMEI), conforme aplicável;</p>
<p>☐ Comprovante de inscrição no CNPJ;</p>
<p>☐ Comprovante de endereço atualizado;</p>
<p>☐ Documento de identificação do responsável legal (RG/CPF);</p>
<p>☐ Comprovante de regularidade fiscal (Certidão Negativa de Débitos), quando aplicável;</p>
<p>☐ Comprovante de registro no conselho profissional competente, quando exigível.</p>`;
        break;
      case 'checklist_pejotizacao':
        corpo = `<p>Checklist de fatores de atenção para mitigação de risco de pejotização, a serem observados durante toda a vigência contratual:</p>
<p>☐ Ausência de subordinação hierárquica e de controle de jornada (ponto eletrônico, horário fixo obrigatório);</p>
<p>☐ Ausência de exclusividade ampla não pactuada expressamente neste instrumento;</p>
<p>☐ Ausência de pessoalidade obrigatória — possibilidade de substituição por profissional habilitado;</p>
<p>☐ Ausência de habitualidade forçada incompatível com a autonomia da CONTRATADA;</p>
<p>☐ Forma de pagamento não caracterizada como salário fixo mensal sem vínculo a serviços efetivamente prestados;</p>
<p>☐ Autonomia técnica plena da CONTRATADA na condução de suas atividades profissionais.</p>`;
        break;
      case 'checklist_conselho':
        corpo = `<p>Checklist de verificação de regularidade do registro profissional da CONTRATADA:</p>
<p>☐ Conselho profissional informado: ${provider.conselho_profissional || '___'};</p>
<p>☐ Número de registro: ${provider.numero_registro_conselho || '___'};</p>
<p>☐ Situação cadastral verificada como regular junto ao conselho competente na data de assinatura;</p>
<p>☐ Compromisso da CONTRATADA de manter a regularidade do registro durante toda a vigência deste contrato;</p>
<p>☐ Comunicação imediata à CONTRATANTE em caso de suspensão, cassação ou irregularidade no registro.</p>`;
        break;
      case 'ciencia_etica':
        corpo = `<p>A CONTRATADA declara ciência e compromisso com:</p>
<p>1. O Código de Ética Profissional da sua categoria e as Resoluções do conselho profissional competente (CFP/CRP ou correlato);</p>
<p>2. O dever de sigilo profissional absoluto sobre informações de pacientes e dados institucionais da CONTRATANTE;</p>
<p>3. A autonomia técnica como contrapartida da responsabilidade profissional pessoal e intransferível sobre seus atos;</p>
<p>4. A vedação de condutas que configurem violação ética, discriminação, assédio ou prejuízo aos pacientes;</p>
<p>5. As consequências éticas, civis e legais decorrentes do descumprimento destas obrigações.</p>`;
        break;
      default:
        corpo = `<p>As partes acordam as condições específicas deste anexo, que passa a ser parte integrante do Contrato de Prestação de Serviços nº firmado entre as partes.</p>`;
    }

    return `
<section class="anexo-section" style="page-break-before: always;">
<h2>ANEXO ${letra} — ${titulo.toUpperCase()}</h2>
<div class="clausula">
${corpo}
<p style="margin-top: 24px;">${company.cidade}/${company.uf}, ${data}.</p>
</div>
</section>`;
  }).join('\n');
}
