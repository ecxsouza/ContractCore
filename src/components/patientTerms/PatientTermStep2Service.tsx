'use client';

// ================================================================
// Step 2 — Serviço
// Botões selecionáveis para modalidade, frequência e duração.
// Padrão visual do Step2Service do módulo de contratos.
// NÃO inclui campos clínicos.
// ================================================================

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import type { PatientTermFormData, PatientTermType, PatientTermModalidade } from '@/lib/patientTerms/types';
import { PATIENT_TERM_TYPE_LABELS, PATIENT_TERM_MODALIDADE_LABELS } from '@/lib/constants';
import type { Company } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

// Data mínima = hoje (sem datas passadas para início)
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Valida que o ano tem exatamente 4 dígitos
function isValidISODateYear(value: string): boolean {
  if (!value) return true;
  const [year] = value.split('-');
  return /^\d{4}$/.test(year);
}

const TIPOS_FASE_1: { value: PatientTermType; label: string; desc: string }[] = [
  { value: 'particular_adulto', label: PATIENT_TERM_TYPE_LABELS.particular_adulto, desc: 'Sessões regulares, pagamento por sessão ou pacote' },
  { value: 'particular_menor',  label: PATIENT_TERM_TYPE_LABELS.particular_menor,  desc: 'Requer responsável legal e financeiro' },
  { value: 'avaliacao_neuro',   label: PATIENT_TERM_TYPE_LABELS.avaliacao_neuro,   desc: 'Pacote fechado com entrega de documento técnico' },
  { value: 'online_adulto',     label: PATIENT_TERM_TYPE_LABELS.online_adulto,     desc: 'Videoconferência (Resolução CFP 11/2018)' },
];

const MODALIDADES: { value: PatientTermModalidade; label: string }[] = [
  { value: 'presencial', label: PATIENT_TERM_MODALIDADE_LABELS.presencial },
  { value: 'online',     label: PATIENT_TERM_MODALIDADE_LABELS.online     },
  { value: 'hibrido',    label: PATIENT_TERM_MODALIDADE_LABELS.hibrido    },
];

const AREAS = [
  { value: 'psicologia',      label: 'Psicologia' },
  { value: 'neuropsicologia', label: 'Neuropsicologia' },
  { value: 'fonoaudiologia',  label: 'Fonoaudiologia' },
  { value: 'psicopedagogia',  label: 'Psicopedagogia' },
  { value: 'aba',             label: 'ABA' },
  { value: 'outro',           label: 'Outro' },
];

// Mesmo padrão do Step2Service do contrato — com placeholder e sugestão por frequência
const FREQUENCIAS = [
  { value: 'semanal',
    label: 'Semanal',
    placeholder: 'Ex.: sessões semanais, preferencialmente às terças-feiras, às 15h, conforme disponibilidade da agenda.',
    sugestao:    'Atendimentos semanais, em dia e horário previamente combinados entre paciente, responsável e clínica, conforme disponibilidade de agenda.',
  },
  { value: 'quinzenal',
    label: 'Quinzenal',
    placeholder: 'Ex.: sessões quinzenais, em dias e horários previamente combinados entre paciente, responsável e clínica.',
    sugestao:    'Atendimentos quinzenais, em dia e horário previamente combinados entre paciente, responsável e clínica, conforme disponibilidade de agenda.',
  },
  { value: 'mensal',
    label: 'Mensal',
    placeholder: 'Ex.: sessões mensais, com agendamento prévio conforme disponibilidade da clínica e do profissional.',
    sugestao:    'Atendimentos mensais, em dia e horário previamente combinados entre paciente, responsável e clínica, conforme disponibilidade de agenda.',
  },
  { value: 'conforme agenda pactuada',
    label: 'Conforme agenda pactuada',
    placeholder: 'Ex.: frequência definida conforme plano de atendimento, disponibilidade de agenda e necessidade administrativa do serviço contratado.',
    sugestao:    'Atendimentos realizados conforme agenda pactuada entre paciente, responsável e clínica, observada a disponibilidade do profissional e a organização administrativa do serviço.',
  },
];

