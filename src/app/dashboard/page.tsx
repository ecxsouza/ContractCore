import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Plus, CheckCircle, Clock,
  TrendingUp, Zap, Shield
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { getStatusDisplay } from '@/lib/constants';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();

  if (!company) redirect('/settings/company?onboarding=true');

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, status, ia_revisado, created_at')
    .eq('company_id', company.id);

  const total       = contracts?.length || 0;
  const assinados   = contracts?.filter(c => c.status === 'assinado').length || 0;
  const rascunhos   = contracts?.filter(c => c.status === 'rascunho').length || 0;
  const iaRevisados = contracts?.filter(c => c.ia_revisado).length || 0;

  const { data: recentes } = await supabase
    .from('contracts')
    .select(`
      id, numero_contrato, status, created_at, ia_revisado,
      service_providers (nome_razao_social, profissao)
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(5);


  return (
    <AppLayout company={company}>
      <div className="space-y-8 animate-in">

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt={company.nome_fantasia}
                className="h-10 w-auto object-contain flex-shrink-0"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {company.nome_fantasia} · Visão geral dos contratos
              </p>
            </div>
          </div>
          <Link href="/contracts/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo Contrato
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de Contratos', value: total,       icon: FileText,    color: 'text-brand-600',   bg: 'bg-brand-50' },
            { label: 'Assinados',          value: assinados,   icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Rascunhos',          value: rascunhos,   icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Revisados por IA',   value: iaRevisados, icon: Zap,         color: 'text-purple-600',  bg: 'bg-purple-50' },
          ].map((m) => (
            <div key={m.label} className="cc-card p-5">
              <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <div className="text-2xl font-bold text-brand-900">{m.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 cc-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-brand-900">Contratos Recentes</h2>
              <Link href="/contracts" className="text-xs text-brand-600 hover:underline font-medium">
                Ver todos →
              </Link>
            </div>

            {recentes && recentes.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {recentes.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-brand-900 truncate group-hover:text-brand-600">
                        {c.service_providers?.nome_razao_social || 'Prestador'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {c.numero_contrato} · {c.service_providers?.profissao}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.ia_revisado && (
                        <span className="badge badge-blue gap-1">
                          <Zap className="w-2.5 h-2.5" /> IA
                        </span>
                      )}
                      <span className={`badge ${getStatusDisplay(c.status).cls}`}>
                        {getStatusDisplay(c.status).label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">Nenhum contrato ainda</p>
                <p className="text-slate-400 text-xs mt-1 mb-4">Crie seu primeiro contrato agora</p>
                <Link href="/contracts/new" className="btn-primary text-xs">
                  <Plus className="w-3.5 h-3.5" /> Criar Contrato
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="cc-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-brand-600" />
                <h3 className="font-semibold text-brand-900 text-sm">Mesa Técnica Ativa</h3>
              </div>
              <div className="space-y-2">
                {[
                  'Jurídico Empresarial',
                  'Advogado Trabalhista',
                  'Direito da Saúde',
                  'Especialista CFP/CRP',
                  'Contador & DP',
                  'LGPD & Dados',
                  'Ética Profissional',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="cc-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                <h3 className="font-semibold text-brand-900 text-sm">Empresa</h3>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <div className="font-medium text-brand-800">{company.razao_social}</div>
                <div>{company.cnpj}</div>
                <div>{company.cidade}/{company.uf}</div>
              </div>
              <Link href="/settings/company" className="btn-ghost text-xs mt-3 -ml-1 px-2">
                Editar dados →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
