// ================================================================
// Template: Particular — Adulto
// Uso: paciente maior de 18 anos, pagamento particular.
// NÃO inclui conteúdo clínico, diagnóstico, CID ou prontuário.
// ================================================================

import type { PatientTermFormData } from '../types';
import type { Company } from '@/types';

export interface TemplateContext {
  formData: PatientTermFormData;
  company:  Company;
  esc:      (v: string | null | undefined) => string;
  brl:      (v: string | number | null | undefined) => string;
  dataBR:   (v: string | null | undefined) => string;
  renderIf: (cond: boolean | null | undefined, html: string) => string;
  hoje:     () => string;
  numero:   string;
}

export function renderParticularAdulto(ctx: TemplateContext): string {
  const { formData, company, esc, brl, dataBR, renderIf, hoje, numero } = ctx;
  const { paciente, servico, financeiro, regras, consentimentos } = formData;

  const endClinica = [
    company.logradouro, company.numero,
    company.complemento, company.bairro,
    company.cidade, company.uf,
  ].filter(Boolean).join(', ');

  const endPaciente = [
    paciente.logradouro, paciente.numero,
    paciente.complemento, paciente.bairro,
    paciente.cidade, paciente.uf,
  ].filter(Boolean).join(', ');

  const formasPgto = (financeiro.forma_pagamento || []).join(', ').toUpperCase() || '—';

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
      <div class="pt-parte-label">Paciente / Contratante-Usuário</div>
      <p class="pt-parte-nome">${esc(paciente.nome_completo)}</p>
      ${paciente.cpf ? `<p class="pt-parte-info">CPF: ${esc(paciente.cpf)}</p>` : ''}
      ${paciente.data_nascimento ? `<p class="pt-parte-info">Data de Nascimento: ${dataBR(paciente.data_nascimento)}</p>` : ''}
      ${paciente.telefone ? `<p class="pt-parte-info">Tel: ${esc(paciente.telefone)}</p>` : ''}
      ${paciente.email ? `<p class="pt-parte-info">E-mail: ${esc(paciente.email)}</p>` : ''}
      ${endPaciente ? `<p class="pt-parte-info">${esc(endPaciente)}</p>` : ''}
    </div>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">1. Objeto</h2>
  <div class="pt-clausula">
    <p><strong>1.1.</strong> Pelo presente instrumento, a CLÍNICA disponibiliza ao PACIENTE serviços de
    <strong>${esc(servico.area_servico)}</strong>
    ${servico.profissional_responsavel ? `sob responsabilidade técnica de <strong>${esc(servico.profissional_responsavel)}</strong>` : ''}.
    </p>
    <p><strong>1.2.</strong> Modalidade: <strong>${esc(servico.modalidade)}</strong>.
    ${servico.local_atendimento ? `Local: ${esc(servico.local_atendimento)}.` : ''}
    </p>
    <p><strong>1.3.</strong> Frequência: <strong>${esc(servico.frequencia)}</strong>.
    Duração aproximada da sessão: <strong>${esc(servico.duracao_sessao)}</strong>.</p>
    ${servico.data_inicio_atendimento ? `<p><strong>1.4.</strong> Início previsto: ${dataBR(servico.data_inicio_atendimento)}.</p>` : ''}
    ${!servico.vigencia_indeterminada && servico.data_fim_atendimento
      ? `<p><strong>1.5.</strong> Término previsto: ${dataBR(servico.data_fim_atendimento)}.</p>`
      : `<p><strong>1.5.</strong> Vigência por prazo <strong>indeterminado</strong>, podendo ser encerrada por qualquer das partes nos termos desta cláusula.</p>`}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">2. Valores e Condições de Pagamento</h2>
  <div class="pt-clausula">
    <p><strong>2.1.</strong> Valor por sessão: <strong>${brl(financeiro.valor_sessao)}</strong>.</p>
    <p><strong>2.2.</strong> Forma de pagamento: <strong>${esc(formasPgto)}</strong>.</p>
    <p><strong>2.3.</strong> Vencimento: ${esc(financeiro.vencimento_pagamento)}.</p>
    <p><strong>2.4.</strong> Emissão de recibo/nota fiscal: ${esc(financeiro.emite_nota_fiscal === 'obrigatorio'
      ? 'obrigatória para cada pagamento realizado'
      : financeiro.emite_nota_fiscal === 'quando_solicitado'
      ? 'mediante solicitação do paciente'
      : 'não aplicável conforme legislação vigente')}.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">3. Regras de Falta, Cancelamento e Remarcação</h2>
  <div class="pt-clausula">
    ${regras.regra_falta ? `<p><strong>3.1. Falta:</strong> ${esc(regras.regra_falta)}</p>` : ''}
    ${regras.regra_cancelamento ? `<p><strong>3.2. Cancelamento:</strong> ${esc(regras.regra_cancelamento)}</p>` : ''}
    ${regras.antecedencia_cancelamento ? `<p><strong>3.3. Antecedência mínima para cancelamento:</strong> ${esc(regras.antecedencia_cancelamento)}.</p>` : ''}
    ${regras.regra_remarcacao ? `<p><strong>3.4. Remarcação:</strong> ${esc(regras.regra_remarcacao)}</p>` : ''}
    ${regras.regra_atraso ? `<p><strong>3.5. Atraso:</strong> ${esc(regras.regra_atraso)}</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">4. Reajuste e Encerramento</h2>
  <div class="pt-clausula">
    ${regras.regra_reajuste ? `<p><strong>4.1.</strong> ${esc(regras.regra_reajuste)}</p>` : ''}
    ${regras.periodicidade_reajuste ? `<p><strong>4.2.</strong> Periodicidade mínima de reajuste: ${esc(regras.periodicidade_reajuste)}.</p>` : ''}
    ${regras.aviso_previo_reajuste ? `<p><strong>4.3.</strong> Aviso prévio para reajuste: ${esc(regras.aviso_previo_reajuste)}.</p>` : ''}
    ${regras.regra_encerramento ? `<p><strong>4.4.</strong> ${esc(regras.regra_encerramento)}</p>` : ''}
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">5. Sigilo Profissional</h2>
  <div class="pt-clausula">
    <p><strong>5.1.</strong> O profissional responsável pelo atendimento está sujeito ao sigilo profissional
    previsto no Código de Ética da categoria, comprometendo-se a não divulgar informações sobre o atendimento
    sem autorização expressa do paciente, salvo nas situações previstas em lei (notificação compulsória,
    risco de vida, ordem judicial).</p>
    <p><strong>5.2.</strong> O paciente é informado de que serão mantidos registros administrativos do
    atendimento, conforme exigências normativas profissionais. O conteúdo técnico desses registros
    não é armazenado no presente sistema.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">6. Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</h2>
  <div class="pt-clausula">
    <p><strong>6.1.</strong> Os dados pessoais fornecidos pelo paciente serão tratados exclusivamente
    para fins de prestação dos serviços contratados, comunicação administrativa e cumprimento de
    obrigações legais. Base legal: execução de contrato (art. 7º, V da LGPD) e proteção da saúde
    (art. 11, II, f da LGPD).</p>
    <p><strong>6.2.</strong> O paciente poderá, a qualquer tempo, solicitar acesso, correção ou
    exclusão de seus dados pessoais, observadas as obrigações legais de retenção.</p>
    <p><strong>6.3.</strong> Os dados não serão compartilhados com terceiros sem consentimento expresso,
    salvo obrigação legal.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">7. Comunicação Administrativa</h2>
  <div class="pt-clausula">
    <p><strong>7.1.</strong> O paciente autoriza o contato administrativo da clínica por WhatsApp e/ou
    e-mail para fins de confirmação de sessões, avisos de cancelamento, informações sobre pagamentos e
    demais comunicações de natureza exclusivamente administrativa.</p>
  </div>
</section>

<section class="pt-section">
  <h2 class="pt-section-title">8. Ciência sobre Resultados Terapêuticos</h2>
  <div class="pt-clausula">
    <p><strong>8.1.</strong> O paciente declara ciência de que resultados terapêuticos dependem de múltiplos
    fatores individuais e não podem ser garantidos antecipadamente. Não há promessa de cura, resultado
    específico ou prazo determinado para alcançar objetivos pessoais.</p>
  </div>
</section>

<div class="pt-consent-block">
  <div class="pt-consent-title">Consentimentos do Paciente</div>
  ${consentimentos.consentimento_sigilo ? `
  <div class="pt-consent-item">
    <div class="pt-consent-check"></div>
    <span class="pt-consent-text">Declaro ciência sobre o sigilo profissional e seus limites legais.</span>
  </div>` : ''}
  ${consentimentos.consentimento_lgpd ? `
  <div class="pt-consent-item">
    <div class="pt-consent-check"></div>
    <span class="pt-consent-text">Autorizo o tratamento dos meus dados pessoais conforme a LGPD e as finalidades descritas neste termo.</span>
  </div>` : ''}
  ${consentimentos.consentimento_contato_admin ? `
  <div class="pt-consent-item">
    <div class="pt-consent-check"></div>
    <span class="pt-consent-text">Autorizo contato administrativo por WhatsApp e/ou e-mail.</span>
  </div>` : ''}
  ${consentimentos.consentimento_sem_promessa ? `
  <div class="pt-consent-item">
    <div class="pt-consent-check"></div>
    <span class="pt-consent-text">Declaro ciência de que não há promessa de resultado terapêutico.</span>
  </div>` : ''}
</div>

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
