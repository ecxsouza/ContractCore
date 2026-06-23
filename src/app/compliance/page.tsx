import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  AlertTriangle, CheckCircle, Clock, FileText,
  Shield, ClipboardList, Users, Calendar,
} from 'lucide-react';
import { ComplianceRefreshButton } from '@/components/compliance/ComplianceRefreshButton';
import { formatDateBR } from '@/lib/masks';
import {
  PATIENT_TERM_STATUS_LABELS,
  getPatientTermStatusDisplay,
} from '@/lib/constants';
import clsx from 'clsx';

export const metadata = { title: 'Compliance' };

const GRAVIDADE_CONFIG = {
  atencao:    { cls: 'bg-blue-50 border-blue-200',   icon: Clock,          dot: 'bg-blue-400',  label: 'Atenção'    },
  importante: { cls: 'bg-amber-50 border-amber-200', icon: AlertTriangle,  dot: 'bg-amber-400', label: 'Importante' },
  critico:    { cls: 'bg-red-50 border-red-200',     icon: AlertTriangle,  dot: 'bg-red-500',   label: 'Crítico'    },
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function in30DaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default async function CompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  // ── Contratos de Prestadores ─────────────────────────────────────
  await supabase.rpc('generate_compliance_alerts', { p_company_id: company.id });

  const { data: alerts } = await supabase
    .from('compliance_alerts')
    .select(`*, contracts (numero_contrato, status), service_providers (nome_razao_social)`)
    .eq('company_id', company.id)
    .eq('resolvido', false)
    .order('gravidade', { ascending: true })
    .order('created_at', { ascending: false });

  const { data: metricas } = await supabase
    .from('contracts')
    .select('status, vigencia_indeterminada, data_vigencia_fim, assinado_contratante, assinado_prestador')
    .eq('company_id', company.id);

  const totalContratos  = metricas?.length || 0;
  const ativosContratos = metricas?.filter(c => c.status === 'assinado').length || 0;
  const semAssinatura   = metricas?.filter(c => c.status === 'aguardando_assinatura').length || 0;
  const alertasCriticos = alerts?.filter(a => a.gravidade === 'critico').length || 0;
  const alertasTotal    = alerts?.length || 0;

  const criticos    = alerts?.filter(a => a.gravidade === 'critico')    || [];
  const importantes = alerts?.filter(a => a.gravidade === 'importante') || [];
  const atencoes    = alerts?.filter(a => a.gravidade === 'atencao')    || [];

  // ── Termos de Pacientes ──────────────────────────────────────────
  const { data: terms } = await supabase
    .from('patient_terms')
    .select('id, status, data_revisao_recomendada, tipo_termo, modalidade')
    .eq('company_id', company.id);

  const { count: totalPacientes } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company.id);

  const hoje = todayISO();
  const em30 = in30DaysISO();

  const statusAtivos = ['ativo', 'assinado', 'pendente_assinatura'];

  const totalTermos          = terms?.length || 0;
  const termosAtivos         = terms?.filter(t => t.status === 'ativo').length              || 0;
  const termosAssinados      = terms?.filter(t => t.status === 'assinado').length           || 0;
  const termosPendAssinatura = terms?.filter(t => t.status === 'pendente_assinatura').length || 0;
  const termosCancelados     = terms?.filter(t => t.status === 'cancelado').length          || 0;
  const termosExpirados      = terms?.filter(t => t.status === 'expirado').length           || 0;
  const termosSubstituidos   = terms?.filter(t => t.status === 'substituido').length        || 0;

  const revisaoVencida = terms?.filter(t =>
    t.data_revisao_recomendada && t.data_revisao_recomendada <= hoje &&
    statusAtivos.includes(t.status)
  ).length || 0;

  const revisaoProxima = terms?.filter(t =>
    t.data_revisao_recomendada && t.data_revisao_recomendada > hoje &&
    t.data_revisao_recomendada <= em30 && statusAtivos.includes(t.status)
  ).length || 0;

  return (
    <AppLayout company={company}>
      <div className="space-y-8 animate-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Dashboard de Compliance</h1>
            <p className="text-slate-500 text-sm">
              Visão geral de alertas e pendências documentais
            </p>
          </div>
          <ComplianceRefreshButton companyId={company.id} />
        </div>

        {/* ── Seção: Contratos de Prestadores ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-brand-900">Contratos de Prestadores</h2>
            <Link href="/contracts" className="ml-auto text-xs text-brand-600 hover:underline">
              Ver contratos →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total de Contratos',   value: totalContratos,  icon: FileText,     cls: 'text-brand-600',   bg: 'bg-brand-50'   },
              { label: 'Ativos (assinados)',    value: ativosContratos, icon: CheckCircle,  cls: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Aguard. Assinatura',   value: semAssinatura,   icon: Clock,        cls: 'text-amber-600',   bg: 'bg-amber-50'   },
              { label: 'Alertas Críticos',     value: alertasCriticos, icon: AlertTriangle,cls: 'text-red-600',     bg: 'bg-red-50'     },
            ].map(m => (
              <div key={m.label} className="cc-card p-5">
                <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                  <m.icon className={`w-4 h-4 ${m.cls}`} />
                </div>
                <div className="text-2xl font-bold text-brand-900">{m.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Estado sem alertas de contratos */}
          {alertasTotal === 0 ? (
            <div className="cc-card flex items-center gap-3 p-4 border-emerald-200 bg-emerald-50">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                Contratos em conformidade — nenhum alerta identificado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {criticos.length > 0 && (
                <AlertSection title="Crítico — Ação Imediata Necessária" alerts={criticos} gravidade="critico" />
              )}
              {importantes.length > 0 && (
                <AlertSection title="Importante — Atenção Necessária" alerts={importantes} gravidade="importante" />
              )}
              {atencoes.length > 0 && (
                <AlertSection title="Atenção — Monitorar" alerts={atencoes} gravidade="atencao" />
              )}
            </div>
          )}
        </section>

        {/* ── Seção: Termos de Pacientes ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-brand-900">Termos de Pacientes</h2>
            <Link href="/patient-terms" className="ml-auto text-xs text-brand-600 hover:underline">
              Ver termos →
            </Link>
          </div>

          {/* Cards de métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total de Termos',    value: totalTermos,          icon: ClipboardList,cls: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Ativos',             value: termosAtivos,         icon: CheckCircle,  cls: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pend. Assinatura',   value: termosPendAssinatura, icon: Clock,        cls: 'text-amber-600',   bg: 'bg-amber-50'   },
              { label: 'Pacientes',          value: totalPacientes || 0,  icon: Users,        cls: 'text-brand-600',   bg: 'bg-brand-50'   },
            ].map(m => (
              <div key={m.label} className="cc-card p-5">
                <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                  <m.icon className={`w-4 h-4 ${m.cls}`} />
                </div>
                <div className="text-2xl font-bold text-brand-900">{m.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Detalhamento por status */}
          <div className="cc-card p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-brand-600" />
              <h3 className="font-semibold text-brand-900 text-sm">Situação dos Termos por Status</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { status: 'assinado',   value: termosAssinados   },
                { status: 'cancelado',  value: termosCancelados  },
                { status: 'expirado',   value: termosExpirados   },
                { status: 'substituido',value: termosSubstituidos},
              ].map(({ status, value }) => {
                const cfg = getPatientTermStatusDisplay(status);
                return (
                  <div key={status} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-xl font-bold text-brand-900">{value}</div>
                    <span className={`text-2xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${cfg.badgeCls}`}>
                      {PATIENT_TERM_STATUS_LABELS[status as keyof typeof PATIENT_TERM_STATUS_LABELS] || status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alertas de revisão */}
          {(revisaoVencida > 0 || revisaoProxima > 0 || termosPendAssinatura > 0) ? (
            <div className="space-y-3">
              {revisaoVencida > 0 && (
                <div className="flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-700">
                      {revisaoVencida} termo(s) com revisão administrativa vencida.
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Há termos de pacientes com revisão recomendada vencida — considere atualizar os documentos.
                    </p>
                    <Link href="/patient-terms" className="text-xs text-red-700 underline mt-1 inline-block">
                      Ver termos →
                    </Link>
                  </div>
                </div>
              )}
              {revisaoProxima > 0 && (
                <div className="flex gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-700">
                      {revisaoProxima} termo(s) com revisão administrativa nos próximos 30 dias.
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Há termos de pacientes com revisão recomendada nos próximos 30 dias.
                    </p>
                    <Link href="/patient-terms" className="text-xs text-amber-700 underline mt-1 inline-block">
                      Ver termos →
                    </Link>
                  </div>
                </div>
              )}
              {termosPendAssinatura > 0 && (
                <div className="flex gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
                  <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-700">
                      {termosPendAssinatura} termo(s) pendente(s) de assinatura.
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Há termos de pacientes pendentes de assinatura.
                    </p>
                    <Link href="/patient-terms?status=pendente_assinatura" className="text-xs text-blue-700 underline mt-1 inline-block">
                      Ver pendentes →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="cc-card flex items-center gap-3 p-4 border-emerald-200 bg-emerald-50">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                Termos de pacientes em dia — sem pendências administrativas identificadas.
              </p>
            </div>
          )}

          {/* Atalhos rápidos */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href="/patient-terms/new" className="btn-secondary text-xs flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Novo Termo
            </Link>
            <Link href="/patients" className="btn-ghost text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Ver Pacientes
            </Link>
          </div>
        </section>

      </div>
    </AppLayout>
  );
}

// ── Componente de seção de alertas (igual ao original) ────────────────────────
function AlertSection({ title, alerts, gravidade }: {
  title:     string;
  alerts:    any[];
  gravidade: keyof typeof GRAVIDADE_CONFIG;
}) {
  const cfg  = GRAVIDADE_CONFIG[gravidade];
  const Icon = cfg.icon;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
        <h3 className="font-semibold text-brand-900 text-sm">{title}</h3>
        <span className="badge badge-gray text-2xs">{alerts.length}</span>
      </div>
      <div className="space-y-3">
        {alerts.map((alert: any) => (
          <div key={alert.id} className={clsx('flex gap-4 p-4 rounded-xl border', cfg.cls)}>
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-current opacity-70" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-sm text-brand-900">{alert.titulo}</p>
                  {alert.descricao && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.descricao}</p>
                  )}
                </div>
                {alert.contract_id && (
                  <Link href={`/contracts/${alert.contract_id}`}
                    className="btn-secondary text-xs py-1 px-3 flex-shrink-0">
                    <FileText className="w-3 h-3" /> Ver contrato
                  </Link>
                )}
              </div>
              {alert.data_referencia && (
                <p className="text-2xs text-slate-400 mt-2">
                  Data de referência: {formatDateBR(alert.data_referencia.split('T')[0])}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
