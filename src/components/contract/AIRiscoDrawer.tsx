'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, AlertTriangle, AlertCircle, Info, Edit3, Check } from 'lucide-react';
import type { ContractFormData } from '@/types';
import clsx from 'clsx';

// Mapeamento: título do risco → campo editável no wizard
const RISCO_FIELD_MAP: Record<string, {
  step:    1 | 2 | 3;
  field:   string;
  label:   string;
  type:    'text' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
}> = {
  // Step 1 — Prestador
  'cpf':                    { step: 1, field: 'cpf',                   label: 'CPF',                   type: 'text'     },
  'cnpj':                   { step: 1, field: 'cnpj',                  label: 'CNPJ',                  type: 'text'     },
  'registro profissional':  { step: 1, field: 'numero_registro_conselho', label: 'Nº Registro Conselho', type: 'text'  },
  'conselho':               { step: 1, field: 'conselho_profissional',  label: 'Conselho Profissional', type: 'text'     },
  'email':                  { step: 1, field: 'email',                  label: 'E-mail',                type: 'text'     },
  // Step 2 — Serviço
  'objeto':                 { step: 2, field: 'objeto',                 label: 'Objeto do Contrato',    type: 'textarea' },
  'descrição':              { step: 2, field: 'descricao_servicos',     label: 'Descrição dos Serviços', type: 'textarea' },
  'agenda':                 { step: 2, field: 'agenda_pactuada',        label: 'Agenda Pactuada',       type: 'textarea' },
  'cancelamento':           { step: 2, field: 'regra_cancelamento',     label: 'Regra de Cancelamento', type: 'textarea' },
  'captação':               { step: 2, field: 'regra_captacao_pacientes', label: 'Regra de Captação',  type: 'textarea' },
  'documentos':             { step: 2, field: 'resp_documentos',        label: 'Responsabilidade — Documentos', type: 'textarea' },
  'sigilo':                 { step: 2, field: 'regra_comunicacao_pacientes', label: 'Comunicação com Pacientes', type: 'textarea' },
  // Step 3 — Remuneração
  'remuneração':            { step: 3, field: 'valor_descricao',        label: 'Descrição do Valor',    type: 'textarea' },
  'valor':                  { step: 3, field: 'valor_descricao',        label: 'Descrição do Valor',    type: 'textarea' },
  'nota fiscal':            { step: 3, field: 'emite_nota_fiscal',      label: 'Nota Fiscal',           type: 'select',
    options: [
      { value: 'obrigatorio',    label: 'Obrigatória (PJ)'   },
      { value: 'dispensado_mei', label: 'Dispensado (MEI)'   },
      { value: 'a_definir',      label: 'PF Autônomo'        },
    ]
  },
  'retenção':               { step: 3, field: 'retencoes_fiscais',      label: 'Retenções Fiscais',     type: 'textarea' },
  'pagamento':              { step: 3, field: 'data_pagamento',         label: 'Data de Pagamento',     type: 'text'     },
};

function findFieldForRisk(titulo: string, descricao: string): typeof RISCO_FIELD_MAP[string] | null {
  const texto = (titulo + ' ' + descricao).toLowerCase();
  for (const [keyword, mapping] of Object.entries(RISCO_FIELD_MAP)) {
    if (texto.includes(keyword)) return mapping;
  }
  return null;
}

const GRAVIDADE_CONFIG = {
  atencao:    { cls: 'border-blue-200 bg-blue-50',   icon: Info,          textCls: 'text-blue-800',   badge: 'bg-blue-100 text-blue-700'   },
  importante: { cls: 'border-amber-200 bg-amber-50', icon: AlertTriangle, textCls: 'text-amber-800',  badge: 'bg-amber-100 text-amber-700' },
  critico:    { cls: 'border-red-200 bg-red-50',     icon: AlertCircle,   textCls: 'text-red-800',    badge: 'bg-red-100 text-red-700'     },
};

interface Risco {
  titulo:        string;
  descricao:     string;
  gravidade:     'atencao' | 'importante' | 'critico';
  como_corrigir: string;
}

interface Props {
  riscos:     Risco[];
  formData:   ContractFormData;
  onUpdate:   (step: 1 | 2 | 3, field: string, value: string) => void;
  onGoToStep: (step: number) => void;
}

