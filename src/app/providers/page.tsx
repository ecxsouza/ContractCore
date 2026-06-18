import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Plus, FileText, Phone, Mail, Building2, Search } from 'lucide-react';
import { ProviderActions } from '@/components/providers/ProviderActions';
import { NewProviderButton } from '@/components/providers/NewProviderButton';

export const metadata = { title: 'Prestadores' };

const PROFISSAO_LABELS: Record<string, string> = {
  psicologo:      'Psicólogo(a)',
  neuropsicologo: 'Neuropsicólogo(a)',
  fonoaudiologo:  'Fonoaudiólogo(a)',
  psicopedagogo:  'Psicopedagogo(a)',
  secretaria:     'Secretária',
  recepcionista:  'Recepcionista',
  coordenador:    'Coordenador(a)',
  outro:          'Outro',
};

const TIPO_BADGE: Record<string, string> = {
  PJ:  'badge-blue',
  MEI: 'badge-yellow',
  PF:  'badge-gray',
};

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; profissao?: string }>;
}) {
  const { q, profissao } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  // Buscar prestadores com contagem de contratos
  let query = supabase
    .from('service_providers')
    .select(`
      *,
      contracts (id, status, numero_contrato, created_at)
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  if (profissao) query = query.eq('profissao', profissao);

  const { data: providers } = await query;

  // Filtro por nome no cliente (simples)
  const filtered = providers?.filter(p =>
    !q || p.nome_razao_social.toLowerCase().includes(q.toLowerCase())
  ) || [];

  // Profissões únicas para filtro
  const profissoes = [...new Set(providers?.map(p => p.profissao) || [])];

  return (
    <AppLayout company={company}>
      <div className="space-y-6 animate-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Prestadores</h1>
            <p className="text-slate-500 text-sm">
              {filtered.length} prestador(es) cadastrado(s)
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="cc-card p-4">
          <div className="flex flex-wrap gap-3">
            {/* Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <form>
                <input
                  name="q"
                  defaultValue={q}
                  className="cc-input pl-9"
                  placeholder="Buscar por nome..."
                />
              </form>
            </div>
            {/* Filtro profissão */}
            <div className="flex flex-wrap gap-2 items-center">
              <Link href="/providers"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  !profissao ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-200'
                }`}>
                Todos
              </Link>
              {profissoes.map(prof => (
                <Link key={prof} href={`/providers?profissao=${prof}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    profissao === prof ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-200'
                  }`}>
                  {PROFISSAO_LABELS[prof] || prof}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Lista */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((provider: any) => {
              const contracts = provider.contracts || [];
              const ativos = contracts.filter((c: any) =>
                ['rascunho', 'aguardando_assinatura', 'assinado'].includes(c.status)
              ).length;
              const ultimo = contracts.sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];

              return (
                <div key={provider.id} className="cc-card p-5 hover:shadow-card-md transition-all group">
                  {/* Header do card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-900 text-sm truncate">
                          {provider.nome_razao_social}
                        </p>
                        <p className="text-xs text-slate-500">
                          {PROFISSAO_LABELS[provider.profissao] || provider.profissao}
                          {provider.especialidade && ` — ${provider.especialidade}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${TIPO_BADGE[provider.tipo_pessoa] || 'badge-gray'}`}>
                        {provider.tipo_pessoa}
                      </span>
                      <ProviderActions
                        provider={provider}
                        contractCount={contracts.length}
                      />
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="space-y-1.5 mb-4">
                    {provider.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{provider.email}</span>
                      </div>
                    )}
                    {provider.telefone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{provider.telefone}</span>
                      </div>
                    )}
                    {provider.conselho_profissional && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {provider.conselho_profissional}: {provider.numero_registro_conselho || 'Não informado'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contratos */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {contracts.length} contrato(s) · {ativos} ativo(s)
                      </span>
                    </div>
                    {ultimo && (
                      <Link
                        href={`/contracts/${ultimo.id}`}
                        className="text-xs text-brand-600 hover:underline font-medium"
                      >
                        Ver último →
                      </Link>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/contracts/new?provider_id=${provider.id}`}
                      className="btn-primary text-xs py-1.5 px-3 flex-1 justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo Contrato
                    </Link>
                    <Link
                      href={`/providers/${provider.id}`}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Ver histórico
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="cc-card flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <p className="font-semibold text-slate-500">
              {q || profissao ? 'Nenhum prestador encontrado' : 'Nenhum prestador ainda'}
            </p>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              {q || profissao
                ? 'Tente outros filtros'
                : 'Os prestadores aparecerão aqui após o primeiro contrato ser criado'}
            </p>
            <Link href="/contracts/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Criar Primeiro Contrato
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
