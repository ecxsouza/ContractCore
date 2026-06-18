import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { AlertTriangle, CheckCircle, Clock, FileText, Shield, RefreshCw } from 'lucide-react';
import { ComplianceRefreshButton } from '@/components/compliance/ComplianceRefreshButton';
import { formatDateBR } from '@/lib/masks';
import clsx from 'clsx';

export const metadata = { title: 'Compliance' };

const GRAVIDADE_CONFIG = {
  atencao:    { cls: 'bg-blue-50 border-blue-200',   icon: Clock,          dot: 'bg-blue-400',  label: 'Atenção'    },
  importante: { cls: 'bg-amber-50 border-amber-200', icon: AlertTriangle,  dot: 'bg-amber-400', label: 'Importante' },
  critico:    { cls: 'bg-red-50 border-red-200',     icon: AlertTriangle,  dot: 'bg-red-500',   label: 'Crítico'    },
};

const TIPO_LABELS: Record<string, string> = {
  contrato_vencendo:   'Contrato vencendo em breve',
  assinatura_pendente: 'Assinatura pendente',
  contrato_vencido:    'Contrato vencido',
  registro_conselho:   'Registro profissional a verificar',
};

export default async function CompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  // Gerar/atualizar alertas
  await supabase.rpc('generate_compliance_alerts', { p_company_id: company.id });

  // Buscar alertas
  const { data: alerts } = await supabase
    .from('compliance_alerts')
    .select(`
      *,
      contracts (numero_contrato, status),
      service_providers (nome_razao_social)
    `)
    .eq('company_id', company.id)
    .eq('resolvido', false)
    .order('gravidade', { ascending: true })  // critico primeiro
    .order('created_at', { ascending: false });

  // Métricas gerais
  const { data: metricas } = await supabase
    .from('contracts')
    .select('status, vigencia_indeterminada, data_vigencia_fim, assinado_contratante, assinado_prestador')
    .eq('company_id', company.id);

  const totalContratos   = metricas?.length || 0;
  const ativos           = metricas?.filter(c => c.status === 'assinado').length || 0;
  const semAssinatura    = metricas?.filter(c => c.status === 'aguardando_assinatura').length || 0;
  const alertasCriticos  = alerts?.filter(a => a.gravidade === 'critico').length || 0;
  const alertasTotal     = alerts?.length || 0;

  // Separar por gravidade
  const criticos    = alerts?.filter(a => a.gravidade === 'critico')    || [];
  const importantes = alerts?.filter(a => a.gravidade === 'importante') || [];
  const atencoes    = alerts?.filter(a => a.gravidade === 'atencao')    || [];

  return (
    <AppLayout company={company}>
      <div className="space-y-6 animate-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Dashboard de Compliance</h1>
            <p className="text-slate-500 text-sm">
              Visão geral de alertas, vencimentos e pendências contratuais
            </p>
          </div>
          <ComplianceRefreshButton companyId={company.id} />
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Contratos Ativos',     value: ativos,           icon: CheckCircle,  cls: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Alertas Críticos',      value: alertasCriticos,  icon: AlertTriangle,cls: 'text-red-600',     bg: 'bg-red-50'     },
            { label: 'Aguard. Assinatura',    value: semAssinatura,    icon: Clock,        cls: 'text-amber-600',   bg: 'bg-amber-50'   },
            { label: 'Total de Alertas',      value: alertasTotal,     icon: Shield,       cls: 'text-brand-600',   bg: 'bg-brand-50'   },
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

        {/* Sem alertas */}
        {alertasTotal === 0 && (
          <div className="cc-card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="font-bold text-brand-900 text-lg">Tudo em conformidade!</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Nenhum alerta de compliance identificado. Continue monitorando regularmente.
            </p>
          </div>
        )}

        {/* Alertas críticos */}
        {criticos.length > 0 && (
          <AlertSection title="Crítico — Ação Imediata Necessária" alerts={criticos} gravidade="critico" />
        )}

        {/* Alertas importantes */}
        {importantes.length > 0 && (
          <AlertSection title="Importante — Atenção Necessária" alerts={importantes} gravidade="importante" />
        )}

        {/* Atenções */}
        {atencoes.length > 0 && (
          <AlertSection title="Atenção — Monitorar" alerts={atencoes} gravidade="atencao" />
        )}

      </div>
    </AppLayout>
  );
}

function AlertSection({ title, alerts, gravidade }: {
  title: string;
  alerts: any[];
  gravidade: keyof typeof GRAVIDADE_CONFIG;
}) {
  const cfg = GRAVIDADE_CONFIG[gravidade];
  const Icon = cfg.icon;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
        <h2 className="font-semibold text-brand-900 text-sm">{title}</h2>
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
