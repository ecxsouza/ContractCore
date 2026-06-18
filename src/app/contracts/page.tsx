import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { FileText, Plus, Zap } from 'lucide-react';
import { getStatusDisplay } from '@/lib/constants';

export const metadata = { title: 'Contratos' };


export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  let query = supabase
    .from('contracts')
    .select(`
      id, numero_contrato, versao, status, data_emissao,
      ia_revisado, assinado_contratante, assinado_prestador, created_at,
      service_providers ( nome_razao_social, profissao, especialidade )
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  if (resolvedParams.status) query = query.eq('status', resolvedParams.status);

  const { data: contracts } = await query;
  const statusKeys = ['rascunho','em_revisao','revisado_ia','aguardando_aprovacao','aguardando_assinatura','assinado','cancelado','arquivado','encerrado'];

  return (
    <AppLayout company={company}>
      <div className="space-y-6 animate-in">

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Contratos</h1>
            <p className="text-slate-500 text-sm">{contracts?.length || 0} contrato(s)</p>
          </div>
          <Link href="/contracts/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Novo Contrato
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/contracts"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              !resolvedParams.status
                ? 'border-brand-500 bg-brand-50 text-brand-800'
                : 'border-slate-200 text-slate-600 hover:border-brand-200'
            }`}
          >
            Todos ({contracts?.length || 0})
          </Link>
          {statusKeys.map(s => {
            const count = contracts?.filter(c => c.status === s).length || 0;
            if (count === 0) return null;
            return (
              <Link
                key={s}
                href={`/contracts?status=${s}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  resolvedParams.status === s
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-slate-200 text-slate-600 hover:border-brand-200'
                }`}
              >
                {getStatusDisplay(s).label} ({count})
              </Link>
            );
          })}
        </div>

        {contracts && contracts.length > 0 ? (
          <div className="cc-card overflow-hidden">
            <div className="divide-y divide-slate-50">
              {contracts.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/contracts/${c.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-brand-900 group-hover:text-brand-600 truncate">
                        {c.service_providers?.nome_razao_social || 'Prestador'}
                      </span>
                      {c.ia_revisado && (
                        <span className="badge badge-blue gap-1 flex-shrink-0">
                          <Zap className="w-2.5 h-2.5" /> IA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                      <span>{c.numero_contrato}</span>
                      <span>·</span>
                      <span>{c.service_providers?.profissao || '—'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`badge ${getStatusDisplay(c.status).cls}`}>
                      {getStatusDisplay(c.status).label}
                    </span>
                    <span className="text-2xs text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="cc-card flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-12 h-12 text-slate-300 mb-4" />
            <p className="font-semibold text-slate-500">Nenhum contrato ainda</p>
            <p className="text-slate-400 text-sm mt-1 mb-6">Crie seu primeiro contrato agora</p>
            <Link href="/contracts/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Criar Contrato
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
