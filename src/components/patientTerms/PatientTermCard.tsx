'use client';

// ================================================================
// PatientTermCard — card de listagem de termos de pacientes
// Não busca dados: recebe "term" pronto da API.
// ================================================================

import { FileText, Calendar, Monitor, MapPin } from 'lucide-react';
import {
  PATIENT_TERM_STATUS_LABELS,
  PATIENT_TERM_TYPE_LABELS,
  PATIENT_TERM_MODALIDADE_LABELS,
  getPatientTermStatusDisplay,
} from '@/lib/constants';
import type { PatientTermType, PatientTermStatus } from '@/lib/patientTerms/types';
import clsx from 'clsx';

interface PatientTermCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  term: any;
  onClick?: () => void;
}

function formatDateBR(isoDate?: string | null): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function PatientTermCard({ term, onClick }: PatientTermCardProps) {
  const statusCfg    = getPatientTermStatusDisplay(term.status as PatientTermStatus);
  const tipoLabel    = PATIENT_TERM_TYPE_LABELS[term.tipo_termo as PatientTermType] || term.tipo_termo;
  const modalLabel   = PATIENT_TERM_MODALIDADE_LABELS[term.modalidade] || term.modalidade;

  // Nome do paciente — pode vir do join patients(nome_completo)
  const nomePaciente: string =
    term.patients?.nome_completo ||
    term.patient?.nome_completo  ||
    '—';

  return (
    <div
      onClick={onClick}
      className={clsx(
        'cc-card p-4 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-brand-200',
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-brand-900 truncate">
              {term.numero_termo || '—'}
            </p>
            <p className="text-2xs text-slate-400 truncate">{nomePaciente}</p>
          </div>
        </div>
        <span className={clsx(
          'text-2xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
          statusCfg.badgeCls,
        )}>
          {PATIENT_TERM_STATUS_LABELS[term.status as PatientTermStatus] || term.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {tipoLabel}
        </span>
        {term.modalidade && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            {term.modalidade === 'online'
              ? <Monitor className="w-3 h-3" />
              : <MapPin   className="w-3 h-3" />
            }
            {modalLabel}
          </span>
        )}
        <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
          <Calendar className="w-3 h-3" />
          {formatDateBR(term.created_at)}
        </span>
      </div>
    </div>
  );
}
