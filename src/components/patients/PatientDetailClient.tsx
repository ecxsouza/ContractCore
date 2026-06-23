'use client';

// ================================================================
// PatientDetailClient — detalhe de paciente com termos vinculados
// NÃO exibe dados clínicos (diagnóstico, CID, evolução, etc.)
// ================================================================

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Users, FileText, Plus, Phone, Mail,
  MapPin, Calendar, ShieldCheck, ShieldAlert,
  Pencil, Trash2, Loader2, AlertTriangle,
} from 'lucide-react';
import { PatientTermCard } from '@/components/patientTerms/PatientTermCard';
import { EditPatientModal } from '@/components/patients/EditPatientModal';
import {
  PATIENT_TERM_STATUS_LABELS,
  PATIENT_TERM_TYPE_LABELS,
} from '@/lib/constants';
import toast from 'react-hot-toast';
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

export function PatientDetailClient({ patient: initialPatient, responsibles, terms }: PatientDetailClientProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(initialPatient);
  const [editing,       setEditing]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, { method: 'DELETE' });
      if (res.status === 409) {
        const err = await res.json();
        setDeleteError(err.error || 'Paciente possui termos vinculados.');
        return;
      }
      if (!res.ok) throw new Error('Erro ao excluir');
      toast.success('Paciente excluído');
      router.push('/patients');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setDeleteLoading(false);
    }
  }

  const enderecoPartes = [
    patient.logradouro, patient.numero,
    patient.complemento, patient.bairro,
    patient.cidade, patient.uf,
  ].filter(Boolean);
  const enderecoStr = enderecoPartes.join(', ') || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">

      {/* Modal de edição */}
      {editing && (
        <EditPatientModal
          patient={patient}
          onClose={() => setEditing(false)}
          onSaved={updated => { setPatient(updated); setEditing(false); }}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowDeleteConfirm(false); setDeleteError(null); } }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Excluir paciente</h3>
                <p className="text-sm text-slate-500">{patient.nome_completo}</p>
              </div>
            </div>
            {deleteError ? (
              <div className="mb-4 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{deleteError}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600 mb-5">
                Esta ação não pode ser desfeita. Todos os dados administrativos serão removidos permanentemente.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                className="btn-secondary">
                {deleteError ? 'Fechar' : 'Cancelar'}
              </button>
              {!deleteError && (
                <button onClick={handleDelete} disabled={deleteLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2">
                  {deleteLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Excluindo…</>
                    : 'Confirmar exclusão'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

        {/* Ações: novo termo + editar + excluir */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap gap-3">
          <Link
            href={`/patient-terms/new?patient_id=${patient.id}`}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Termo para este Paciente
          </Link>
          <button onClick={() => setEditing(true)}
            className="btn-secondary flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Editar
          </button>
          <button onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }}
            className="btn-ghost flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
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