const DURACOES = [
  { value: '30 minutos', label: '30 min' },
  { value: '40 minutos', label: '40 min' },
  { value: '50 minutos', label: '50 min' },
  { value: '60 minutos', label: '60 min' },
  { value: 'outro',      label: 'Outros' },
];

interface Step2Props {
  data:     PatientTermFormData;
  company:  Company;
  onChange: (partial: Partial<PatientTermFormData>) => void;
  onBack:   () => void;
  onNext:   () => void;
}

export function PatientTermStep2Service({ data, company, onChange, onBack, onNext }: Step2Props) {
  useScrollTop();
  const { servico } = data;

  // Endereço da empresa — mesmo formato do Step2Service do contrato
  const localEmpresa = [
    company.logradouro, company.numero,
    company.bairro, company.cep,
    company.cidade, company.uf,
  ].filter(Boolean).join(', ') ||
  `${company.cidade || 'Cidade'} — ${company.uf || 'UF'}`;

  // Preencher local_atendimento com dados da empresa se ainda estiver vazio
  useEffect(() => {
    if (!servico.local_atendimento && localEmpresa) {
      onChange({ servico: { ...servico, local_atendimento: localEmpresa } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estado da área personalizada (quando área = 'outro')
  const [areaOutroTexto, setAreaOutroTexto] = useState(
    servico.area_servico?.startsWith('outro — ')
      ? servico.area_servico.replace('outro — ', '')
      : ''
  );
  const areaEhOutro = servico.area_servico === 'outro' ||
    servico.area_servico?.startsWith('outro — ');

  // Estado local para duração personalizada
  const [duracaoPersonalizada, setDuracaoPersonalizada] = useState(
    !DURACOES.slice(0,-1).some(d => d.value === servico.duracao_sessao)
      ? servico.duracao_sessao
      : ''
  );
  // Reconhecer detalhamento de qualquer frequência salva como "valor — detalhe"
  const [agendaDetalhe, setAgendaDetalhe] = useState(() => {
    const freq = servico.frequencia || '';
    const idx  = freq.indexOf(' — ');
    return idx >= 0 ? freq.slice(idx + 3) : '';
  });

  // Frequência selecionada (valor puro, sem o detalhe)
  const freqValor = servico.frequencia?.split(' — ')[0] || '';

  function updateServico(field: keyof typeof servico, value: string | boolean | number | null) {
    const updated = { ...servico, [field]: value };
    // UX: tipo online_adulto → forçar modalidade online
    if (field === 'tipo_termo' && value === 'online_adulto') {
      updated.modalidade = 'online';
      updated.plataforma_online = servico.plataforma_online;
    }
    // Trocar tipo para não-online → limpar plataforma se modalidade não for online
    if (field === 'tipo_termo' && value !== 'online_adulto' && updated.modalidade !== 'online') {
      updated.plataforma_online = '';
    }
    onChange({ servico: updated });
  }

  const isAvaliacao    = servico.tipo_termo === 'avaliacao_neuro';
  const isOnline       = servico.modalidade === 'online' || servico.tipo_termo === 'online_adulto';
  const duracaoEhOutro = !DURACOES.slice(0,-1).some(d => d.value === servico.duracao_sessao);
  // Todas as 4 frequências abrem o campo de detalhamento
  const freqEhAgenda   = FREQUENCIAS.some(f => f.value === freqValor);

  function handleDuracaoSelect(val: string) {
    if (val === 'outro') {
      updateServico('duracao_sessao', duracaoPersonalizada || '');
    } else {
      updateServico('duracao_sessao', val);
      setDuracaoPersonalizada('');
    }
  }

  function handleFreqSelect(val: string) {
    // Limpar detalhe ao trocar de frequência
    setAgendaDetalhe('');
    updateServico('frequencia', val);
  }

  function handleNext() {
    if (!servico.tipo_termo) { toast.error('Selecione o tipo de termo'); return; }
    if (!servico.area_servico) { toast.error('Selecione a área do serviço'); return; }
    if (!servico.data_inicio_atendimento) { toast.error('Informe a data de início prevista'); return; }
    if (!servico.vigencia_indeterminada && servico.data_fim_atendimento &&
        servico.data_fim_atendimento <= servico.data_inicio_atendimento) {
      toast.error('Data de término deve ser posterior à data de início'); return;
    }
    onNext();
  }

  return (
    <div className="space-y-6">
      {/* Tipo de termo */}
      <div className="cc-card p-6">
        <div className="section-title">Tipo de Termo</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TIPOS_FASE_1.map(t => (
            <button key={t.value} type="button"
              onClick={() => updateServico('tipo_termo', t.value)}
              className={clsx(
                'text-left px-4 py-3 rounded-xl border-2 text-sm transition-all',
                servico.tipo_termo === t.value
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-slate-200 hover:border-brand-300 text-slate-700'
              )}>
              <div className="font-semibold">{t.label}</div>
              <div className="text-2xs text-slate-400 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Serviço */}
      <div className="cc-card p-6">
        <div className="section-title">Serviço e Profissional</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="cc-label">Área do serviço <span className="text-red-500">*</span></label>
            <select
              value={areaEhOutro ? 'outro' : servico.area_servico}
              onChange={e => {
                const val = e.target.value;
                if (val === 'outro') {
                  updateServico('area_servico', areaOutroTexto ? `outro — ${areaOutroTexto}` : 'outro');
                } else {
                  setAreaOutroTexto('');
                  updateServico('area_servico', val);
                }
              }}
              className="cc-input w-full">
              <option value="">Selecione...</option>
              {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            {areaEhOutro && (
              <input type="text" className="cc-input w-full mt-2"
                value={areaOutroTexto}
                onChange={e => {
                  setAreaOutroTexto(e.target.value);
                  updateServico('area_servico', e.target.value.trim()
                    ? `outro — ${e.target.value.trim()}`
                    : 'outro');
                }}
                placeholder="Descreva a área do serviço..." />
            )}
          </div>

          <div>
            <label className="cc-label">Profissional responsável</label>
            <input type="text" value={servico.profissional_responsavel}
              onChange={e => updateServico('profissional_responsavel', e.target.value)}
              placeholder="Nome do profissional (opcional)"
              className="cc-input w-full" />
          </div>

          {/* Modalidade — botões */}
          <div className="md:col-span-2">
            <label className="cc-label">Modalidade</label>
            <div className="flex gap-2 mt-1">
              {MODALIDADES.map(m => (
                <button key={m.value} type="button"
                  onClick={() => updateServico('modalidade', m.value as PatientTermModalidade)}
                  className={clsx('flex-1 py-2 rounded-lg border text-xs font-medium transition-all',
                    servico.modalidade === m.value
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-slate-200 text-slate-500 hover:border-brand-200')}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="cc-label">Local de atendimento</label>
            <input type="text" value={servico.local_atendimento}
              onChange={e => updateServico('local_atendimento', e.target.value)}
              placeholder={`Ex: ${localEmpresa}`}
              className="cc-input w-full" />
          </div>

          {/* Plataforma — só quando online_adulto */}
          {servico.tipo_termo === 'online_adulto' && (
            <div className="md:col-span-2">
              <label className="cc-label">Plataforma online</label>
              <input type="text" value={servico.plataforma_online}
                onChange={e => updateServico('plataforma_online', e.target.value)}
                placeholder="Ex: Google Meet, Zoom, Microsoft Teams..."
                className="cc-input w-full" />
            </div>
          )}
        </div>
      </div>

      {/* Agenda */}
      <div className="cc-card p-6">
        <div className="section-title">Agenda e Vigência</div>

        {/* Frequência — botões */}
        <div className="mb-4">
          <label className="cc-label">Frequência</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {FREQUENCIAS.map(f => {
              const isSelected = freqValor === f.value;
              return (
                <button key={f.value} type="button"
                  onClick={() => handleFreqSelect(f.value)}
                  className={clsx('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-slate-200 text-slate-500 hover:border-brand-200')}>
                  {f.label}
                </button>
              );
            })}
          </div>
          {freqEhAgenda && (() => {
            const freqInfo = FREQUENCIAS.find(f => f.value === freqValor);
            return freqInfo ? (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="cc-label mb-0">Detalhamento da agenda</label>
                  {!agendaDetalhe && (
                    <button type="button"
                      onClick={() => {
                        const s = freqInfo.sugestao;
                        setAgendaDetalhe(s);
                        updateServico('frequencia', `${freqValor} — ${s}`);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-brand-700 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-all">
                      ✦ Usar sugestão
                    </button>
                  )}
                </div>
                <textarea className="cc-textarea mt-1" rows={3}
                  value={agendaDetalhe}
                  onChange={e => {
                    const v = e.target.value;
                    setAgendaDetalhe(v);
                    updateServico('frequencia', v.trim()
                      ? `${freqValor} — ${v.trim()}`
                      : freqValor);
                  }}
                  placeholder={freqInfo.placeholder} />
              </div>
            ) : null;
          })()}
        </div>

        {/* Duração — botões */}
        <div className="mb-4">
          <label className="cc-label">Duração da sessão</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {DURACOES.map(d => {
              const isSelected = d.value === 'outro' ? duracaoEhOutro : servico.duracao_sessao === d.value;
              return (
                <button key={d.value} type="button"
                  onClick={() => handleDuracaoSelect(d.value)}
                  className={clsx('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-slate-200 text-slate-500 hover:border-brand-200')}>
                  {d.label}
                </button>
              );
            })}
          </div>
          {duracaoEhOutro && (
            <input className="cc-input mt-2 max-w-xs" type="text"
              value={duracaoPersonalizada}
              onChange={e => {
                setDuracaoPersonalizada(e.target.value);
                updateServico('duracao_sessao', e.target.value);
              }}
              placeholder="Ex: 80 minutos" />
          )}
        </div>

        {/* Avaliação: número de sessões */}
        {isAvaliacao && (
          <div className="mb-4 max-w-xs">
            <label className="cc-label">Nº de sessões (pacote)</label>
            <input type="number" min={1}
              value={servico.quantidade_sessoes ?? ''}
              onChange={e => updateServico('quantidade_sessoes', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Ex: 6"
              className="cc-input w-full" />
          </div>
        )}

        {/* Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="cc-label">Data de início prevista <span className="text-red-500">*</span></label>
            <input type="date"
              value={servico.data_inicio_atendimento}
              min={todayISO()}
              onChange={e => {
                const v = e.target.value;
                if (!isValidISODateYear(v)) return;
                // Bloquear ano anterior ao ano atual (além de data anterior a hoje)
                if (v) {
                  const year = Number(v.split('-')[0]);
                  if (year < new Date().getFullYear()) return;
                  if (v < todayISO()) return;
                }
                updateServico('data_inicio_atendimento', v);
              }}
              className="cc-input w-full" />
          </div>

          {/* Vigência */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox"
                checked={servico.vigencia_indeterminada}
                onChange={e => updateServico('vigencia_indeterminada', e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded" />
              <div>
                <span className="text-sm font-medium text-slate-700">Vigência indeterminada</span>
                <p className="text-2xs text-slate-400 mt-0.5">O atendimento continua até encerramento por qualquer das partes</p>
              </div>
            </label>
          </div>

          {!servico.vigencia_indeterminada && (
            <div>
              <label className="cc-label">Data de término prevista</label>
              <input type="date"
                value={servico.data_fim_atendimento}
                min={servico.data_inicio_atendimento || todayISO()}
                onChange={e => {
                  const v = e.target.value;
                  if (!isValidISODateYear(v)) return;
                  if (v && servico.data_inicio_atendimento && v <= servico.data_inicio_atendimento) return;
                  updateServico('data_fim_atendimento', v);
                }}
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
