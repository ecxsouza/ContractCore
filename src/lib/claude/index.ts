// ================================================================
// ContractCore — Integração Claude / Mesa Técnica Multidisciplinar
// ================================================================
import Anthropic from '@anthropic-ai/sdk';
import type { ContractFormData, Company, RiscoItem, ChecklistMesaItem, ClausulaRevisada } from '@/types';

export type { RiscoItem, ChecklistMesaItem };

const client = new Anthropic({
  apiKey:  process.env.ANTHROPIC_API_KEY!,
  timeout: 58000,
});

const VALID_MODELS = [
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-haiku-4-5',
] as const;
type ValidModel = typeof VALID_MODELS[number];

function getModel(): ValidModel {
  const configured = process.env.ANTHROPIC_MODEL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ANTHROPIC_MODEL não configurada. Defina nas variáveis de ambiente da Vercel.');
    }
    console.warn('[Claude] ANTHROPIC_MODEL não definida. Usando claude-sonnet-4-6 como fallback.');
    return 'claude-sonnet-4-6';
  }
  if (!VALID_MODELS.includes(configured as ValidModel)) {
    throw new Error(`ANTHROPIC_MODEL inválida: "${configured}". Valores aceitos: ${VALID_MODELS.join(', ')}`);
  }
  return configured as ValidModel;
}

const SYSTEM_PROMPT = `Você é a MESA TÉCNICA MULTIDISCIPLINAR do ContractCore, formada por 9 especialistas:
1. Jurídico corporativo | 2. RH | 3. Departamento Pessoal | 4. Contador
5. Advogado Trabalhista | 6. Advogado Direito da Saúde | 7. Especialista CFP/CRP
8. Psicólogo com visão ética | 9. Especialista em contratos empresariais

REGRAS:
- Contrato de PRESTAÇÃO DE SERVIÇOS AUTÔNOMA — nunca linguagem CLT
- Responda em português brasileiro claro, acessível ao leigo
- Seja ESPECÍFICO e DETALHADO — nunca genérico
- Identifique PROBLEMAS REAIS baseados nos dados fornecidos
- Retorne APENAS JSON válido, sem texto antes ou depois
- LINGUAGEM JURÍDICA PRUDENTE: nunca use "juridicamente nulo", "sem força legal", "juridicamente inválido" ou cite artigos de lei de forma absoluta. Use: "apresenta risco jurídico elevado", "pode ter sua eficácia comprometida", "juridicamente frágil", "risco de fragilidade probatória". A análise é de risco, não de sentença judicial.`;

// ClausulaRevisada definida em @/types
export type { ClausulaRevisada };

export interface EnrichContractInput {
  formData:     ContractFormData;
  company:      Company;
  contratoBase: string;
}

export interface EnrichContractOutput {
  contrato_html:        string;
  sugestoes:            string;
  riscos_identificados: RiscoItem[];
  nivel_risco:          'baixo' | 'medio' | 'alto';
  checklist_mesa:       ChecklistMesaItem[];
  clausulas_ajustadas:  string[];
  clausulas_revisadas:  ClausulaRevisada[];
  tokens_usados:        number;
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function enrichContractWithAI(input: EnrichContractInput): Promise<EnrichContractOutput> {
  const { formData, company, contratoBase } = input;
  const { provider, service, remuneration } = formData;

  const contratoTexto = contratoBase
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 2000);

  const conselhoOk = provider.conselho_profissional && provider.numero_registro_conselho;
  const objetoStatus = service.objeto
    ? `"${service.objeto.slice(0, 150)}"`
    : 'NÃO PREENCHIDO — CRÍTICO';
  const valorStatus = remuneration.valor_descricao
    ? `"${remuneration.valor_descricao.slice(0, 100)}"`
    : 'NÃO INFORMADO — CRÍTICO';

