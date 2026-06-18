'use client';

import { useState } from 'react';
import { BarChart3, Download, FileText, Users, Filter, TrendingUp } from 'lucide-react';
import type { Company } from '@/types';
import clsx from 'clsx';
import { getStatusDisplay } from '@/lib/constants';

interface Props {
  company:   Company;
  contracts: any[];
}


export function ReportsClient({ company, contracts }: Props) {
  const [filter, setFilter] = useState({ status: '', profissao: '', periodo: '' });

  // Filtrar contratos
  const filtered = contracts.filter(c => {
    const provider = c.service_providers;
    if (filter.status    && c.status            !== filter.status)    return false;
    if (filter.profissao && provider?.profissao !== filter.profissao) return false;
    if (filter.periodo) {
      const data = new Date(c.created_at);
      const now  = new Date();
      if (filter.periodo === '30d' && data < new Date(now.getTime() - 30*86400000)) return false;
      if (filter.periodo === '90d' && data < new Date(now.getTime() - 90*86400000)) return false;
      if (filter.periodo === 'ano' && data.getFullYear() !== now.getFullYear())       return false;
    }
    return true;
  });

  // Métricas do relatório
  const metricas = {
    total:        filtered.length,
    assinados:    filtered.filter(c => c.status === 'assinado').length,
    rascunhos:    filtered.filter(c => c.status === 'rascunho').length,
    iaRevisados:  filtered.filter(c => c.ia_revisado).length,
    porProfissao: filtered.reduce((acc: Record<string, number>, c: any) => {
      const p = c.service_providers?.profissao || 'outro';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {}),
  };

  // Gerar CSV
  function downloadCSV() {
    const headers = [
      'Nº Contrato', 'Prestador', 'Profissão', 'Tipo', 'Status',
      'Data Emissão', 'Vigência', 'Remuneração', 'IA Revisado',
      'Assinado Clínica', 'Assinado Prestador', 'E-mail', 'Telefone'
    ];

    const rows = filtered.map(c => {
      const p  = c.service_providers;
      const rem = c.remuneration || {};
      const vig = c.vigencia_indeterminada
        ? 'Indeterminada'
        : `${c.data_vigencia_inicio || ''} a ${c.data_vigencia_fim || ''}`;

      return [
        c.numero_contrato,
        p?.nome_razao_social || '',
        p?.profissao         || '',
        p?.tipo_pessoa       || '',
        getStatusDisplay(c.status).label,
        c.data_emissao       || '',
        vig,
        rem.valor_descricao  || '',
        c.ia_revisado ? 'Sim' : 'Não',
        c.assinado_contratante ? 'Sim' : 'Não',
        c.assinado_prestador   ? 'Sim' : 'Não',
        p?.email    || '',
        p?.telefone || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
    const bom  = '\uFEFF'; // BOM para Excel reconhecer UTF-8
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ContractCore_Relatorio_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Profissões únicas
  const profissoes = [...new Set(contracts.map(c => c.service_providers?.profissao).filter(Boolean))];

  return (
    <div className="space-y-6 animate-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Relatórios</h1>
          <p className="text-slate-500 text-sm">Exporte e analise dados dos seus contratos</p>
        </div>
        <button onClick={downloadCSV} className="btn-primary">
          <Download className="w-4 h-4" /> Exportar CSV ({filtered.length})
        </button>
      </div>

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

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total filtrado', value: metricas.total,       icon: FileText,   cls: 'text-brand-600',   bg: 'bg-brand-50'   },
          { label: 'Assinados',      value: metricas.assinados,   icon: TrendingUp, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rascunhos',      value: metricas.rascunhos,   icon: FileText,   cls: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Revisados por IA', value: metricas.iaRevisados, icon: BarChart3, cls: 'text-purple-600', bg: 'bg-purple-50' },
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
            {(Object.entries(metricas.porProfissao) as [string, number][])
              .sort(([, a], [, b]) => b - a)
              .map(([prof, count]) => {
                const pct = Math.round((count / metricas.total) * 100);
                return (
                  <div key={prof}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 capitalize">{prof.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold text-brand-900">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tabela resumo */}
      <div className="cc-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-brand-900">Lista de Contratos</h2>
          <span className="text-xs text-slate-400">{filtered.length} registro(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Nº', 'Prestador', 'Profissão', 'Status', 'Emissão', 'IA', 'Assinado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.slice(0, 50).map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-mono text-brand-600 whitespace-nowrap">{c.numero_contrato}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-900 max-w-[160px] truncate">{c.service_providers?.nome_razao_social}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 capitalize">{c.service_providers?.profissao?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-2xs ${getStatusDisplay(c.status).cls}`}>
                      {getStatusDisplay(c.status).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {c.data_emissao ? new Date(c.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">{c.ia_revisado ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {c.assinado_contratante && c.assinado_prestador ? '✓ Ambos' :
                     c.assinado_contratante ? 'Parcial' :
                     c.assinado_prestador   ? 'Parcial' : '—'}
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
  );
}
