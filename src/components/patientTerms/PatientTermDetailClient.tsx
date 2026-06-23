'use client';

// ================================================================
// PatientTermDetailClient — detalhe do termo salvo
// Exibe HTML salvo (termo_html), permite imprimir e cancelar.
// NÃO exibe dados clínicos.
// NÃO implementa assinatura eletrônica (Fase 4).
// ================================================================

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Printer, XCircle, Loader2, Calendar, User,
  FileText, AlertTriangle,
} from 'lucide-react';
import {
  PATIENT_TERM_STATUS_LABELS,
  PATIENT_TERM_TYPE_LABELS,
  PATIENT_TERM_MODALIDADE_LABELS,
  getPatientTermStatusDisplay,
} from '@/lib/constants';
import type { PatientTermStatus, PatientTermType, PatientTermModalidade } from '@/lib/patientTerms/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function formatDateBR(iso?: string | null): string {
  if (!iso) return '—';
  const d = iso.split('T')[0].split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}

const STATUS_CANCELAVEL: PatientTermStatus[] = ['rascunho', 'ativo', 'pendente_assinatura'];

interface PatientTermDetailClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  term:    any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patient: any | null;
}

export function PatientTermDetailClient({ term, patient }: PatientTermDetailClientProps) {
  const router   = useRouter();
  const [canceling, setCanceling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const statusCfg   = getPatientTermStatusDisplay(term.status as PatientTermStatus);
  const tipoLabel   = PATIENT_TERM_TYPE_LABELS[term.tipo_termo  as PatientTermType]    || term.tipo_termo;
  const modalLabel  = PATIENT_TERM_MODALIDADE_LABELS[term.modalidade as PatientTermModalidade] || term.modalidade;
  const podeCancelar = STATUS_CANCELAVEL.includes(term.status as PatientTermStatus);

  function handlePrint() {
    if (!term.termo_html) { toast.error('HTML do termo não disponível'); return; }
    const w = window.open('', '_blank');
    if (!w) { toast.error('Bloqueio de pop-up — permita pop-ups para imprimir'); return; }
    w.document.write(term.termo_html);
    w.document.close();
    w.focus();
    w.print();
  }

  async function handleCancel() {
    setCanceling(true);
    try {
      const res = await fetch(`/api/patient-terms/${term.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'cancelado' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao cancelar' }));
        throw new Error(err.error || 'Erro ao cancelar');
      }
      toast.success('Termo cancelado');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar');
    } finally {
      setCanceling(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/patient-terms" className="hover:text-brand-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Termos de Pacientes
        </Link>
        <span>/</span>
        <span className="text-brand-800 font-medium">{term.numero_termo}</span>
      </div>

      {/* Cabeçalho do termo */}
      <div className="cc-card p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-brand-900">
                {patient?.nome_completo || 'Paciente'}
              </h1>
              <span className={clsx('badge', statusCfg.badgeCls)}>
                {PATIENT_TERM_STATUS_LABELS[term.status as PatientTermStatus] || term.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />{term.numero_termo}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />{tipoLabel}
              </span>
              {term.modalidade && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />{modalLabel}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />Criado em {formatDateBR(term.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-slate-100">
          <button onClick={handlePrint}
            className="btn-secondary flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>

          {podeCancelar && !showConfirm && (
            <button onClick={() => setShowConfirm(true)}
              className="btn-ghost flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
              <XCircle className="w-4 h-4" /> Cancelar Termo
            </button>
          )}
        </div>

        {/* Confirmação de cancelamento */}
        {showConfirm && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Tem certeza que deseja cancelar este termo? Esta ação não pode ser desfeita facilmente.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCancel} disabled={canceling}
                className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2 text-sm">
                {canceling
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelando…</>
                  : 'Confirmar Cancelamento'}
              </button>
              <button onClick={() => setShowConfirm(false)} disabled={canceling}
                className="btn-secondary text-sm">
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resumo de campos administrativos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Área',       value: term.area_servico          || '—' },
          { label: 'Profissional', value: term.profissional_responsavel || '—' },
          { label: 'Início',     value: formatDateBR(term.data_inicio_atendimento) },
          { label: 'Revisão em', value: formatDateBR(term.data_revisao_recomendada) },
        ].map(item => (
          <div key={item.label} className="cc-card p-4">
            <div className="text-2xs text-slate-400 uppercase tracking-widest font-semibold mb-1">
              {item.label}
            </div>
            <div className="text-sm font-semibold text-brand-900 truncate">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Aviso de revisão */}
      {term.data_revisao_recomendada && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">
            Recomenda-se revisar este termo anualmente. Próxima revisão sugerida: <strong>{formatDateBR(term.data_revisao_recomendada)}</strong>.
          </p>
        </div>
      )}

      {/* Preview do termo HTML */}
      <div className="cc-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-sm text-brand-900">Documento do Termo</h2>
          <button onClick={handlePrint}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
        {term.termo_html ? (
          <div
            className="contract-preview max-h-[700px] overflow-y-auto p-4 bg-white text-sm"
            dangerouslySetInnerHTML={{ __html: term.termo_html }}
          />
        ) : (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            Documento não disponível
          </div>
        )}
      </div>

      {/* Link para paciente */}
      {term.patient_id && (
        <div className="flex justify-end">
          <Link href={`/patients/${term.patient_id}`}
            className="btn-ghost text-xs flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Ver cadastro do paciente
          </Link>
        </div>
      )}
    </div>
  );
}
