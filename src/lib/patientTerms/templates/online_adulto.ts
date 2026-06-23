// ================================================================
// Template: Atendimento Online — Adulto
// Uso: atendimento psicológico/terapêutico por videoconferência,
//      paciente adulto. Inclui cláusulas obrigatórias baseadas
//      na Resolução CFP nº 11/2018 e boas práticas de segurança.
// NÃO inclui conteúdo clínico, diagnóstico, CID ou prontuário.
// ================================================================

import type { TemplateContext } from './particular_adulto';

export function renderOnlineAdulto(ctx: TemplateContext): string {
  const { formData, company, esc, brl, dataBR, hoje } = ctx;
  const { paciente, servico, financeiro, regras, consentimentos } = formData;

  const endClinica = [
    company.logradouro, company.numero,
    company.complemento, company.bairro,
    company.cidade, company.uf,
  ].filter(Boolean).join(', ');

  const formasPgto = (financeiro.forma_pagamento || []).join(', ').toUpperCase() || '—';
  const plataforma = servico.plataforma_online ? esc(servico.plataforma_online) : 'plataforma segura a ser definida pelo profissional';

  // Montar itens de consentimento — card só aparece se houver ao menos um marcado
  const consentItems = [
    consentimentos.consentimento_online ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Consinto expressamente com o atendimento na modalidade <strong>online</strong>, declarando ciência sobre as condições técnicas, de sigilo, de emergência e as limitações inerentes a esta modalidade.</span>
    </div>` : '',
    consentimentos.consentimento_sigilo ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Declaro ciência sobre o sigilo profissional e seus limites legais.</span>
    </div>` : '',
    consentimentos.consentimento_lgpd ? `
    <div class="pt-consent-item">
      <div class="pt-consent-check"></div>
      <span class="pt-consent-text">Autorizo o tratamento dos meus dados pessoais conforme a LGPD e as finalidades descritas neste termo.</span>
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
      <p class="pt-parte-info">${esc(endClinica)}</p>
      <p class="pt-parte-info">E-mail: ${esc(company.email)} · Tel: ${esc(company.telefone)}</p>
      <p class="pt-parte-info">Representada por: <strong>${esc(company.responsavel_legal)}</strong> — CPF ${esc(company.cpf_responsavel)}</p>
    </div>
    <div class="pt-parte-card">
      <div class="pt-parte-label">Paciente / Contratante-Usuário</div>
      <p class="pt-parte-nome">${esc(paciente.nome_completo)}</p>
      ${paciente.cpf ? `<p class="pt-parte-info">CPF: ${esc(paciente.cpf)}</p>` : ''}
      ${paciente.data_nascimento ? `<p class="pt-parte-info">Data de Nascimento: ${dataBR(paciente.data_nascimento)}</p>` : ''}
      ${paciente.telefone ? `<p class="pt-parte-info">Tel: ${esc(paciente.telefone)}</p>` : ''}
      ${paciente.email ? `<p class="pt-parte-info">E-mail: ${esc(paciente.email)}</p>` : ''}
    </div>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">1. Objeto — Atendimento Online</h2>
  <div class="pt-clausula">
    <p><strong>1.1.</strong> O presente instrumento formaliza a prestação de serviços de
    <strong>${esc(servico.area_servico)}</strong> na modalidade <strong>online</strong>
    ${servico.profissional_responsavel ? `, sob responsabilidade técnica de <strong>${esc(servico.profissional_responsavel)}</strong>` : ''}.
    Este atendimento observa a Resolução CFP nº 11/2018 e normativas complementares vigentes.
    </p>
    <p><strong>1.2.</strong> Plataforma utilizada: <strong>${plataforma}</strong>.</p>
    <p><strong>1.3.</strong> Frequência: <strong>${esc(servico.frequencia)}</strong>.
    Duração aproximada da sessão: <strong>${esc(servico.duracao_sessao)}</strong>.</p>
    ${servico.data_inicio_atendimento ? `<p><strong>1.4.</strong> Início previsto: ${dataBR(servico.data_inicio_atendimento)}.</p>` : ''}
    ${!servico.vigencia_indeterminada && servico.data_fim_atendimento
      ? `<p><strong>1.5.</strong> Término previsto: ${dataBR(servico.data_fim_atendimento)}.</p>`
      : `<p><strong>1.5.</strong> Vigência por prazo <strong>indeterminado</strong>, podendo ser encerrada nos termos deste instrumento.</p>`}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">2. Condições Específicas do Atendimento Online</h2>
  <div class="pt-clausula">
    <p><strong>2.1. Ambiente reservado:</strong> O paciente compromete-se a realizar as sessões em local
    privado, sem a presença de terceiros não autorizados pelo profissional, garantindo condições
    adequadas de sigilo em seu ambiente.</p>
    <p><strong>2.2. Conexão:</strong> O paciente é responsável por providenciar conexão de internet
    estável e equipamento adequado (computador, tablet ou smartphone) para a realização das sessões.
    Problemas técnicos do lado do paciente não isentam de eventuais cobranças conforme as regras
    estabelecidas neste termo.</p>
    <p><strong>2.3. Gravação vedada:</strong> É expressamente vedada a gravação das sessões por
    qualquer das partes, por qualquer meio, salvo mediante autorização expressa e por escrito de
    ambas as partes.</p>
    <p><strong>2.4. Sigilo da plataforma:</strong> O profissional adotará plataforma com recursos
    de segurança e privacidade adequados. O paciente deve evitar o uso de dispositivos compartilhados
    ou redes públicas de internet durante as sessões.</p>
    <p><strong>2.5. Crise e emergência:</strong> Em situações de crise ou emergência durante sessão
    online, o paciente deve informar imediatamente o profissional. Caso necessário, deve acionar os
    serviços de emergência disponíveis em sua localidade
    (SAMU 192 · Bombeiros 193 · CVV 188 · UPA ou pronto-socorro mais próximo).
    O atendimento online apresenta limitações inerentes à modalidade em situações de urgência.</p>
    <p><strong>2.6. Interrupção técnica:</strong> Em caso de interrupção da conexão durante a sessão,
    as partes tentarão restabelecer o contato pelos meios acordados. Se não houver reestabelecimento
    no prazo combinado, a sessão será reagendada conforme disponibilidade.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">3. Valores e Condições de Pagamento</h2>
  <div class="pt-clausula">
    <p><strong>3.1.</strong> Valor por sessão: <strong>${brl(financeiro.valor_sessao)}</strong>.</p>
    <p><strong>3.2.</strong> Forma de pagamento: <strong>${esc(formasPgto)}</strong>.</p>
    <p><strong>3.3.</strong> Vencimento: ${esc(financeiro.vencimento_pagamento)}.</p>
    <p><strong>3.4.</strong> Emissão de recibo/nota fiscal: ${esc(financeiro.emite_nota_fiscal === 'obrigatorio'
      ? 'obrigatória para cada pagamento realizado'
      : financeiro.emite_nota_fiscal === 'quando_solicitado'
      ? 'mediante solicitação do paciente'
      : 'não aplicável conforme legislação vigente')}.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">4. Regras de Falta, Cancelamento e Remarcação</h2>
  <div class="pt-clausula">
    ${regras.regra_falta ? `<p><strong>4.1. Falta:</strong> ${esc(regras.regra_falta)}</p>` : ''}
    ${regras.regra_cancelamento ? `<p><strong>4.2. Cancelamento:</strong> ${esc(regras.regra_cancelamento)}</p>` : ''}
    ${regras.antecedencia_cancelamento ? `<p><strong>4.3. Antecedência mínima:</strong> ${esc(regras.antecedencia_cancelamento)}.</p>` : ''}
    ${regras.regra_remarcacao ? `<p><strong>4.4. Remarcação:</strong> ${esc(regras.regra_remarcacao)}</p>` : ''}
    ${regras.regra_atraso ? `<p><strong>4.5. Atraso:</strong> ${esc(regras.regra_atraso)}</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">5. Reajuste e Encerramento</h2>
  <div class="pt-clausula">
    ${regras.regra_reajuste ? `<p><strong>5.1.</strong> ${esc(regras.regra_reajuste)}</p>` : ''}
    ${regras.periodicidade_reajuste ? `<p><strong>5.2.</strong> Periodicidade mínima de reajuste: ${esc(regras.periodicidade_reajuste)}.</p>` : ''}
    ${regras.aviso_previo_reajuste ? `<p><strong>5.3.</strong> Aviso prévio: ${esc(regras.aviso_previo_reajuste)}.</p>` : ''}
    ${regras.regra_encerramento ? `<p><strong>5.4.</strong> ${esc(regras.regra_encerramento)}</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">6. Sigilo Profissional</h2>
  <div class="pt-clausula">
    <p><strong>6.1.</strong> O profissional responsável está sujeito ao sigilo profissional previsto no
    Código de Ética da categoria, comprometendo-se a não divulgar informações sobre o atendimento
    sem autorização, salvo nas hipóteses previstas em lei.</p>
    <p><strong>6.2.</strong> Serão mantidos registros administrativos do atendimento conforme normas
    profissionais vigentes. O conteúdo técnico desses registros não é armazenado neste sistema.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">7. Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</h2>
  <div class="pt-clausula">
    <p><strong>7.1.</strong> Os dados pessoais serão tratados exclusivamente para fins de prestação
    dos serviços contratados. Base legal: execução de contrato (art. 7º, V da LGPD) e proteção da
    saúde (art. 11, II, f).</p>
    <p><strong>7.2.</strong> No contexto do atendimento online, o profissional adotará medidas técnicas
    razoáveis para proteção dos dados transmitidos durante as sessões.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">8. Comunicação Administrativa</h2>
  <div class="pt-clausula">
    <p><strong>8.1.</strong> O paciente autoriza o contato administrativo da clínica por WhatsApp e/ou
    e-mail para confirmação de sessões, avisos de cancelamento e demais comunicações administrativas.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">9. Ciência sobre Resultados Terapêuticos</h2>
  <div class="pt-clausula">
    <p><strong>9.1.</strong> O paciente declara ciência de que resultados terapêuticos dependem de
    múltiplos fatores individuais e não podem ser garantidos antecipadamente.</p>
  </div>
</section>

${consentItems ? `
<div class="pt-consent-block">
  <div class="pt-consent-title">Consentimentos para Atendimento Online</div>
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
      <p><strong>${esc(paciente.nome_completo)}</strong></p>
      ${paciente.cpf ? `<p>CPF: ${esc(paciente.cpf)}</p>` : ''}
      <p><em>Paciente</em></p>
    </div>
  </div>
</section>`;
}
