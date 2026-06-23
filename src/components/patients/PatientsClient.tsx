'use client';

// ================================================================
// PatientsClient — listagem de pacientes cadastrados
// Busca via GET /api/patients com query ?q= para nome/CPF.
// NÃO exibe dados clínicos.
// ================================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Loader2, User, Phone, Mail, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

function maskCPFDisplay(cpf?: string | null): string {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export function PatientsClient() {
  const router  = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [query,    setQuery]    = useState('');
  const [search,   setSearch]   = useState('');

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
    setSearch('');
    setQuery('');
    fetchPatients();
  }

  return (
    <div className="space-y-6 animate-in">
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
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CPF…"
            className="cc-input w-full pl-9" />
        </div>
        <button type="submit" className="btn-secondary">Buscar</button>
        {query && (
          <button type="button" onClick={handleClearSearch}
            className="btn-ghost text-sm">
            Limpar
          </button>
        )}
      </form>

      {/* Conteúdo */}
      {loading ? (
        <div className="cc-card flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="cc-card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={() => fetchPatients()}
            className="btn-secondary mt-4 text-sm">
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
            {query
              ? 'Tente outro termo de busca'
              : 'Os pacientes são cadastrados ao criar um novo termo'}
          </p>
          <Link href="/patient-terms/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Termo
          </Link>
        </div>
      ) : (
        <div className="cc-card overflow-hidden">
          <div className="divide-y divide-slate-50">
            {patients.map(p => (
              <button
                key={p.id}
                onClick={() => router.push(`/patients/${p.id}`)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
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
                    {p.cpf && (
                      <span>{maskCPFDisplay(p.cpf)}</span>
                    )}
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
                {p.is_menor && (
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
