// ================================================================
// Template: Avaliação Neuropsicológica
// Uso: pacote fechado com número de sessões e entrega de
//      documento técnico. Pode ser adulto ou menor.
// O sistema registra que haverá avaliação e que um documento
// técnico será produzido — nunca armazena o conteúdo técnico.
// NÃO inclui diagnóstico, CID, hipótese ou conteúdo clínico.
// ================================================================

import type { TemplateContext } from './particular_adulto';

export function renderAvaliacaoNeuro(ctx: TemplateContext): string {
  const { formData, company, esc, brl, dataBR, hoje } = ctx;
  const { paciente, responsavel_legal, mesmo_responsavel, servico, financeiro, regras, consentimentos } = formData;

  const endClinica = [
    company.logradouro, company.numero,
    company.complemento, company.bairro,
    company.cidade, company.uf,
  ].filter(Boolean).join(', ');

  const isMenor = paciente.is_menor;
  const formasPgto = (financeiro.forma_pagamento || []).join(', ').toUpperCase() || '—';
  const nomeResponsavel = isMenor ? esc(responsavel_legal.nome_completo) : '';

  // Montar itens de consentimento — card só aparece se houver ao menos um marcado
  const consentItems = [
    isMenor && consentimentos.consentimento_responsavel_menor ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Autorizo expressamente a realização da avaliação neuropsicológica com o menor <strong>${esc(paciente.nome_completo)}</strong>.</span>
    </div>` : '',
    consentimentos.consentimento_sigilo ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Declaro ciência sobre o sigilo profissional e seus limites legais.</span>
    </div>` : '',
    consentimentos.consentimento_lgpd ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Autorizo o tratamento dos dados pessoais conforme a LGPD e as finalidades descritas neste termo.</span>
    </div>` : '',
    consentimentos.consentimento_contato_admin ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Autorizo contato administrativo por WhatsApp e/ou e-mail.</span>
    </div>` : '',
    consentimentos.consentimento_sem_promessa ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Declaro ciência de que os resultados da avaliação não constituem promessa de resultado específico ou conclusão técnica absoluta.</span>
    </div>` : '',
  ].filter(Boolean).join('');

  return `
<section class="pt-section">
  <h2 class="pt-section-title">Identificação das Partes</h2>
  <div class="pt-partes-grid">
    <div class="pt-parte-card">
      <div class="pt-parte-label">Clínica / Contratante</div>
      <p class="pt-parte-nome">${esc(company.razao_social)}</p>
      <p class="pt-parte-info">${esc(company.nome_fantasia)}</p>
      <p class="pt-parte-info">CNPJ: ${esc(company.cnpj)}</p>
      <p class="pt-parte-info">${esc(endClinica)}</p>
      <p class="pt-parte-info">E-mail: ${esc(company.email)} · Tel: ${esc(company.telefone)}</p>
      <p class="pt-parte-info">Representada por: <strong>${esc(company.responsavel_legal)}</strong> — CPF ${esc(company.cpf_responsavel)}</p>
    </div>
    <div class="pt-parte-card">
      <div class="pt-parte-label">${isMenor ? 'Paciente (Menor de Idade)' : 'Paciente / Contratante-Usuário'}</div>
      <p class="pt-parte-nome">${esc(paciente.nome_completo)}</p>
      ${paciente.cpf ? `<p class="pt-parte-info">CPF: ${esc(paciente.cpf)}</p>` : ''}
      ${paciente.data_nascimento ? `<p class="pt-parte-info">Data de Nascimento: ${dataBR(paciente.data_nascimento)}</p>` : ''}
      ${paciente.telefone ? `<p class="pt-parte-info">Tel: ${esc(paciente.telefone)}</p>` : ''}
      ${paciente.email ? `<p class="pt-parte-info">E-mail: ${esc(paciente.email)}</p>` : ''}
    </div>
  </div>
  ${isMenor ? `
  <div class="pt-responsavel-grid">
    <div class="pt-responsavel-card">
      <div class="pt-responsavel-label">Responsável Legal — Autoriza o Atendimento</div>
      <p class="pt-parte-nome">${nomeResponsavel}</p>
      ${responsavel_legal.cpf ? `<p class="pt-parte-info">CPF: ${esc(responsavel_legal.cpf)}</p>` : ''}
      ${responsavel_legal.grau_parentesco ? `<p class="pt-parte-info">Parentesco: ${esc(responsavel_legal.grau_parentesco)}</p>` : ''}
    </div>
  </div>` : ''}
</section>

<section class="pt-section">
  <h2 class="pt-section-title">1. Objeto — Avaliação Neuropsicológica</h2>
  <div class="pt-clausula">
    <p><strong>1.1.</strong> O presente termo formaliza a contratação de <strong>avaliação neuropsicológica</strong>
    ${servico.profissional_responsavel ? `sob responsabilidade técnica de <strong>${esc(servico.profissional_responsavel)}</strong>` : 'conforme protocolos profissionais vigentes'},
    a ser realizada com ${isMenor ? `o(a) menor <strong>${esc(paciente.nome_completo)}</strong>` : `o(a) paciente <strong>${esc(paciente.nome_completo)}</strong>`}.
    </p>
    <p><strong>1.2.</strong> Modalidade: <strong>${esc(servico.modalidade)}</strong>.
    ${servico.local_atendimento ? `Local: ${esc(servico.local_atendimento)}.` : ''}
    </p>
    ${servico.quantidade_sessoes
      ? `<p><strong>1.3.</strong> Número de sessões previsto: <strong>${servico.quantidade_sessoes}</strong> sessão(ões).
         Duração aproximada por sessão: <strong>${esc(servico.duracao_sessao)}</strong>.</p>`
      : `<p><strong>1.3.</strong> Duração aproximada por sessão: <strong>${esc(servico.duracao_sessao)}</strong>.
         O número de sessões será definido conforme protocolo de avaliação.</p>`}
    ${servico.data_inicio_atendimento ? `<p><strong>1.4.</strong> Início previsto: ${dataBR(servico.data_inicio_atendimento)}.</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">2. Relatório Técnico</h2>
  <div class="pt-clausula">
    <div class="pt-aviso-admin">
      <strong>Nota administrativa:</strong> Será produzido documento técnico após a conclusão
      do protocolo de avaliação. O conteúdo técnico do documento não é registrado neste sistema —
      trata-se de responsabilidade exclusiva do profissional responsável.
    </div>
    <p><strong>2.1.</strong> O documento técnico resultante da avaliação será entregue ao paciente ou
    responsável legal em prazo a ser informado pelo profissional responsável, conforme complexidade
    e protocolo adotado.</p>
    <p><strong>2.2.</strong> A entrega do documento técnico está condicionada à conclusão integral do
    protocolo de avaliação e à quitação dos valores acordados.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">3. Valores e Condições de Pagamento</h2>
  <div class="pt-clausula">
    ${financeiro.valor_pacote
      ? `<p><strong>3.1.</strong> Valor total do pacote de avaliação: <strong>${brl(financeiro.valor_pacote)}</strong>.</p>`
      : financeiro.valor_sessao
      ? `<p><strong>3.1.</strong> Valor por sessão: <strong>${brl(financeiro.valor_sessao)}</strong>.</p>`
      : ''}
    <p><strong>3.2.</strong> Forma de pagamento: <strong>${esc(formasPgto)}</strong>.</p>
    <p><strong>3.3.</strong> Vencimento: ${esc(financeiro.vencimento_pagamento)}.</p>
    <p><strong>3.4.</strong> Recibo / Documento fiscal: ${esc(financeiro.emite_nota_fiscal === 'obrigatorio'
      ? 'Emitir a cada pagamento — recibo, nota fiscal ou documento fiscal equivalente, conforme o enquadramento fiscal aplicável.'
      : financeiro.emite_nota_fiscal === 'quando_solicitado'
      ? 'Emitir quando solicitado pelo paciente ou responsável financeiro.'
      : 'Não aplicável neste caso — procedimento de emissão externo ao termo, quando aplicável.')}.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">4. Política de Cancelamento do Pacote</h2>
  <div class="pt-clausula">
    <p><strong>4.1.</strong> Em razão da natureza do serviço (protocolo de avaliação com sessões interdependentes),
    o cancelamento após o início das sessões implicará cobrança proporcional às sessões já realizadas.</p>
    ${regras.regra_cancelamento ? `<p><strong>4.2.</strong> ${esc(regras.regra_cancelamento)}</p>` : ''}
    ${regras.antecedencia_cancelamento ? `<p><strong>4.3.</strong> Antecedência mínima para cancelamento de sessão: ${esc(regras.antecedencia_cancelamento)}.</p>` : ''}
    ${regras.regra_falta ? `<p><strong>4.4. Falta:</strong> ${esc(regras.regra_falta)}</p>` : ''}
    ${regras.regra_remarcacao ? `<p><strong>4.5. Remarcação:</strong> ${esc(regras.regra_remarcacao)}</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">5. Sigilo Profissional</h2>
  <div class="pt-clausula">
    <p><strong>5.1.</strong> O profissional responsável está sujeito ao sigilo profissional previsto no
    Código de Ética da categoria, comprometendo-se a não divulgar informações sobre o processo de
    avaliação sem autorização, salvo nas hipóteses previstas em lei.</p>
    ${isMenor ? `<p><strong>5.2.</strong> O compartilhamento de informações com o responsável legal
    observará o Código de Ética profissional aplicável.</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">6. Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</h2>
  <div class="pt-clausula">
    <p><strong>6.1.</strong> Os dados pessoais fornecidos serão tratados exclusivamente para fins de
    prestação dos serviços contratados. Base legal: execução de contrato (art. 7º, V da LGPD) e
    proteção da saúde (art. 11, II, f).</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">7. Ciência sobre Resultados</h2>
  <div class="pt-clausula">
    <p><strong>7.1.</strong> O ${isMenor ? 'responsável legal' : 'paciente'} declara ciência de que os
    resultados do processo de avaliação refletem o desempenho observado nas condições de aplicação e
    não constituem promessa de resultado específico nem interpretação técnica absoluta. A análise dos
    resultados é de responsabilidade exclusiva do profissional habilitado.</p>
  </div>
</section>

${consentItems ? `
<div class="pt-consent-block">
  <div class="pt-consent-title">Consentimentos</div>
  ${consentItems}
</div>` : ''}

<section class="pt-signature-section">
  <p class="pt-sig-city">${esc(company.cidade)}/${esc(company.uf)}, ${hoje()}.</p>
  <div class="pt-signatures-grid">
    <div class="pt-signature-block">
      <div class="pt-signature-space"></div>
      <p><strong>${esc(company.razao_social)}</strong></p>
      <p>CNPJ: ${esc(company.cnpj)}</p>
      <p><em>Clínica / Contratante</em></p>
    </div>
    <div class="pt-signature-block">
      <div class="pt-signature-space"></div>
      ${isMenor
        ? `<p><strong>${nomeResponsavel}</strong></p>
           ${responsavel_legal.cpf ? `<p>CPF: ${esc(responsavel_legal.cpf)}</p>` : ''}
           <p><em>Responsável Legal pelo Paciente</em></p>`
        : `<p><strong>${esc(paciente.nome_completo)}</strong></p>
           ${paciente.cpf ? `<p>CPF: ${esc(paciente.cpf)}</p>` : ''}
           <p><em>Paciente</em></p>`}
    </div>
  </div>
</section>`;
}
