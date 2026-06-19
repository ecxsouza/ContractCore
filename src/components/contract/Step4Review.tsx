'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, Zap, Save, CheckCircle, AlertTriangle,
  Loader2, AlertCircle, Info, ArrowDownRight, ArrowUpRight,
  MinusCircle, Check, X, Printer, ToggleLeft, ToggleRight, Pencil,
} from 'lucide-react';
import { generateContractHTML } from '@/lib/pdf/generator';
import { getContractPrintCSS, getContractPrintHeader } from '@/lib/pdf/contractPrintCSS';
import type { ContractFormData, Company, AnexoType, RiscoItem, ChecklistMesaItem } from '@/types';
import type { ClausulaRevisada } from '@/lib/claude';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

// ── Configurações visuais ─────────────────────────────────────────

const GRAVIDADE_CONFIG = {
  atencao:    { label: 'Atenção',    cls: 'bg-blue-50 border-blue-200 text-blue-800',    icon: Info          },
  importante: { label: 'Importante', cls: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle },
  critico:    { label: 'Crítico',    cls: 'bg-red-50 border-red-200 text-red-800',       icon: AlertCircle   },
};

const CHECKLIST_STATUS = {
  ok:       { icon: <CheckCircle   className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  atencao:  { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,   cls: 'bg-amber-50 border-amber-200 text-amber-800'       },
  problema: { icon: <AlertCircle   className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />,     cls: 'bg-red-50 border-red-200 text-red-800'             },
};

const NIVEL_RISCO_CFG = {
  baixo: { label: 'Risco Baixo', icon: ArrowDownRight, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  medio: { label: 'Risco Médio', icon: MinusCircle,    cls: 'text-amber-700 bg-amber-50 border-amber-200'       },
  alto:  { label: 'Risco Alto',  icon: ArrowUpRight,   cls: 'text-red-700 bg-red-50 border-red-200'             },
};

const ANEXOS_INFO = [
  { id: 'confidencialidade'     as AnexoType, titulo: 'Termo de Confidencialidade',           recomendado: true,  desc: 'Formaliza o sigilo sobre dados da clínica e pacientes.' },
  { id: 'lgpd'                  as AnexoType, titulo: 'Termo LGPD',                           recomendado: true,  desc: 'Declara ciência sobre a Lei 13.709/2018.' },
  { id: 'prontuarios'           as AnexoType, titulo: 'Responsabilidade — Prontuários',       recomendado: true,  desc: 'Define responsabilidades sobre guarda e sigilo dos documentos clínicos.' },
  { id: 'uso_estrutura'         as AnexoType, titulo: 'Termo de Uso da Estrutura',            recomendado: false, desc: 'Formaliza condições de uso de salas e equipamentos.' },
  { id: 'politica_agenda'       as AnexoType, titulo: 'Política de Agenda e Cancelamentos',   recomendado: false, desc: 'Define regras de agenda, faltas e remarcações.' },
  { id: 'sem_vinculo_clt'       as AnexoType, titulo: 'Declaração — Ausência de Vínculo CLT', recomendado: true,  desc: 'Declaração expressa de que a relação não é empregatícia.' },
  { id: 'checklist_pj_mei'      as AnexoType, titulo: 'Checklist Contratação PJ/MEI',         recomendado: false, desc: 'Lista de documentos necessários para onboarding.' },
  { id: 'checklist_pejotizacao' as AnexoType, titulo: 'Checklist Riscos de Pejotização',      recomendado: true,  desc: 'Identifica fatores de risco de vínculo CLT.' },
  { id: 'checklist_conselho'    as AnexoType, titulo: 'Checklist Registro Profissional',       recomendado: false, desc: 'Verifica regularidade no conselho.' },
  { id: 'ciencia_etica'         as AnexoType, titulo: 'Ciência — Ética Profissional',         recomendado: false, desc: 'Declara compromisso com o Código de Ética da categoria.' },
];

// ── Aplicar revisões aprovadas no HTML via data-clause-key ────────

function aplicarRevisoesNoHtml(
  htmlOriginal: string,
  clausulas:    ClausulaRevisada[],
  aprovadas:    Record<string, boolean>,
  textos:       Record<string, string>,
): string {
  let html = htmlOriginal;

  clausulas.forEach((cl) => {
    if (!aprovadas[cl.id]) return;                // só aplica as aprovadas
    const textoFinal = textos[cl.id] ?? cl.texto_revisado;
    if (!textoFinal || textoFinal === cl.texto_original) return;

    // Substituição por data-clause-key — confiável, sem depender do título da IA
    const regex = new RegExp(
      `(<[^>]+data-clause-key="${cl.chave}"[^>]*>)([^<]*)`,
      'i',
    );
    if (regex.test(html)) {
      // Preserva a tag, substitui apenas o conteúdo de texto depois dela
      // Para cláusula 1.1 (objeto): substitui o texto após o <strong>1.1.</strong>
      const tagRegex = new RegExp(
        `(<[^>]+data-clause-key="${cl.chave}"[^>]*>\\s*(?:<strong>[^<]+<\\/strong>\\s*)?)([\\s\\S]*?)(<\\/p>)`,
        'i',
      );
      html = html.replace(tagRegex, `$1${textoFinal}$3`);
    }
    // Fallback: se a chave não tiver no HTML (campo opcional), não quebra
  });

  return html;
}

// ── Componente diff com edição ────────────────────────────────────

interface TextDiffProps {
  clausulaId:   string;
  original:     string;
  revisado:     string;
  motivo:       string;
  textoEditado: string;
  onEdit:       (id: string, valor: string) => void;
}

function TextDiff({ clausulaId, original, revisado, motivo, textoEditado, onEdit }: TextDiffProps) {
  const [editando, setEditando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleFocus() {
    setEditando(true);
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-slate-500 italic">
        💡 {motivo}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Original */}
        <div className="p-3 border-b md:border-b-0 md:border-r border-slate-200">
          <div className="font-semibold text-red-600 uppercase tracking-wide mb-1.5 text-2xs">✗ Original</div>
          <p className="text-slate-600 leading-relaxed line-through decoration-red-300 decoration-1">{original}</p>
        </div>
        {/* Revisado — editável */}
        <div className="p-3 bg-emerald-50/50 relative">
          <div className="flex items-center justify-between mb-1.5">
            <div className="font-semibold text-emerald-600 uppercase tracking-wide text-2xs">✓ Revisado</div>
            <button
              type="button"
              onClick={() => { setEditando(e => !e); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className={clsx(
                'flex items-center gap-1.5 text-2xs font-semibold px-2 py-1 rounded-md transition-colors',
                editando
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-brand-600'
              )}
              title={editando ? 'Confirmar edição' : 'Editar texto revisado'}
            >
              {editando
                ? <><Check className="w-3 h-3" /> Confirmar</>
                : <><Pencil className="w-3 h-3" /> Editar</>
              }
            </button>
          </div>
          {editando ? (
            <>
              <textarea
                ref={textareaRef}
                className="w-full text-xs text-emerald-900 font-medium leading-relaxed bg-white border border-emerald-300 rounded-lg p-2 resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={textoEditado}
                onFocus={handleFocus}
                onChange={e => onEdit(clausulaId, e.target.value)}
              />
              <p className="mt-1.5 text-2xs text-amber-600 leading-relaxed">
                ⚠️ Texto editado manualmente. Valide com advogado antes da assinatura.
              </p>
            </>
          ) : (
            <p className="text-emerald-900 leading-relaxed font-medium whitespace-pre-wrap">{textoEditado || revisado}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Props e tipos ─────────────────────────────────────────────────

interface Step4Props {
  formData:    ContractFormData;
  company:     Company;
  onChange:    (data: Partial<ContractFormData>) => void;
  onBack:      () => void;
  onSave:      () => void;
  saving:      boolean;
  onGoToStep?: (step: number) => void;
}

type TabType = 'preview' | 'revisao' | 'anexos' | 'vigencia';
type AIPhase = 'idle' | 'processing' | 'done' | 'error' | 'accepted' | 'rejected';

// ── Componente principal ──────────────────────────────────────────

export function Step4Review({ formData, company, onChange, onBack, onSave, saving, onGoToStep }: Step4Props) {
  useScrollTop();

  const [contratoOriginal,   setContratoOriginal]   = useState('');
  const [contratoRevisado,   setContratoRevisado]   = useState('');
  const [aiPhase,            setAiPhase]            = useState<AIPhase>('idle');
  const [aiSugestoes,        setAiSugestoes]        = useState('');
  const [riscos,             setRiscos]             = useState<RiscoItem[]>([]);
  const [nivelRisco,         setNivelRisco]         = useState<'baixo' | 'medio' | 'alto' | null>(null);
  const [checklistMesa,      setChecklistMesa]      = useState<ChecklistMesaItem[]>([]);
  const [clausulasRevisadas, setClausulasRevisadas] = useState<ClausulaRevisada[]>([]);
  const [activeTab,          setActiveTab]          = useState<TabType>('preview');

  // Aprovação individual: id → true/false (padrão: todas sugeridas, nenhuma aprovada)
  const [aprovadas,  setAprovadas]  = useState<Record<string, boolean>>({});
  // Textos editados: id → texto atual (começa com o revisado da IA)
  const [textosEditados, setTextosEditados] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const html = generateContractHTML(formData, company, 'CC-PREVIEW');
      setContratoOriginal(html);
    } catch (e) { console.error('Erro ao gerar preview:', e); }
  }, []);

  // Contrato exibido: quando aceito, usa o HTML com revisões aplicadas
  const contratoExibido = aiPhase === 'accepted' ? contratoRevisado : contratoOriginal;

  // ── IA ────────────────────────────────────────────────────────
  async function handleEnrichWithAI() {
    setAiPhase('processing');
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 58000);
    try {
      const res = await fetch('/api/claude', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body:    JSON.stringify({ formData, company }),
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Erro ${res.status}`);
      }

      const data = await res.json() as {
        contrato_html?:        string;
        sugestoes?:            string;
        riscos_identificados?: RiscoItem[];
        nivel_risco?:          'baixo' | 'medio' | 'alto';
        checklist_mesa?:       ChecklistMesaItem[];
        clausulas_revisadas?:  ClausulaRevisada[];
      };

      const cls = data.clausulas_revisadas ?? [];

      // Inicializar aprovação (todas como false — usuário decide individualmente)
      const aprovInit: Record<string, boolean> = {};
      const textosInit: Record<string, string> = {};
      cls.forEach(cl => {
        aprovInit[cl.id]   = false;
        textosInit[cl.id]  = cl.texto_revisado;
      });

      setClausulasRevisadas(cls);
      setAprovadas(aprovInit);
      setTextosEditados(textosInit);
      setAiSugestoes(     data.sugestoes            ?? '');
      setRiscos(          data.riscos_identificados ?? []);
      setNivelRisco(      data.nivel_risco          ?? null);
      setChecklistMesa(   data.checklist_mesa       ?? []);
      // Guarda o HTML base retornado pela IA (com seção da mesa técnica no final)
      setContratoRevisado(data.contrato_html        ?? contratoOriginal);
      setAiPhase('done');
      setActiveTab('revisao');
      toast.success('Revisão da Mesa Técnica concluída!');
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setAiPhase('error');
      toast.error(msg.includes('abort') ? 'Tempo esgotado. Tente novamente.' : msg);
    }
  }

  function toggleAprovacao(id: string) {
    setAprovadas(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function editarTexto(id: string, valor: string) {
    setTextosEditados(prev => ({ ...prev, [id]: valor }));
  }

  // Detecta placeholders/textos provisórios que não podem ir para o contrato final
  function detectarPlaceholders(textos: string[]): { bloqueantes: string[]; avisos: string[] } {
    const PADRAO_BLOQUEANTE = /\[DEFINIR\]|\[INFORMAR\]|\[PREENCHER\]|\{\{.*?\}\}|\bXXX\b/gi;
    const PADRAO_AVISO       = /\bTESTE\b/gi;
    const bloqueantes: string[] = [];
    const avisos: string[] = [];
    textos.forEach(t => {
      if (!t) return;
      if (PADRAO_BLOQUEANTE.test(t)) bloqueantes.push(t);
      PADRAO_BLOQUEANTE.lastIndex = 0;
      if (PADRAO_AVISO.test(t)) avisos.push(t);
      PADRAO_AVISO.lastIndex = 0;
    });
    return { bloqueantes, avisos };
  }

  function handleAcceptIA() {
    const clausulasAceitas = clausulasRevisadas.filter(cl => aprovadas[cl.id]);
    const textosFinais = clausulasAceitas.map(cl => textosEditados[cl.id] ?? cl.texto_revisado);

    const { bloqueantes, avisos } = detectarPlaceholders(textosFinais);

    if (bloqueantes.length > 0) {
      toast.error('Há campos pendentes ou provisórios na cláusula revisada. Edite antes de salvar o contrato final.');
      return;
    }
    if (avisos.length > 0) {
      toast('Atenção: foi detectado texto "TESTE" em uma cláusula aplicada. Revise antes de salvar.', { icon: '⚠️' });
    }

    // Monta HTML final aplicando apenas as revisões individualmente aprovadas
    const htmlFinal = aplicarRevisoesNoHtml(
      contratoOriginal,
      clausulasRevisadas,
      aprovadas,
      textosEditados,
    );

    setContratoRevisado(htmlFinal);

    onChange({
      ia_aceita:              true,
      ia_contrato_html:       htmlFinal,
      ia_sugestoes:           aiSugestoes,
      ia_nivel_risco:         nivelRisco ?? undefined,
      ia_checklist_mesa:      checklistMesa,
      ia_clausulas_revisadas: clausulasAceitas,
      ia_riscos:              riscos,
    });
    setAiPhase('accepted');
    setActiveTab('preview');

    const nAceitas = clausulasAceitas.length;
    toast.success(
      nAceitas === 0
        ? 'Revisão registrada sem aplicar substituições de texto.'
        : `${nAceitas} cláusula${nAceitas > 1 ? 's' : ''} aplicada${nAceitas > 1 ? 's' : ''} no contrato.`,
    );
  }

  function handleRejectIA() {
    onChange({ ia_aceita: false, ia_contrato_html: undefined });
    setAiPhase('rejected');
    toast('Revisão rejeitada — contrato original mantido.');
  }

  // Barreira defensiva: revalida o HTML final que será salvo (caso já tenha
  // passado por handleAcceptIA anteriormente) antes de disparar onSave.
  function handleSaveClick() {
    if (formData.ia_aceita && formData.ia_contrato_html) {
      const { bloqueantes } = detectarPlaceholders([formData.ia_contrato_html]);
      if (bloqueantes.length > 0) {
        toast.error('Há campos pendentes ou provisórios na cláusula revisada. Edite antes de salvar o contrato final.');
        return;
      }
    }
    onSave();
  }

  function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) { toast.error('Permita popups para imprimir.'); return; }
    const css    = getContractPrintCSS(company.logo_url, company.nome_fantasia || company.razao_social);
    const header = getContractPrintHeader(company.logo_url, company.nome_fantasia || company.razao_social);
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Contrato — ${company.nome_fantasia || company.razao_social}</title>
<style>${css}</style></head>
<body>${header}${contratoExibido}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 700);
  }

  function toggleAnexo(id: AnexoType) {
    const next = formData.anexos.includes(id)
      ? formData.anexos.filter(a => a !== id)
      : [...formData.anexos, id];
    onChange({ anexos: next });
  }

  const totalAprovadas = Object.values(aprovadas).filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in">

      {/* Modal loading IA */}
      {aiPhase === 'processing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-card-lg p-10 flex flex-col items-center gap-5 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-brand-50 border-2 border-brand-200 flex items-center justify-center">
                <Zap className="w-7 h-7 text-brand-600" />
              </div>
              <div className="absolute -inset-1 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-bold text-brand-900 text-lg">Mesa Técnica analisando</p>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                9 especialistas revisando cláusulas, riscos trabalhistas, fiscais, LGPD e CFP/CRP.
              </p>
              <p className="text-brand-600 text-xs mt-3 font-medium">⏱ Aguarde até 45 segundos</p>
            </div>
          </div>
        </div>
      )}

      {/* Bloco IA */}
      <div className="cc-card p-6 border-2 border-gold-400 bg-gradient-to-br from-white to-amber-50/30">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-brand-900 mb-1">Revisão pela Mesa Técnica</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              9 especialistas analisam riscos trabalhistas, fiscais, LGPD, CFP/CRP e cláusulas contratuais.
              <br /><span className="text-xs text-slate-400">⏱ Pode levar até 45 segundos.</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            {nivelRisco && (() => {
              const cfg = NIVEL_RISCO_CFG[nivelRisco];
              const Icon = cfg.icon;
              return (
                <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border', cfg.cls)}>
                  <Icon className="w-3.5 h-3.5" /> {cfg.label}
                </div>
              );
            })()}
            <button
              onClick={handleEnrichWithAI}
              disabled={aiPhase === 'processing'}
              className="btn-gold"
            >
              {aiPhase === 'processing' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
              ) : (
                <><Zap className="w-4 h-4" /> {aiPhase === 'done' || aiPhase === 'accepted' || aiPhase === 'rejected' ? 'Revisar novamente' : 'Enriquecer com IA'}</>
              )}
            </button>
          </div>
        </div>

        {/* Sugestões */}
        {aiSugestoes && (
          <div className="mt-4 p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-brand-800 text-sm font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> O que a Mesa Técnica observou:
            </div>
            <p className="text-brand-700 text-sm leading-relaxed">{aiSugestoes}</p>
          </div>
        )}

        {/* Botões aceitar/rejeitar — só em 'done' */}
        {aiPhase === 'done' && (
          <div className="mt-4 space-y-2">
            {totalAprovadas > 0 && (
              <p className="text-xs text-emerald-700 text-center font-medium">
                {totalAprovadas} revisão{totalAprovadas > 1 ? 'ões' : ''} selecionada{totalAprovadas > 1 ? 's' : ''} para aplicar
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={handleAcceptIA} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
                <Check className="w-4 h-4" /> Aceitar revisão
              </button>
              <button onClick={handleRejectIA} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
                <X className="w-4 h-4" /> Manter original
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-900 p-1 rounded-xl overflow-x-auto">
        {[
          { id: 'preview',  label: '📄 Contrato'  },
          { id: 'revisao',  label: `🔍 Revisão IA${clausulasRevisadas.length ? ` (${clausulasRevisadas.length})` : ''}` },
          { id: 'anexos',   label: '📎 Anexos'    },
          { id: 'vigencia', label: '📅 Vigência'  },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
            className={clsx('flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id ? 'bg-white text-brand-800 shadow-sm font-semibold' : 'text-white/60 hover:text-white')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Preview */}
      {activeTab === 'preview' && (
        <div className="cc-card overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-800">Pré-visualização</span>
            <div className="flex items-center gap-3">
              <span className={clsx('badge', aiPhase === 'accepted' ? 'badge-green' : 'badge-gray')}>
                {aiPhase === 'accepted' ? '✨ Revisado pela IA' : 'Versão original'}
              </span>
              {/* Botão de imprimir */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                title="Imprimir / Salvar como PDF"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </button>
            </div>
          </div>
          {contratoExibido ? (
            <div className="contract-preview rounded-none border-0" dangerouslySetInnerHTML={{ __html: contratoExibido }} />
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">Gerando preview…</div>
          )}
        </div>
      )}

      {/* Tab: Revisão IA */}
      {activeTab === 'revisao' && (
        <div className="space-y-4">
          {(aiPhase === 'idle' || aiPhase === 'error') && (
            <div className="cc-card p-8 text-center text-slate-400 text-sm">
              Clique em <strong>Enriquecer com IA</strong> para ver a análise da Mesa Técnica.
            </div>
          )}

          {/* Checklist */}
          {checklistMesa.length > 0 && (
            <div className="cc-card p-5">
              <h4 className="font-bold text-brand-900 mb-3 text-sm">Checklist da Mesa Técnica</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checklistMesa.map((item, i) => {
                  const cfg = CHECKLIST_STATUS[item.status] ?? CHECKLIST_STATUS.atencao;
                  return (
                    <div key={i} className={clsx('flex items-start gap-2.5 p-3 rounded-lg border text-xs', cfg.cls)}>
                      {cfg.icon}
                      <div>
                        <span className="font-semibold">{item.area}</span>
                        <p className="mt-0.5 leading-relaxed">{item.observacao}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Riscos */}
          {riscos.length > 0 && (
            <div className="cc-card p-5">
              <h4 className="font-bold text-brand-900 mb-3 text-sm">Riscos Identificados</h4>
              <div className="space-y-2">
                {riscos.map((risco, i) => {
                  const cfg = GRAVIDADE_CONFIG[risco.gravidade as keyof typeof GRAVIDADE_CONFIG] ?? GRAVIDADE_CONFIG.atencao;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={clsx('p-3 rounded-xl border text-xs', cfg.cls)}>
                      <div className="flex items-center gap-2 font-semibold mb-1">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{risco.titulo}</span>
                        <span className="ml-auto font-normal opacity-70">{risco.area}</span>
                      </div>
                      <p className="leading-relaxed mb-1">{risco.descricao}</p>
                      <p className="opacity-80"><strong>Como corrigir:</strong> {risco.como_corrigir}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cláusulas revisadas — com aprovação individual e edição */}
          {clausulasRevisadas.length > 0 && (
            <div className="cc-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-brand-900 text-sm">Cláusulas Revisadas ({clausulasRevisadas.length})</h4>
                {aiPhase === 'done' && (
                  <span className="text-xs text-slate-500">
                    Ative as revisões que deseja aplicar no contrato
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {clausulasRevisadas.map((cl) => {
                  const cfg      = GRAVIDADE_CONFIG[cl.gravidade] ?? GRAVIDADE_CONFIG.atencao;
                  const Icon     = cfg.icon;
                  const isOn     = aprovadas[cl.id] ?? false;
                  const ToggleIcon = isOn ? ToggleRight : ToggleLeft;

                  return (
                    <div key={cl.id} className={clsx('border rounded-xl overflow-hidden transition-all',
                      isOn ? 'border-emerald-300 shadow-sm' : 'border-slate-200')}>
                      {/* Header da cláusula */}
                      <div className={clsx('flex items-center gap-2 px-4 py-2.5 text-xs font-semibold', cfg.cls)}>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{cl.titulo}</span>
                        <span className="opacity-70">{cl.area} · {cfg.label}</span>
                        {/* Toggle de aprovação individual */}
                        <button
                          type="button"
                          onClick={() => toggleAprovacao(cl.id)}
                          className={clsx(
                            'ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all',
                            isOn
                              ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-700'
                          )}
                          title={isOn ? 'Clique para não aplicar esta revisão' : 'Clique para aplicar esta revisão'}
                        >
                          <ToggleIcon className="w-4 h-4 flex-shrink-0" />
                          {isOn ? 'Aplicar' : 'Não aplicar'}
                        </button>
                      </div>

                      {/* Corpo */}
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-slate-700 leading-relaxed">
                          <strong>Problema:</strong> {cl.problema}
                        </p>
                        <TextDiff
                          clausulaId={cl.id}
                          original={cl.texto_original}
                          revisado={cl.texto_revisado}
                          motivo={cl.motivo}
                          textoEditado={textosEditados[cl.id] ?? cl.texto_revisado}
                          onEdit={editarTexto}
                        />
                        {isOn && (
                          <p className="text-2xs text-emerald-700 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Esta revisão será aplicada no contrato ao aceitar
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Anexos */}
      {activeTab === 'anexos' && (
        <div className="cc-card p-6">
          <div className="section-title">Selecione os Anexos</div>
          <p className="text-slate-500 text-sm mb-4">Os marcados com ★ são recomendados pela mesa técnica.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ANEXOS_INFO.map(anexo => {
              const selected = formData.anexos.includes(anexo.id);
              return (
                <div key={anexo.id} onClick={() => toggleAnexo(anexo.id)}
                  className={clsx('relative p-4 rounded-xl border-2 cursor-pointer transition-all',
                    selected ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-200')}>
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2',
                      selected ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white')}>
                      {selected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-brand-900">{anexo.titulo}</span>
                        {anexo.recomendado && <span className="text-gold-500 text-xs">★</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{anexo.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Vigência */}
      {activeTab === 'vigencia' && (
        <div className="cc-card p-6 space-y-4">
          <div className="section-title">Vigência do Contrato</div>
          <div className="flex gap-3">
            {[
              { v: true,  label: 'Prazo Indeterminado', desc: 'Vigora até rescisão — recomendado' },
              { v: false, label: 'Prazo Determinado',   desc: 'Com data de início e término' },
            ].map(opt => (
              <button key={String(opt.v)} type="button"
                onClick={() => onChange({ vigencia_indeterminada: opt.v })}
                className={clsx('flex-1 p-4 rounded-xl border-2 text-left transition-all',
                  formData.vigencia_indeterminada === opt.v ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200')}>
                <div className="font-semibold text-sm text-brand-900">{opt.label}</div>
                <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="cc-label">Data de Início</label>
              <input type="date" className="cc-input"
                value={formData.data_vigencia_inicio || ''}
                onChange={e => onChange({ data_vigencia_inicio: e.target.value })} />
            </div>
            {!formData.vigencia_indeterminada && (
              <div>
                <label className="cc-label">Data de Término</label>
                <input type="date" className="cc-input"
                  value={formData.data_vigencia_fim || ''}
                  onChange={e => onChange({ data_vigencia_fim: e.target.value })} />
              </div>
            )}
          </div>
          <div>
            <label className="cc-label">Notas Internas (não aparecem no contrato)</label>
            <textarea className="cc-textarea" rows={3}
              value={formData.notas_internas || ''}
              onChange={e => onChange({ notas_internas: e.target.value })}
              placeholder="Observações internas, histórico de negociação, particularidades..." />
          </div>
        </div>
      )}

      {/* Aviso jurídico */}
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Aviso Jurídico:</strong> Este contrato é gerado automaticamente com suporte de IA e possui caráter de minuta. Não substitui assessoria jurídica especializada. Recomenda-se revisão por advogado trabalhista e contador antes da assinatura.
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button type="button" onClick={handleSaveClick} disabled={saving} className="btn-primary">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-4 h-4" /> Salvar Contrato</>
          )}
        </button>
      </div>
    </div>
  );
}
