'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileCode2, Plus, Zap, Users, Star, ArrowRight, Trash2, AlertTriangle, X,
  Brain, Mic, BookOpen, CalendarDays, Briefcase, UserCog, FileText } from 'lucide-react';
import type { Company, ContractTemplate } from '@/types';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PROFISSAO_LABELS: Record<string, string> = {
  psicologo:      'Psicólogo(a)',
  neuropsicologo: 'Neuropsicólogo(a)',
  fonoaudiologo:  'Fonoaudiólogo(a)',
  psicopedagogo:  'Psicopedagogo(a)',
  secretaria:     'Secretária',
  recepcionista:  'Recepcionista',
  coordenador:    'Coordenador(a)',
  outro:          'Outro',
};

const PROFISSAO_CORES: Record<string, string> = {
  psicologo:      'bg-blue-100 text-blue-700',
  neuropsicologo: 'bg-purple-100 text-purple-700',
  fonoaudiologo:  'bg-emerald-100 text-emerald-700',
  psicopedagogo:  'bg-amber-100 text-amber-700',
  secretaria:     'bg-slate-100 text-slate-700',
  recepcionista:  'bg-slate-100 text-slate-700',
  coordenador:    'bg-brand-100 text-brand-700',
  outro:          'bg-slate-100 text-slate-600',
};

// Ícone real para cada profissão — nunca exibe "?" no card.
// Fallback: FileText para qualquer profissão não mapeada.
const PROFISSAO_ICONES: Record<string, React.ElementType> = {
  psicologo:      Users,        // atendimento / relação interpessoal
  neuropsicologo: Brain,        // neuropsicologia / avaliação cognitiva
  fonoaudiologo:  Mic,          // fala / comunicação / voz
  psicopedagogo:  BookOpen,     // aprendizagem / educação
  secretaria:     CalendarDays, // agenda / organização administrativa
  recepcionista:  CalendarDays, // agenda / atendimento ao público
  coordenador:    Briefcase,    // gestão / coordenação
  outro:          UserCog,      // profissional genérico configurável
};

interface Props {
  company:   Company;
  templates: ContractTemplate[];
}