  // Limites rígidos de caracteres por campo garantem que o JSON feche antes de max_tokens
  const prompt = `Analise este contrato e retorne JSON.

DADOS:
Contratante: ${company.razao_social} | CNPJ: ${company.cnpj} | ${company.cidade}/${company.uf}
Contratada: ${provider.nome_razao_social} | ${provider.tipo_pessoa} | ${provider.profissao}
Conselho: ${conselhoOk ? `${provider.conselho_profissional} nº ${provider.numero_registro_conselho}` : 'NÃO INFORMADO'}
Especialidade: ${provider.especialidade || 'Não informada'}
Objeto: ${objetoStatus}
Descrição: ${service.descricao_servicos || 'Não preenchida'}
Modalidade: ${service.modalidade} | Periodicidade: ${service.periodicidade}
Agenda: ${service.agenda_pactuada || 'Não informada'} | Local: ${service.local_prestacao || 'Não informado'}
Exclusividade: ${service.exclusividade ? 'SIM — RISCO' : 'NÃO'}
Cancelamento: ${service.regra_cancelamento || 'Não definida'} | Remarcação: ${service.regra_remarcacao || 'Não definida'}
Valor: ${valorStatus} | NF: ${remuneration.emite_nota_fiscal} | Pagamento: ${remuneration.data_pagamento}
Retenções: ${remuneration.retencoes_fiscais || 'não especificadas'}

CONTRATO:
${contratoTexto}

RETORNE SOMENTE JSON VÁLIDO. Sem markdown. Sem bloco \`\`\`json. Sem texto antes ou depois.

LIMITES OBRIGATÓRIOS (respeite-os para não truncar a resposta):
- sugestoes: máximo 600 caracteres
- clausulas_revisadas: EXATAMENTE 3 itens
- riscos: EXATAMENTE 3 itens
- checklist: EXATAMENTE 7 itens
- problema: máximo 250 caracteres
- texto_original: máximo 180 caracteres
- texto_revisado: máximo 350 caracteres
- motivo: máximo 180 caracteres
- descricao (risco): máximo 180 caracteres
- como_corrigir: máximo 160 caracteres
- observacao (checklist): máximo 130 caracteres

Se houver mais de 3 problemas, priorize os 3 mais graves. Seja específico e direto.

{
  "nivel_risco": "alto",
  "sugestoes": "Análise executiva objetiva dos principais riscos encontrados. Máximo 600 caracteres.",
  "clausulas_revisadas": [
    {
      "id": "cl_objeto",
      "chave": "objeto",
      "titulo": "Objeto do Contrato",
      "problema": "Problema concreto explicado para leigo. Máx 250 chars.",
      "texto_original": "Trecho original com o problema. Máx 180 chars.",
      "texto_revisado": "Texto corrigido pronto para uso. Máx 350 chars.",
      "motivo": "Por que protege a clínica. Máx 180 chars.",
      "gravidade": "critico",
      "area": "Contratual"
    },
    {
      "id": "cl_descricao",
      "chave": "descricao_servicos",
      "titulo": "Descrição dos Serviços",
      "problema": "Problema concreto. Máx 250 chars.",
      "texto_original": "Trecho original. Máx 180 chars.",
      "texto_revisado": "Texto corrigido. Máx 350 chars.",
      "motivo": "Motivo da correção. Máx 180 chars.",
      "gravidade": "importante",
      "area": "Contratual"
    },
    {
      "id": "cl_remuneracao",
      "chave": "remuneracao",
      "titulo": "Remuneração e Honorários",
      "problema": "Problema concreto. Máx 250 chars.",
      "texto_original": "Trecho original. Máx 180 chars.",
      "texto_revisado": "Texto corrigido. Máx 350 chars.",
      "motivo": "Motivo da correção. Máx 180 chars.",
      "gravidade": "importante",
      "area": "Fiscal"
    }
  ],
  "riscos": [
    { "titulo": "Título curto", "descricao": "Risco explicado. Máx 180 chars.", "gravidade": "critico", "como_corrigir": "Ação prática. Máx 160 chars.", "area": "Trabalhista" },
    { "titulo": "Título curto", "descricao": "Risco explicado. Máx 180 chars.", "gravidade": "importante", "como_corrigir": "Ação prática. Máx 160 chars.", "area": "Fiscal" },
    { "titulo": "Título curto", "descricao": "Risco explicado. Máx 180 chars.", "gravidade": "atencao", "como_corrigir": "Ação prática. Máx 160 chars.", "area": "Pejotização" }
  ],
  "checklist": [
    { "area": "Trabalhista",  "status": "atencao",  "observacao": "Avaliação específica. Máx 130 chars." },
    { "area": "Fiscal",       "status": "ok",        "observacao": "Avaliação específica. Máx 130 chars." },
    { "area": "LGPD",         "status": "problema",  "observacao": "Avaliação específica. Máx 130 chars." },
    { "area": "CFP/CRP",      "status": "ok",        "observacao": "Status do registro. Máx 130 chars." },
    { "area": "Pejotização",  "status": "atencao",   "observacao": "Score X/10 e fator principal. Máx 130 chars." },
    { "area": "Remuneração",  "status": "ok",        "observacao": "Avaliação do valor. Máx 130 chars." },
    { "area": "Conselho",     "status": "atencao",   "observacao": "Status do registro. Máx 130 chars." }
  ]
}`;

