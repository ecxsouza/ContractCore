// ================================================================
// Template: Particular — Menor de Idade
// Uso: paciente menor de 18 anos, pagamento particular.
// Quem assina: responsável legal (não o menor).
// Responsável legal e financeiro podem ser pessoas diferentes.
// NÃO inclui conteúdo clínico, diagnóstico, CID ou prontuário.
// ================================================================

import type { TemplateContext } from './particular_adulto';

export function renderParticularMenor(ctx: TemplateContext): string {
  const { formData, company, esc, brl, dataBR, hoje } = ctx;
  const { paciente, responsavel_legal, responsavel_financeiro, mesmo_responsavel, servico, financeiro, regras, consentimentos } = formData;

  const endClinica = [
    company.logradouro, company.numero,
    company.complemento, company.bairro,
    company.cidade, company.uf,
  ].filter(Boolean).join(', ');

  const formasPgto = (financeiro.forma_pagamento || []).join(', ').toUpperCase() || '—';

  const nomeRespLegal = esc(responsavel_legal.nome_completo);
  const nomeRespFin   = mesmo_responsavel ? nomeRespLegal : esc(responsavel_financeiro.nome_completo);

  // Montar itens de consentimento — card só aparece se houver ao menos um marcado
  const consentItems = [
    consentimentos.consentimento_responsavel_menor ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Autorizo expressamente o atendimento do menor <strong>${esc(paciente.nome_completo)}</strong> e assumo as obrigações deste termo como responsável legal.</span>
    </div>` : '',
    consentimentos.consentimento_sigilo ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Declaro ciência sobre o sigilo profissional e seus limites legais, incluindo a avaliação profissional sobre o que pode ser compartilhado com responsáveis.</span>
    </div>` : '',
    consentimentos.consentimento_lgpd ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Autorizo o tratamento dos dados pessoais do menor e meus próprios dados conforme a LGPD e as finalidades descritas neste termo.</span>
    </div>` : '',
    consentimentos.consentimento_contato_admin ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Autorizo contato administrativo por WhatsApp e/ou e-mail.</span>
    </div>` : '',
    consentimentos.consentimento_sem_promessa ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Declaro ciência de que não há promessa de resultado terapêutico.</span>
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
      ${company.inscricao_municipal ? `<p class="pt-parte-info">Insc. Municipal: ${esc(company.inscricao_municipal)}</p>` : ''}
      <p class="pt-parte-info">${esc(endClinica)}</p>
      <p class="pt-parte-info">E-mail: ${esc(company.email)} · Tel: ${esc(company.telefone)}</p>
      <p class="pt-parte-info">Representada por: <strong>${esc(company.responsavel_legal)}</strong> — CPF ${esc(company.cpf_responsavel)}</p>
    </div>
    <div class="pt-parte-card">
      <div class="pt-parte-label">Paciente (Menor de Idade)</div>
      <p class="pt-parte-nome">${esc(paciente.nome_completo)}</p>
      ${paciente.cpf ? `<p class="pt-parte-info">CPF: ${esc(paciente.cpf)}</p>` : ''}
      ${paciente.data_nascimento ? `<p class="pt-parte-info">Data de Nascimento: ${dataBR(paciente.data_nascimento)}</p>` : ''}
    </div>
  </div>

  <div class="pt-responsavel-grid">
    <div class="pt-responsavel-card">
      <div class="pt-responsavel-label">Responsável Legal — Autoriza o Atendimento</div>
      <p class="pt-parte-nome">${nomeRespLegal}</p>
      ${responsavel_legal.cpf ? `<p class="pt-parte-info">CPF: ${esc(responsavel_legal.cpf)}</p>` : ''}
      ${responsavel_legal.grau_parentesco ? `<p class="pt-parte-info">Grau de parentesco: ${esc(responsavel_legal.grau_parentesco)}</p>` : ''}
      ${responsavel_legal.telefone ? `<p class="pt-parte-info">Tel: ${esc(responsavel_legal.telefone)}</p>` : ''}
      ${responsavel_legal.email ? `<p class="pt-parte-info">E-mail: ${esc(responsavel_legal.email)}</p>` : ''}
    </div>
    ${!mesmo_responsavel ? `
    <div class="pt-responsavel-card">
      <div class="pt-responsavel-label">Responsável Financeiro — Responde pelo Pagamento</div>
      <p class="pt-parte-nome">${nomeRespFin}</p>
      ${responsavel_financeiro.cpf ? `<p class="pt-parte-info">CPF: ${esc(responsavel_financeiro.cpf)}</p>` : ''}
      ${responsavel_financeiro.grau_parentesco ? `<p class="pt-parte-info">Grau de parentesco: ${esc(responsavel_financeiro.grau_parentesco)}</p>` : ''}
      ${responsavel_financeiro.telefone ? `<p class="pt-parte-info">Tel: ${esc(responsavel_financeiro.telefone)}</p>` : ''}
      ${responsavel_financeiro.email ? `<p class="pt-parte-info">E-mail: ${esc(responsavel_financeiro.email)}</p>` : ''}
    </div>` : ''}
  </div>
  <p style="font-size:8pt;color:#475569;margin-top:4px;">
    <em>Nota: O responsável legal, na qualidade de representante do paciente menor de idade, autoriza o atendimento e
    assume as obrigações deste termo. Quem assina este documento é o responsável legal, não o menor.</em>
  </p>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">1. Objeto e Autorização do Atendimento</h2>
  <div class="pt-clausula">
    <p><strong>1.1.</strong> O responsável legal <strong>${nomeRespLegal}</strong> autoriza expressamente
    o atendimento de <strong>${esc(servico.area_servico)}</strong> ao menor
    <strong>${esc(paciente.nome_completo)}</strong>
    ${servico.profissional_responsavel ? `, sob responsabilidade técnica de <strong>${esc(servico.profissional_responsavel)}</strong>` : ''}.
    </p>
    <p><strong>1.2.</strong> Modalidade: <strong>${esc(servico.modalidade)}</strong>.
    ${servico.local_atendimento ? `Local: ${esc(servico.local_atendimento)}.` : ''}
    </p>
    <p><strong>1.3.</strong> Frequência: <strong>${esc(servico.frequencia)}</strong>.
    Duração aproximada da sessão: <strong>${esc(servico.duracao_sessao)}</strong>.</p>
    ${servico.data_inicio_atendimento ? `<p><strong>1.4.</strong> Início previsto: ${dataBR(servico.data_inicio_atendimento)}.</p>` : ''}
    ${!servico.vigencia_indeterminada && servico.data_fim_atendimento
      ? `<p><strong>1.5.</strong> Término previsto: ${dataBR(servico.data_fim_atendimento)}.</p>`
      : `<p><strong>1.5.</strong> Vigência por prazo <strong>indeterminado</strong>.`}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">2. Valores e Condições de Pagamento</h2>
  <div class="pt-clausula">
    <p><strong>2.1.</strong> Valor por sessão: <strong>${brl(financeiro.valor_sessao)}</strong>.</p>
    <p><strong>2.2.</strong> Forma de pagamento: <strong>${esc(formasPgto)}</strong>.</p>
    <p><strong>2.3.</strong> Vencimento: ${esc(financeiro.vencimento_pagamento)}.</p>
    <p><strong>2.4.</strong> O responsável financeiro — <strong>${nomeRespFin}</strong> — assume integralmente
    a obrigação de pagamento pelos serviços prestados ao paciente menor de idade.</p>
    <p><strong>2.5.</strong> Emissão de recibo/nota fiscal: ${esc(financeiro.emite_nota_fiscal === 'obrigatorio'
      ? 'obrigatória para cada pagamento realizado'
      : financeiro.emite_nota_fiscal === 'quando_solicitado'
      ? 'mediante solicitação'
      : 'não aplicável conforme legislação vigente')}.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">3. Regras de Falta, Cancelamento e Remarcação</h2>
  <div class="pt-clausula">
    ${regras.regra_falta ? `<p><strong>3.1. Falta:</strong> ${esc(regras.regra_falta)}</p>` : ''}
    ${regras.regra_cancelamento ? `<p><strong>3.2. Cancelamento:</strong> ${esc(regras.regra_cancelamento)}</p>` : ''}
    ${regras.antecedencia_cancelamento ? `<p><strong>3.3. Antecedência mínima:</strong> ${esc(regras.antecedencia_cancelamento)}.</p>` : ''}
    ${regras.regra_remarcacao ? `<p><strong>3.4. Remarcação:</strong> ${esc(regras.regra_remarcacao)}</p>` : ''}
    ${regras.regra_atraso ? `<p><strong>3.5. Atraso:</strong> ${esc(regras.regra_atraso)}</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">4. Reajuste e Encerramento</h2>
  <div class="pt-clausula">
    ${regras.regra_reajuste ? `<p><strong>4.1.</strong> ${esc(regras.regra_reajuste)}</p>` : ''}
    ${regras.periodicidade_reajuste ? `<p><strong>4.2.</strong> Periodicidade mínima de reajuste: ${esc(regras.periodicidade_reajuste)}.</p>` : ''}
    ${regras.aviso_previo_reajuste ? `<p><strong>4.3.</strong> Aviso prévio: ${esc(regras.aviso_previo_reajuste)}.</p>` : ''}
    ${regras.regra_encerramento ? `<p><strong>4.4.</strong> ${esc(regras.regra_encerramento)}</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">5. Sigilo Profissional e Informação ao Responsável</h2>
  <div class="pt-clausula">
    <p><strong>5.1.</strong> O profissional responsável está sujeito ao sigilo profissional previsto no
    Código de Ética da categoria, comprometendo-se a não divulgar informações sobre o atendimento
    sem autorização, salvo nas hipóteses previstas em lei.</p>
    <p><strong>5.2.</strong> O responsável legal declara ciência de que o compartilhamento de informações
    com responsáveis, no contexto de atendimento de menor de idade, observará o Código de Ética
    profissional aplicável, que reserva ao profissional a avaliação do que pode ser comunicado,
    com vistas à preservação do vínculo terapêutico e ao bem-estar do menor.</p>
    <p><strong>5.3.</strong> Serão mantidos registros administrativos do atendimento conforme as normas
    profissionais vigentes. O conteúdo técnico desses registros não é armazenado neste sistema.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">6. Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</h2>
  <div class="pt-clausula">
    <p><strong>6.1.</strong> Os dados pessoais do paciente menor e de seus responsáveis serão tratados
    exclusivamente para fins de prestação dos serviços contratados e comunicações administrativas.
    Base legal: execução de contrato (art. 7º, V da LGPD) e proteção da saúde (art. 11, II, f).</p>
    <p><strong>6.2.</strong> O responsável legal, na qualidade de titular dos dados do menor, poderá
    solicitar acesso, correção ou exclusão dos dados pessoais, observadas as obrigações legais de retenção.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">7. Comunicação Administrativa</h2>
  <div class="pt-clausula">
    <p><strong>7.1.</strong> O responsável legal autoriza o contato administrativo da clínica por
    WhatsApp e/ou e-mail para fins de confirmação de sessões, cancelamentos e demais avisos
    de natureza exclusivamente administrativa.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">8. Ciência sobre Resultados Terapêuticos</h2>
  <div class="pt-clausula">
    <p><strong>8.1.</strong> O responsável declara ciência de que resultados terapêuticos dependem de
    múltiplos fatores individuais e não podem ser garantidos antecipadamente.</p>
  </div>
</section>

${consentItems ? `
<div class="pt-consent-block">
  <div class="pt-consent-title">Consentimentos do Responsável Legal</div>
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
      <p><strong>${nomeRespLegal}</strong></p>
      ${responsavel_legal.cpf ? `<p>CPF: ${esc(responsavel_legal.cpf)}</p>` : ''}
      <p><em>Responsável Legal pelo Paciente</em></p>
    </div>
  </div>
  ${!mesmo_responsavel ? `
  <p style="font-size:8pt;color:#475569;margin-top:8px;">Responsável Financeiro: <strong>${nomeRespFin}</strong>${responsavel_financeiro.cpf ? ' — CPF: ' + esc(responsavel_financeiro.cpf) : ''}.</p>
  ` : ''}
</section>`;
}