export function TemplatesClient({ company, templates }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [selected, setSelected]       = useState<string | null>(null);
  const [showDetail, setShowDetail]   = useState<ContractTemplate | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContractTemplate | null>(null);
  const [confirmUse, setConfirmUse]       = useState<ContractTemplate | null>(null);

  const sistemaTpls  = templates.filter(t => t.is_sistema);
  const empresaTpls  = templates.filter(t => !t.is_sistema);

  async function executeUseTemplate(template: ContractTemplate) {
    // Incrementar contador de uso
    await supabase
      .from('contract_templates')
      .update({ uso_count: (template.uso_count || 0) + 1 })
      .eq('id', template.id);

    // Redirecionar para novo contrato com template pré-selecionado
    router.push(`/contracts/new?template_id=${template.id}`);
    toast.success(`Template "${template.nome}" carregado!`);
  }

  function handleUseTemplate(template: ContractTemplate) {
    setConfirmUse(template);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const { error } = await supabase
      .from('contract_templates')
      .delete()
      .eq('id', id)
      .eq('company_id', company.id);
    if (error) { toast.error('Erro ao excluir.'); }
    else { toast.success('Template excluído.'); router.refresh(); }
    setDeleting(null);
    setConfirmDelete(null);
  }

  const TemplateCard = ({ template }: { template: ContractTemplate }) => (
    <div
      onClick={() => setShowDetail(template)}
      className={clsx(
        'cc-card p-5 cursor-pointer hover:shadow-card-md transition-all group',
        selected === template.id && 'ring-2 ring-brand-500'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            PROFISSAO_CORES[template.profissao] || 'bg-slate-100 text-slate-600')}>
            {(() => {
              const Icon = PROFISSAO_ICONES[template.profissao] ?? FileText;
              return <Icon className="w-4 h-4" />;
            })()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-brand-900 text-sm truncate">{template.nome}</p>
            <p className="text-xs text-slate-500">
              {PROFISSAO_LABELS[template.profissao] || template.profissao}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {template.is_sistema && (
            <span className="badge badge-gold gap-1 text-2xs">
              <Star className="w-2.5 h-2.5" /> Sistema
            </span>
          )}
          {template.uso_count > 0 && (
            <span className="text-2xs text-slate-400">{template.uso_count}x usado</span>
          )}
        </div>
      </div>

      {template.descricao && (
        <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
          {template.descricao}
        </p>
      )}

      <div className="flex items-center gap-2">
        <span className="text-2xs text-slate-400">
          {template.anexos_padrao?.length || 0} anexo(s) incluído(s)
        </span>
        <span className="text-slate-200">·</span>
        <span className="text-2xs text-slate-400">
          {(template.remuneration_data?.modelos as string[] || []).join(', ') || '—'}
        </span>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={e => { e.stopPropagation(); handleUseTemplate(template); }}
          className="btn-primary text-xs py-1.5 px-3 flex-1 justify-center"
        >
          <ArrowRight className="w-3.5 h-3.5" /> Usar template
        </button>
        {!template.is_sistema && (
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(template); }}
            disabled={deleting === template.id}
            className="btn-ghost text-xs py-1.5 px-2 text-red-400 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Templates de Contrato</h1>
          <p className="text-slate-500 text-sm">
            Modelos pré-configurados por profissão para agilizar a criação de contratos
          </p>
        </div>
      </div>

      {/* Templates do sistema */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-gold-500" />
          <h2 className="font-semibold text-brand-900">Templates do Sistema</h2>
          <span className="badge badge-gray text-2xs">{sistemaTpls.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sistemaTpls.map(t => <TemplateCard key={t.id} template={t} />)}
        </div>
      </div>

      {/* Templates da empresa */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-brand-900">Meus Templates</h2>
            <span className="badge badge-gray text-2xs">{empresaTpls.length}</span>
          </div>
        </div>

        {empresaTpls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {empresaTpls.map(t => <TemplateCard key={t.id} template={t} />)}
          </div>
        ) : (
          <div className="cc-card flex flex-col items-center justify-center py-12 text-center">
            <FileCode2 className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-500 text-sm">Nenhum template personalizado ainda</p>
            <p className="text-slate-400 text-xs mt-1 mb-4 max-w-xs">
              Após criar um contrato, você poderá salvá-lo como template para reutilizar com outros profissionais da mesma função.
            </p>
          </div>
        )}
      </div>

      {/* Modal de aviso — revisar com atenção antes de usar o template */}
      {confirmUse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-7 max-w-md w-full animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5.5 h-5.5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-brand-900">Este é um modelo</h3>
                <p className="text-xs text-slate-500 mt-0.5">{confirmUse.nome}</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-5">
              Os campos pré-preenchidos refletem a <strong>prática habitual de mercado</strong> para
              esta profissão, mas precisam ser revisados com atenção à realidade específica deste
              contrato — carga horária, valores, regras de cancelamento, conselho profissional e
              demais condições devem ser conferidos e ajustados antes de finalizar.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmUse(null)}
                className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { const t = confirmUse; setConfirmUse(null); executeUseTemplate(t); }}
                className="flex-1 py-2 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors"
              >
                Entendi, usar template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-brand-900">Excluir template?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-5">
              O template <strong>"{confirmDelete.nome}"</strong> será excluído permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4 inline mr-1" /> Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={deleting === confirmDelete.id}
                className="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleting === confirmDelete.id
                  ? 'Excluindo...'
                  : <><Trash2 className="w-4 h-4 inline mr-1" /> Excluir</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhe */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-8 max-w-lg w-full animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-bold text-brand-900 text-lg">{showDetail.nome}</h3>
                <p className="text-slate-500 text-sm mt-0.5">
                  {PROFISSAO_LABELS[showDetail.profissao]}
                  {showDetail.is_sistema && ' · Template do Sistema'}
                </p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            {showDetail.descricao && (
              <p className="text-slate-600 text-sm leading-relaxed mb-6">{showDetail.descricao}</p>
            )}

            {/* Objeto pré-configurado */}
            {showDetail.service_data?.objeto && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">Objeto do Contrato</p>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                  {showDetail.service_data.objeto}
                </p>
              </div>
            )}

            {/* Remuneração */}
            {showDetail.remuneration_data?.modelos && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">Modelos de Remuneração</p>
                <div className="flex flex-wrap gap-2">
                  {(showDetail.remuneration_data.modelos as string[]).map(m => (
                    <span key={m} className="badge badge-blue text-2xs">{m.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Anexos */}
            {showDetail.anexos_padrao?.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">Anexos Incluídos</p>
                <div className="flex flex-wrap gap-2">
                  {showDetail.anexos_padrao.map(a => (
                    <span key={a} className="badge badge-gray text-2xs">{a.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowDetail(null)} className="btn-secondary flex-1">Fechar</button>
              <button
                onClick={() => { setShowDetail(null); handleUseTemplate(showDetail); }}
                className="btn-primary flex-1"
              >
                <ArrowRight className="w-4 h-4" /> Usar este Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
