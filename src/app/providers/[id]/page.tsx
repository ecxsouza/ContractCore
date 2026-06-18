import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, FileText, Users, Plus, Zap } from 'lucide-react';
import { formatDateBR } from '@/lib/masks';
import { getStatusDisplay } from '@/lib/constants';

export const metadata = { title: 'Prestador' };


export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  // Buscar prestador
  const { data: provider } = await supabase
    .from('service_providers')
    .select('*')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (!provider) notFound();

  // Buscar todos os contratos deste prestador
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('provider_id', id)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  const PROFISSAO_LABELS: Record<string, string> = {
    psicologo: 'Psicólogo(a)', neuropsicologo: 'Neuropsicólogo(a)',
    fonoaudiologo: 'Fonoaudiólogo(a)', psicopedagogo: 'Psicopedagogo(a)',
    secretaria: 'Secretária', recepcionista: 'Recepcionista',
    coordenador: 'Coordenador(a)', outro: 'Outro',
  };

  return (
    <AppLayout company={company}>
      <div className="max-w-4xl mx-auto space-y-6 animate-in">

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/providers" className="hover:text-brand-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Prestadores
          </Link>
          <span>/</span>
          <span className="text-brand-800 font-medium">{provider.nome_razao_social}</span>
        </div>

        {/* Card do prestador */}
        <div className="cc-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-7 h-7 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-brand-900">{provider.nome_razao_social}</h1>
                <span className="badge badge-blue">{provider.tipo_pessoa}</span>
              </div>
              <p className="text-slate-500 text-sm mt-1">
                {PROFISSAO_LABELS[provider.profissao] || provider.profissao}
                {provider.especialidade && ` — ${provider.especialidade}`}
              </p>
              {provider.conselho_profissional && (
                <p className="text-slate-400 text-xs mt-1">
                  {provider.conselho_profissional}: {provider.numero_registro_conselho || 'Não informado'}
                </p>
              )}
            </div>
            <Link
              href={`/contracts/new?provider_id=${provider.id}`}
              className="btn-primary flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Novo Contrato
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'E-mail',    value: provider.email    || '—' },
              { label: 'Telefone',  value: provider.telefone || '—' },
              { label: 'Cidade',    value: provider.cidade ? `${provider.cidade}/${provider.uf}` : '—' },
              { label: 'Contratos', value: String(contracts?.length || 0) },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                <div className="text-2xs text-slate-400 uppercase tracking-widest font-semibold mb-1">{item.label}</div>
                <div className="text-sm font-semibold text-brand-900 truncate">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico de contratos */}
        <div className="cc-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-brand-900">Histórico de Contratos</h2>
          </div>

          {contracts && contracts.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {contracts.map((contract: any) => (
                <Link key={contract.id} href={`/contracts/${contract.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-brand-900 group-hover:text-brand-600">
                        {contract.numero_contrato}
                      </span>
                      {contract.ia_revisado && (
                        <span className="badge badge-blue gap-1 text-2xs">
                          <Zap className="w-2.5 h-2.5" /> IA
                        </span>
                      )}
                      {contract.is_renovacao && (
                        <span className="badge badge-yellow text-2xs">Renovação</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Emitido em {formatDateBR(contract.data_emissao)} · v{contract.versao}
                      {!contract.vigencia_indeterminada && contract.data_vigencia_fim &&
                        ` · Vence em ${formatDateBR(contract.data_vigencia_fim)}`}
                    </div>
                  </div>
                  <span className={`badge ${getStatusDisplay(contract.status).cls} flex-shrink-0`}>
                    {getStatusDisplay(contract.status).label}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum contrato ainda</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
