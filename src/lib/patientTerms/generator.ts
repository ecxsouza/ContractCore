// ================================================================
// ContractCore — Gerador de Termos de Pacientes
// Arquivo isolado — não altera nem importa generator.ts de contratos.
//
// Função principal: generatePatientTermHTML(formData, company)
//   → Retorna HTML string completo pronto para salvar no banco
//     e imprimir via window.print().
//
// IMPORTANTE: Este módulo NÃO é prontuário eletrônico.
// Não gera conteúdo clínico, diagnóstico, CID ou laudo.
// ================================================================

import type { Company } from '@/types';
import type { PatientTermFormData, PatientTermType } from './types';
import { patientTermPrintCSS } from './printCSS';
import {
  PATIENT_TERM_TEMPLATE_RENDERERS,
  type TemplateContext,
} from './templates/index';

// ── Helpers locais ────────────────────────────────────────────────
// Não exportados: uso interno exclusivo do gerador.

/**
 * Escapa caracteres especiais HTML para prevenir XSS.
 * Todos os campos vindos do formulário passam por aqui.
 * Usa split/join em vez de replaceAll (compatível com ES2017).
 */
function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

/**
 * Formata valor monetário em BRL.
 * Aceita string (input controlado do wizard) ou number.
 * Normaliza os formatos comuns antes de parsear:
 *   '1200'        → R$ 1.200,00
 *   '1200.00'     → R$ 1.200,00  (ponto decimal inglês)
 *   '1200,00'     → R$ 1.200,00  (vírgula decimal brasileira)
 *   '1.200,00'    → R$ 1.200,00  (formato PT-BR completo)
 *   'R$ 1.200,00' → R$ 1.200,00  (com prefixo)
 *   '10.000,00'   → R$ 10.000,00
 * Não usa replaceAll — compatível com ES2017 (tsconfig do projeto).
 * Retorna '—' se vazio ou não numérico.
 */
function formatCurrencyBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else {
    // Remove prefixo "R$", espaços e non-breaking spaces
    let s = String(value)
      .trim()
      .split('R$').join('')
      .split('\u00a0').join('')
      .split(' ').join('');

    // Detecta o formato do separador decimal:
    // — Se contém vírgula → formato PT-BR: ponto é milhar, vírgula é decimal
    //   Ex: '1.200,00' → remove pontos, troca vírgula por ponto → '1200.00'
    // — Se NÃO contém vírgula mas contém ponto → ponto pode ser decimal (inglês)
    //   ou milhar sem decimal. Verificar: se ponto não estiver em posição de decimal
    //   (ex: '1.200' tem ponto na posição 1, não na penúltima), tratar como milhar.
    //   Caso mais seguro: se o ponto separa exatamente 3 dígitos até o fim sem vírgula,
    //   é milhar. Caso contrário, é decimal.
    if (s.indexOf(',') !== -1) {
      // Formato PT-BR: '1.200,00' ou '1200,00'
      s = s.split('.').join('').split(',').join('.');
    } else if (s.indexOf('.') !== -1) {
      // Sem vírgula: pode ser '1200.00' (decimal inglês) ou '1.200' (milhar sem centavos)
      const dotIdx = s.lastIndexOf('.');
      const afterDot = s.slice(dotIdx + 1);
      if (afterDot.length <= 2) {
        // '1200.00' ou '1200.5' — ponto é decimal inglês, manter como está
      } else {
        // '1.200' — ponto é separador de milhar, remover
        s = s.split('.').join('');
      }
    }

    num = parseFloat(s);
  }
  if (isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata data ISO (YYYY-MM-DD) para o padrão brasileiro (DD/MM/YYYY).
 * Retorna '' se vazio ou inválido.
 */
function formatDateBR(value: string | null | undefined): string {
  if (!value) return '';
  // Evita deslocamento de fuso ao usar Z
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

/**
 * Retorna html apenas se a condição for verdadeira.
 * Facilita renderização condicional nos templates.
 */
function renderIf(cond: boolean | null | undefined, html: string): string {
  return cond ? html : '';
}

/**
 * Data de hoje no formato DD/MM/YYYY.
 */
function hoje(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

// ── Seleção de template ───────────────────────────────────────────

/**
 * Retorna o renderer correto para o tipo de termo.
 * Fallback seguro: se o tipo não estiver mapeado, usa particular_adulto.
 */
function selectRenderer(tipo: PatientTermType) {
  return PATIENT_TERM_TEMPLATE_RENDERERS[tipo]
    ?? PATIENT_TERM_TEMPLATE_RENDERERS['particular_adulto'];
}

// ── Cabeçalho e rodapé HTML ───────────────────────────────────────

function renderHeader(company: Company, numero: string): string {
  const logoHtml = company.logo_url
    ? `<div class="pt-logo"><img src="${escapeHtml(company.logo_url)}" alt="${escapeHtml(company.razao_social)}" /></div>`
    : `<div class="pt-logo-text">${escapeHtml(company.razao_social)}</div>`;

  const tipoLabel: Record<string, string> = {
    particular_adulto: 'Termo de Prestação de Serviços ao Paciente — Particular',
    particular_menor:  'Termo de Prestação de Serviços ao Paciente — Menor de Idade',
    avaliacao_neuro:   'Termo de Avaliação Neuropsicológica',
    online_adulto:     'Termo de Prestação de Serviços — Atendimento Online',
  };

  return `
${logoHtml}
<h1 class="pt-title">${escapeHtml(tipoLabel['particular_adulto'] || 'Termo de Prestação de Serviços ao Paciente')}</h1>
<p class="pt-meta">
  <span class="pt-numero">Nº ${escapeHtml(numero)}</span>
  &nbsp;·&nbsp;
  ${escapeHtml(company.cidade)}/${escapeHtml(company.uf)}
</p>`;
}

function renderHeaderWithType(company: Company, numero: string, tipo: PatientTermType): string {
  const tipoLabel: Record<PatientTermType, string> = {
    particular_adulto: 'Termo de Prestação de Serviços ao Paciente — Particular',
    particular_menor:  'Termo de Prestação de Serviços ao Paciente — Menor de Idade',
    avaliacao_neuro:   'Termo de Avaliação Neuropsicológica',
    online_adulto:     'Termo de Prestação de Serviços — Atendimento Online',
  };

  const logoHtml = company.logo_url
    ? `<div class="pt-logo"><img src="${escapeHtml(company.logo_url)}" alt="${escapeHtml(company.razao_social)}" /></div>`
    : `<div class="pt-logo-text">${escapeHtml(company.razao_social)}</div>`;

  return `
${logoHtml}
<h1 class="pt-title">${escapeHtml(tipoLabel[tipo])}</h1>
<p class="pt-meta">
  <span class="pt-numero">Nº ${escapeHtml(numero)}</span>
  &nbsp;·&nbsp;
  ${escapeHtml(company.cidade)}/${escapeHtml(company.uf)}
</p>`;
}

// ── Função principal ──────────────────────────────────────────────

/**
 * Gera o HTML completo do termo de serviço ao paciente.
 *
 * @param formData - dados agrupados do wizard (PatientTermFormData)
 * @param company  - dados da clínica (Company)
 * @param numero   - número do termo (ex: 'TP-2026-0001').
 *                   Use 'TP-PREVIEW' durante a pré-visualização.
 *                   O backend substitui pelo número real ao salvar
 *                   (mesmo padrão do CC-PREVIEW nos contratos).
 * @returns HTML string completo, pronto para salvar e imprimir.
 */
export function generatePatientTermHTML(
  formData: PatientTermFormData,
  company:  Company,
  numero:   string = 'TP-PREVIEW',
): string {
  const tipo = formData.servico.tipo_termo;
  const renderer = selectRenderer(tipo);

  // Contexto compartilhado com todos os templates
  const ctx: TemplateContext = {
    formData,
    company,
    esc:      escapeHtml,
    brl:      formatCurrencyBRL,
    dataBR:   formatDateBR,
    renderIf,
    hoje,
    numero,
  };

  const headerHtml  = renderHeaderWithType(company, numero, tipo);
  const bodyHtml    = renderer(ctx);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Termo de Serviço — ${escapeHtml(company.razao_social)}</title>
  <style>${patientTermPrintCSS}</style>
</head>
<body>
<article class="pt-body">
${headerHtml}
${bodyHtml}
</article>
</body>
</html>`;
}
