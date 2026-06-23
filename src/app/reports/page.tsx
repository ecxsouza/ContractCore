import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReportsClient } from '@/components/reports/ReportsClient';

export const metadata = { title: 'Relatórios' };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function in30DaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  // ── Contratos de Prestadores (mantido exatamente igual) ──────────
  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      id, numero_contrato, versao, status, data_emissao,
      data_vigencia_inicio, data_vigencia_fim, vigencia_indeterminada,
      ia_revisado, assinado_contratante, assinado_prestador,
      data_assinatura_contratante, data_assinatura_prestador,
      service_details, remuneration, anexos, created_at,
      service_providers (
        nome_razao_social, profissao, profissao_descricao,
        tipo_pessoa, especialidade, email, telefone,
        conselho_profissional, numero_registro_conselho
      )
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  // ── Termos de Pacientes ──────────────────────────────────────────
  const { data: terms } = await supabase
    .from('patient_terms')
    .select(`
      id, numero_termo, status, tipo_termo, modalidade,
      area_servico, data_revisao_recomendada, created_at,
      patients ( nome_completo, is_menor )
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  const { count: totalPacientes } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company.id);

  const hoje = todayISO();
  const em30 = in30DaysISO();

  // Pré-calcular métricas para o client (evita re-computar no client)
  const termMetrics = {
    total:            terms?.length || 0,
    totalPacientes:   totalPacientes || 0,
    porStatus:        {} as Record<string, number>,
    porTipo:          {} as Record<string, number>,
    porModalidade:    {} as Record<string, number>,
    revisaoVencida:   0,
    revisaoProxima:   0,
  };

  const statusAtivos = ['ativo', 'assinado', 'pendente_assinatura'];
  for (const t of terms || []) {
    termMetrics.porStatus[t.status]   = (termMetrics.porStatus[t.status]   || 0) + 1;
    termMetrics.porTipo[t.tipo_termo] = (termMetrics.porTipo[t.tipo_termo] || 0) + 1;
    if (t.modalidade) termMetrics.porModalidade[t.modalidade] = (termMetrics.porModalidade[t.modalidade] || 0) + 1;
    if (t.data_revisao_recomendada && statusAtivos.includes(t.status)) {
      if (t.data_revisao_recomendada <= hoje) termMetrics.revisaoVencida++;
      else if (t.data_revisao_recomendada <= em30) termMetrics.revisaoProxima++;
    }
  }

  return (
    <AppLayout company={company}>
      <ReportsClient
        company={company}
        contracts={contracts || []}
        terms={terms || []}
        termMetrics={termMetrics}
      />
    </AppLayout>
  );
}
