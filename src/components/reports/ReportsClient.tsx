'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3, Download, FileText, Users,
  Filter, TrendingUp, ClipboardList, AlertTriangle, Clock,
} from 'lucide-react';
import type { Company } from '@/types';
import clsx from 'clsx';
import {
  getStatusDisplay,
  PATIENT_TERM_STATUS_LABELS,
  PATIENT_TERM_TYPE_LABELS,
  PATIENT_TERM_MODALIDADE_LABELS,
} from '@/lib/constants';

interface TermMetrics {
  total:          number;
  totalPacientes: number;
  porStatus:      Record<string, number>;
  porTipo:        Record<string, number>;
  porModalidade:  Record<string, number>;
  revisaoVencida: number;
  revisaoProxima: number;
}

interface Props {
  company:     Company;
  contracts:   any[];
  terms:       any[];
  termMetrics: TermMetrics;
}

type Aba = 'contratos' | 'termos';

export function ReportsClient({ company, contracts, terms, termMetrics }: Props) {
  const [aba,    setAba]    = useState<Aba>('contratos');
  const [filter, setFilter] = useState({ status: '', profissao: '', periodo: '' });

  // ── Filtros de contratos ──────────────────────────────────────────
  const filtered = contracts.filter(c => {
    const provider = c.service_providers;
    if (filter.status    && c.status            !== filter.status)    return false;
    if (filter.profissao && provider?.profissao !== filter.profissao) return false;
    if (filter.periodo) {
      const data = new Date(c.created_at);
      const now  = new Date();
      if (filter.periodo === '30d' && data < new Date(now.getTime() - 30*86400000)) return false;
      if (filter.periodo === '90d' && data < new Date(now.getTime() - 90*86400000)) return false;
      if (filter.periodo === 'ano' && data.getFullYear() !== now.getFullYear()) return false;
    }
    return true;
  });

  const metricas = {
    total:       filtered.length,
    assinados:   filtered.filter(c => c.status === 'assinado').length,
    rascunhos:   filtered.filter(c => c.status === 'rascunho').length,
    iaRevisados: filtered.filter(c => c.ia_revisado).length,
    porProfissao: filtered.reduce((acc: Record<string, number>, c: any) => {
      const p = c.service_providers?.profissao || 'outro';
      acc[p] = (acc[p] || 0) + 1; return acc;
    }, {}),
  };

  // ── CSV de Contratos ─────────────────────────────────────────────
  function downloadCSV() {
    const headers = ['Nº Contrato','Prestador','Profissão','Tipo','Status',
      'Data Emissão','Vigência','Remuneração','IA Revisado','Assinado Clínica','Assinado Prestador','E-mail','Telefone'];
    const rows = filtered.map(c => {
      const p   = c.service_providers;
      const rem = c.remuneration || {};
      const vig = c.vigencia_indeterminada ? 'Indeterminada' : `${c.data_vigencia_inicio || ''} a ${c.data_vigencia_fim || ''}`;
      return [c.numero_contrato, p?.nome_razao_social||'', p?.profissao||'', p?.tipo_pessoa||'',
        getStatusDisplay(c.status).label, c.data_emissao||'', vig, rem.valor_descricao||'',
        c.ia_revisado?'Sim':'Não', c.assinado_contratante?'Sim':'Não', c.assinado_prestador?'Sim':'Não',
        p?.email||'', p?.telefone||'']
        .map(v => `"${String(v).replace(/"/g,'""')}"`);
    });
    const csv  = [headers.map(h=>`"${h}"`).join(','), ...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ContractCore_Contratos_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── CSV de Termos ────────────────────────────────────────────────
  function downloadTermsCSV() {
    const headers = ['Nº Termo','Paciente','Menor','Tipo','Status','Modalidade','Área','Criado em','Revisão Recomendada'];
    const rows = terms.map((t: any) => {
      const tipoLabel = PATIENT_TERM_TYPE_LABELS[t.tipo_termo as keyof typeof PATIENT_TERM_TYPE_LABELS] || t.tipo_termo;
      const statusLabel = PATIENT_TERM_STATUS_LABELS[t.status as keyof typeof PATIENT_TERM_STATUS_LABELS] || t.status;
      const modalLabel  = t.modalidade ? (PATIENT_TERM_MODALIDADE_LABELS[t.modalidade] || t.modalidade) : '—';
      return [t.numero_termo, t.patients?.nome_completo||'', t.patients?.is_menor?'Sim':'Não',
        tipoLabel, statusLabel, modalLabel, t.area_servico||'',
        t.created_at?.split('T')[0]||'', t.data_revisao_recomendada||'']
        .map(v => `"${String(v).replace(/"/g,'""')}"`);
    });
    const csv  = [headers.map(h=>`"${h}"`).join(','), ...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ContractCore_Termos_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const profissoes = [...new Set(contracts.map(c => c.service_providers?.profissao).filter(Boolean))];

  return (
    <div className="space-y-6 animate-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Relatórios Documentais</h1>
          <p className="text-slate-500 text-sm">Exporte e analise dados dos documentos da clínica</p>
        </div>
        <div className="flex gap-2">
          {aba === 'contratos' && (
            <button onClick={downloadCSV} className="btn-primary flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Exportar CSV ({filtered.length})
            </button>
          )}
          {aba === 'termos' && (
            <button onClick={downloadTermsCSV} className="btn-primary flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Exportar CSV ({termMetrics.total})
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([
          { key: 'contratos', label: 'Contratos de Prestadores', icon: FileText },
          { key: 'termos',    label: 'Termos de Pacientes',      icon: ClipboardList },
        ] as const).map(tab => (
          <button key={tab.key} type="button"
            onClick={() => setAba(tab.key)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              aba === tab.key
                ? 'bg-white text-brand-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Aba: Contratos de Prestadores ── */}
      {aba === 'contratos' && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="cc-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-brand-800">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="cc-label">Status</label>
                <select className="cc-select" value={filter.status}
                  onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
                  <option value="">Todos</option>
                  {['rascunho','em_revisao','revisado_ia','aguardando_aprovacao','aguardando_assinatura','assinado','cancelado','arquivado','encerrado'].map(v => (
                    <option key={v} value={v}>{getStatusDisplay(v).label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="cc-label">Profissão</label>
                <select className="cc-select" value={filter.profissao}
                  onChange={e => setFilter(p => ({ ...p, profissao: e.target.value }))}>
                  <option value="">Todas</option>
                  {profissoes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="cc-label">Período</label>
                <select className="cc-select" value={filter.periodo}
                  onChange={e => setFilter(p => ({ ...p, periodo: e.target.value }))}>
                  <option value="">Todo período</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                  <option value="ano">Este ano</option>
                </select>
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total filtrado',   value: metricas.total,       icon: FileText,   cls: 'text-brand-600',   bg: 'bg-brand-50'   },
              { label: 'Assinados',        value: metricas.assinados,   icon: TrendingUp, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Rascunhos',        value: metricas.rascunhos,   icon: FileText,   cls: 'text-amber-600',   bg: 'bg-amber-50'   },
              { label: 'Revisados por IA', value: metricas.iaRevisados, icon: BarChart3,  cls: 'text-purple-600',  bg: 'bg-purple-50'  },
            ].map(m => (
              <div key={m.label} className="cc-card p-4">
                <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center mb-2`}>
                  <m.icon className={`w-4 h-4 ${m.cls}`} />
                </div>
                <div className="text-xl font-bold text-brand-900">{m.value}</div>
                <div className="text-xs text-slate-500">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Por profissão */}
          {Object.keys(metricas.porProfissao).length > 0 && (
            <div className="cc-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-brand-600" />
                <h2 className="font-semibold text-brand-900">Contratos por Profissão</h2>
              </div>
              <div className="space-y-3">
                {(Object.entries(metricas.porProfissao) as [string,number][])
                  .sort(([,a],[,b]) => b-a)
                  .map(([prof, count]) => {
                    const pct = Math.round((count/metricas.total)*100);
                    return (
                      <div key={prof}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-700 capitalize">{prof.replace(/_/g,' ')}</span>
                          <span className="text-sm font-semibold text-brand-900">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Tabela de contratos */}
          <div className="cc-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-brand-900">Lista de Contratos</h2>
              <span className="text-xs text-slate-400">{filtered.length} registro(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Nº','Prestador','Profissão','Status','Emissão','IA','Assinado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.slice(0,50).map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs font-mono text-brand-600 whitespace-nowrap">{c.numero_contrato}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-900 max-w-[160px] truncate">{c.service_providers?.nome_razao_social}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 capitalize">{c.service_providers?.profissao?.replace(/_/g,' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-2xs ${getStatusDisplay(c.status).cls}`}>{getStatusDisplay(c.status).label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {c.data_emissao ? new Date(c.data_emissao+'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">{c.ia_revisado ? '✓' : '—'}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        {c.assinado_contratante && c.assinado_prestador ? '✓ Ambos' :
                         c.assinado_contratante || c.assinado_prestador ? 'Parcial' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 50 && (
                <p className="px-6 py-3 text-xs text-slate-400 border-t border-slate-100">
                  Exibindo 50 de {filtered.length}. Use Exportar CSV para ver todos.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Aba: Termos de Pacientes ── */}
      {aba === 'termos' && (
        <div className="space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total de Termos', value: termMetrics.total,          icon: ClipboardList, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pacientes',       value: termMetrics.totalPacientes,  icon: Users,         cls: 'text-brand-600',   bg: 'bg-brand-50'   },
              { label: 'Rev. Vencida',    value: termMetrics.revisaoVencida,  icon: AlertTriangle, cls: 'text-red-600',     bg: 'bg-red-50'     },
              { label: 'Rev. Próxima',    value: termMetrics.revisaoProxima,  icon: Clock,         cls: 'text-amber-600',   bg: 'bg-amber-50'   },
            ].map(m => (
              <div key={m.label} className="cc-card p-4">
                <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center mb-2`}>
                  <m.icon className={`w-4 h-4 ${m.cls}`} />
                </div>
                <div className="text-xl font-bold text-brand-900">{m.value}</div>
                <div className="text-xs text-slate-500">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Por status */}
          {Object.keys(termMetrics.porStatus).length > 0 && (
            <div className="cc-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-brand-900">Termos por Status</h2>
              </div>
              <div className="space-y-3">
                {(Object.entries(termMetrics.porStatus) as [string,number][])
                  .sort(([,a],[,b]) => b-a)
                  .map(([status, count]) => {
                    const pct   = termMetrics.total > 0 ? Math.round((count/termMetrics.total)*100) : 0;
                    const label = PATIENT_TERM_STATUS_LABELS[status as keyof typeof PATIENT_TERM_STATUS_LABELS] || status;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-700">{label}</span>
                          <span className="text-sm font-semibold text-brand-900">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Por tipo e por modalidade lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Por tipo */}
            <div className="cc-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-brand-900">Termos por Tipo</h2>
              </div>
              {Object.keys(termMetrics.porTipo).length > 0 ? (
                <div className="space-y-3">
                  {(Object.entries(termMetrics.porTipo) as [string,number][])
                    .sort(([,a],[,b]) => b-a)
                    .map(([tipo, count]) => {
                      const pct   = termMetrics.total > 0 ? Math.round((count/termMetrics.total)*100) : 0;
                      const label = PATIENT_TERM_TYPE_LABELS[tipo as keyof typeof PATIENT_TERM_TYPE_LABELS] || tipo;
                      return (
                        <div key={tipo}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">{label}</span>
                            <span className="text-xs font-semibold text-brand-900">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhum dado disponível.</p>
              )}
            </div>

            {/* Por modalidade */}
            <div className="cc-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-brand-900">Termos por Modalidade</h2>
              </div>
              {Object.keys(termMetrics.porModalidade).length > 0 ? (
                <div className="space-y-3">
                  {(Object.entries(termMetrics.porModalidade) as [string,number][])
                    .sort(([,a],[,b]) => b-a)
                    .map(([mod, count]) => {
                      const pct   = termMetrics.total > 0 ? Math.round((count/termMetrics.total)*100) : 0;
                      const label = PATIENT_TERM_MODALIDADE_LABELS[mod] || mod;
                      return (
                        <div key={mod}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">{label}</span>
                            <span className="text-xs font-semibold text-brand-900">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhum dado disponível.</p>
              )}
            </div>
          </div>

          {/* Tabela de termos */}
          <div className="cc-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-brand-900">Lista de Termos</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{terms.length} registro(s)</span>
                <Link href="/patient-terms/new" className="btn-secondary text-xs flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Novo Termo
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Nº Termo','Paciente','Tipo','Status','Modalidade','Criado em','Revisão'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {terms.slice(0,50).map((t: any) => {
                    const tipoLabel   = PATIENT_TERM_TYPE_LABELS[t.tipo_termo as keyof typeof PATIENT_TERM_TYPE_LABELS] || t.tipo_termo;
                    const statusLabel = PATIENT_TERM_STATUS_LABELS[t.status as keyof typeof PATIENT_TERM_STATUS_LABELS] || t.status;
                    const modalLabel  = t.modalidade ? (PATIENT_TERM_MODALIDADE_LABELS[t.modalidade] || t.modalidade) : '—';
                    const createdBR   = t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '—';
                    const revisaoBR   = t.data_revisao_recomendada
                      ? t.data_revisao_recomendada.split('-').reverse().join('/')
                      : '—';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs font-mono text-emerald-700 whitespace-nowrap">{t.numero_termo}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900 max-w-[140px] truncate">{t.patients?.nome_completo || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[120px] truncate">{tipoLabel}</td>
                        <td className="px-4 py-3">
                          <span className="badge text-2xs bg-emerald-100 text-emerald-700">{statusLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{modalLabel}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{createdBR}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{revisaoBR}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {terms.length > 50 && (
                <p className="px-6 py-3 text-xs text-slate-400 border-t border-slate-100">
                  Exibindo 50 de {terms.length}. Use Exportar CSV para ver todos.
                </p>
              )}
            </div>
          </div>

          {/* Atalhos */}
          <div className="flex flex-wrap gap-2">
            <Link href="/patient-terms" className="btn-ghost text-xs flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Ver todos os termos
            </Link>
            <Link href="/patients" className="btn-ghost text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Ver pacientes
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