export function AIRiscoDrawer({ riscos, formData, onUpdate, onGoToStep }: Props) {
  const [openRisco, setOpenRisco] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saved, setSaved] = useState<number | null>(null);

  function getFieldValue(mapping: NonNullable<ReturnType<typeof findFieldForRisk>>) {
    const source = mapping.step === 1 ? formData.provider
                 : mapping.step === 2 ? formData.service
                 : formData.remuneration;
    return (source as any)[mapping.field] || '';
  }

  function handleOpenEdit(idx: number) {
    const risco   = riscos[idx];
    const mapping = findFieldForRisk(risco.titulo, risco.descricao);
    if (mapping) setEditingValue(getFieldValue(mapping));
    setOpenRisco(openRisco === idx ? null : idx);
  }

  function handleSave(idx: number) {
    const risco   = riscos[idx];
    const mapping = findFieldForRisk(risco.titulo, risco.descricao);
    if (mapping) {
      onUpdate(mapping.step, mapping.field, editingValue);
      setSaved(idx);
      setTimeout(() => setSaved(null), 2000);
    }
  }

  if (riscos.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        {riscos.length} ponto(s) identificado(s) pela IA — clique para corrigir diretamente:
      </p>

      {riscos.map((risco, idx) => {
        const cfg     = GRAVIDADE_CONFIG[risco.gravidade] || GRAVIDADE_CONFIG.atencao;
        const Icon    = cfg.icon;
        const mapping = findFieldForRisk(risco.titulo, risco.descricao);
        const isOpen  = openRisco === idx;

        return (
          <div key={idx} className={clsx('rounded-xl border transition-all', cfg.cls)}>
            {/* Cabeçalho do risco */}
            <div
              className="flex items-start gap-3 p-4 cursor-pointer"
              onClick={() => handleOpenEdit(idx)}
            >
              <Icon className={clsx('w-4 h-4 flex-shrink-0 mt-0.5', cfg.textCls)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('font-semibold text-sm', cfg.textCls)}>{risco.titulo}</span>
                  <span className={clsx('badge text-2xs', cfg.badge)}>
                    {risco.gravidade === 'critico' ? 'Crítico' : risco.gravidade === 'importante' ? 'Importante' : 'Atenção'}
                  </span>
                  {mapping && (
                    <span className="badge bg-emerald-100 text-emerald-700 text-2xs gap-1">
                      <Edit3 className="w-2.5 h-2.5" /> Editável aqui
                    </span>
                  )}
                </div>
                <p className={clsx('text-xs mt-1 leading-relaxed', cfg.textCls, 'opacity-80')}>
                  {risco.descricao}
                </p>
              </div>
              <ChevronRight className={clsx('w-4 h-4 flex-shrink-0 transition-transform', cfg.textCls, 'opacity-50', isOpen && 'rotate-90')} />
            </div>

            {/* Painel de edição inline */}
            {isOpen && (
              <div className="px-4 pb-4 border-t border-current border-opacity-10 pt-3 space-y-3">
                {risco.como_corrigir && (
                  <p className={clsx('text-xs font-medium', cfg.textCls)}>
                    💡 <strong>O que fazer:</strong> {risco.como_corrigir}
                  </p>
                )}

                {mapping ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                      Editar: {mapping.label}
                    </label>

                    {mapping.type === 'textarea' ? (
                      <textarea
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-y min-h-[80px]"
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                        placeholder={`Digite o ${mapping.label.toLowerCase()}...`}
                      />
                    ) : mapping.type === 'select' ? (
                      <select
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-brand-500"
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                      >
                        {mapping.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                        placeholder={`Digite o ${mapping.label.toLowerCase()}...`}
                      />
                    )}

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSave(idx)}
                        className={clsx(
                          'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          saved === idx
                            ? 'bg-emerald-500 text-white'
                            : 'bg-brand-700 hover:bg-brand-600 text-white'
                        )}
                      >
                        {saved === idx
                          ? <><Check className="w-3.5 h-3.5" /> Salvo!</>
                          : <><Check className="w-3.5 h-3.5" /> Aplicar correção</>
                        }
                      </button>
                      <button
                        onClick={() => { setOpenRisco(null); onGoToStep(mapping.step); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white/60 border border-slate-300 transition-all"
                      >
                        Ir para Etapa {mapping.step} <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Sem campo mapeado — oferecer navegação para a etapa correta */
                  <div className="flex items-center gap-2 pt-1">
                    <p className="text-xs text-slate-500 flex-1">
                      Este ponto precisa ser corrigido manualmente nas etapas anteriores.
                    </p>
                    {[1, 2, 3].map(s => (
                      <button key={s}
                        onClick={() => { setOpenRisco(null); onGoToStep(s); }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 hover:border-brand-300 hover:bg-brand-50 text-slate-600 transition-all">
                        Etapa {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
