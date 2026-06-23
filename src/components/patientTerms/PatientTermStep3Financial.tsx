'use client';

// ================================================================
// Step 3 — Financeiro e Regras
// tipo_pagamento fixo como 'particular' na Fase 1 (convênio = Fase 2)
// NÃO inclui campos clínicos.
// ================================================================

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, DollarSign, FileText } from 'lucide-react';
import type { PatientTermFormData, PatientTermNotaFiscal } from '@/lib/patientTerms/types';
import { PATIENT_TERM_NOTA_FISCAL_LABELS } from '@/lib/constants';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

const FORMAS_PAGAMENTO = [
  { value: 'pix',          label: 'PIX'          },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cartao',       label: 'Cartão'        },
  { value: 'dinheiro',     label: 'Dinheiro'      },
  { value: 'boleto',       label: 'Boleto'        },
];

const NOTA_FISCAL_OPTIONS: { value: PatientTermNotaFiscal; label: string }[] = [
  { value: 'obrigatorio',       label: PATIENT_TERM_NOTA_FISCAL_LABELS.obrigatorio       },
  { value: 'quando_solicitado', label: PATIENT_TERM_NOTA_FISCAL_LABELS.quando_solicitado },
  { value: 'nao_emite',         label: PATIENT_TERM_NOTA_FISCAL_LABELS.nao_emite         },
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
    const nova = atual.includes(forma)
      ? atual.filter(f => f !== forma)
      : [...atual, forma];
    updateFin('forma_pagamento', nova);
  }

  return (
    <div className="space-y-6">
      {/* ── Financeiro ── */}
      <div className="cc-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <DollarSign className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <h2 className="font-semibold text-sm text-brand-900">Financeiro</h2>
        </div>

        {/* Tipo pagamento — fixo na Fase 1 */}
        <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Tipo de pagamento:</span>
          <span className="text-xs font-semibold text-brand-700 px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200">
            Particular
          </span>
          <span className="text-2xs text-slate-400 ml-auto">Convênio disponível em versão futura</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Valor de pacote para avaliação, ou por sessão nos demais */}
          {isAvaliacao ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor do pacote (R$)</label>
              <input type="text"
                value={financeiro.valor_pacote}
                onChange={e => updateFin('valor_pacote', e.target.value)}
                placeholder="Ex: 1.200,00"
                className="cc-input w-full" />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor por sessão (R$)</label>
              <input type="text"
                value={financeiro.valor_sessao}
                onChange={e => updateFin('valor_sessao', e.target.value)}
                placeholder="Ex: 200,00"
                className="cc-input w-full" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento / data de pagamento</label>
            <input type="text"
              value={financeiro.vencimento_pagamento}
              onChange={e => updateFin('vencimento_pagamento', e.target.value)}
              placeholder="Ex: no dia da sessão, todo dia 05..."
              className="cc-input w-full" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-2">Formas de pagamento aceitas</label>
            <div className="flex flex-wrap gap-2">
              {FORMAS_PAGAMENTO.map(f => (
                <button
                  key={f.value} type="button"
                  onClick={() => toggleFormaPagamento(f.value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    financeiro.forma_pagamento.includes(f.value)
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-brand-300'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Emissão de recibo/nota fiscal</label>
            <select
              value={financeiro.emite_nota_fiscal}
              onChange={e => updateFin('emite_nota_fiscal', e.target.value)}
              className="cc-input w-full">
              <option value="">Selecione...</option>
              {NOTA_FISCAL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Regras de atendimento ── */}
      <div className="cc-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <h2 className="font-semibold text-sm text-brand-900">Regras de Atendimento</h2>
        </div>
        <p className="text-2xs text-slate-400 mb-4">
          Os valores abaixo são sugeridos. Edite conforme a política da clínica.
        </p>

        <div className="space-y-4">
          {([
            { field: 'regra_falta'               as const, label: 'Regra de falta'               },
            { field: 'regra_cancelamento'         as const, label: 'Regra de cancelamento'         },
            { field: 'antecedencia_cancelamento'  as const, label: 'Antecedência mínima para cancelamento' },
            { field: 'regra_remarcacao'           as const, label: 'Regra de remarcação'          },
            { field: 'regra_atraso'               as const, label: 'Regra de atraso'              },
            { field: 'regra_reajuste'             as const, label: 'Regra de reajuste'            },
            { field: 'periodicidade_reajuste'     as const, label: 'Periodicidade mínima de reajuste' },
            { field: 'aviso_previo_reajuste'      as const, label: 'Aviso prévio para reajuste'   },
            { field: 'regra_encerramento'         as const, label: 'Regra de encerramento'        },
          ] as const).map(({ field, label }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <textarea rows={2}
                value={regras[field]}
                onChange={e => updateRegras(field, e.target.value)}
                className="cc-input w-full resize-none" />
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
