'use client';

// ================================================================
// PatientsClient — listagem de pacientes com edição e exclusão
// NÃO exibe dados clínicos.
// ================================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Users, Loader2, User, Phone, Mail,
  ShieldAlert, Pencil, Trash2, AlertTriangle, X,
} from 'lucide-react';
import { EditPatientModal } from '@/components/patients/EditPatientModal';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function maskCPFDisplay(cpf?: string | null): string {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export function PatientsClient() {
  const router  = useRouter();
  const [patients,      setPatients]      = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [query,         setQuery]         = useState('');
  const [search,        setSearch]        = useState('');

  // Estado de edição
  const [editingPatient, setEditingPatient] = useState<any | null>(null);

  // Estado de exclusão
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPatients = useCallback((q?: string) => {
    setLoading(true);
    setError(null);
    const url = q ? `/api/patients?q=${encodeURIComponent(q)}` : '/api/patients';
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setPatients(d.patients || []))
      .catch(() => setError('Não foi possível carregar os pacientes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchPatients(search.trim() || undefined);
    setQuery(search.trim());
  }

  function handleClearSearch() {
    setSearch(''); setQuery(''); fetchPatients();
  }

  // Edição — atualiza lista local após salvar
  function handleSaved(updated: any) {
    setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditingPatient(null);
  }

  // Exclusão
  async function handleDelete(id: string) {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      if (res.status === 409) {
        const err = await res.json();
        setDeleteError(err.error || 'Paciente possui termos vinculados.');
        return;
      }
      if (!res.ok) throw new Error('Erro ao excluir');
      toast.success('Paciente excluído');
      setDeletingId(null);
      setPatients(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setDeleteLoading(false);
    }
  }

  const deletingPatient = patients.find(p => p.id === deletingId);

  return (
    <div className="space-y-6 animate-in">
      {/* Modal de edição */}
      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {deletingId && deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={e => { if (e.target === e.currentTarget) { setDeletingId(null); setDeleteError(null); } }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Excluir paciente</h3>
                <p className="text-sm text-slate-500">{deletingPatient.nome_completo}</p>
              </div>
            </div>
            {deleteError ? (
              <div className="mb-4 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{deleteError}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600 mb-5">
                Esta ação não pode ser desfeita. Todos os dados administrativos do paciente serão removidos permanentemente.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeletingId(null); setDeleteError(null); }}
                className="btn-secondary">
                {deleteError ? 'Fechar' : 'Cancelar'}
              </button>
              {!deleteError && (
                <button onClick={() => handleDelete(deletingId)} disabled={deleteLoading}
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

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Pacientes</h1>
          <p className="text-slate-500 text-sm">
            {loading ? 'Carregando…' : `${patients.length} paciente(s)${query ? ` para "${query}"` : ''}`}
          </p>
        </div>
        <Link href="/patient-terms/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Termo
        </Link>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CPF…" className="cc-input w-full pl-9" />
        </div>
        <button type="submit" className="btn-secondary">Buscar</button>
        {query && (
          <button type="button" onClick={handleClearSearch} className="btn-ghost text-sm">
            Limpar
          </button>
        )}
      </form>

      {/* Lista */}
      {loading ? (
        <div className="cc-card flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="cc-card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={() => fetchPatients()} className="btn-secondary mt-4 text-sm">
            Tentar novamente
          </button>
        </div>
      ) : patients.length === 0 ? (
        <div className="cc-card flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-slate-300 mb-4" />
          <p className="font-semibold text-slate-500">
            {query ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </p>
          <p className="text-slate-400 text-sm mt-1 mb-6">
            {query ? 'Tente outro termo de busca' : 'Os pacientes são cadastrados ao criar um novo termo'}
          </p>
          <Link href="/patient-terms/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Termo
          </Link>
        </div>
      ) : (
        <div className="cc-card overflow-hidden">
          <div className="divide-y divide-slate-50">
            {patients.map(p => (
              <div key={p.id}
                className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors group">
                {/* Clicável para detalhe */}
                <button onClick={() => router.push(`/patients/${p.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-brand-900 group-hover:text-brand-600 truncate">
                        {p.nome_completo}
                      </span>
                      {p.is_menor && (
                        <span className="badge text-2xs bg-amber-100 text-amber-700 border-amber-200 flex-shrink-0">
                          Menor
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-2xs text-slate-400">
                      {p.cpf && <span>{maskCPFDisplay(p.cpf)}</span>}
                      {p.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />{p.telefone}
                        </span>
                      )}
                      {p.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-2.5 h-2.5" />{p.email}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Ações */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setEditingPatient(p); }}
                    title="Editar paciente"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeletingId(p.id); setDeleteError(null); }}
                    title="Excluir paciente"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
