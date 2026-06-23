'use client';

// ================================================================
// Step 3 — Financeiro e Regras
// Máscara BRL, chips de pagamento e nota fiscal como no Step3 do contrato.
// tipo_pagamento fixo como 'particular' na Fase 1.
// NÃO inclui campos clínicos.
// ================================================================

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, DollarSign, FileText } from 'lucide-react';
import type { PatientTermFormData, PatientTermNotaFiscal } from '@/lib/patientTerms/types';
import { PATIENT_TERM_NOTA_FISCAL_LABELS } from '@/lib/constants';
import { maskCurrencyInput } from '@/lib/masks';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

const FORMAS_PAGAMENTO = [
  { value: 'pix',           label: 'PIX',           icon: '⚡' },
  { value: 'transferencia', label: 'Transferência',  icon: '🏦' },
  { value: 'cartao',        label: 'Cartão',         icon: '💳' },
  { value: 'dinheiro',      label: 'Dinheiro',       icon: '💵' },
  { value: 'boleto',        label: 'Boleto',         icon: '📄' },
];

const NOTA_FISCAL_OPTS: { val: PatientTermNotaFiscal; label: string; desc: string }[] = [
  { val: 'obrigatorio',       label: 'Obrigatório',        desc: 'Emissão de recibo/nota para cada pagamento realizado.'         },
  { val: 'quando_solicitado', label: 'Quando solicitado',  desc: 'Emitir apenas mediante pedido expresso do paciente.'           },
  { val: 'nao_emite',         label: 'Não emite',          desc: 'Não aplicável conforme legislação vigente para este prestador.' },
];

const REGRAS_FIELDS = [
  { field: 'regra_falta'              as const, label: 'Regra de falta'                        },
  { field: 'regra_cancelamento'       as const, label: 'Regra de cancelamento'                  },
  { field: 'antecedencia_cancelamento'as const, label: 'Antecedência mínima para cancelamento'  },
  { field: 'regra_remarcacao'         as const, label: 'Regra de remarcação'                    },
  { field: 'regra_atraso'             as const, label: 'Regra de atraso'                        },
  { field: 'regra_reajuste'           as const, label: 'Regra de reajuste'                      },
  { field: 'periodicidade_reajuste'   as const, label: 'Periodicidade mínima de reajuste'       },
  { field: 'aviso_previo_reajuste'    as const, label: 'Aviso prévio para reajuste'             },
  { field: 'regra_encerramento'       as const, label: 'Regra de encerramento'                  },
];

interface Step3Props {
  data:     PatientTermFormData;
  onChange: (partial: Partial<PatientTermFormData>) => void;
  onBack:   () => void;
  onNext:   () => void;
}

export function PatientTermStep3Financial({ data, onChange, onBack, onNext }: Step3Props) {
  useScrollTop();
  const { servico, financeiro, regras } = data;
  const isAvaliacao = servico.tipo_termo === 'avaliacao_neuro';

  function updateFin(field: keyof typeof financeiro, value: string | string[]) {
    onChange({ financeiro: { ...financeiro, [field]: value } });
  }

  function updateRegras(field: keyof typeof regras, value: string) {
    onChange({ regras: { ...regras, [field]: value } });
  }

  function toggleFormaPagamento(forma: string) {
    const atual = financeiro.forma_pagamento;
    const nova  = atual.includes(forma)
      ? atual.filter(f => f !== forma)
      : [...atual, forma];
    updateFin('forma_pagamento', nova);
  }

  // Máscara BRL ao digitar — converte dígitos em R$ X.XXX,XX
  function handleValorChange(field: 'valor_sessao' | 'valor_pacote', raw: string) {
    updateFin(field, maskCurrencyInput(raw));
  }

  return (
    <div className="space-y-6">
      {/* ── Financeiro ── */}
      <div className="cc-card p-6">
        <div className="section-title">Financeiro</div>

        {/* Tipo pagamento — fixo na Fase 1 */}
        <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Tipo de pagamento:</span>
          <span className="text-xs font-bold text-brand-700 px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand-200">
            Particular
          </span>
          <span className="text-2xs text-slate-400 ml-auto">Convênio disponível em versão futura</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isAvaliacao ? (
            <div>
              <label className="cc-label">Valor do pacote</label>
              <input type="text"
                value={financeiro.valor_pacote}
                onChange={e => handleValorChange('valor_pacote', e.target.value)}
                placeholder="R$ 0,00"
                className="cc-input w-full" />
            </div>
          ) : (
            <div>
              <label className="cc-label">Valor por sessão</label>
              <input type="text"
                value={financeiro.valor_sessao}
                onChange={e => handleValorChange('valor_sessao', e.target.value)}
                placeholder="R$ 0,00"
                className="cc-input w-full" />
            </div>
          )}

          <div>
            <label className="cc-label">Vencimento / data de pagamento</label>
            <input type="text"
              value={financeiro.vencimento_pagamento}
              onChange={e => updateFin('vencimento_pagamento', e.target.value)}
              placeholder="Ex: no dia da sessão, todo dia 05..."
              className="cc-input w-full" />
          </div>
        </div>

        {/* Formas de pagamento — chips */}
        <div className="mt-4">
          <label className="cc-label">Formas de pagamento aceitas</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {FORMAS_PAGAMENTO.map(f => {
              const selected = financeiro.forma_pagamento.includes(f.value);
              return (
                <button key={f.value} type="button" onClick={() => toggleFormaPagamento(f.value)}
                  className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                    selected ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-200')}>
                  <span>{f.icon}</span> {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nota Fiscal — botões como no contrato */}
      <div className="cc-card p-6">
        <div className="section-title">Recibo / Nota Fiscal</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {NOTA_FISCAL_OPTS.map(({ val, label, desc }) => (
            <button key={val} type="button" onClick={() => updateFin('emite_nota_fiscal', val)}
              className={clsx('p-4 rounded-xl border-2 text-left transition-all',
                financeiro.emite_nota_fiscal === val ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200')}>
              <div className="text-sm font-semibold text-brand-900">{label}</div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Regras de atendimento — padrão visual do contrato */}
      <div className="cc-card p-6">
        <div className="section-title">Regras de Atendimento</div>
        <p className="text-xs text-slate-400 mb-5">
          Os textos abaixo são sugestões. Edite conforme a política da sua clínica.
        </p>
        <div className="space-y-4">
          {REGRAS_FIELDS.map(({ field, label }) => (
            <div key={field}>
              <label className="cc-label">{label}</label>
              <textarea rows={2} className="cc-textarea w-full"
                value={regras[field]}
                onChange={e => updateRegras(field, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="btn-secondary flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button type="button" onClick={onNext}
          className="btn-primary flex items-center gap-2">
          Avançar para Revisão <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
