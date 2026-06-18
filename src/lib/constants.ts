// ================================================================
// ContractCore — Constantes Globais
// FONTE ÚNICA DA VERDADE para status, labels e configurações
// ================================================================

// ── STATUS DE CONTRATO ────────────────────────────────────────────
// Valores exatos usados no banco de dados (snake_case, sem acento)
export const CONTRACT_STATUS = {
  RASCUNHO:              'rascunho',
  EM_REVISAO:            'em_revisao',
  REVISADO_IA:           'revisado_ia',
  AGUARDANDO_APROVACAO:  'aguardando_aprovacao',
  AGUARDANDO_ASSINATURA: 'aguardando_assinatura',
  ASSINADO:              'assinado',
  CANCELADO:             'cancelado',
  ARQUIVADO:             'arquivado',
  ENCERRADO:             'encerrado',
} as const;

export type ContractStatusValue = typeof CONTRACT_STATUS[keyof typeof CONTRACT_STATUS];

// ── CONFIGURAÇÃO DE EXIBIÇÃO POR STATUS ─────────────────────────
export const STATUS_DISPLAY: Record<ContractStatusValue, {
  label:     string;
  cls:       string;
  badgeCls:  string;
}> = {
  rascunho:              { label: 'Rascunho',             cls: 'badge-gray',   badgeCls: 'bg-slate-100 text-slate-600'   },
  em_revisao:            { label: 'Em Revisão',           cls: 'badge-yellow', badgeCls: 'bg-amber-100 text-amber-700'   },
  revisado_ia:           { label: 'Revisado pela IA',     cls: 'badge-blue',   badgeCls: 'bg-blue-100 text-blue-700'     },
  aguardando_aprovacao:  { label: 'Aguard. Aprovação',    cls: 'badge-yellow', badgeCls: 'bg-amber-100 text-amber-700'   },
  aguardando_assinatura: { label: 'Aguard. Assinatura',   cls: 'badge-blue',   badgeCls: 'bg-brand-100 text-brand-700'   },
  assinado:              { label: 'Assinado',             cls: 'badge-green',  badgeCls: 'bg-emerald-100 text-emerald-700'},
  cancelado:             { label: 'Cancelado',            cls: 'badge-red',    badgeCls: 'bg-red-100 text-red-700'       },
  arquivado:             { label: 'Arquivado',            cls: 'badge-gray',   badgeCls: 'bg-slate-100 text-slate-500'   },
  encerrado:             { label: 'Encerrado',            cls: 'badge-gray',   badgeCls: 'bg-slate-100 text-slate-500'   },
};

// Helper para exibição segura
export function getStatusDisplay(status: string) {
  return STATUS_DISPLAY[status as ContractStatusValue] || {
    label:    status,
    cls:      'badge-gray',
    badgeCls: 'bg-slate-100 text-slate-600',
  };
}

// ── MODELO ANTHROPIC ──────────────────────────────────────────────
// IDs canônicos confirmados na documentação oficial Anthropic (junho 2026)
// Fonte: https://platform.claude.com/docs/en/about-claude/models/overview
//
// Claude API ID         Alias             Descrição
// claude-opus-4-8       claude-opus-4-8   Mais capaz — raciocínio complexo e agentes
// claude-sonnet-4-6     claude-sonnet-4-6 Melhor custo-benefício (recomendado para ContractCore)
// claude-haiku-4-5-20251001 claude-haiku-4-5 Mais rápido e barato
//
// IMPORTANTE: claude-opus-4-6 está DEPRECIADO — migrar para claude-opus-4-8
// (claude-sonnet-4-6 e claude-haiku-4-5-20251001 estão ativos e são os recomendados)
export const ANTHROPIC_MODELS = {
  OPUS:   'claude-opus-4-8',            // flagship — mais caro
  SONNET: 'claude-sonnet-4-6',          // recomendado para ContractCore
  HAIKU:  'claude-haiku-4-5-20251001',  // mais rápido/barato
} as const;

// Custo por 1.000 tokens (USD) — preços oficiais Anthropic junho 2026
// Opus 4.8:   $5/MTok input,  $25/MTok output
// Sonnet 4.6: $3/MTok input,  $15/MTok output
// Haiku 4.5:  $1/MTok input,  $5/MTok  output
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8':           { input: 0.000005,   output: 0.000025   },
  'claude-sonnet-4-6':         { input: 0.000003,   output: 0.000015   },
  'claude-haiku-4-5-20251001': { input: 0.000001,   output: 0.000005   },
  'claude-haiku-4-5':          { input: 0.000001,   output: 0.000005   },  // alias
};

export function calcularCustoIA(
  promptTokens:     number,
  completionTokens: number,
  modelo:           string
): number {
  const costs = MODEL_COSTS[modelo] || MODEL_COSTS['claude-sonnet-4-6'];
  return parseFloat(
    ((promptTokens * costs.input) + (completionTokens * costs.output)).toFixed(6)
  );
}

// ── NÍVEL DE RISCO ────────────────────────────────────────────────
export const NIVEL_RISCO_DISPLAY = {
  baixo: { label: 'Baixo',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  medio: { label: 'Médio',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  alto:  { label: 'Alto',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
} as const;

// ── STORAGE PATHS ─────────────────────────────────────────────────
// Padrão: {user_id}/{company_id}/{entidade}/{filename}
export function storagePath(
  userId:    string,
  companyId: string,
  entity:    'logos' | 'contracts' | 'provider-docs',
  filename:  string
): string {
  // Sanitizar filename — só alfanuméricos, hífen, underscore, ponto
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${companyId}/${entity}/${safe}`;
}
