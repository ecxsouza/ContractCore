'use client';

import { useState } from 'react';
import { Clock, Eye, GitBranch } from 'lucide-react';
import clsx from 'clsx';

interface Version {
  id:                string;
  versao:            number;
  contrato_html:     string;
  alteracoes_resumo: string;
  created_at:        string;
}

interface Props {
  contractId:     string;
  currentVersion: number;
  versions:       Version[];
}

export function ContractVersionsClient({ contractId, currentVersion, versions }: Props) {
  const [viewing,  setViewing]  = useState<Version | null>(versions[0] || null);
  const [compare,  setCompare]  = useState<Version | null>(null);
  const [mode, setMode] = useState<'single' | 'compare'>('single');

  if (versions.length === 0) {
    return (
      <div className="cc-card flex flex-col items-center justify-center py-16 text-center">
        <Clock className="w-10 h-10 text-slate-300 mb-3" />
        <p className="font-semibold text-slate-500">Nenhuma versão registrada</p>
        <p className="text-slate-400 text-xs mt-1 max-w-xs">
          As versões são salvas automaticamente quando o contrato é atualizado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Controles */}
      <div className="cc-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setMode('single')}
            className={clsx('btn-secondary text-xs py-1.5 px-3',
              mode === 'single' && 'bg-brand-50 border-brand-300 text-brand-700')}>
            <Eye className="w-3.5 h-3.5" /> Visualizar
          </button>
          <button onClick={() => setMode('compare')} disabled={versions.length < 2}
            className={clsx('btn-secondary text-xs py-1.5 px-3',
              mode === 'compare' && 'bg-brand-50 border-brand-300 text-brand-700',
              versions.length < 2 && 'opacity-40')}>
            <GitBranch className="w-3.5 h-3.5" /> Comparar
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Versão atual: <strong>v{currentVersion}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Lista de versões */}
        <div className="lg:col-span-1">
          <div className="cc-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Versões</p>
            </div>
            <div className="divide-y divide-slate-50">
              {versions.map(v => (
                <button key={v.id}
                  onClick={() => {
                    if (mode === 'compare' && viewing && v.id !== viewing.id) {
                      setCompare(v);
                    } else {
                      setViewing(v);
                      setCompare(null);
                    }
                  }}
                  className={clsx(
                    'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors',
                    viewing?.id === v.id && 'bg-brand-50 border-l-2 border-brand-500',
                    compare?.id === v.id && 'bg-amber-50 border-l-2 border-amber-500'
                  )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-brand-900">v{v.versao}</span>
                    {v.versao === currentVersion && (
                      <span className="badge badge-green text-2xs">Atual</span>
                    )}
                  </div>
                  <p className="text-2xs text-slate-400">
                    {new Date(v.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  {v.alteracoes_resumo && (
                    <p className="text-2xs text-slate-500 mt-1 line-clamp-2">{v.alteracoes_resumo}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visualização */}
        <div className={clsx('lg:col-span-3', mode === 'compare' && compare ? 'grid grid-cols-2 gap-4' : '')}>

          {/* Versão principal */}
          {viewing && (
            <div className="cc-card overflow-hidden">
              <div className="px-4 py-2 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-700">
                  Versão {viewing.versao}
                  {viewing.versao === currentVersion && ' (atual)'}
                </span>
                <span className="text-2xs text-slate-400">
                  {new Date(viewing.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div
                className="contract-preview rounded-none border-0 max-h-[65vh] text-xs"
                dangerouslySetInnerHTML={{ __html: viewing.contrato_html }}
              />
            </div>
          )}

          {/* Versão de comparação */}
          {mode === 'compare' && compare && (
            <div className="cc-card overflow-hidden">
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700">
                  Versão {compare.versao} (comparando)
                </span>
                <button onClick={() => setCompare(null)} className="text-amber-400 hover:text-amber-600 text-sm">×</button>
              </div>
              <div
                className="contract-preview rounded-none border-0 max-h-[65vh] text-xs"
                dangerouslySetInnerHTML={{ __html: compare.contrato_html }}
              />
            </div>
          )}

          {/* Instrução de comparação */}
          {mode === 'compare' && !compare && (
            <div className="cc-card flex items-center justify-center">
              <div className="text-center p-8">
                <GitBranch className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Selecione outra versão para comparar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