  const response = await client.messages.create({
    model:      getModel(),
    max_tokens: 2800,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: prompt }],
  });

  const msgContent = response.content[0];
  if (msgContent.type !== 'text') throw new Error('Resposta inesperada da IA');

  const raw = msgContent.text;

  // Log sempre — crítico para diagnóstico
  console.log('[Claude] stop_reason:', response.stop_reason);
  console.log('[Claude] tokens — input:', response.usage.input_tokens, '| output:', response.usage.output_tokens);
  console.log('[Claude] raw início:', raw.slice(0, 300));
  console.log('[Claude] raw fim:', raw.slice(-200));

  if (response.stop_reason === 'max_tokens') {
    console.error('[Claude] TRUNCADO — resposta cortada antes de fechar o JSON. Reduza os limites de caracteres no prompt.');
  }

  // Parser robusto: remove fences, extrai entre primeira { e última }
  const withoutFences = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const firstBrace = withoutFences.indexOf('{');
  const lastBrace  = withoutFences.lastIndexOf('}');

  let parsed: {
    nivel_risco:         string;
    sugestoes:           string;
    clausulas_revisadas: ClausulaRevisada[];
    riscos:              RiscoItem[];
    checklist:           ChecklistMesaItem[];
  } | null = null;

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = withoutFences.slice(firstBrace, lastBrace + 1);
    console.log('[Claude] JSON extraído:', jsonStr.length, 'chars');
    try {
      parsed = JSON.parse(jsonStr);
      console.log('[Claude] Parse OK — nivel_risco:', parsed?.nivel_risco,
        '| clausulas:', parsed?.clausulas_revisadas?.length,
        '| riscos:', parsed?.riscos?.length);
    } catch (parseErr) {
      console.error('[Claude] Parse FALHOU:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('[Claude] JSON tentado (500 chars):', jsonStr.slice(0, 500));
    }
  } else {
    console.error('[Claude] Nenhum objeto JSON encontrado na resposta');
    console.error('[Claude] Resposta completa:', raw.slice(0, 1000));
  }

  // Se parse falhou, lançar erro real em vez de retornar arrays vazios silenciosamente
  if (!parsed) {
    const motivo = response.stop_reason === 'max_tokens'
      ? 'A resposta da IA foi truncada antes de fechar o JSON. Tente novamente.'
      : `IA não retornou JSON válido (stop_reason=${response.stop_reason}, tokens=${response.usage.output_tokens})`;
    throw new Error(motivo);
  }

  const clausulasRevisadas = (parsed.clausulas_revisadas || []).filter(
    (cl) => cl && cl.titulo && cl.texto_revisado && cl.texto_revisado !== cl.texto_original,
  );

  // Injeta seção da mesa técnica no final do HTML — garantido, sem depender de títulos
  let contratoHtmlFinal = contratoBase;
  if (clausulasRevisadas.length > 0) {
    const cards = clausulasRevisadas.map((cl) => {
      const label = cl.gravidade === 'critico' ? 'Crítico'
                  : cl.gravidade === 'importante' ? 'Importante'
                  : 'Atenção';
      return (
        `<div class="ia-review-card ia-gravidade-${escapeHtml(cl.gravidade || 'atencao')}">` +
          `<div class="ia-review-kicker">Mesa Técnica · ${escapeHtml(cl.area || '')} · ${label}</div>` +
          `<h3 class="ia-review-titulo">${escapeHtml(cl.titulo || '')}</h3>` +
          `<p class="ia-review-problema"><strong>Problema:</strong> ${escapeHtml(cl.problema || '')}</p>` +
          `<div class="ia-review-diff">` +
            `<div class="ia-diff-original"><span class="ia-diff-label">✗ Original</span>${escapeHtml(cl.texto_original || '')}</div>` +
            `<div class="ia-diff-revisado"><span class="ia-diff-label">✓ Revisado</span>${escapeHtml(cl.texto_revisado)}</div>` +
          `</div>` +
          `<p class="ia-review-motivo"><strong>Por quê:</strong> ${escapeHtml(cl.motivo || '')}</p>` +
        `</div>`
      );
    }).join('\n');

    const secao = `\n<div class="ia-review-section page-break-before">` +
      `<h2>✦ Revisão da Mesa Técnica Multidisciplinar</h2>` +
      `<p class="ia-review-intro">${escapeHtml(parsed.sugestoes || '')}</p>` +
      cards +
      `</div>`;

    contratoHtmlFinal = contratoBase.includes('</body>')
      ? contratoBase.replace('</body>', secao + '</body>')
      : contratoBase + secao;
  }

  return {
    contrato_html:        contratoHtmlFinal,
    sugestoes:            parsed.sugestoes || '',
    riscos_identificados: (parsed.riscos   || []) as RiscoItem[],
    nivel_risco:          (['baixo', 'medio', 'alto'].includes(parsed.nivel_risco)
                            ? parsed.nivel_risco : 'medio') as 'baixo' | 'medio' | 'alto',
    checklist_mesa:       (parsed.checklist || []) as ChecklistMesaItem[],
    clausulas_ajustadas:  clausulasRevisadas.map(c => c.titulo),
    clausulas_revisadas:  clausulasRevisadas,
    tokens_usados:        response.usage.input_tokens + response.usage.output_tokens,
  };
}

export async function suggestContractObject(profissao: string, especialidade?: string): Promise<string> {
  const isDescricao = especialidade === 'descricao_detalhada';
  const prompt = isDescricao
    ? `Escreva a DESCRIÇÃO DETALHADA DE SERVIÇOS para contrato de prestação com ${profissao} em clínica de saúde. 2 parágrafos. Texto corrido. Sem títulos ou asteriscos. Mencione autonomia técnica.`
    : `Escreva o OBJETO de contrato de prestação de serviços autônoma para ${profissao} em clínica de psicologia. 2 parágrafos. Texto corrido. Sem títulos ou asteriscos. Autonomia técnica. Sem CLT.`;

  const response = await client.messages.create({
    model:      getModel(),
    max_tokens: 500,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: prompt }],
  });

  const c = response.content[0];
  if (c.type !== 'text') return '';
  return c.text.replace(/\*\*/g, '').replace(/^#{1,6}\s*/gm, '').trim();
}
