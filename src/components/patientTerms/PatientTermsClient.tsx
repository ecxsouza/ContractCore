'use client';

// ================================================================
// PatientTermsClient — listagem de termos de pacientes
// Busca via GET /api/patient-terms com filtro opcional por status.
// NÃO exibe dados clínicos.
// ================================================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { PatientTermCard } from '@/components/patientTerms/PatientTermCard';
import {
  PATIENT_TERM_STATUS_LABELS,
  PATIENT_TERM_STATUS,
} from '@/lib/constants';
import type { PatientTermStatus } from '@/lib/patientTerms/types';
import clsx from 'clsx';

export function PatientTermsClient() {
  const router = useRouter();
  const [terms,       setTerms]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = statusFilter
      ? `/api/patient-terms?status=${statusFilter}`
      : '/api/patient-terms';
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setTerms(d.terms || []))
      .catch(() => setError('Não foi possível carregar os termos.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const statusKeys = Object.values(PATIENT_TERM_STATUS) as PatientTermStatus[];

  // Contagem por status para os filtros
  const countByStatus = terms.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Termos de Pacientes</h1>
          <p className="text-slate-500 text-sm">
            {loading ? 'Carregando…' : `${terms.length} termo(s)`}
          </p>
        </div>
        <Link href="/patient-terms/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Termo
        </Link>
      </div>

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            !statusFilter
              ? 'border-brand-500 bg-brand-50 text-brand-800'
              : 'border-slate-200 text-slate-600 hover:border-brand-200'
          )}>
          Todos ({terms.length})
        </button>
        {statusKeys.map(s => {
          const count = countByStatus[s] || 0;
          if (count === 0 && statusFilter !== s) return null;
          return (
            <button key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                statusFilter === s
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-slate-200 text-slate-600 hover:border-brand-200'
              )}>
              {PATIENT_TERM_STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="cc-card flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="cc-card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={() => setStatusFilter('')}
            className="btn-secondary mt-4 text-sm">
            Tentar novamente
          </button>
        </div>
      ) : terms.length === 0 ? (
        <div className="cc-card flex flex-col items-center justify-center py-20 text-center">
          <FileText className="w-12 h-12 text-slate-300 mb-4" />
          <p className="font-semibold text-slate-500">Nenhum termo encontrado</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">
            {statusFilter
              ? 'Tente outro filtro ou crie um novo termo'
              : 'Crie o primeiro termo de atendimento ao paciente'}
          </p>
          <Link href="/patient-terms/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Termo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {terms.map(term => (
            <PatientTermCard
              key={term.id}
              term={term}
              onClick={() => router.push(`/patient-terms/${term.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
