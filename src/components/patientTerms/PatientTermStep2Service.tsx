'use client';

// ================================================================
// Step 2 — Serviço
// NÃO inclui campos clínicos.
// Convênio e Online+Menor não disponíveis na Fase 1.
// ================================================================

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import type { PatientTermFormData, PatientTermType, PatientTermModalidade } from '@/lib/patientTerms/types';
import { PATIENT_TERM_TYPE_LABELS, PATIENT_TERM_MODALIDADE_LABELS } from '@/lib/constants';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

const TIPOS_FASE_1: { value: PatientTermType; label: string; desc: string }[] = [
  { value: 'particular_adulto', label: PATIENT_TERM_TYPE_LABELS.particular_adulto, desc: 'Sessões regulares, pagamento por sessão ou pacote' },
  { value: 'particular_menor',  label: PATIENT_TERM_TYPE_LABELS.particular_menor,  desc: 'Requer responsável legal e financeiro' },
  { value: 'avaliacao_neuro',   label: PATIENT_TERM_TYPE_LABELS.avaliacao_neuro,   desc: 'Pacote fechado com entrega de documento técnico' },
  { value: 'online_adulto',     label: PATIENT_TERM_TYPE_LABELS.online_adulto,     desc: 'Atendimento por videoconferência (Resolução CFP 11/2018)' },
];

const AREAS = [
  { value: 'psicologia',       label: 'Psicologia' },
  { value: 'neuropsicologia',  label: 'Neuropsicologia' },
  { value: 'fonoaudiologia',   label: 'Fonoaudiologia' },
  { value: 'psicopedagogia',   label: 'Psicopedagogia' },
  { value: 'aba',              label: 'ABA — Análise do Comportamento Aplicada' },
  { value: 'outro',            label: 'Outro' },
];

const FREQUENCIAS = [
  'semanal', 'quinzenal', 'mensal', 'conforme agenda pactuada',
];

const DURACOES = [
  '30 minutos', '45 minutos', '50 minutos', '60 minutos', '90 minutos', 'outro',
];

const MODALIDADES: { value: PatientTermModalidade; label: string }[] = [
  { value: 'presencial', label: PATIENT_TERM_MODALIDADE_LABELS.presencial },
  { value: 'online',     label: PATIENT_TERM_MODALIDADE_LABELS.online     },
  { value: 'hibrido',    label: PATIENT_TERM_MODALIDADE_LABELS.hibrido    },
];

interface Step2Props {
  data:     PatientTermFormData;
  onChange: (partial: Partial<PatientTermFormData>) => void;
  onBack:   () => void;
  onNext:   () => void;
}

export function PatientTermStep2Service({ data, onChange, onBack, onNext }: Step2Props) {
  useScrollTop();
  const { servico } = data;

  function updateServico(field: keyof typeof servico, value: string | boolean | number | null) {
    const updated = { ...servico, [field]: value };
    // UX: se tipo = online_adulto, forçar modalidade online
    if (field === 'tipo_termo' && value === 'online_adulto') {
      updated.modalidade = 'online';
    }
    onChange({ servico: updated });
  }

  const isAvaliacao = servico.tipo_termo === 'avaliacao_neuro';
  const isOnline    = servico.modalidade === 'online' || servico.tipo_termo === 'online_adulto';

  function handleNext() {
    if (!servico.tipo_termo) {
      toast.error('Selecione o tipo de termo');
      return;
    }
    if (!servico.area_servico) {
      toast.error('Selecione a área do serviço');
      return;
    }
    onNext();
  }

  return (
    <div className="space-y-6">
      <div className="cc-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Briefcase className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <h2 className="font-semibold text-sm text-brand-900">Serviço</h2>
        </div>

        {/* Tipo de termo */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Tipo de termo <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TIPOS_FASE_1.map(t => (
              <button
                key={t.value} type="button"
                onClick={() => updateServico('tipo_termo', t.value)}
                className={clsx(
                  'text-left px-3 py-3 rounded-xl border text-sm transition-all',
                  servico.tipo_termo === t.value
                    ? 'border-brand-600 bg-brand-50 text-brand-800'
                    : 'border-slate-200 hover:border-brand-300 text-slate-700'
                )}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-2xs text-slate-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Área do serviço */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Área do serviço <span className="text-red-400">*</span>
            </label>
            <select
              value={servico.area_servico}
              onChange={e => updateServico('area_servico', e.target.value)}
              className="cc-input w-full">
              <option value="">Selecione...</option>
              {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Profissional responsável</label>
            <input type="text"
              value={servico.profissional_responsavel}
              onChange={e => updateServico('profissional_responsavel', e.target.value)}
              placeholder="Nome do profissional (opcional)"
              className="cc-input w-full" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Modalidade</label>
            <select
              value={servico.modalidade}
              onChange={e => updateServico('modalidade', e.target.value as PatientTermModalidade)}
              className="cc-input w-full">
              {MODALIDADES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Local de atendimento</label>
            <input type="text"
              value={servico.local_atendimento}
              onChange={e => updateServico('local_atendimento', e.target.value)}
              placeholder="Endereço ou nome da clínica"
              className="cc-input w-full" />
          </div>

          {/* Plataforma online — exibe apenas se online */}
          {isOnline && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Plataforma online</label>
              <input type="text"
                value={servico.plataforma_online}
                onChange={e => updateServico('plataforma_online', e.target.value)}
                placeholder="Ex: Google Meet, Zoom, Microsoft Teams..."
                className="cc-input w-full" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Frequência</label>
            <select value={servico.frequencia}
              onChange={e => updateServico('frequencia', e.target.value)}
              className="cc-input w-full">
              {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Duração da sessão</label>
            <select value={servico.duracao_sessao}
              onChange={e => updateServico('duracao_sessao', e.target.value)}
              className="cc-input w-full">
              {DURACOES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Quantidade de sessões — exibe para avaliação neuropsicológica */}
          {isAvaliacao && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nº de sessões (pacote)</label>
              <input type="number" min={1}
                value={servico.quantidade_sessoes ?? ''}
                onChange={e => updateServico('quantidade_sessoes', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Ex: 6"
                className="cc-input w-full" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data de início prevista</label>
            <input type="date"
              value={servico.data_inicio_atendimento}
              onChange={e => updateServico('data_inicio_atendimento', e.target.value)}
              className="cc-input w-full" />
          </div>
        </div>

        {/* Vigência */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Vigência</p>
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input type="checkbox"
              checked={servico.vigencia_indeterminada}
              onChange={e => updateServico('vigencia_indeterminada', e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded" />
            <div>
              <span className="text-sm font-medium text-slate-700">Vigência indeterminada</span>
              <p className="text-2xs text-slate-400 mt-0.5">O atendimento continua até encerramento por qualquer das partes</p>
            </div>
          </label>

          {!servico.vigencia_indeterminada && (
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-slate-600 mb-1">Data de término prevista</label>
              <input type="date"
                value={servico.data_fim_atendimento}
                onChange={e => updateServico('data_fim_atendimento', e.target.value)}
                className="cc-input w-full" />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="btn-secondary flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button type="button" onClick={handleNext}
          className="btn-primary flex items-center gap-2">
          Avançar para Financeiro <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
