'use client';

// ================================================================
// PatientDetailClient — detalhe de paciente com termos vinculados
// NÃO exibe dados clínicos (diagnóstico, CID, evolução, etc.)
// ================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Users, FileText, Plus, Phone, Mail,
  MapPin, Calendar, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { PatientTermCard } from '@/components/patientTerms/PatientTermCard';
import {
  PATIENT_TERM_STATUS_LABELS,
  PATIENT_TERM_TYPE_LABELS,
} from '@/lib/constants';
import clsx from 'clsx';

function formatDateBR(iso?: string | null): string {
  if (!iso) return '—';
  const d = iso.split('T')[0].split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}

function maskCPFDisplay(cpf?: string | null): string {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

const GRAU_LABELS: Record<string, string> = {
  mae: 'Mãe', pai: 'Pai', avo: 'Avó/Avô', tutor: 'Tutor(a)',
  curador: 'Curador(a)', conjuge: 'Cônjuge', outro: 'Outro',
};

interface PatientDetailClientProps {
  patient:     any;
  responsibles: any[];
  terms:       any[];
}

export function PatientDetailClient({ patient, responsibles, terms }: PatientDetailClientProps) {
  const router = useRouter();

  const enderecoPartes = [
    patient.logradouro, patient.numero,
    patient.complemento, patient.bairro,
    patient.cidade, patient.uf,
  ].filter(Boolean);
  const enderecoStr = enderecoPartes.join(', ') || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/patients" className="hover:text-brand-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pacientes
        </Link>
        <span>/</span>
        <span className="text-brand-800 font-medium">{patient.nome_completo}</span>
      </div>

      {/* Cabeçalho do paciente */}
      <div className="cc-card p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-brand-900">{patient.nome_completo}</h1>
              {patient.is_menor ? (
                <span className="badge bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Menor de idade
                </span>
              ) : (
                <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Adulto
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              {patient.cpf && (
                <span>CPF: {maskCPFDisplay(patient.cpf)}</span>
              )}
              {patient.data_nascimento && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateBR(patient.data_nascimento)}
                </span>
              )}
              {patient.telefone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />{patient.telefone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />{patient.email}
                </span>
              )}
              {enderecoStr && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />{enderecoStr}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ação: novo termo para este paciente */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <Link
            href={`/patient-terms/new?patient_id=${patient.id}`}
            className="btn-primary flex items-center gap-2 w-fit">
            <Plus className="w-4 h-4" /> Novo Termo para este Paciente
          </Link>
        </div>
      </div>

      {/* Responsáveis (somente para menores) */}
      {patient.is_menor && responsibles.length > 0 && (
        <div className="cc-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-sm text-brand-900">Responsáveis</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {responsibles.map(r => (
              <div key={r.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-brand-900">{r.nome_completo}</p>
                  {r.is_responsavel_legal && (
                    <span className="text-2xs px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">Legal</span>
                  )}
                  {r.is_responsavel_financeiro && (
                    <span className="text-2xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Financeiro</span>
                  )}
                </div>
                <div className="text-2xs text-slate-400 space-y-0.5">
                  {r.grau_parentesco && <p>{GRAU_LABELS[r.grau_parentesco] || r.grau_parentesco}</p>}
                  {r.cpf && <p>CPF: {maskCPFDisplay(r.cpf)}</p>}
                  {r.telefone && <p>{r.telefone}</p>}
                  {r.email && <p>{r.email}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Termos vinculados */}
      <div className="cc-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-sm text-brand-900">
              Termos de Atendimento ({terms.length})
            </h2>
          </div>
          <Link
            href={`/patient-terms/new?patient_id=${patient.id}`}
            className="btn-secondary text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Novo Termo
          </Link>
        </div>

        {terms.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhum termo gerado ainda para este paciente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {terms.map(t => (
              <PatientTermCard
                key={t.id}
                term={t}
                onClick={() => router.push(`/patient-terms/${t.id}`)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
