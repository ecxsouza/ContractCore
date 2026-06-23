import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Plus, CheckCircle, Clock,
  TrendingUp, Zap, Shield, ClipboardList,
  Users, AlertTriangle, Calendar,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { getStatusDisplay } from '@/lib/constants';

export const metadata = { title: 'Dashboard' };

// Data de hoje em formato ISO para comparar revisão recomendada
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function in30DaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  // ── Contratos de Prestadores ───────────────────────────────────
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, status, ia_revisado, created_at')
    .eq('company_id', company.id);

  const totalContratos = contracts?.length || 0;
  const assinados      = contracts?.filter(c => c.status === 'assinado').length   || 0;
  const rascunhos      = contracts?.filter(c => c.status === 'rascunho').length   || 0;
  const iaRevisados    = contracts?.filter(c => c.ia_revisado).length             || 0;

  const { data: recentes } = await supabase
    .from('contracts')
    .select(`id, numero_contrato, status, created_at, ia_revisado,
             service_providers (nome_razao_social, profissao)`)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // ── Termos de Pacientes ────────────────────────────────────────
  const { data: terms } = await supabase
    .from('patient_terms')
    .select('id, status, data_revisao_recomendada, created_at')
    .eq('company_id', company.id);

  const { count: totalPacientes } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company.id);

  const hoje    = todayISO();
  const em30    = in30DaysISO();

  const totalTermos           = terms?.length || 0;
  const termosAtivos          = terms?.filter(t => t.status === 'ativo').length              || 0;
  const termosAssinados       = terms?.filter(t => t.status === 'assinado').length           || 0;
  const termosPendAssinatura  = terms?.filter(t => t.status === 'pendente_assinatura').length || 0;
  const terminados            = terms?.filter(t => t.status === 'cancelado' || t.status === 'expirado').length || 0;

  // Revisão vencida (data <= hoje, com data preenchida)
  const revisaoVencida = terms?.filter(t =>
    t.data_revisao_recomendada && t.data_revisao_recomendada <= hoje &&
    (t.status === 'ativo' || t.status === 'assinado')
  ).length || 0;

  // Revisão próxima (data entre hoje e hoje+30 dias)
  const revisaoProxima = terms?.filter(t =>
    t.data_revisao_recomendada && t.data_revisao_recomendada > hoje &&
    t.data_revisao_recomendada <= em30 &&
    (t.status === 'ativo' || t.status === 'assinado')
  ).length || 0;

  return (
    <AppLayout company={company}>
      <div className="space-y-8 animate-in">

        {/* Cabeçalho */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {company.logo_url && (
              <img src={company.logo_url} alt={company.nome_fantasia}
                className="h-10 w-auto object-contain flex-shrink-0" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5">Visão geral dos documentos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/contracts/new" className="btn-primary flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Novo Contrato
            </Link>
            <Link href="/patient-terms/new" className="btn-secondary flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4" /> Novo Termo
            </Link>
          </div>
        </div>

        {/* ── Termos de Pacientes ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-brand-900 text-sm">Termos de Pacientes</h2>
            <Link href="/patient-terms" className="ml-auto text-xs text-brand-600 hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total de Termos',   value: totalTermos,          icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50'  },
              { label: 'Ativos',            value: termosAtivos,         icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50'  },
              { label: 'Pend. Assinatura',  value: termosPendAssinatura, icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50'    },
              { label: 'Pacientes',         value: totalPacientes || 0,  icon: Users,         color: 'text-brand-600',   bg: 'bg-brand-50'    },
            ].map(m => (
              <div key={m.label} className="cc-card p-5">
                <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                </div>
                <div className="text-2xl font-bold text-brand-900">{m.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Alerta de revisão */}
          {(revisaoVencida > 0 || revisaoProxima > 0) && (
            <div className={`cc-card p-4 flex items-start gap-3 border ${
              revisaoVencida > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
            }`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                revisaoVencida > 0 ? 'text-red-500' : 'text-amber-500'
              }`} />
              <div className="text-xs text-slate-700">
                {revisaoVencida > 0 && (
                  <p className="font-semibold text-red-700 mb-0.5">
                    {revisaoVencida} termo(s) com revisão vencida — recomenda-se atualização.
                  </p>
                )}
                {revisaoProxima > 0 && (
                  <p className="text-amber-700">
                    {revisaoProxima} termo(s) com revisão recomendada nos próximos 30 dias.
                  </p>
                )}
                <Link href="/patient-terms" className="text-brand-600 hover:underline mt-1 inline-block">
                  Ver termos →
                </Link>
              </div>
            </div>
          )}

          {/* Mini-atalhos */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { href: '/patient-terms', label: 'Todos os Termos', icon: ClipboardList },
              { href: '/patients',      label: 'Pacientes',       icon: Users         },
              { href: '/patient-terms/new', label: 'Novo Termo',  icon: Plus          },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="cc-card p-4 flex flex-col items-center gap-2 text-center hover:border-emerald-200 hover:bg-emerald-50 transition-all group">
                <a.icon className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-slate-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>


        {/* ── Contratos de Prestadores ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-brand-900 text-sm">Contratos de Prestadores</h2>
            <Link href="/contracts" className="ml-auto text-xs text-brand-600 hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total de Contratos', value: totalContratos, icon: FileText,    color: 'text-brand-600',   bg: 'bg-brand-50'   },
              { label: 'Assinados',          value: assinados,      icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Rascunhos',          value: rascunhos,      icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50'   },
              { label: 'Revisados por IA',   value: iaRevisados,    icon: Zap,         color: 'text-purple-600',  bg: 'bg-purple-50'  },
            ].map(m => (
              <div key={m.label} className="cc-card p-5">
                <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                </div>
                <div className="text-2xl font-bold text-brand-900">{m.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Grid inferior: contratos recentes + painéis laterais ── */}
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
                  <Link key={c.id} href={`/contracts/${c.id}`}
                    className="flex flex-col gap-2 px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors group sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3 sm:contents">
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
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pl-12 sm:pl-0 sm:flex-shrink-0">
                      {c.ia_revisado && (
                        <span className="badge badge-blue gap-1 text-2xs">
                          <Zap className="w-2.5 h-2.5" /> IA
                        </span>
                      )}
                      <span className={`badge ${getStatusDisplay(c.status).cls} text-2xs`}>
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
                <Link href="/contracts/new" className="btn-primary text-xs flex items-center gap-1.5">
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
                  'Jurídico Empresarial', 'Advogado Trabalhista',
                  'Direito da Saúde', 'Especialista CFP/CRP',
                  'Contador & DP', 'LGPD & Dados', 'Ética Profissional',
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

            {/* Resumo de termos */}
            <div className="cc-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-brand-900 text-sm">Termos de Pacientes</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Ativos</span>
                  <span className="font-semibold text-brand-900">{termosAtivos}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Assinados</span>
                  <span className="font-semibold text-brand-900">{termosAssinados}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Cancelados/Expirados</span>
                  <span className="font-semibold text-brand-900">{terminados}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Pacientes</span>
                  <span className="font-semibold text-brand-900">{totalPacientes || 0}</span>
                </div>
              </div>
              <Link href="/patient-terms" className="btn-ghost text-xs mt-3 -ml-1 px-2">
                Ver termos →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
