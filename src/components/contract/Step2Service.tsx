'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Zap, Plus, X, Loader2 } from 'lucide-react';
import type { ServiceDetails, Company, ProfessionType } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Scroll para o topo ao montar
function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

const RECURSOS_FIXOS = [
  'Sala de atendimento', 'Recepção', 'WhatsApp institucional', 'Sistema de agenda',
  'Prontuário digital', 'Sistema interno', 'Materiais clínicos', 'Testes psicológicos',
  'Internet', 'Telefone', 'Impressora',
];

const MODALIDADES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online',     label: 'Online'     },
  { value: 'hibrido',    label: 'Híbrido'    },
];

// Periodicidades com placeholder inteligente para o campo de detalhamento
const PERIODICIDADES = [
  {
    value: 'semanal',
    label: 'Semanal',
    placeholder: 'Ex: Segundas e Quartas-feiras, das 08h às 12h — totalizando aproximadamente 8 atendimentos por mês, conforme disponibilidade pactuada.',
  },
  {
    value: 'quinzenal',
    label: 'Quinzenal',
    placeholder: 'Ex: A cada 15 dias, preferencialmente nas primeiras e terceiras semanas do mês, em dias e horários a combinar com antecedência mínima de 7 dias.',
  },
  {
    value: 'mensal',
    label: 'Mensal',
    placeholder: 'Ex: 1 (um) dia por mês, a ser definido entre as partes até o último dia útil do mês anterior, com carga de até 8 horas de atendimento.',
  },
  {
    value: 'sob demanda',
    label: 'Sob demanda',
    placeholder: 'Ex: Os atendimentos serão realizados conforme demanda da CONTRATANTE, sem frequência mínima garantida, mediante solicitação com antecedência de 48 horas.',
  },
  {
    value: 'conforme agenda pactuada',
    label: 'Conforme agenda pactuada',
    placeholder: 'Ex: A agenda será definida mensalmente entre as partes, registrada por escrito (e-mail ou sistema interno), podendo ser ajustada com aviso prévio de 24 horas.',
  },
  {
    value: 'plantao',
    label: 'Por plantão',
    placeholder: 'Ex: Plantões de 12 horas, realizados aos sábados das 07h às 19h, com frequência de 2 plantões por mês, conforme escala acordada mensalmente.',
  },
];

// Regras operacionais com placeholders práticos para leigos
const REGRAS_CAMPOS = [
  {
    field: 'regra_cancelamento',
    label: 'Cancelamento de Atendimento',
    placeholder: 'Ex: O cancelamento deve ser avisado com pelo menos 24 horas de antecedência por WhatsApp ou e-mail. Cancelamentos sem aviso prévio poderão ser cobrados integralmente da clínica ou do paciente, conforme acordo.',
  },
  {
    field: 'regra_falta',
    label: 'Falta do Prestador',
    placeholder: 'Ex: Em caso de falta não comunicada, o prestador deverá repor o atendimento em até 7 dias úteis, em horário a combinar, sem custo adicional para a clínica.',
  },
  {
    field: 'regra_atraso',
    label: 'Atraso',
    placeholder: 'Ex: Atrasos de até 15 minutos serão tolerados. Acima disso, o tempo será descontado do atendimento ou o paciente poderá ser remarcado, a critério do prestador.',
  },
  {
    field: 'regra_remarcacao',
    label: 'Remarcação',
    placeholder: 'Ex: Remarcações devem ser feitas com pelo menos 48 horas de antecedência. Cada paciente tem direito a 1 remarcação por mês sem custo. A partir da 2ª, aplica-se taxa de R$ 50,00.',
  },
  {
    field: 'resp_materiais',
    label: 'Responsabilidade por Materiais',
    placeholder: 'Ex: A clínica fornece sala equipada e papel. O prestador é responsável por seus próprios testes, apostilas, formulários e equipamentos específicos da sua área.',
  },
  {
    field: 'resp_documentos',
    label: 'Documentos Clínicos e Prontuários',
    placeholder: 'Ex: Os prontuários ficam arquivados na clínica (físico ou digital). O prestador tem acesso durante a vigência do contrato e deve devolvê-los em caso de encerramento. É vedado levar cópias sem autorização.',
  },
  {
    field: 'regra_comunicacao_pacientes',
    label: 'Comunicação com Pacientes',
    placeholder: 'Ex: O contato com pacientes deve ser feito preferencialmente pelo sistema da clínica ou WhatsApp institucional. O prestador não deve usar canal pessoal para agendar ou cobrar pacientes da clínica.',
  },
  {
    field: 'regra_captacao_pacientes',
    label: 'Captação de Pacientes',
    placeholder: 'Ex: É vedado ao prestador captar pacientes atendidos na clínica para atendimento particular ou em outro local, durante a vigência do contrato e pelos 12 meses seguintes ao encerramento.',
  },
];

interface Step2Props {
  data: ServiceDetails;
  company: Company;
  profissao: ProfessionType;
  onChange: (d: Partial<ServiceDetails>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step2Service({ data, company, profissao, onChange, onBack, onNext }: Step2Props) {
  useScrollTop();
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [customRecurso, setCustomRecurso] = useState('');
  const [loadingIA, setLoadingIA]         = useState(false);
  const [loadingIADesc, setLoadingIADesc] = useState(false);
  const [showAIModal, setShowAIModal]     = useState(false);

  // Periodicidade selecionada — para mostrar o campo de detalhamento
  const periodicidadeInfo = PERIODICIDADES.find(p => p.value === data.periodicidade);

  function toggleRecurso(r: string) {
    const list = data.recursos_disponibilizados || [];
    onChange({ recursos_disponibilizados: list.includes(r) ? list.filter(x => x !== r) : [...list, r] });
  }

  function addCustomRecurso() {
    if (!customRecurso.trim()) return;
    const list = data.recursos_personalizados || [];
    if (!list.includes(customRecurso.trim())) onChange({ recursos_personalizados: [...list, customRecurso.trim()] });
    setCustomRecurso('');
  }

  async function sugerirObjetoIA() {
    setLoadingIA(true);
    setShowAIModal(true);
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'sugestao_objeto', profissao, especialidade: '' }),
      });
      if (res.ok) {
        const r = await res.json();
        if (r.objeto) { onChange({ objeto: r.objeto }); toast.success('Sugestão da IA aplicada!'); }
        else { toast.error('IA não retornou sugestão. Preencha manualmente.'); }
      } else { toast.error('Erro na IA. Preencha manualmente.'); }
    } catch { toast.error('IA indisponível. Preencha manualmente.'); }
    finally { setLoadingIA(false); setShowAIModal(false); }
  }

  async function sugerirDescricaoIA() {
    setLoadingIADesc(true);
    setShowAIModal(true);
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'sugestao_objeto', profissao, especialidade: 'descricao_detalhada' }),
      });
      if (res.ok) {
        const r = await res.json();
        if (r.objeto) { onChange({ descricao_servicos: r.objeto }); toast.success('Sugestão aplicada!'); }
      } else { toast.error('Erro na IA.'); }
    } catch { toast.error('IA indisponível.'); }
    finally { setLoadingIADesc(false); setShowAIModal(false); }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!data.objeto?.trim()) e.objeto = 'Objeto do contrato obrigatório.';
    setErrors(e);
    if (Object.keys(e).length > 0) { toast.error('Preencha os campos obrigatórios.'); return false; }
    return true;
  }

  return (
    <div className="space-y-6 animate-in">

      {/* Modal de loading da IA */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-card-lg p-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 border-2 border-brand-200 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-brand-900">IA processando...</p>
              <p className="text-slate-500 text-sm mt-1">A mesa técnica está gerando a sugestão.<br/>Aguarde alguns segundos.</p>
            </div>
          </div>
        </div>
      )}

      {/* Objeto e descrição */}
      <div className="cc-card p-6">
        <div className="section-title">Objeto do Contrato</div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="cc-label">Objeto <span className="text-red-500">*</span></label>
              <button type="button" onClick={sugerirObjetoIA} disabled={loadingIA} className="btn-ghost text-xs py-1 px-2">
                {loadingIA
                  ? <span className="w-3 h-3 border border-brand-400 border-t-brand-700 rounded-full animate-spin" />
                  : <Zap className="w-3 h-3" />}
                Sugerir com IA
              </button>
            </div>
            <textarea
              className={clsx('cc-textarea', errors.objeto && 'error')}
              value={data.objeto}
              onChange={e => onChange({ objeto: e.target.value })}
              rows={4}
              placeholder="Clique em 'Sugerir com IA' para preenchimento automático, ou descreva aqui: Ex: Prestação de serviços de psicologia clínica, incluindo atendimentos individuais, avaliações psicológicas e orientação a pais, na modalidade presencial."
            />
            {errors.objeto && <p className="text-red-500 text-xs mt-1">{errors.objeto}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="cc-label">Descrição Detalhada dos Serviços</label>
              <button type="button" onClick={sugerirDescricaoIA} disabled={loadingIADesc} className="btn-ghost text-xs py-1 px-2">
                {loadingIADesc ? <span className="w-3 h-3 border border-brand-400 border-t-brand-700 rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
                Sugerir com IA
              </button>
            </div>
            <textarea
              className="cc-textarea"
              value={data.descricao_servicos || ''}
              onChange={e => onChange({ descricao_servicos: e.target.value })}
              rows={3}
              placeholder="Ex: Atendimentos de psicoterapia individual para adultos e adolescentes (sessões de 50 min), aplicação de testes psicológicos (ex: Wisc, Bender), devolutivas para pais e responsáveis, e orientação parental quando necessário."
            />
          </div>
        </div>
      </div>

      {/* Modalidade, Local e Periodicidade */}
      <div className="cc-card p-6">
        <div className="section-title">Modalidade e Agenda</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="cc-label">Local de Prestação</label>
            <input
              className="cc-input"
              value={data.local_prestacao}
              onChange={e => onChange({ local_prestacao: e.target.value })}
              placeholder={`${company.logradouro || 'Rua'}, ${company.numero || '0'} — ${company.cidade || 'Cidade'}/${company.uf || 'UF'}`}
            />
          </div>

          <div>
            <label className="cc-label">Modalidade</label>
            <div className="flex gap-2 mt-1">
              {MODALIDADES.map(m => (
                <button key={m.value} type="button" onClick={() => onChange({ modalidade: m.value as any })}
                  className={clsx('flex-1 py-2 rounded-lg border text-xs font-medium transition-all',
                    data.modalidade === m.value
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-slate-200 text-slate-500 hover:border-brand-200')}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Periodicidade */}
          <div className="md:col-span-2">
            <label className="cc-label">Periodicidade</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PERIODICIDADES.map(p => (
                <button key={p.value} type="button"
                  onClick={() => onChange({ periodicidade: p.value })}
                  className={clsx('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    data.periodicidade === p.value
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-slate-200 text-slate-500 hover:border-brand-200')}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Campo de detalhamento — aparece após selecionar periodicidade */}
            {periodicidadeInfo && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="cc-label mb-0">Detalhamento da {periodicidadeInfo.label}</label>
                  {!data.agenda_pactuada && (
                    <button
                      type="button"
                      onClick={() => onChange({ agenda_pactuada: periodicidadeInfo.placeholder.replace(/^Ex: /, '') })}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-700 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      ✦ Usar sugestão
                    </button>
                  )}
                </div>
                <textarea
                  className="cc-textarea"
                  rows={3}
                  value={data.agenda_pactuada || ''}
                  onChange={e => onChange({ agenda_pactuada: e.target.value })}
                  placeholder={periodicidadeInfo.placeholder}
                />
                <p className="text-2xs text-amber-600 mt-1">
                  ⚠️ Descreva como "agenda pactuada entre as partes" — evite termos como "horário fixo obrigatório" para não caracterizar jornada CLT.
                </p>
              </div>
            )}
          </div>

          {/* Exclusividade */}
          <div className="md:col-span-2">
            <label className="cc-label">Exclusividade</label>
            <div className="flex gap-3 mt-1">
              {[
                { v: false, label: 'Sem exclusividade', desc: 'Prestador livre para atender outras clínicas (recomendado para reduzir risco trabalhista)' },
                { v: true,  label: 'Com exclusividade',  desc: 'Exige cláusula específica e compensação financeira adicional' },
              ].map(opt => (
                <button key={String(opt.v)} type="button" onClick={() => onChange({ exclusividade: opt.v })}
                  className={clsx('flex-1 p-3 rounded-xl border-2 text-left text-xs transition-all',
                    data.exclusividade === opt.v ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200')}>
                  <div className="font-semibold text-sm text-brand-900">{opt.label}</div>
                  <div className="text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recursos */}
      <div className="cc-card p-6">
        <div className="section-title">Recursos Disponibilizados pela Clínica</div>
        <p className="text-slate-500 text-xs mb-3">Marque o que a clínica oferece ao prestador para a realização do trabalho.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {RECURSOS_FIXOS.map(r => {
            const selected = data.recursos_disponibilizados?.includes(r);
            return (
              <button key={r} type="button" onClick={() => toggleRecurso(r)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  selected ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-200')}>
                {selected ? '✓ ' : ''}{r}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input className="cc-input flex-1" value={customRecurso}
            onChange={e => setCustomRecurso(e.target.value)}
            placeholder="Adicionar outro recurso (ex: Cofre para materiais, Câmera de avaliação...)"
            onKeyDown={e => e.key === 'Enter' && addCustomRecurso()} />
          <button type="button" onClick={addCustomRecurso} className="btn-secondary px-4 flex-shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {(data.recursos_personalizados || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {data.recursos_personalizados!.map(r => (
              <span key={r} className="badge badge-blue flex items-center gap-1">
                {r}
                <button onClick={() => onChange({ recursos_personalizados: data.recursos_personalizados!.filter(x => x !== r) })}
                  className="ml-0.5 opacity-60 hover:opacity-100"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Regras operacionais */}
      <div className="cc-card p-6">
        <div className="section-title">Regras Operacionais</div>
        <p className="text-slate-500 text-xs mb-4">
          Preencha apenas o que faz sentido para este profissional. Deixe em branco o que não se aplica — o contrato usará cláusulas padrão.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REGRAS_CAMPOS.map(item => (
            <div key={item.field}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="cc-label mb-0">{item.label}</label>
                {!(data as any)[item.field] && (
                  <button
                    type="button"
                    onClick={() => onChange({ [item.field]: item.placeholder.replace(/^Ex: /, '') })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-500 hover:bg-gold-600 text-white text-2xs font-semibold rounded-lg transition-all flex-shrink-0 ml-2"
                  >
                    ✦ Usar sugestão
                  </button>
                )}
              </div>
              <textarea
                className="cc-textarea text-xs"
                rows={3}
                value={(data as any)[item.field] || ''}
                onChange={e => onChange({ [item.field]: e.target.value })}
                placeholder={item.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button type="button" onClick={() => validate() && onNext()} className="btn-primary">
          Próxima etapa <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
